import openai
import os
import asyncio
import uuid
import logging
from firebase_admin import credentials, storage
import firebase_admin
import json
import base64
import re

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
    Generate a professional wallet activity report narrative based on metrics.
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
        Generate a professional advisor based email wallet activity report based on the following metrics:
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
                {"role": "system", "content": "You are a professional financial advisor creating wallet activity reports."},
                {"role": "user", "content": prompt.strip()},
            ],
        )
        return response["choices"][0]["message"]["content"]
    except Exception as e:
        raise RuntimeError(f"Error generating narrative: {e}")


def format_as_html_template(narrative, date, wallet_address):
    """
    Formats the narrative into a styled HTML template with:
    - Proper title placement in the header
    - Clean and professional styling
    """
    # Convert Markdown-style syntax to proper HTML
    def parse_markdown(text):
        text = re.sub(r"### (.+)", r"<h3>\1</h3>", text)  # H3
        text = re.sub(r"## (.+)", r"<h2>\1</h2>", text)   # H2
        text = re.sub(r"# (.+)", r"<h1>\1</h1>", text)    # H1
        text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)  # Bold
        text = re.sub(r"^- (.+)", r"<p>- \1</p>", text, flags=re.MULTILINE)  # Lists
        text = re.sub(r"\n(?!<(h[1-3]|strong|p))", r"<p>", text)  # Newlines to <p>
        return text

    cleaned_narrative = parse_markdown(narrative)

    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
            body {{
                font-family: 'Roboto', Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
                color: #333;
            }}
            .container {{
                max-width: 900px;
                margin: 40px auto;
                background: #fff;
                border-radius: 12px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }}
            .header {{
                position: relative;
                color: white;
                text-align: center;
                background: linear-gradient(135deg, #6600ff, #8e24aa);
                background-image: url('{EXTERNAL_LOGO_URL}');
                background-size: cover;
                background-position: center;
                padding: 80px 20px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
            }}
            .header h1 {{
                font-size: 32px;
                font-weight: 700;
                margin: 0;
                background-color: rgba(0, 0, 0, 0.6);
                padding: 10px 20px;
                border-radius: 8px;
            }}
            .content {{
                padding: 20px;
            }}
            h1 {{
                font-size: 24px;
                font-weight: bold;
                color: #6600ff;
                margin: 0;
                color: #6600ff;
            }}
            h2 {{
                font-size: 20px;
                color: #8e24aa;
                margin-top: 20px;
                border-bottom: 2px solid #e9ecef;
                padding-bottom: 5px;
            }}
            h3 {{
                font-size: 18px;
                color: #495057;
                margin-top: 15px;
            }}
            p {{
                margin-bottom: 15px;
                text-align: justify;
                font-size: 16px;
                line-height: 1.6;
            }}
            strong {{
                font-weight: bold;
                color: #000;
            }}
            .button-container {{
                text-align: right;
                margin-bottom: 10px;
            }}
            .title-container {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin: 20px 0;
                padding: 0 20px;
                border-bottom: 1px solid #e9ecef;
            }}
            .title-container h1 {{
                font-size: 24px;
                font-weight: bold;
                color: #6600ff;
                margin: 0;
            }}
            .button {{
                background: #6600ff;
                color: white;
                border: none;
                padding: 8px 15px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                transition: background 0.3s;
                margin-left: 10px;
            }}
            .button:hover {{
                background: #4a148c;
            }}
            .editable {{
                font-size: 16px;
                line-height: 1.6;
                padding: 10px;
                border: 1px solid transparent;
                background: #f9f9f9;
                border-radius: 5px;
                outline: none;
                transition: border 0.3s, background 0.3s;
            }}
            .editable[contenteditable="true"] {{
                border: 1px solid #6600ff;
                background: #fff;
            }}
            .footer {{
                text-align: center;
                padding: 10px;
                font-size: 14px;
                background-color: #f8f8f8;
                color: #555;
                border-top: 1px solid #e9ecef;
            }}
        </style>
        <title>Wallet Activity Report</title>
    </head>
    <body>
        <div class="container">
            <div class="header">
            </div>
            <div class="content">
                <p><strong>Date:</strong> {date}</p>
                <p><strong>Wallet Address:</strong> {wallet_address}</p>
                        
                <!-- Title and Buttons -->
                <div class="title-container">
                    <h1 class="title">Wallet Activity Report</h1>
                    <div class="button-container">
                        <button id="editButton" class="button" onclick="enableEditing()">Edit</button>
                        <button id="saveButton" class="button" style="display: none;" onclick="saveChanges()">Save</button>
                        <button id="copyButton" class="button" onclick="copyContent()">Copy</button>
                    </div>
                </div>
                
                <div id="reportContent" contenteditable="false" class="editable">
                    {cleaned_narrative}
                </div>
            </div>
            <div class="footer">
                <p>© 2024 401 Financial. All Rights Reserved.</p>
            </div>
        </div>
        <script>
            function enableEditing() {{
                const reportContent = document.getElementById('reportContent');
                const saveButton = document.getElementById('saveButton');
                const editButton = document.getElementById('editButton');
                reportContent.contentEditable = "true";
                reportContent.style.border = "1px solid #6600ff";
                reportContent.style.background = "#fff";
                saveButton.style.display = "inline-block";
                editButton.style.display = "none";
            }}

            function saveChanges() {{
                const reportContent = document.getElementById('reportContent');
                const saveButton = document.getElementById('saveButton');
                const editButton = document.getElementById('editButton');
                reportContent.contentEditable = "false";
                reportContent.style.border = "none";
                reportContent.style.background = "none";
                saveButton.style.display = "none";
                editButton.style.display = "inline-block";
                alert('Changes saved!');
            }}

            function copyContent() {{
                const reportContent = document.getElementById('reportContent').innerText;
                navigator.clipboard.writeText(reportContent).then(() => {{
                    alert('Content copied to clipboard!');
                }}).catch(err => {{
                    console.error('Failed to copy: ', err);
                }});
            }}
        </script>
    </body>
    </html>
    """

def upload_to_firebase(content, wallet_address):
    file_name = f"{wallet_address}_{uuid.uuid4().hex}.html"
    blob_path = f"narratives/{file_name}"
    blob = bucket.blob(blob_path)

    blob.upload_from_string(content, content_type="text/html")
    blob.make_public()

    logger.info(f"Uploaded {file_name} to Firebase: {blob.public_url}")
    return blob.public_url

def generate_narrative(metrics, date, wallet_address):
    try:
        narrative = asyncio.run(generate_openai_narrative(metrics, date))
        full_html = format_as_html_template(narrative, date, wallet_address)
        html_url = upload_to_firebase(full_html, wallet_address)
        return {"html_url": html_url}
    except Exception as e:
        logger.error(f"Error generating narrative: {e}")
        raise RuntimeError(f"Error generating narrative: {e}")
