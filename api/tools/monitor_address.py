import os
import json
import logging
import datetime
import time
import matplotlib.pyplot as plt
from threading import Thread
from api.tools.etherscanv2 import get_transaction_data  # Import etherscanv2 utility functions

# Path to local flagged.json file
FLAGGED_JSON_PATH = os.path.join(os.path.dirname(__file__), 'unique', 'flagged.json')

# Use Etherscan API key directly from the environment
ETHERSCAN_API_KEY = os.getenv('NEXT_PUBLIC_ETHERSCAN_API_KEY')

if not ETHERSCAN_API_KEY:
    raise ValueError("NEXT_PUBLIC_ETHERSCAN_API_KEY is not set in the environment")

# Supported chains and their base URLs
SUPPORTED_CHAINS = {
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

# Function to fetch transactions
def fetch_transactions(wallet_address, chain='ethereum'):
    try:
        return get_transaction_data(wallet_address, chain=chain, module="account", action="txlist").get('result', [])
    except Exception as e:
        logger.error(f"Error fetching transactions: {e}")
        return []

# Function to check for dusting patterns
def check_dusting_patterns(wallet_address, transactions):
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

# Plot transactions on a graph
def plot_transactions(transactions):
    if not transactions:
        return

    timestamps = [datetime.datetime.fromtimestamp(int(tx['timeStamp'])) for tx in transactions]
    values = [float(tx['value']) / 1e18 for tx in transactions]

    plt.figure(figsize=(10, 6))
    plt.plot(timestamps, values, marker='o', linestyle='-', color='b')
    plt.title('Transaction History')
    plt.xlabel('Time')
    plt.ylabel('Transaction Value (ETH)')
    plt.grid()
    plt.tight_layout()
    plt.pause(0.1)  # Interactive plot update

# Monitor address for new transactions
def monitor_address(wallet_address, chain='ethereum'):
    known_transactions = set()
    try:
        while True:
            transactions = fetch_transactions(wallet_address, chain)
            new_transactions = [tx for tx in transactions if tx['hash'] not in known_transactions]

            if new_transactions:
                known_transactions.update(tx['hash'] for tx in new_transactions)
                logger.info(f"New transactions detected: {len(new_transactions)}")
                plot_transactions(new_transactions)

                # Summarize key metrics
                total_sent = sum(float(tx['value']) / 1e18 for tx in transactions if tx['from'].lower() == wallet_address.lower())
                total_received = sum(float(tx['value']) / 1e18 for tx in transactions if tx['to'].lower() == wallet_address.lower())

                summary = {
                    "Total ETH Sent": total_sent,
                    "Total ETH Received": total_received,
                    "Total Transactions": len(transactions),
                    "New Transactions": len(new_transactions)
                }
                logger.info(f"Summary: {summary}")

                # Detect dusting patterns
                dusting_patterns = check_dusting_patterns(wallet_address, transactions)
                if dusting_patterns:
                    logger.warning(f"Dusting patterns detected: {dusting_patterns}")

            time.sleep(10)  # Poll every 10 seconds
    except KeyboardInterrupt:
        logger.info("Monitoring stopped.")
    except Exception as e:
        logger.error(f"Error in monitoring: {e}")

# Start monitoring in a thread
def start_monitoring(wallet_address, chain='ethereum'):
    thread = Thread(target=monitor_address, args=(wallet_address, chain))
    thread.daemon = True
    thread.start()