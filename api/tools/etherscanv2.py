import os
import json
import re
import logging
import requests

# Path to local flagged.json file
FLAGGED_JSON_PATH = os.path.join(os.path.dirname(__file__), 'unique', 'flagged.json')

# Use Etherscan API key directly from the environment
ETHERSCAN_API_KEY = os.getenv('NEXT_PUBLIC_ETHERSCAN_API_KEY')

if not ETHERSCAN_API_KEY:
    raise ValueError("NEXT_PUBLIC_ETHERSCAN_API_KEY is not set in the environment")

# Ethereum address regex pattern
ETHEREUM_ADDRESS_PATTERN = r"0x[a-fA-F0-9]{40}"

# Supported chains and their base URLs
CHAIN_API_BASE_URLS = {
    'ethereum': 'https://api.etherscan.io',
    'sepolia': 'https://api-sepolia.etherscan.io',
    'holesky': 'https://api-holesky.etherscan.io',
    'bsc': 'https://api.bscscan.com',
    'bsc_testnet': 'https://api-testnet.bscscan.com',
    'polygon': 'https://api.polygonscan.com',
    'polygon_testnet': 'https://api-testnet.polygonscan.com',
    'polygon_zkevm': 'https://api-zkevm.polygonscan.com',
    'polygon_zkevm_testnet': 'https://api-testnet-zkevm.polygonscan.com',
    'base': 'https://api.basescan.org',
    'base_testnet': 'https://api-testnet.basescan.org',
    'arbitrum': 'https://api.arbiscan.io',
    'arbitrum_nova': 'https://api-nova.arbiscan.io',
    'arbitrum_sepolia': 'https://api-sepolia.arbiscan.io',
    'linea': 'https://api.lineascan.org',
    'linea_testnet': 'https://api-testnet.lineascan.org',
    'fantom': 'https://api.ftmscan.com',
    'fantom_testnet': 'https://api-testnet.ftmscan.com',
    'optimism': 'https://api-optimistic.etherscan.io',
    'optimism_sepolia': 'https://api-sepolia-optimistic.etherscan.io',
    'avalanche': 'https://api.snowtrace.io',
    'avalanche_fuji': 'https://api-testnet.snowtrace.io',
    # Add additional chains as required
}

# Chain IDs for supported networks
CHAIN_IDS = {
    'ethereum': 1,
    'sepolia': 11155111,
    'holesky': 1700,
    'bsc': 56,
    'bsc_testnet': 97,
    'polygon': 137,
    'polygon_testnet': 80001,
    'polygon_zkevm': 1101,
    'polygon_zkevm_testnet': 1442,
    'base': 8453,
    'base_testnet': 84531,
    'arbitrum': 42161,
    'arbitrum_nova': 42170,
    'arbitrum_sepolia': 421611,
    'linea': 59144,
    'linea_testnet': 59140,
    'fantom': 250,
    'fantom_testnet': 4002,
    'optimism': 10,
    'optimism_sepolia': 11155420,
    'avalanche': 43114,
    'avalanche_fuji': 43113,
    # Add additional chain IDs as required
}

# Setup logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Function to validate Ethereum addresses
def is_valid_ethereum_address(address):
    """Check if the address is a valid Ethereum address."""
    return bool(re.match(ETHEREUM_ADDRESS_PATTERN, address))

# Function to build Etherscan API V2 URL
def build_etherscan_api_v2_url(chain, module, action, wallet_address):
    """Constructs the API URL for the given chain, module, and action."""
    base_url = CHAIN_API_BASE_URLS.get(chain, CHAIN_API_BASE_URLS['ethereum'])
    return f"{base_url}/api?module={module}&action={action}&address={wallet_address}&apikey={ETHERSCAN_API_KEY}"

# Function to fetch transaction details from Etherscan V2
def get_etherscan_v2_details(wallet_address, unique_addresses=None, chain='ethereum'):
    """
    Fetch Etherscan V2 transaction details for a given wallet address.

    :param wallet_address: The Ethereum wallet address to query.
    :param unique_addresses: Optional list of addresses to filter transactions.
    :param chain: The blockchain chain to query (default: 'ethereum').
    :return: A formatted string of transaction details or an error message.
    """
    unique_addresses = unique_addresses or []
    try:
        details = []

        def fetch_transactions(url):
            """Fetch and return transactions from the given Etherscan V2 API URL."""
            response = requests.get(url)
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get('status') == '1':
                        return data.get('result', [])
                    else:
                        logger.error(f"Etherscan API error: {data.get('message', 'Unknown error')} - URL: {url}")
                        return []
                except json.JSONDecodeError:
                    logger.error("Error decoding Etherscan API response as JSON.")
                    return []
            else:
                logger.error(f"Failed to fetch data from Etherscan API. Status code: {response.status_code}")
                return []

        # Regular transactions
        regular_tx_url = build_etherscan_api_v2_url(chain, 'account', 'txlist', wallet_address)
        regular_transactions = fetch_transactions(regular_tx_url)

        # Internal transactions
        internal_tx_url = build_etherscan_api_v2_url(chain, 'account', 'txlistinternal', wallet_address)
        internal_transactions = fetch_transactions(internal_tx_url)

        # Function to process transactions
        def process_transactions(transactions, tx_type):
            for tx in transactions:
                if tx.get('to', '').lower() in unique_addresses or tx.get('from', '').lower() in unique_addresses:
                    details.append({
                        'transaction_type': tx_type,
                        'transaction_hash': tx.get('hash', ''),
                        'from': tx.get('from', ''),
                        'to': tx.get('to', ''),
                        'etherscan_url': f"{CHAIN_API_BASE_URLS[chain]}/tx/{tx.get('hash', '')}"
                    })
                    break  # Stop searching on first match

        # Process both regular and internal transactions
        process_transactions(regular_transactions, 'Regular')
        process_transactions(internal_transactions, 'Internal')

        if details:
            formatted_details = "\n".join(
                [f"Involved in {tx['transaction_type']} transaction\n"
                 f"From: {tx['from']} To: {tx['to']}\n"
                 f"Transaction Hash: {tx['transaction_hash']}\n"
                 f"Etherscan URL: {tx['etherscan_url']}\n"
                 for tx in details]
            )
            return formatted_details
        else:
            return "No relevant transactions found."

    except Exception as e:
        logger.error(f"Error fetching data from Etherscan API: {e}")
        return "Error retrieving transaction details."

# Example usage
if __name__ == "__main__":
    example_wallet = "0xYourWalletAddress"
    example_unique_addresses = ["0xAnotherAddress"]
    chain = "ethereum"
    result = get_etherscan_v2_details(example_wallet, example_unique_addresses, chain)
    print(result)
