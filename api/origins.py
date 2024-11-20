import os
import json
import logging
from api.etherscanv2 import get_etherscan_v2_details  # Importing from etherscanv2.py

# Path to the known origins JSON file
KNOWN_ORIGINS_PATH = os.path.join(os.path.dirname(__file__), 'known_origins/contract_origins.json')

# Load logging configuration
logging.basicConfig(level=logging.INFO)

# Function to load known origins from a JSON file
def load_known_origins():
    """
    Load the locally stored known origins from a JSON file.
    """
    try:
        with open(KNOWN_ORIGINS_PATH, 'r') as f:
            known_origins = json.load(f)
        return known_origins
    except Exception as e:
        logging.error(f"Error loading known origins: {e}")
        return []

# Function to check addresses against known origins and fetch details from Etherscan
def check_addresses_with_origins(addresses, chain='ethereum'):
    """
    Check addresses against known origins and fetch details from Etherscan if needed.

    Args:
        addresses (list): List of Ethereum addresses to check.
        chain (str): Blockchain chain to use for Etherscan queries (default: 'ethereum').

    Returns:
        list: List of results for each address.
    """
    known_origins = load_known_origins()
    results = []

    for address in addresses:
        # Normalize address to lowercase for comparison
        address_lower = address.lower()
        matches = []

        # Check if the given address matches any locally stored origin addresses
        for origin in known_origins:
            origin_address = origin['address'].lower()
            if address_lower == origin_address:
                matches.append({
                    "name": origin['name'],
                    "type": origin['type'],
                    "address": origin_address
                })

        # If no match is found in known origins, query Etherscan for additional information
        if not matches:
            etherscan_info = fetch_etherscan_v2_info(address_lower, chain)
            if etherscan_info:
                results.append({
                    "address": address,
                    "status": "MATCH_FOUND_ON_ETHERSCAN",
                    "etherscan_info": etherscan_info
                })
            else:
                results.append({
                    "address": address,
                    "status": "NO_MATCH"
                })
        else:
            results.append({
                "address": address,
                "status": "MATCH_FOUND",
                "matches": matches
            })

    return results

# Helper function to query Etherscan V2 for address information
def fetch_etherscan_v2_info(address, chain):
    """
    Fetch address information from Etherscan V2 API.

    Args:
        address (str): The Ethereum address to query.
        chain (str): Blockchain chain to use for the query (e.g., 'ethereum', 'polygon').

    Returns:
        dict: Etherscan information for the address or None if no data is found.
    """
    try:
        etherscan_details = get_etherscan_v2_details(address, chain=chain)
        if etherscan_details and "transaction_type" in etherscan_details:
            return {
                "message": "Found on Etherscan",
                "transaction_count": len(etherscan_details),
                "transactions": etherscan_details
            }
        else:
            logging.warning(f"No relevant data found for address {address} on chain {chain}.")
            return None
    except Exception as e:
        logging.error(f"Error fetching Etherscan info for address {address} on chain {chain}: {e}")
        return None

# Example usage for debugging
if __name__ == "__main__":
    example_addresses = ["0xYourAddress1", "0xYourAddress2"]
    chain = "ethereum"  # Change chain as needed
    results = check_addresses_with_origins(example_addresses, chain=chain)
    print(json.dumps(results, indent=4))
