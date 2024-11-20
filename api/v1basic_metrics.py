import os
from api.etherscanv2 import get_etherscan_v2_details

# Fetch transactions using Etherscan V2
def fetch_transactions(address, chain='ethereum'):
    response = get_etherscan_v2_details(address, chain=chain, module="account", action="txlist")
    return response.get('transactions', [])

# Fetch token transfers using Etherscan V2
def fetch_token_transfers(address, chain='ethereum'):
    response = get_etherscan_v2_details(address, chain=chain, module="account", action="tokentx")
    return response.get('result', [])

# Calculate basic metrics
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

# Simplified capital gains calculation
def calculate_capital_gains(address, transactions):
    purchase_history = []
    capital_gains = 0.0
    for tx in transactions:
        if tx['to'].lower() == address.lower():
            purchase_history.append({
                'amount': float(tx['value']) / 1e18,
                'price': 2000.0
            })
        elif tx['from'].lower() == address.lower():
            sale_amount = float(tx['value']) / 1e18
            for purchase in purchase_history[:]:
                if sale_amount == 0:
                    break
                if purchase['amount'] <= sale_amount:
                    capital_gains += (3000.0 - purchase['price']) * purchase['amount']
                    sale_amount -= purchase['amount']
                    purchase_history.remove(purchase)
                else:
                    capital_gains += (3000.0 - purchase['price']) * sale_amount
                    purchase['amount'] -= sale_amount
                    sale_amount = 0
    return capital_gains

# Aggregate data processing
def process_data(address, chain='ethereum'):
    transactions = fetch_transactions(address, chain)
    token_transfers = fetch_token_transfers(address, chain)
    metrics = calculate_metrics(address, transactions, token_transfers)
    capital_gains = calculate_capital_gains(address, transactions)
    return {
        'metrics': metrics,
        'capital_gains': capital_gains
    }
