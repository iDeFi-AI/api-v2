from flask import Blueprint, request, jsonify
import os
import json
import asyncio
import logging
from api.tools.etherscanv2 import get_transaction_data, is_valid_ethereum_address

# Create Blueprint
origins = Blueprint('origins', __name__)

# Path to known origins JSON file
KNOWN_ORIGINS_PATH = os.path.join(os.path.dirname(__file__), 'known_origins/contract_origins.json')

# Supported chains
SUPPORTED_CHAINS = ["ethereum", "base", "bsc", "polygon", "arbitrum", "optimism"]

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load known origins
def load_known_origins():
    """Load known origins from a JSON file."""
    try:
        with open(KNOWN_ORIGINS_PATH, 'r') as f:
            known_origins = json.load(f)
        logger.info("Loaded known origins successfully.")
        return known_origins
    except FileNotFoundError:
        logger.error(f"Known origins file not found: {KNOWN_ORIGINS_PATH}")
        return []
    except json.JSONDecodeError as e:
        logger.error(f"Error decoding JSON from {KNOWN_ORIGINS_PATH}: {e}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error loading known origins: {e}")
        return []

# Fetch chain data for a single address
async def fetch_chain_data(address, chain):
    """Fetch transaction data for an address on a specific chain."""
    try:
        transactions = await get_transaction_data(address, chains=[chain])
        if transactions and isinstance(transactions, list):
            chain_result = transactions[0]  # Get the first result for the chain
            return {
                "status": "MATCH_FOUND_ON_ETHERSCAN",
                "etherscan_info": {
                    "transaction_count": len(chain_result["transactions"]),
                    "transactions": chain_result["transactions"][:5],  # Limit to 5 transactions
                },
            }
    except Exception as e:
        logger.error(f"Error fetching data for {address} on {chain}: {e}")
    return {"status": "NO_MATCH"}

# Match an address with known origins
def match_known_origins(address, known_origins):
    """Match a wallet address with known origins."""
    matches = []
    for origin in known_origins:
        if address.lower() == origin.get("address", "").lower():
            matches.append({
                "name": origin.get("name", "Unknown"),
                "type": origin.get("type", "Unknown"),
                "address": origin.get("address"),
            })
    return matches

# Asynchronously process addresses
async def process_addresses(addresses):
    """Process multiple addresses and fetch transaction data."""
    known_origins = load_known_origins()
    results = []

    for address in addresses:
        if not is_valid_ethereum_address(address):
            logger.warning(f"Invalid Ethereum address: {address}")
            results.append({"address": address, "status": "INVALID_ADDRESS"})
            continue

        result = {"address": address, "known_origins": [], "chains": []}

        # Match with known origins
        result["known_origins"] = match_known_origins(address, known_origins)

        # Fetch chain data concurrently for supported chains
        chain_results = await asyncio.gather(
            *[fetch_chain_data(address, chain) for chain in SUPPORTED_CHAINS],
            return_exceptions=True
        )

        # Process chain results
        for chain, chain_result in zip(SUPPORTED_CHAINS, chain_results):
            if isinstance(chain_result, dict) and chain_result["status"] == "MATCH_FOUND_ON_ETHERSCAN":
                result["chains"].append({
                    "chain": chain,
                    "transaction_count": chain_result["etherscan_info"]["transaction_count"],
                    "transactions": chain_result["etherscan_info"]["transactions"],
                })

        results.append(result)

    return results