import os
import json
import re
import logging
from api.tools.etherscanv2 import get_transaction_data, is_valid_ethereum_address

# Logging setup
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Dynamically calculate paths
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))  # tools/
API_DIR = os.path.abspath(os.path.join(CURRENT_DIR, '..'))  # api/
UNIQUE_DIR = os.path.join(API_DIR, 'unique')
FLAGGED_JSON_PATH = os.path.join(UNIQUE_DIR, 'flagged.json')

# Load flagged data
def load_flagged_data():
    """
    Load flagged data from the unique directory.
    """
    try:
        logger.debug(f"Attempting to load flagged data from: {FLAGGED_JSON_PATH}")
        if not os.path.exists(FLAGGED_JSON_PATH):
            logger.error(f"Flagged dataset file not found at: {FLAGGED_JSON_PATH}")
            return None

        with open(FLAGGED_JSON_PATH, 'r') as file:
            flagged_data = json.load(file)
            logger.info(f"Flagged data loaded successfully from {FLAGGED_JSON_PATH}")
            return flagged_data
    except FileNotFoundError:
        logger.error(f"File not found: {FLAGGED_JSON_PATH}")
        return None
    except json.JSONDecodeError as e:
        logger.error(f"JSON Decode Error in flagged.json: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error loading flagged.json: {e}")
        return None

# Clean and validate Ethereum addresses
def clean_and_validate_addresses(addresses):
    """
    Clean and validate Ethereum addresses.
    """
    cleaned_addresses = []
    for address in addresses:
        if isinstance(address, str):
            address = re.sub(r'[^\w]', '', address)  # Remove invalid characters
            if is_valid_ethereum_address(address):
                cleaned_addresses.append(address)
            else:
                logger.warning(f"Invalid Ethereum address skipped: {address}")
    return cleaned_addresses

# Extract unique addresses from the dataset
def get_unique_addresses(dataset):
    """
    Extract unique addresses from the dataset.
    """
    unique_addresses = set()
    for entry in dataset:
        grandparent = entry.get('grandparent')
        if grandparent:
            unique_addresses.add(grandparent.lower())

        parents = entry.get('parents', [])
        unique_addresses.update([p.lower() for p in parents])

        children = entry.get('children', {})
        for parent, child_list in children.items():
            unique_addresses.add(parent.lower())
            unique_addresses.update([c.lower() for c in child_list])

    return unique_addresses

# Check an individual Ethereum address against the dataset
async def check_address_in_dataset(address, dataset):
    """
    Check if the given address is flagged and fetch transaction details.
    """
    try:
        address_lower = address.lower()
        etherscan_details = await get_transaction_data(address_lower)

        for entry in dataset:
            grandparent = entry.get('grandparent', '').lower()
            parents = [p.lower() for p in entry.get('parents', [])]
            children = {k.lower(): [c.lower() for c in v] for k, v in entry.get('children', {}).items()}

            if grandparent == address_lower:
                return {
                    "address": address,
                    "status": "FAIL",
                    "description": "Address is flagged as a grandparent.",
                    "related_addresses": {
                        "grandparent": grandparent,
                        "parents": parents,
                        "children": children
                    },
                    "transactions": etherscan_details
                }

            if address_lower in parents:
                return {
                    "address": address,
                    "status": "WARNING",
                    "description": "Address is flagged as a parent.",
                    "related_addresses": {
                        "grandparent": grandparent,
                        "parents": parents,
                        "children": children.get(address_lower, [])
                    },
                    "transactions": etherscan_details
                }

            for parent, child_list in children.items():
                if address_lower in child_list:
                    return {
                        "address": address,
                        "status": "WARNING",
                        "description": "Address is flagged as a child.",
                        "related_addresses": {
                            "grandparent": grandparent,
                            "parents": [parent],
                            "children": child_list
                        },
                        "transactions": etherscan_details
                    }

        return {
            "address": address,
            "status": "PASS",
            "description": "Address is not flagged in the dataset.",
            "transactions": etherscan_details
        }

    except Exception as e:
        logger.error(f"Error in check_address_in_dataset for address {address}: {e}")
        return {"address": address, "status": "ERROR", "description": str(e)}

# Check multiple wallet addresses
async def check_wallet_address(addresses):
    """
    Check multiple Ethereum addresses against the dataset asynchronously.
    """
    flagged_data = load_flagged_data()
    if flagged_data is None:
        logger.error("Flagged data could not be loaded.")
        return [{'status': 'ERROR', 'message': 'Failed to load flagged data.'}]

    results = []
    cleaned_addresses = clean_and_validate_addresses(addresses)

    if not cleaned_addresses:
        logger.warning("No valid Ethereum addresses were provided.")
        return [{'status': 'ERROR', 'message': 'No valid Ethereum addresses provided.'}]

    for address in cleaned_addresses:
        result = await check_address_in_dataset(address, flagged_data)
        results.append(result)

    return results

# Example Usage
if __name__ == "__main__":
    import asyncio

    test_addresses = [
        "0xValidEthereumAddress1",
        "0xInvalidEthereumAddress"
    ]

    async def run_test():
        results = await check_wallet_address(test_addresses)
        print(json.dumps(results, indent=4))

    asyncio.run(run_test())
