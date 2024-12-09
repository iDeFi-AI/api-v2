import openai
import os
import asyncio
import uuid
import logging
import base64
from firebase_admin import credentials, storage
import firebase_admin
import json

# Logging configuration
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Initialize OpenAI API Key
openai.api_key = os.getenv("NEXT_PUBLIC_OPENAI_API_KEY")
if not openai.api_key:
    raise ValueError("NEXT_PUBLIC_OPENAI_API_KEY environment variable is missing.")

# Firebase initialization
def initialize_firebase(app_name="narrative_service"):
    """Initializes Firebase Admin SDK."""
    if app_name not in firebase_admin._apps:
        firebase_service_account_key_base64 = os.getenv("NEXT_PUBLIC_FIREBASE_SERVICE_ACCOUNT_KEY")
        if not firebase_service_account_key_base64:
            raise ValueError("Missing Firebase service account key environment variable.")

        try:
            firebase_service_account_key_bytes = base64.b64decode(firebase_service_account_key_base64)
            firebase_service_account_key_str = firebase_service_account_key_bytes.decode("utf-8")
            firebase_service_account_key_dict = json.loads(firebase_service_account_key_str)

            if firebase_service_account_key_dict.get("type") != "service_account":
                raise ValueError("Invalid service account certificate.")

            cred = credentials.Certificate(firebase_service_account_key_dict)
            firebase_admin.initialize_app(
                cred,
                {"storageBucket": "api-v2-idefi-ai.firebasestorage.app"},
                name=app_name,
            )
        except Exception as e:
            raise ValueError(f"Error initializing Firebase: {e}")

    return storage.bucket(app=firebase_admin.get_app(app_name))

# Initialize Firebase bucket
try:
    bucket = initialize_firebase()
except ValueError as e:
    logger.error(f"Firebase initialization failed: {e}")
    raise

async def generate_openai_narrative(metrics, date):
    """
    Generate a professional financial report narrative based on wallet metrics.
    """
    if not metrics or not date:
        raise ValueError("Metrics and date are required.")

    fraud_risk_summary = f"""
        Low Risk Wallets: {metrics['financialMetrics']['fraudRiskSummary']['Low']},
        Moderate Risk Wallets: {metrics['financialMetrics']['fraudRiskSummary']['Moderate']},
        High Risk Wallets: {metrics['financialMetrics']['fraudRiskSummary']['High']},
        Flagged Wallets: {metrics['financialMetrics']['fraudRiskSummary']['Flagged']}
    """

    prompt = f"""
        Generate a professional financial report narrative based on the following wallet metrics:
        Date: {date}
        Wallet Address: {metrics['wallet_address']}
        Total Transactions: {metrics['financialMetrics']['totalTransactions']}
        Transactions by Layer: Layer 1 - {metrics['financialMetrics']['transactionsByLayer']['Layer1']}, 
                               Layer 2 - {metrics['financialMetrics']['transactionsByLayer']['Layer2']}
        Interacting Wallets: {metrics['financialMetrics']['interactingWallets']}
        Total Transactions with Interacting Wallets: {metrics['financialMetrics']['interactingWalletTransactions']}
        Most Active Wallet: {metrics['financialMetrics']['mostActiveWallet']['address']} 
                            with {metrics['financialMetrics']['mostActiveWallet']['transactionCount']} transactions.
        Fraud Risk Summary: {fraud_risk_summary}.
    """
    try:
        response = await openai.ChatCompletion.acreate(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a professional financial advisor creating wallet reports."},
                {"role": "user", "content": prompt.strip()},
            ],
        )
        narrative = response["choices"][0]["message"]["content"]
        return format_as_html_template(narrative, date)
    except Exception as e:
        raise RuntimeError(f"Error generating narrative: {e}")

def format_as_html_template(narrative, date):
    """
    Formats the narrative into an HTML template with a logo.
    """
    logo_path = "/public/financial.jpg"  # Adjust path as necessary to match your backend/frontend structure
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 20px;
            }}
            .header {{
                display: flex;
                align-items: center;
                border-bottom: 2px solid #ccc;
                padding-bottom: 10px;
                margin-bottom: 20px;
            }}
            .logo {{
                height: 50px;
                margin-right: 20px;
            }}
            .content {{
                margin: 20px 0;
            }}
            .footer {{
                border-top: 2px solid #ccc;
                padding-top: 10px;
                margin-top: 20px;
                font-size: 0.9em;
                text-align: center;
                color: #555;
            }}
        </style>
        <title>Financial Report</title>
    </head>
    <body>
        <div class="header">
            <img src="{logo_path}" alt="Company Logo" class="logo">
            <h1>Financial Report</h1>
        </div>
        <p><strong>Date:</strong> {date}</p>
        <div class="content">
            {narrative}
        </div>
        <div class="footer">
            <p>Thank you,</p>
            <p><strong>401 Financial</strong></p>
        </div>
    </body>
    </html>
    """

def save_narrative_as_html(html_content, wallet_address):
    """Save the narrative HTML content to a file."""
    output_dir = os.path.join("data", "narratives")
    os.makedirs(output_dir, exist_ok=True)
    file_name = f"{wallet_address}_{uuid.uuid4().hex}.html"
    file_path = os.path.join(output_dir, file_name)

    with open(file_path, "w", encoding="utf-8") as file:
        file.write(html_content)

    return file_path

def upload_to_firebase(file_path, wallet_address):
    """Upload the narrative HTML file to Firebase and return the public URL."""
    blob_path = f"narratives/{wallet_address}_{os.path.basename(file_path)}"
    blob = bucket.blob(blob_path)

    with open(file_path, "rb") as file:
        blob.upload_from_file(file, content_type="text/html")
    blob.make_public()

    return blob.public_url

def generate_narrative(metrics, date, wallet_address, upload_to_cloud=True):
    """
    Generate a narrative, save it as HTML, and optionally upload it to Firebase.
    """
    try:
        html_content = asyncio.run(generate_openai_narrative(metrics, date))
        local_path = save_narrative_as_html(html_content, wallet_address)

        if upload_to_cloud:
            public_url = upload_to_firebase(local_path, wallet_address)
            os.remove(local_path)  # Cleanup local file
            return {"html_url": public_url}
        else:
            return {"html_path": local_path}

    except Exception as e:
        logger.error(f"Error generating narrative: {e}")
        raise RuntimeError(f"Error generating narrative: {e}")
