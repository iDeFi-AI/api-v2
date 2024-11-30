import json
import asyncio
import logging
import os
import base64
from tqdm.asyncio import tqdm
from pyvis.network import Network
import firebase_admin
from firebase_admin import credentials, storage, initialize_app, get_app
from io import BytesIO
from collections import Counter
from datetime import datetime
from api.tools.etherscanv2 import get_transaction_data
import openai  # Import OpenAI

# Load environment variables
ETHERSCAN_API_KEY = os.getenv("NEXT_PUBLIC_ETHERSCAN_API_KEY")
FIREBASE_SERVICE_ACCOUNT_KEY = os.getenv("NEXT_PUBLIC_FIREBASE_SERVICE_ACCOUNT_KEY")
OPENAI_API_KEY = os.getenv("NEXT_PUBLIC_OPENAI_API_KEY")

if not ETHERSCAN_API_KEY:
    raise ValueError("Missing Etherscan API Key (NEXT_PUBLIC_ETHERSCAN_API_KEY)")

if not FIREBASE_SERVICE_ACCOUNT_KEY:
    raise ValueError("Missing Firebase service account key (NEXT_PUBLIC_FIREBASE_SERVICE_ACCOUNT_KEY)")

if not OPENAI_API_KEY:
    raise ValueError("Missing OpenAI API Key (OPENAI_API_KEY)")

openai.api_key = OPENAI_API_KEY

FIREBASE_BUCKET_NAME = "api-v2-idefi-ai.firebasestorage.app"

# Retry and timeout configurations
MAX_RETRIES = 3
RATE_LIMIT_DELAY = 3.0  # Delay between API requests in seconds

# Logging configuration
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Firebase
def initialize_firebase(app_name="turnqey"):
    try:
        firebase_service_account_key = base64.b64decode(FIREBASE_SERVICE_ACCOUNT_KEY).decode("utf-8")
        firebase_cred = credentials.Certificate(json.loads(firebase_service_account_key))

        if app_name in [app.name for app in firebase_admin._apps.values()]:
            logger.info(f"Firebase app '{app_name}' already initialized.")
            firebase_app = get_app(app_name)
        else:
            firebase_app = initialize_app(firebase_cred, {"storageBucket": FIREBASE_BUCKET_NAME}, name=app_name)
            logger.info(f"Firebase app '{app_name}' initialized successfully.")

        return storage.bucket(app=firebase_app)
    except Exception as e:
        logger.error(f"Error initializing Firebase: {e}")
        raise

bucket = initialize_firebase()

async def fetch_transaction_data_with_retries(wallet_address, progress_bar=None):
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            logger.info(f"Fetching transaction data for {wallet_address} (Attempt {attempt}/{MAX_RETRIES})...")
            data = await get_transaction_data(wallet_address)
            if progress_bar:
                progress_bar.update(1)
            return data
        except Exception as e:
            logger.error(f"Error fetching transaction data: {e}")
            if attempt == MAX_RETRIES:
                raise
            await asyncio.sleep(RATE_LIMIT_DELAY * 2 ** (attempt - 1))

def calculate_metrics(transaction_results, wallet_address):
    transactions_by_chain = {}
    total_transactions = 0
    interacting_wallets = Counter()
    inter_txn_total = 0

    for chain_data in transaction_results:
        chain_name = chain_data.get("chain_name", "Unknown")
        transactions = chain_data.get("transactions", [])
        transaction_count = len(transactions)

        transactions_by_chain[chain_name] = transaction_count
        total_transactions += transaction_count

        for tx in transactions:
            to_address = tx.get("to")
            interacting_wallets[to_address] += 1

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
        },
    }

async def generate_openai_narrative(metrics, date):
    prompt = f"""
Generate a professional financial report narrative based on the following wallet metrics:
Date: {date}
Wallet Address: {metrics['wallet_address']}
Total Transactions: {metrics['financialMetrics']['totalTransactions']}
Interacting Wallets: {metrics['financialMetrics']['interactingWallets']}
Interacting Wallet Transactions: {metrics['financialMetrics']['interactingWalletTransactions']}
Most Active Wallet: {metrics['financialMetrics']['mostActiveWallet']['address']} with {metrics['financialMetrics']['mostActiveWallet']['transactionCount']} transactions.
"""
    try:
        response = await openai.ChatCompletion.acreate(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a professional financial analyst generating client-friendly wallet reports."},
                {"role": "user", "content": prompt}
            ]
        )
        return response["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error(f"Error generating narrative with OpenAI: {e}")
        return "Unable to generate narrative at this time."

def upload_to_firebase(content, path, content_type):
    blob = bucket.blob(path)
    blob.upload_from_string(content, content_type=content_type)
    blob.make_public()
    logger.info(f"Uploaded file to Firebase: {path}")
    return blob.public_url

async def generate_turnqey_report(wallet_address):
    try:
        if not wallet_address:
            raise ValueError("Wallet address is required.")

        logger.info(f"Starting Turnqey report generation for wallet: {wallet_address}")

        with tqdm(total=2, desc="Generating Report", unit="step") as progress_bar:
            transaction_results = await fetch_transaction_data_with_retries(wallet_address, progress_bar)
            progress_bar.update(1)

            metrics = calculate_metrics(transaction_results, wallet_address)
            progress_bar.update(1)

        date = datetime.now().strftime("%m/%d/%Y")
        narrative = await generate_openai_narrative(metrics, date)

        report_blob_path = f"turnqey_reports/{wallet_address}.json"
        narrative_blob_path = f"turnqey_reports/{wallet_address}_narrative.txt"

        report_url = upload_to_firebase(json.dumps(metrics, indent=4), report_blob_path, "application/json")
        narrative_url = upload_to_firebase(narrative, narrative_blob_path, "text/plain")

        return {
            "report_url": report_url,
            "narrative_url": narrative_url,
        }

    except Exception as e:
        logger.error(f"Error generating Turnqey Report: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python turnqey_report.py <wallet_address>")
        sys.exit(1)

    wallet_address = sys.argv[1].strip()
    report = asyncio.run(generate_turnqey_report(wallet_address))
    print(json.dumps(report, indent=4))
