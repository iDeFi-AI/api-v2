from api.tools.v1basic_metrics import fetch_transactions
from api.tools.v2intermediate_metrics import calculate_tax_implications

# DeFi exposure analysis
def analyze_defi_exposure(transactions):
    defi_exposure = sum(
        float(tx['value']) / 1e18 for tx in transactions if "defi" in tx.get('input', '').lower()
    )
    return defi_exposure

# On-chain analytics
def perform_onchain_analysis(transactions):
    connections = {}
    for tx in transactions:
        from_addr = tx['from'].lower()
        to_addr = tx['to'].lower()
        connections.setdefault(from_addr, []).append(to_addr)
    return connections

# Tokenization insights
def analyze_tokenized_assets(transactions):
    tokenized_assets = [
        {
            'tokenSymbol': tx.get('tokenSymbol'),
            'tokenName': tx.get('tokenName'),
            'value': float(tx['value']) / 1e18
        }
        for tx in transactions if tx.get('tokenSymbol') and tx.get('tokenName')
    ]
    return tokenized_assets

# Generational wealth planning
def generate_wealth_plan(address, transactions):
    total_assets = sum(
        float(tx['value']) for tx in transactions if tx['to'].lower() == address.lower()
    ) / 1e18
    return {
        'address': address,
        'assets': total_assets,
        'recommendations': [
            "Consider creating a digital will",
            "Explore trust funds with smart contracts",
            "Set up inheritance using tokenized assets"
        ]
    }
