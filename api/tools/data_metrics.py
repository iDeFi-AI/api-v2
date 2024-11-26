import logging
from datetime import datetime
from collections import defaultdict
import json
from api.tools.etherscanv2 import get_etherscan_v2_details

logger = logging.getLogger(__name__)

# Fetch transactions using etherscanv2.py
def fetch_transactions(address, chain='ethereum'):
    response = get_etherscan_v2_details(address, chain=chain, module="account", action="txlist")
    return response.get('result', [])

# Fetch internal transactions using etherscanv2.py
def fetch_internal_transactions(address, chain='ethereum'):
    response = get_etherscan_v2_details(address, chain=chain, module="account", action="txlistinternal")
    return response.get('result', [])

# Fetch token transfers using etherscanv2.py
def fetch_token_transfers(address, chain='ethereum'):
    response = get_etherscan_v2_details(address, chain=chain, module="account", action="tokentx")
    return response.get('result', [])

# Calculate metrics and forensic data
def calculate_metrics_and_forensics(address, transactions, internal_transactions, token_transfers):
    metrics = {
        "ETH Analysis": {},
        "Internal Transactions": {},
        "Token Transfers": {},
        "Unique Interactions": {}
    }
    forensic_insights = {
        "High-Value Transactions": 0,
        "Frequent Recipients": defaultdict(int),
        "Dusting Attacks": 0
    }

    # ETH Analysis
    eth_sent = sum(float(tx['value']) / 1e18 for tx in transactions if tx['from'].lower() == address.lower())
    eth_received = sum(float(tx['value']) / 1e18 for tx in transactions if tx['to'].lower() == address.lower())
    avg_gas_price = (
        sum(float(tx['gasPrice']) for tx in transactions) / len(transactions)
        if transactions else 0
    )

    metrics["ETH Analysis"] = {
        "Total ETH Sent": eth_sent,
        "Total ETH Received": eth_received,
        "Total ETH Transacted": eth_sent + eth_received,
        "Average Gas Price (Gwei)": avg_gas_price / 1e9,
        "Transaction Count": len(transactions)
    }

    # Internal Transactions
    internal_sent = sum(float(tx['value']) / 1e18 for tx in internal_transactions if tx['from'].lower() == address.lower())
    internal_received = sum(float(tx['value']) / 1e18 for tx in internal_transactions if tx['to'].lower() == address.lower())

    metrics["Internal Transactions"] = {
        "Total Internal Sent": internal_sent,
        "Total Internal Received": internal_received,
        "Internal Transaction Count": len(internal_transactions)
    }

    # Token Transfers
    token_summary = defaultdict(int)
    token_value_breakdown = defaultdict(float)
    for tx in token_transfers:
        token_symbol = tx.get('tokenSymbol', 'UNKNOWN')
        token_value = float(tx['value']) / (10 ** int(tx.get('tokenDecimal', 18)))
        token_summary[token_symbol] += 1
        token_value_breakdown[token_symbol] += token_value

    metrics["Token Transfers"] = {
        "Total Token Transfers": len(token_transfers),
        "Token Summary": dict(token_summary),
        "Token Value Breakdown": dict(token_value_breakdown)
    }

    # Unique Interactions
    unique_senders = set(tx['from'] for tx in transactions)
    unique_recipients = set(tx['to'] for tx in transactions)
    metrics["Unique Interactions"] = {
        "Unique Senders": len(unique_senders),
        "Unique Recipients": len(unique_recipients),
        "Total Unique Addresses": len(unique_senders | unique_recipients)
    }

    # Forensic Insights
    high_value_threshold = 1.0  # ETH
    for tx in transactions:
        value_eth = float(tx['value']) / 1e18
        if value_eth > high_value_threshold:
            forensic_insights["High-Value Transactions"] += 1
        if tx['to'].lower() in unique_recipients:
            forensic_insights["Frequent Recipients"][tx['to']] += 1
        if 0 < value_eth < 0.001:  # Dusting attack threshold
            forensic_insights["Dusting Attacks"] += 1

    return metrics, forensic_insights

# Process data
def process_data(address, chain='ethereum'):
    logger.info(f"Fetching data for {address} on {chain}...")
    transactions = fetch_transactions(address, chain)
    internal_transactions = fetch_internal_transactions(address, chain)
    token_transfers = fetch_token_transfers(address, chain)

    metrics, forensic_insights = calculate_metrics_and_forensics(
        address, transactions, internal_transactions, token_transfers
    )

    output = {
        "metrics": metrics,
        "forensic_insights": forensic_insights
    }

    store_data(address, output)
    return output

# Store data
def store_data(address, output):
    # Export data to JSON file
    filename = f"{address}_forensic_report.json"
    with open(filename, "w") as file:
        json.dump(output, file, indent=4)
    logger.info(f"Forensic report saved as {filename}")

