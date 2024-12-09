import openai
import os
import asyncio
import uuid
import logging
from firebase_admin import credentials, storage
import firebase_admin
import json
import base64

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

# External logo URL
EXTERNAL_LOGO_URL = "https://cdn.prod.website-files.com/631ee5b346419b93f92caf9a/631f8989dada7e625bfa2660_401_Website_Cover-01-01.jpg"

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
        return response["choices"][0]["message"]["content"]
    except Exception as e:
        raise RuntimeError(f"Error generating narrative: {e}")

def format_as_html_template(narrative, date):
    """
    Formats the narrative into a styled HTML template with an option to edit or copy content.
    """
    # Clean and format narrative text
    cleaned_narrative = (
        narrative.replace("### ", "<h3>")
                 .replace("## ", "<h2>")
                 .replace("#", "")  # Remove single hash artifacts
                 .replace("**", "<strong>")
                 .replace(" --- ", "<br><br>")
    )

    # Return the HTML template
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{
                font-family: Arial, sans-serif;
                background-color: #f9f9f9;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 900px;
                margin: 30px auto;
                padding: 20px;
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                text-align: center;
                margin-bottom: 20px;
            }}
            .logo {{
                height: 120px;
                border-radius: 12px;
            }}
            .content {{
                line-height: 1.8;
                color: #333;
                font-size: 16px;
            }}
            .content h1 {{
                text-align: center;
                color: #4a90e2;
                margin-bottom: 20px;
            }}
            .content h2 {{
                font-size: 20px;
                color: #333;
                margin-top: 20px;
                border-bottom: 2px solid #ddd;
                padding-bottom: 5px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }}
            .content h3 {{
                font-size: 18px;
                color: #555;
                margin-top: 15px;
            }}
            .content p {{
                margin: 10px 0;
                text-align: justify;
            }}
            .note {{
                background: #f1f8ff;
                padding: 8px 12px;
                border-left: 4px solid #007bff;
                border-radius: 8px;
                font-size: 14px;
                color: #333;
            }}
            .button-container {{
                display: flex;
                align-items: center;
                gap: 8px;
            }}
            .button {{
                background: #007bff;
                color: #fff;
                padding: 5px 10px;
                font-size: 14px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            }}
            .button:hover {{
                background: #0056b3;
            }}
            .footer {{
                text-align: center;
                margin-top: 20px;
                font-size: 14px;
                color: #555;
            }}
            a {{
                color: #4a90e2;
                text-decoration: none;
            }}
            a:hover {{
                text-decoration: underline;
            }}
        </style>
        <title>Financial Report</title>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://cdn.prod.website-files.com/631ee5b346419b93f92caf9a/631f8989dada7e625bfa2660_401_Website_Cover-01-01.jpg" alt="401 Financial Logo" class="logo">
                <h1>Financial Report</h1>
            </div>
            <div class="content">
                <p><strong>Date:</strong> {date}</p>
                <h2>
                    Report Narrative
                    <div class="button-container">
                        <span class="note">You can edit this content directly or copy it for further use.</span>
                        <button class="button" onclick="alert('Edit functionality coming soon!')">Edit</button>
                        <button class="button" onclick="navigator.clipboard.writeText(document.body.innerText)">Copy</button>
                    </div>
                </h2>
                {cleaned_narrative}
            </div>
            <div class="footer">
                <p>Generated by <strong>401 Financial</strong></p>
                <p><a href="https://api-v2.idefi.ai">Visit Our Platform</a></p>
            </div>
        </div>
    </body>
    </html>
    """

def upload_to_firebase(content, wallet_address):
    """
    Upload content to Firebase and return its public URL.

    Args:
        content (str): Content to upload.
        wallet_address (str): Ethereum wallet address for naming.

    Returns:
        str: Public URL of the uploaded file.
    """
    file_name = f"{wallet_address}_{uuid.uuid4().hex}.html"
    blob_path = f"narratives/{file_name}"
    blob = bucket.blob(blob_path)

    blob.upload_from_string(content, content_type="text/html")
    blob.make_public()

    logger.info(f"Uploaded {file_name} to Firebase: {blob.public_url}")
    return blob.public_url

def generate_narrative(metrics, date, wallet_address):
    """
    Generate a narrative, format it as HTML, and upload to Firebase.

    Returns:
        dict: URL for HTML narrative.
    """
    try:
        narrative = asyncio.run(generate_openai_narrative(metrics, date))
        full_html = format_as_html_template(narrative, date)
        html_url = upload_to_firebase(full_html, wallet_address)
        return {"html_url": html_url}
    except Exception as e:
        logger.error(f"Error generating narrative: {e}")
        raise RuntimeError(f"Error generating narrative: {e}")
