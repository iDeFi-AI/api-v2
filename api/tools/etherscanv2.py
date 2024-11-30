import os
import logging
import asyncio
import httpx
from httpx import HTTPStatusError
import re
from dotenv import load_dotenv
from tqdm import tqdm

# Load environment variables
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
dotenv_path = os.path.join(ROOT_DIR, ".env")

if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
    logging.info(f".env loaded successfully from: {dotenv_path}")
else:
    raise FileNotFoundError(f".env file not found at: {dotenv_path}")

# Etherscan API Key
ETHERSCAN_API_KEY = os.getenv("NEXT_PUBLIC_ETHERSCAN_API_KEY")
if not ETHERSCAN_API_KEY:
    raise ValueError("NEXT_PUBLIC_ETHERSCAN_API_KEY is not set in the environment")

# Logging configuration
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Ethereum address regex pattern
ETHEREUM_ADDRESS_PATTERN = r"0x[a-fA-F0-9]{40}"

# Supported Chains with Chain IDs
SUPPORTED_CHAINS = {
    "ethereum": 1,
    "bsc": 56,
    "polygon": 137,
    "arbitrum": 42161,
    "optimism": 10,
    "base": 8453,
}

# API Base URL
API_URL = "https://api.etherscan.io/api"

# Rate limit settings
RATE_LIMIT_DELAY = 0.25  # Delay between requests (in seconds)

# Validate Ethereum address
def is_valid_ethereum_address(address):
    """Validate Ethereum address format."""
    return bool(re.match(ETHEREUM_ADDRESS_PATTERN, address))

# Convert value from wei to Ether
def wei_to_ether(wei):
    """Convert wei to Ether."""
    return float(wei) / 10**18

# Clean and enrich transactions
def clean_transaction_data(transactions):
    """Clean and enrich transaction data."""
    cleaned_data = []
    for tx in transactions:
        if not tx.get("to") or tx.get("value") == "0":
            continue  # Exclude irrelevant transactions

        cleaned_tx = {
            "blockNumber": tx.get("blockNumber"),
            "timeStamp": tx.get("timeStamp"),
            "hash": tx.get("hash"),
            "from": tx.get("from"),
            "to": tx.get("to"),
            "value_ether": wei_to_ether(tx.get("value", "0")),
            "gas": tx.get("gas"),
            "gasPrice": wei_to_ether(tx.get("gasPrice", "0")),
            "gasUsed": tx.get("gasUsed"),
            "isError": tx.get("isError"),
            "functionName": tx.get("functionName"),
        }
        cleaned_data.append(cleaned_tx)

    # Sort by timestamp
    cleaned_data.sort(key=lambda x: int(x["timeStamp"]))
    return cleaned_data

# Fetch transactions with retries
async def fetch_transactions(chain_id, wallet_address, startblock=0, endblock=99999999, sort="asc", retries=3, timeout=10):
    """
    Fetch transaction data for a wallet address on a specific chain using Etherscan API.
    """
    params = {
        "module": "account",
        "action": "txlist",
        "address": wallet_address,
        "startblock": startblock,
        "endblock": endblock,
        "sort": sort,
        "chainid": chain_id,
        "apikey": ETHERSCAN_API_KEY,
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        for attempt in range(retries):
            try:
                logger.info(f"Fetching transactions for wallet {wallet_address} on chain {chain_id} (attempt {attempt + 1})")
                response = await client.get(API_URL, params=params)
                response.raise_for_status()
                data = response.json()

                if data.get("status") == "1":  # Success
                    return clean_transaction_data(data.get("result", []))
                else:
                    logger.warning(f"Etherscan API error: {data.get('message')}")
                    return []

            except HTTPStatusError as e:
                logger.error(f"HTTP error: {e.response.status_code} - {e.response.text}")
            except Exception as e:
                logger.error(f"Request failed: {e}")

            # Exponential backoff for retries
            await asyncio.sleep(2 ** attempt * RATE_LIMIT_DELAY)

    logger.error(f"Failed to fetch transactions for {wallet_address} on chain {chain_id} after {retries} attempts.")
    return []

# Process transactions for a specific chain
async def process_chain_transactions(chain_name, wallet_address):
    """
    Process transactions for a given chain by chain name.
    """
    chain_id = SUPPORTED_CHAINS.get(chain_name)
    if not chain_id:
        logger.warning(f"Unsupported chain: {chain_name}")
        return []

    return await fetch_transactions(chain_id, wallet_address)

# Main function to handle multi-chain transaction fetching
async def get_transaction_data(wallet_address, chains=None, startblock=0, endblock=99999999):
    """
    Fetch transaction data across multiple chains.
    """
    if not is_valid_ethereum_address(wallet_address):
        raise ValueError(f"Invalid Ethereum address: {wallet_address}")

    chains = chains or SUPPORTED_CHAINS.keys()
    results = []

    with tqdm(total=len(chains), desc="Processing chains", unit="chain") as pbar:
        for chain_name in chains:
            try:
                chain_data = await process_chain_transactions(chain_name, wallet_address)
                if chain_data:
                    results.append({
                        "chain": chain_name,
                        "transactions": chain_data,
                    })
                else:
                    logger.warning(f"No relevant transactions found for {wallet_address} on {chain_name}.")
            except Exception as e:
                logger.error(f"Error processing chain {chain_name}: {e}")
            pbar.update(1)

    return results if results else []

# Entry point for testing
if __name__ == "__main__":
    wallet = "0xYourWalletAddressHere"
    chains_to_query = ["ethereum", "bsc", "polygon", "arbitrum", "optimism", "base"]
    asyncio.run(get_transaction_data(wallet, chains_to_query))
