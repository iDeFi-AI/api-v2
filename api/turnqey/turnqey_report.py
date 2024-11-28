import json
import asyncio
import logging
from api.tools.address_checker import check_wallet_address, clean_and_validate_addresses
from api.tools.etherscanv2 import get_transaction_data
from api.tools.visualize_risk import visualize_risk

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

async def generate_turnqey_report(wallet_address, chain="ethereum"):
    """
    Generate a Turnqey Report using transaction data, flagged data, and risk analysis.

    Args:
        wallet_address (str): Wallet address to analyze.
        chain (str): Blockchain network.

    Returns:
        dict: Turnqey report.
    """
    try:
        if not wallet_address:
            raise ValueError("Wallet address is required.")

        # Validate the input wallet address
        wallet_address = clean_and_validate_addresses([wallet_address])
        if not wallet_address:
            raise ValueError("Invalid wallet address.")

        wallet_address = wallet_address[0]  # Extract the single cleaned address

        # Fetch transaction details from Etherscan
        transactions = await get_transaction_data(wallet_address, chain=chain)
        if not transactions:
            return {"error": "No transactions found for the given wallet address."}

        # Extract interacting wallets from transactions
        interacting_wallets = list(set(tx["to"] for tx in transactions if tx["to"] != wallet_address))

        # Analyze interacting wallets using address_checker
        wallet_analysis = check_wallet_address(interacting_wallets, chain=chain)

        # Categorize wallets based on their risk levels
        low_risk_wallets = [wa["address"] for wa in wallet_analysis if wa["status"] == "PASS"]
        moderate_risk_wallets = [wa["address"] for wa in wallet_analysis if wa["status"] == "WARNING"]
        high_risk_wallets = [wa["address"] for wa in wallet_analysis if wa["status"] == "FAIL"]

        # Recommendations based on risk analysis
        recommendations = []
        if len(moderate_risk_wallets) > 0:
            recommendations.append(
                {
                    "action": "monitor",
                    "wallets": moderate_risk_wallets[:2],  # Suggest first 2 wallets for monitoring
                }
            )

        # Transaction stats
        transaction_count = len(transactions)
        most_common_wallet = max(
            [tx["to"] for tx in transactions if tx["to"] != wallet_address],
            key=lambda w: sum(1 for tx in transactions if tx["to"] == w),
            default=None,
        )

        # Generate visual graph of wallet relationships
        graph_visualization = visualize_risk(wallet_address, chain=chain)
        if not graph_visualization:
            logger.warning(f"Graph visualization could not be generated for {wallet_address}.")
            graph_visualization = "Visualization not available."

        # Compile Turnqey report
        turnqey_report = {
            "wallet_address": wallet_address,
            "total_transactions": transaction_count,
            "total_interacting_wallets": len(interacting_wallets),
            "risk_analysis": {
                "low_risk_wallets": len(low_risk_wallets),
                "moderate_risk_wallets": len(moderate_risk_wallets),
                "high_risk_wallets": len(high_risk_wallets),
            },
            "recommendations": recommendations,
            "most_common_wallet": most_common_wallet,
            "risk_visualization": graph_visualization,  # Path to the generated graph
        }

        return turnqey_report

    except Exception as e:
        logger.error(f"Error generating Turnqey Report: {e}")
        return {"error": str(e)}
