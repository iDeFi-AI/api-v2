import asyncio
import os
import json
from collections import Counter
from api.tools.etherscanv2 import get_transaction_data, SUPPORTED_CHAINS
from api.tools.address_checker import load_flagged_data

# Path to flagged.json
FLAGGED_JSON_PATH = os.path.join(os.path.dirname(__file__), "unique", "flagged.json")

def categorize_chains_by_layer(chains):
    """
    Categorize chains into Layer 1 (L1) and Layer 2 (L2).
    """
    # Layer 1 chains
    layer_1_chains = {
        "ethereum",
        "sepolia",
        "holesky",
        "bsc",
        "polygon",
        "ftm",
        "snow",
        "base",
        "blast",
        "bttc",
        "celo",
        "cronos",
        "frax",
        "gnosis",
        "kroma",
        "mantle",
        "moonbeam",
        "moonriver",
        "opbnb",
        "wemix",
    }

    # Layer 2 chains
    layer_2_chains = {
        "arbitrum",
        "nova_arbitrum",
        "optimism",
        "zkEVM_polygon",
        "linea",
        "scroll",
        "taiko",
        "zksync",
        "xai",
    }

    l1_chains = set(chains).intersection(layer_1_chains)
    l2_chains = set(chains).intersection(layer_2_chains)

    return list(l1_chains), list(l2_chains)

async def fetch_transactions(wallet_address, chains):
    """
    Fetch transactions for a wallet across the specified chains.
    """
    return await get_transaction_data(wallet_address, chains)

def load_and_validate_flagged_data():
    """
    Load and clean flagged data from flagged.json.
    """
    flagged_data = load_flagged_data()
    if flagged_data is None:
        raise ValueError("Failed to load flagged.json")
    
    unique_addresses = set()
    for entry in flagged_data:
        grandparent = entry.get("grandparent")
        if grandparent:
            unique_addresses.add(grandparent.lower())

        parents = entry.get("parents", [])
        unique_addresses.update([p.lower() for p in parents])

        children = entry.get("children", {})
        for parent, child_list in children.items():
            unique_addresses.add(parent.lower())
            unique_addresses.update([c.lower() for c in child_list])
    
    return unique_addresses

def calculate_fraud_risk_summary(interacting_wallets, flagged_addresses):
    """
    Summarize fraud risk by counting Low, Moderate, High-risk wallets and cross-reference flagged addresses.
    """
    risk_summary = {"Low": 0, "Moderate": 0, "High": 0, "Flagged": 0}
    for wallet, count in interacting_wallets.items():
        if wallet in flagged_addresses:
            risk_summary["Flagged"] += 1
        elif count > 100:
            risk_summary["Low"] += 1
        elif count > 20:
            risk_summary["Moderate"] += 1
        else:
            risk_summary["High"] += 1
    return risk_summary

async def calculate_metrics(wallet_address, chains=None):
    """
    Fetch transaction data and calculate metrics for a wallet with L1/L2 breakdowns and fraud risk analysis.
    """
    if not wallet_address:
        raise ValueError("Wallet address is required.")

    chains = chains or SUPPORTED_CHAINS.keys()
    l1_chains, l2_chains = categorize_chains_by_layer(chains)

    # Load flagged addresses for fraud risk analysis
    flagged_addresses = load_and_validate_flagged_data()

    transaction_results = await fetch_transactions(wallet_address, chains)
    interacting_wallets = Counter()
    transactions_by_chain = {}
    transactions_by_layer = {"Layer1": 0, "Layer2": 0}
    total_transactions = 0

    for chain_data in transaction_results:
        chain_name = chain_data.get("chain", "Unknown")
        transactions = chain_data.get("transactions", [])
        transaction_count = len(transactions)

        transactions_by_chain[chain_name] = transaction_count
        total_transactions += transaction_count

        # Categorize transactions by Layer 1 or Layer 2
        if chain_name in l1_chains:
            transactions_by_layer["Layer1"] += transaction_count
        elif chain_name in l2_chains:
            transactions_by_layer["Layer2"] += transaction_count

        for tx in transactions:
            to_address = tx.get("to")
            if to_address:
                interacting_wallets[to_address.lower()] += 1

    fraud_risk_summary = calculate_fraud_risk_summary(interacting_wallets, flagged_addresses)
    inter_txn_total = sum(interacting_wallets.values())
    most_active_wallet = interacting_wallets.most_common(1)[0] if interacting_wallets else ("None", 0)

    return {
        "wallet_address": wallet_address,
        "financialMetrics": {
            "totalTransactions": total_transactions,
            "transactionsByChain": transactions_by_chain,
            "transactionsByLayer": transactions_by_layer,
            "interactingWallets": len(interacting_wallets),
            "interactingWalletTransactions": inter_txn_total,
            "mostActiveWallet": {
                "address": most_active_wallet[0],
                "transactionCount": most_active_wallet[1],
            },
            "fraudRiskSummary": fraud_risk_summary,
        },
    }

def generate_metrics(wallet_address, chains=None):
    """
    Wrapper function to calculate metrics synchronously for integration with full_report.py.
    """
    return asyncio.run(calculate_metrics(wallet_address, chains))

if __name__ == "__main__":
    # For standalone testing
    wallet_address = "0xYourWalletAddressHere"
    chains = ["ethereum", "polygon", "arbitrum", "optimism"]
    metrics = generate_metrics(wallet_address, chains)
    print(json.dumps(metrics, indent=4))
