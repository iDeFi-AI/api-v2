import os
import json
import logging
import datetime
from flask import jsonify
from api.tools.etherscanv2 import get_etherscan_v2_details  # Import etherscanv2 utility functions

# Path to local flagged.json file
FLAGGED_JSON_PATH = os.path.join(os.path.dirname(__file__), 'unique', 'flagged.json')

# Use Etherscan API key directly from the environment
ETHERSCAN_API_KEY = os.getenv('NEXT_PUBLIC_ETHERSCAN_API_KEY')

if not ETHERSCAN_API_KEY:
    raise ValueError("NEXT_PUBLIC_ETHERSCAN_API_KEY is not set in the environment")

# Supported chains and their base URLs
CHAIN_API_BASE_URLS = {
    'ethereum': 'https://api.etherscan.io',
    'bsc': 'https://api.bscscan.com',
    'polygon': 'https://api.polygonscan.com',
    'arbitrum': 'https://api.arbiscan.io',
    'optimism': 'https://api-optimistic.etherscan.io',
    'avalanche': 'https://api.snowtrace.io',
    'fantom': 'https://api.ftmscan.com',
    # Add additional chains as needed
}

# Setup logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Function to check for dusting patterns
def check_dusting_patterns(wallet_address, chain='ethereum'):
    try:
        transactions = get_etherscan_v2_details(wallet_address, chain=chain)
        dusting_patterns = []

        for tx in transactions:
            value_eth = int(tx['value']) / 1e18
            if 0 < value_eth < 0.001:
                dusting_patterns.append({
                    'transaction_hash': tx['hash'],
                    'from': tx['from'],
                    'to': tx['to'],
                    'value': value_eth,
                    'timestamp': datetime.datetime.fromtimestamp(int(tx['timeStamp'])).isoformat()
                })

        return dusting_patterns
    except Exception as e:
        logger.error(f"Error checking dusting patterns: {e}")
        return []

# Function to provide recommendations based on dusting patterns
def provide_dusting_recommendations(dusting_patterns):
    if dusting_patterns:
        return [
            "Your wallet has been dusted. Avoid interacting with these transactions.",
            "Consider transferring funds to a new wallet.",
            "Enable additional security measures like hardware wallets."
        ]
    return ["No dusting patterns detected. Your wallet appears safe."]

# Main function to monitor address
def monitor_address(wallet_address, chain='ethereum'):
    try:
        if not get_etherscan_v2_details(wallet_address, chain=chain):  # Use etherscanv2 utility for validation
            return {'error': "Invalid Ethereum address or no data found."}

        dusting_patterns = check_dusting_patterns(wallet_address, chain)
        recommendations = provide_dusting_recommendations(dusting_patterns)

        return {
            'dusting_patterns': dusting_patterns,
            'recommendations': recommendations
        }
    except Exception as e:
        logger.error(f"Error monitoring address: {e}")
        return {'error': str(e)}

