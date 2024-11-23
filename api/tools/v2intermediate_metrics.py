from api.tools.v1basic_metrics import fetch_transactions, calculate_metrics

# Generate security alerts
def generate_security_alerts(transactions, flagged_addresses):
    alerts = []
    for tx in transactions:
        if tx['to'].lower() in flagged_addresses or tx['from'].lower() in flagged_addresses:
            alerts.append(f"High-risk transaction detected: {tx['hash']}")
    return alerts

# Portfolio health score
def calculate_portfolio_health_score(asset_allocation, risk_score):
    diversification = len(asset_allocation.keys())
    health_score = diversification * 10 - risk_score
    return max(0, min(100, health_score))

# Tax implications
def calculate_tax_implications(transactions):
    purchase_history = []
    capital_gains = 0.0
    tax_rate = 0.25  # Example tax rate

    for tx in transactions:
        if tx['to'].lower() == tx['address'].lower():
            purchase_history.append({
                'amount': float(tx['value']) / 1e18,
                'price': 2000.0
            })
        elif tx['from'].lower() == tx['address'].lower():
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
    return capital_gains * tax_rate
