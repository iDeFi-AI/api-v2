import json
import asyncio
import logging
import os
import base64
from tqdm.asyncio import tqdm
from pyvis.network import Network
import firebase_admin
from firebase_admin import credentials, storage, initialize_app, get_app
from collections import Counter
from datetime import datetime, timedelta
from api.tools.etherscanv2 import get_transaction_data
import openai

# Load environment variables
ETHERSCAN_API_KEY = os.getenv("NEXT_PUBLIC_ETHERSCAN_API_KEY")
FIREBASE_SERVICE_ACCOUNT_KEY = os.getenv("NEXT_PUBLIC_FIREBASE_SERVICE_ACCOUNT_KEY")
OPENAI_API_KEY = os.getenv("NEXT_PUBLIC_OPENAI_API_KEY")

if not ETHERSCAN_API_KEY or not FIREBASE_SERVICE_ACCOUNT_KEY or not OPENAI_API_KEY:
    raise ValueError("Missing required API keys.")

openai.api_key = OPENAI_API_KEY
FIREBASE_BUCKET_NAME = "api-v2-idefi-ai.firebasestorage.app"

# Logging configuration
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Firebase
def initialize_firebase(app_name="turnqey"):
    try:
        firebase_service_account_key = base64.b64decode(FIREBASE_SERVICE_ACCOUNT_KEY).decode("utf-8")
        firebase_cred = credentials.Certificate(json.loads(firebase_service_account_key))
        if app_name in [app.name for app in firebase_admin._apps.values()]:
            firebase_app = get_app(app_name)
        else:
            firebase_app = initialize_app(firebase_cred, {"storageBucket": FIREBASE_BUCKET_NAME}, name=app_name)
        return storage.bucket(app=firebase_app)
    except Exception as e:
        logger.error(f"Error initializing Firebase: {e}")
        raise

bucket = initialize_firebase()

def calculate_fraud_risk(interacting_wallets):
    """Assign risk scores to interacting wallets (dummy logic for example)."""
    fraud_risk_scores = {}
    for wallet, count in interacting_wallets.items():
        if count > 100:
            fraud_risk_scores[wallet] = "Low"
        elif count > 20:
            fraud_risk_scores[wallet] = "Moderate"
        else:
            fraud_risk_scores[wallet] = "High"
    return fraud_risk_scores

def calculate_metrics(transaction_results, wallet_address):
    transactions_by_chain = {}
    total_transactions = 0
    interacting_wallets = Counter()

    for chain_data in transaction_results:
        chain_name = chain_data.get("chain", "Unknown")
        transactions = chain_data.get("transactions", [])
        transaction_count = len(transactions)

        transactions_by_chain[chain_name] = transaction_count
        total_transactions += transaction_count

        for tx in transactions:
            to_address = tx.get("to")
            interacting_wallets[to_address] += 1

    fraud_risk = calculate_fraud_risk(interacting_wallets)
    inter_txn_total = sum(interacting_wallets.values())
    most_active_wallet = interacting_wallets.most_common(1)[0] if interacting_wallets else ("None", 0)

    return {
        "wallet_address": wallet_address,
        "financialMetrics": {
            "totalTransactions": total_transactions,
            "transactionsByChain": transactions_by_chain,
            "interactingWallets": len(interacting_wallets),
            "interactingWalletTransactions": inter_txn_total,
            "mostActiveWallet": {
                "address": most_active_wallet[0],
                "transactionCount": most_active_wallet[1],
            },
            "fraudRiskScores": fraud_risk,
        },
    }

async def generate_openai_narrative(metrics, date):
    fraud_risk_summary = ", ".join(
        f"{wallet}: {risk}" for wallet, risk in metrics["financialMetrics"]["fraudRiskScores"].items()
    )
    prompt = f"""
        Generate a professional financial advisor basedreport narrative based on the following wallet metrics:
        Date: {date}
        Wallet Address: {metrics['wallet_address']}
        Total Transactions: {metrics['financialMetrics']['totalTransactions']}
        Interacting Wallets: {metrics['financialMetrics']['interactingWallets']}
        Interacting Wallet Transactions: {metrics['financialMetrics']['interactingWalletTransactions']}
        Most Active Wallet: {metrics['financialMetrics']['mostActiveWallet']['address']} with {metrics['financialMetrics']['mostActiveWallet']['transactionCount']} transactions.
        Fraud Risk Summary: {fraud_risk_summary}.
        """
    try:
        response = await openai.ChatCompletion.acreate(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a professional financial advisor working generating wallet reports on behalf of the client."},
                {"role": "user", "content": prompt},
            ],
        )
        return response["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error(f"Error generating narrative with OpenAI: {e}")
        return "Unable to generate narrative at this time."

async def visualize_relationships(wallet_address, transaction_results):
    """
    Generates a network visualization for wallet relationships with enhanced styling, key map, and tagging.
    """
    try:
        # Initialize the network visualization
        net = Network(height="1200px", width="100%", bgcolor="#222222", font_color="white")
        net.set_options("""{
          "physics": {
            "solver": "forceAtlas2Based"
          },
          "interaction": {
            "tooltipDelay": 200
          },
          "edges": {
            "color": {
              "inherit": "both"
            },
            "smooth": {
              "enabled": true,
              "type": "dynamic"
            }
          },
          "nodes": {
            "font": {
              "size": 12,
              "color": "white"
            }
          }
        }""")

        # Track correlation for tagging
        wallet_correlation = Counter()

        # Add nodes and edges
        for chain_data in transaction_results:
            transactions = chain_data.get("transactions", [])
            for tx in transactions:
                from_addr = tx.get("from")
                to_addr = tx.get("to")
                value = tx.get("value_ether", 0)

                # Update correlation counter
                wallet_correlation[to_addr] += 1

                # Main wallet node
                if from_addr == wallet_address:
                    net.add_node(
                        from_addr,
                        title=f"Main Wallet\nAddress: {from_addr}",
                        color="#FF5733",  # Distinct color for the main wallet
                        size=20,
                        shape="star",
                    )
                else:
                    net.add_node(
                        from_addr,
                        title=f"Interacting Wallet\nAddress: {from_addr}",
                        color="#33FF57",  # Green for interacting wallets
                        size=15,
                    )

                # Add destination wallet node
                net.add_node(
                    to_addr,
                    title=f"Interacting Wallet\nAddress: {to_addr}",
                    color="#33FF57",
                    size=15,
                )

                # Add edge with transaction value
                net.add_edge(
                    from_addr,
                    to_addr,
                    title=f"Value: {value} ETH",
                    color="#3380FF" if value > 0 else "#AAAAAA",  # Blue for significant transactions
                    width=2 if value > 0 else 1,  # Thicker for higher values
                )

        # Highlight most correlated wallets
        for wallet, count in wallet_correlation.most_common(5):  # Top 5 most correlated
            net.add_node(
                wallet,
                title=f"Highly Correlated Wallet\nAddress: {wallet}\nCorrelation Count: {count}",
                color="#FFFF33",  # Yellow for highly correlated wallets
                size=25,
            )

        # Generate the visualization HTML file
        output_file = f"{wallet_address}_visualization.html"
        net.save_graph(output_file)

        # Embed a legend in the HTML
        with open(output_file, "r+") as html_file:
            content = html_file.read()
            legend_html = """
            <div style="position: absolute; top: 10px; right: 10px; background-color: #333; color: white; padding: 10px; border-radius: 5px;">
                <h3>Legend</h3>
                <ul style="list-style: none; padding: 0;">
                    <li><span style="color: #FF5733;">&#9733;</span> Main Wallet</li>
                    <li><span style="color: #33FF57;">&#9679;</span> Interacting Wallets</li>
                    <li><span style="color: #FFFF33;">&#9733;</span> Highly Correlated Wallets</li>
                    <li><span style="color: #3380FF;">&#8212;</span> Significant Transactions</li>
                    <li><span style="color: #AAAAAA;">&#8212;</span> Other Transactions</li>
                </ul>
            </div>
            """
            content = content.replace("<body>", f"<body>{legend_html}")
            html_file.seek(0)
            html_file.write(content)

        # Upload the file to Firebase
        blob_path = f"visualizations/{wallet_address}.html"
        with open(output_file, "rb") as f:
            blob = bucket.blob(blob_path)
            blob.upload_from_file(f, content_type="text/html")
        logger.info(f"Uploaded visualization to Firebase: {blob_path}")

        return blob.generate_signed_url(expiration=timedelta(hours=1))
    except Exception as e:
        logger.error(f"Error generating visualization: {e}")
        return None

async def generate_turnqey_report(wallet_address):
    try:
        if not wallet_address:
            raise ValueError("Wallet address is required.")

        logger.info(f"Starting Turnqey report generation for wallet: {wallet_address}")

        with tqdm(total=3, desc="Generating Report", unit="step") as progress_bar:
            # Fetch transaction data
            transaction_results = await get_transaction_data(wallet_address)
            progress_bar.update(1)

            # Calculate metrics
            metrics = calculate_metrics(transaction_results, wallet_address)
            progress_bar.update(1)

            # Generate the narrative
            date = datetime.now().strftime("%Y-%m-%d")
            narrative = await generate_openai_narrative(metrics, date)

            # Generate visualization
            visualization_url = await visualize_relationships(wallet_address, transaction_results)
            progress_bar.update(1)

            # Upload metrics report to Firebase
            metrics_blob_path = f"turnqey_reports/{wallet_address}_metrics.json"
            metrics_url = upload_to_firebase(
                content=json.dumps(metrics, indent=4),
                path=metrics_blob_path,
                content_type="application/json"
            )

            # Upload narrative report to Firebase
            narrative_blob_path = f"turnqey_reports/{wallet_address}_narrative.txt"
            narrative_url = upload_to_firebase(
                content=narrative,
                path=narrative_blob_path,
                content_type="text/plain"
            )

        return {
            "date": date,
            "wallet_address": wallet_address,
            "metrics_url": metrics_url,
            "narrative_url": narrative_url,
            "visualization_url": visualization_url,
        }
    except Exception as e:
        logger.error(f"Error generating Turnqey Report: {e}")
        return {"error": str(e)}

def upload_to_firebase(content, path, content_type):
    """
    Uploads a file to Firebase and returns its public URL.
    """
    try:
        blob = bucket.blob(path)
        blob.upload_from_string(content, content_type=content_type)
        blob.make_public()
        logger.info(f"Uploaded file to Firebase: {path}")
        return blob.public_url
    except Exception as e:
        logger.error(f"Error uploading to Firebase: {e}")
        raise

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python turnqey_report.py <wallet_address>")
        sys.exit(1)

    wallet_address = sys.argv[1].strip()
    report = asyncio.run(generate_turnqey_report(wallet_address))
    print(json.dumps(report, indent=4))
