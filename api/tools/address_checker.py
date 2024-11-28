import os
import json
import re
import logging
from api.tools.etherscanv2 import (
    get_transaction_data,
    is_valid_ethereum_address,
    SUPPORTED_CHAINS
)

# Logging setup
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load flagged data from a corrected path
def load_flagged_data():
    """Load flagged data from the correct path."""
    try:
        # Use the appropriate relative path to locate `flagged.json`
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        flagged_file_path = os.path.join(root_dir, 'unique', 'flagged.json')

        # Load the JSON file
        with open(flagged_file_path, 'r') as f:
            flagged_data = json.load(f)
            logger.info(f"Flagged data loaded successfully from {flagged_file_path}")
            return flagged_data
    except FileNotFoundError as e:
        logger.error(f"Error loading flagged.json: {e}")
        return None
    except json.JSONDecodeError as e:
        logger.error(f"Error decoding flagged.json: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error loading flagged.json: {e}")
        return None

# Clean and validate Ethereum addresses
def clean_and_validate_addresses(addresses):
    """Clean and validate Ethereum addresses."""
    cleaned_addresses = []
    for address in addresses:
        if isinstance(address, str):
            address = re.sub(r'[^\w]', '', address)  # Remove invalid characters
            if is_valid_ethereum_address(address):
                cleaned_addresses.append(address)
    return cleaned_addresses

# Extract unique addresses from the dataset (grandparent, parents, children)
def get_unique_addresses(dataset):
    """Extract unique addresses from the dataset."""
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
def check_address_in_dataset(address, dataset, chain='ethereum'):
    """
    Check if the given address is a grandparent, parent, or child, and fetch transaction details.
    """
    address_lower = address.lower()
    unique_addresses = get_unique_addresses(dataset)
    
    # Use Etherscan V2 to fetch transaction details
    etherscan_details = get_transaction_data(address_lower, unique_addresses, chain)

    for entry in dataset:
        grandparent = entry.get('grandparent', '').lower()
        parents = [p.lower() for p in entry.get('parents', [])]
        children = {k.lower(): [c.lower() for c in v] for k, v in entry.get('children', {}).items()}

        if grandparent == address_lower:
            return {
                "address": address,
                "status": "FAIL",
                "description": f"Address {address} is a grandparent flagged for direct involvement in illicit activities.\n{etherscan_details}",
                "related_addresses": {
                    "grandparent": grandparent,
                    "parents": parents,
                    "children": children
                }
            }

        if address_lower in parents:
            return {
                "address": address,
                "status": "WARNING",
                "description": f"Address {address} is a parent flagged for indirect involvement.\n{etherscan_details}",
                "related_addresses": {
                    "grandparent": grandparent,
                    "parents": parents,
                    "children": children.get(address_lower, [])
                }
            }

        for parent, child_list in children.items():
            if address_lower in child_list:
                return {
                    "address": address,
                    "status": "WARNING",
                    "description": f"Address {address} is a child flagged for indirect involvement through parent {parent}.\n{etherscan_details}",
                    "related_addresses": {
                        "grandparent": grandparent,
                        "parents": [parent],
                        "children": child_list
                    }
                }

    return {
        "address": address,
        "status": "PASS",
        "description": f"Address {address} is not involved in flagged activities.\n{etherscan_details}"
    }

# Check multiple wallet addresses
def check_wallet_address(addresses, chain='ethereum'):
    """
    Check multiple Ethereum addresses against the dataset and fetch transaction details.
    """
    flagged_data = load_flagged_data()
    if flagged_data is None:
        logger.error("Flagged data could not be loaded.")
        return [{'status': 'ERROR', 'message': 'Failed to load flagged data.'}]

    results = []
    for address in addresses:
        if not is_valid_ethereum_address(address):
            results.append({'status': 'ERROR', 'message': f'Invalid Ethereum address: {address}'})
            continue

        result = check_address_in_dataset(address, flagged_data, chain)
        results.append(result)

    return results

# Example Usage
if __name__ == "__main__":
    test_addresses = [
        "0xYourValidAddress1",
        "0xYourValidAddress2",
        "0xInvalidAddress"
    ]
    chain = "ethereum"
    results = check_wallet_address(test_addresses, chain)
    print(json.dumps(results, indent=4))
