import logging
from datetime import datetime
from api.etherscanv2 import get_etherscan_v2_details

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

# Calculate metrics
def calculate_metrics(address, transactions, token_transfers):
    metrics = {}
    eth_sent = sum(float(tx['value']) for tx in transactions if tx['from'].lower() == address.lower())
    eth_received = sum(float(tx['value']) for tx in transactions if tx['to'].lower() == address.lower())
    avg_gas_price = (
        sum(float(tx['gasPrice']) for tx in transactions) / len(transactions)
        if transactions else 0
    )
    
    metrics['Total ETH Sent'] = eth_sent / 1e18
    metrics['Total ETH Received'] = eth_received / 1e18
    metrics['Average Gas Price (Gwei)'] = avg_gas_price / 1e9
    
    token_counts = {}
    for tx in token_transfers:
        token_symbol = tx.get('tokenSymbol', 'UNKNOWN')
        token_counts[token_symbol] = token_counts.get(token_symbol, 0) + 1

    metrics['Token Transfers'] = token_counts
    return metrics

# Calculate capital gains
def calculate_capital_gains(address, transactions):
    purchase_history = []
    capital_gains = 0.0
    for tx in transactions:
        if tx['to'].lower() == address.lower():
            purchase_history.append({
                'date': datetime.fromtimestamp(int(tx['timeStamp'])),
                'amount': float(tx['value']) / 1e18,
                'price': 2000.0  # Example purchase price
            })
        elif tx['from'].lower() == address.lower():
            sale_amount = float(tx['value']) / 1e18
            sale_price = 3000.0  # Example sale price
            for purchase in purchase_history[:]:
                if sale_amount == 0:
                    break
                if purchase['amount'] <= sale_amount:
                    capital_gains += (sale_price - purchase['price']) * purchase['amount']
                    sale_amount -= purchase['amount']
                    purchase_history.remove(purchase)
                else:
                    capital_gains += (sale_price - purchase['price']) * sale_amount
                    purchase['amount'] -= sale_amount
                    sale_amount = 0
    return capital_gains

# Process data
def process_data(address, chain='ethereum'):
    transactions = fetch_transactions(address, chain)
    internal_transactions = fetch_internal_transactions(address, chain)
    token_transfers = fetch_token_transfers(address, chain)
    
    metrics = calculate_metrics(address, transactions, token_transfers)
    capital_gains = calculate_capital_gains(address, transactions)
    
    store_data(address, transactions, metrics, capital_gains)

# Store data (stub for integration with a database or caching system)
def store_data(address, transactions, metrics, capital_gains):
    # Implement storage logic, e.g., save to a database or update a cache
    logger.info(f"Storing data for {address}: Metrics={metrics}, Capital Gains={capital_gains}")

# Calculate activity score
def calculate_activity_score(data):
    transaction_count = len(data['transactions'])
    transaction_value_sum = sum(float(tx['value']) for tx in data['transactions'])
    activity_score = min(100, transaction_count + transaction_value_sum / 10)
    return activity_score

# Calculate risk scores
def calculate_risk_scores(data):
    return {
        "targeted_attacks": calculate_targeted_attack_risk(data),
        "dusting_attacks": calculate_dusting_attack_risk(data),
        "draining": calculate_draining_risk(data),
        "phishing": calculate_phishing_risk(data)
    }

def calculate_targeted_attack_risk(data):
    high_value_tx = sum(1 for tx in data['transactions'] if float(tx['value']) > 1)
    return min(100, high_value_tx * 5)

def calculate_dusting_attack_risk(data):
    dust_tx = sum(1 for tx in data['transactions'] if float(tx['value']) < 0.0001)
    return min(100, dust_tx * 10)

def calculate_draining_risk(data):
    total_outflow = sum(float(tx['value']) for tx in data['transactions'] if tx['from'] == data['address'])
    return min(100, total_outflow / 100)

def calculate_phishing_risk(data):
    failed_tx = sum(1 for tx in data['transactions'] if tx.get('status') == 'Failed')
    return min(100, failed_tx * 10)

# Calculate opportunity scores
def calculate_opportunity_scores(data):
    return {
        "investment": calculate_investment_opportunity(data),
        "staking": calculate_staking_opportunity(data),
        "tax_efficiency": calculate_tax_efficiency(data)
    }

def calculate_investment_opportunity(data):
    incoming_tx_value = sum(float(tx['value']) for tx in data['transactions'] if tx['to'] == data['address'])
    return min(100, incoming_tx_value / 1000)

def calculate_staking_opportunity(data):
    unique_stake_tx = len(set(tx['to'] for tx in data['transactions']))
    return min(100, unique_stake_tx * 2)

def calculate_tax_efficiency(data):
    regular_tx = sum(1 for tx in data['transactions'] if tx.get('description') == 'Regular transaction')
    return min(100, regular_tx * 2)

# Calculate trust scores
def calculate_trust_scores(data):
    return {
        "trusted_sources": calculate_trusted_sources(data),
        "trusted_recipients": calculate_trusted_recipients(data),
        "wallet_trust": calculate_wallet_trust(data)
    }

def calculate_trusted_sources(data):
    unique_sources = len(set(tx['from'] for tx in data['transactions'] if tx['to'] == data['address']))
    return min(100, unique_sources * 2)

def calculate_trusted_recipients(data):
    unique_recipients = len(set(tx['to'] for tx in data['transactions'] if tx['from'] == data['address']))
    return min(100, unique_recipients * 2)

def calculate_wallet_trust(data):
    trust_factor = len(data['transactions']) / 10
    return min(100, trust_factor * 2)

# Calculate volatility scores
def calculate_volatility_scores(data):
    return {
        "by_coin": calculate_volatility_by_coin(data),
        "by_wallet": calculate_volatility_by_wallet(data)
    }

def calculate_volatility_by_coin(data):
    values = [float(tx['value']) for tx in data['transactions']]
    return (max(values) - min(values)) / max(values) * 100 if values else 0

def calculate_volatility_by_wallet(data):
    tx_count = len(data['transactions'])
    tx_value_sum = sum(float(tx['value']) for tx in data['transactions'])
    return min(100, (tx_count / tx_value_sum) * 100 if tx_value_sum else 0)
