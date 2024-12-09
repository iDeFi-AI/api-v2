import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import datetime
import logging
import base64
import json
import asyncio
from flask import Flask, request, jsonify, make_response
import firebase_admin
from firebase_admin import credentials, db, auth, storage
from dotenv import load_dotenv
from flask_cors import CORS

# Importing Turnqey modules
from api.turnqey.metrics import calculate_metrics
from api.turnqey.narrative import generate_narrative
from api.turnqey.origins import process_addresses_async
from api.turnqey.visualize import create_visualization
from api.turnqey.full_report import generate_turnqey_report

# Importing additional tools and utilities
from api.firebase_auth import firebase_auth_middleware
from api.api_health import calculate_health
from api.tools.etherscanv2 import is_valid_ethereum_address
from api.tools.address_checker import (
    load_flagged_data,
    check_wallet_address,
    clean_and_validate_addresses,
)

# Load environment variables
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
dotenv_path = os.path.join(ROOT_DIR, '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    raise FileNotFoundError(f".env file not found at: {dotenv_path}")

# Define the directory for mapped_addresses if used
MAPPED_ADDRESSES_DIR = os.path.join(ROOT_DIR, 'mapped_addresses')
os.makedirs(MAPPED_ADDRESSES_DIR, exist_ok=True)

# Flask app setup
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["https://turnqey.xyz", "*"]}})

# Logging configuration
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Firebase initialization
firebase_service_account_key_base64 = os.getenv('NEXT_PUBLIC_FIREBASE_SERVICE_ACCOUNT_KEY')
if not firebase_service_account_key_base64:
    raise ValueError("Missing Firebase service account key environment variable")

firebase_service_account_key_bytes = base64.b64decode(firebase_service_account_key_base64)
firebase_service_account_key_str = firebase_service_account_key_bytes.decode('utf-8')
firebase_service_account_key_dict = json.loads(firebase_service_account_key_str)

try:
    cred = credentials.Certificate(firebase_service_account_key_dict)
    firebase_admin.initialize_app(
        cred,
        {
            'databaseURL': 'https://api-v2-idefi-ai-default-rtdb.firebaseio.com/',
            'storageBucket': 'api-v2-idefi-ai.firebasestorage.app',
        },
    )
    logger.info("Firebase Admin SDK initialized successfully.")
except Exception as e:
    logger.error(f"Firebase Initialization Error: {e}")
    raise

bucket = storage.bucket()

# Helper for async function execution
def run_async(func, *args, **kwargs):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    return loop.run_until_complete(func(*args, **kwargs))

@app.route("/api/health", methods=["GET"])
def health_check():
    """
    Returns the health status of the API and its endpoints.
    """
    try:
        health_overrides = {
            "/api/health": {"status": "Online", "message": "Health check passed."},
            "/api/get_flagged_addresses": {"status": "Online", "message": "Endpoint is Functional"},
            "/api/checkaddress": {"status": "Migrating", "message": "Undergoing Data Migration. Analyzer Frontend Tool Unavailable"},
            "/api/origins": {"status": "Degraded", "message": "Undergoing Updates"},
            "/api/full_report": {"status": "Degraded", "message": "Undergoing Updates. Not Available"},
        }

        health_status = calculate_health(health_overrides)
        return jsonify(health_status), 200
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            "overall_status": "Error",
            "message": f"Health check failed: {str(e)}",
            "endpoints": []
        }), 500


@app.route('/api/list_json_files', methods=['GET'])
def list_json_files():
    try:
        json_files = [f for f in os.listdir(MAPPED_ADDRESSES_DIR) if f.endswith('.json')]
        return jsonify({'files': json_files}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/validate_user', methods=['POST'])
def validate_user():
    """
    Validates the Firebase user by their ID token (passed in the request body).
    """
    try:
        data = request.json
        id_token = data.get('idToken')

        if not id_token:
            return jsonify({'error': 'ID token is required'}), 400

        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token.get('uid')

        if not uid:
            return jsonify({'error': 'UID not found in token'}), 400

        user_record = auth.get_user(uid)
        return jsonify({
            'uid': user_record.uid,
            'email': user_record.email,
            'email_verified': user_record.email_verified
        }), 200

    except Exception as e:
        return jsonify({'error': 'User validation failed', 'details': str(e)}), 401


@app.route('/api/metrics', methods=['POST'])
@firebase_auth_middleware
def metrics_endpoint():
    try:
        data = request.json
        wallet_address = data.get('wallet_address')
        if not wallet_address:
            return jsonify({"error": "Wallet address is required."}), 400
        metrics = run_async(calculate_metrics, wallet_address)
        return jsonify(metrics), 200
    except Exception as e:
        logger.error(f"Metrics endpoint error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/narrative', methods=['POST'])
@firebase_auth_middleware
def narrative_endpoint():
    """
    Endpoint to generate a financial narrative.
    If metrics are not provided in the request body, automatically fetch them via calculate_metrics.
    """
    try:
        data = request.json
        metrics = data.get('metrics')
        wallet_address = data.get('wallet_address')

        if not wallet_address and not metrics:
            return jsonify({"error": "Wallet address or metrics are required."}), 400

        # If metrics are not provided, fetch them
        if not metrics:
            if not wallet_address:
                return jsonify({"error": "No wallet address provided to fetch metrics."}), 400
            metrics = run_async(calculate_metrics, wallet_address)

        # Ensure date is provided or default to today
        date = data.get('date', datetime.datetime.now().strftime("%Y-%m-%d"))

        # Validate metrics structure
        if 'wallet_address' not in metrics or 'financialMetrics' not in metrics:
            return jsonify({"error": "Invalid metrics structure."}), 400

        # Generate the narrative and return the HTML URL or path
        result = generate_narrative(metrics, date, wallet_address)
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Narrative endpoint error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/origins', methods=['POST'])
@firebase_auth_middleware
def origins_endpoint():
    """
    Endpoint to process Ethereum addresses and match transactions with known origins.
    Produces a structured JSON response:
    {
      "results": [
        {
          "address": "0xAddress1",
          "status": "PROCESSED",
          "matched_origins": [...],
          "transactions": [...]
        },
        ...
      ]
    }
    """
    try:
        data = request.json
        addresses = data.get('addresses', [])

        if not addresses:
            logger.warning("No addresses provided in the request.")
            return jsonify({"error": "Addresses are required."}), 400

        # Validate Ethereum addresses
        valid_addresses = [addr for addr in addresses if is_valid_ethereum_address(addr)]
        if not valid_addresses:
            logger.warning("No valid Ethereum addresses found in the input.")
            return jsonify({"error": "No valid Ethereum addresses provided."}), 400

        logger.info(f"Processing {len(valid_addresses)} valid addresses.")

        # Process addresses asynchronously
        results = run_async(process_addresses_async, valid_addresses)

        processed_results = []
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Error processing address: {result}")
                processed_results.append({"status": "ERROR", "details": str(result)})
                continue

            known_origins = result.get("known_origins", [])
            transactions = result.get("transactions", [])

            # If you want to simplify/clean transactions further, do it here:
            cleaned_transactions = []
            for tx in transactions:
                cleaned_transactions.append({
                    "hash": tx.get("hash"),
                    "from": tx.get("from"),
                    "to": tx.get("to"),
                    "value_ether": tx.get("value_ether"),
                    "function_name": tx.get("function_name", "N/A"),
                    "timestamp": tx.get("timestamp"),
                    "gas_used": tx.get("gas_used", "N/A")
                })

            if known_origins:
                logger.info(f"Found {len(known_origins)} matches for address {result['address']}.")

            processed_results.append({
                "address": result["address"],
                "status": "PROCESSED",
                "matched_origins": known_origins,
                "transactions": cleaned_transactions,
            })

        return jsonify({"results": processed_results}), 200

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Origins endpoint error: {e}")
        return jsonify({"error": "An unexpected error occurred.", "details": str(e)}), 500

@app.route('/api/visualize', methods=['POST'])
@firebase_auth_middleware
def visualize_endpoint():
    try:
        data = request.json
        root_address = data.get('root_address')

        if not root_address:
            return jsonify({"error": "Root address is required."}), 400
        if not is_valid_ethereum_address(root_address):
            return jsonify({"error": "Invalid Ethereum address."}), 400

        # Run the visualization asynchronously
        result = run_async(create_visualization, root_address)
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Visualization endpoint error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/full_report', methods=['POST'])
@firebase_auth_middleware
def full_report_endpoint():
    try:
        data = request.json
        wallet_address = data.get('wallet_address')
        if not wallet_address:
            return jsonify({"error": "Wallet address is required."}), 400
        full_report = run_async(generate_turnqey_report, wallet_address)
        return jsonify(full_report), 200
    except Exception as e:
        logger.error(f"Full report endpoint error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/get_flagged_addresses', methods=['GET'])
def get_flagged_addresses():
    try:
        flagged_data = load_flagged_data()
        if not flagged_data:
            return jsonify({'error': 'No flagged data found.'}), 404
        return jsonify({'flagged_addresses': flagged_data}), 200
    except Exception as e:
        logger.error(f"Error loading flagged addresses: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/checkaddress', methods=['POST'])
@firebase_auth_middleware
def check_wallet_address_endpoint():
    try:
        data = request.get_json()
        addresses = data.get('addresses', [])
        if not addresses:
            return jsonify({'error': 'Addresses parameter is required.'}), 400
        cleaned_addresses = clean_and_validate_addresses(addresses)
        results = [check_wallet_address(address, []) for address in cleaned_addresses]
        return jsonify({'results': results}), 200
    except Exception as e:
        logger.error(f"Error in checkaddress endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/download/<filename>', methods=['GET'])
@firebase_auth_middleware
def download_results(filename):
    try:
        blob = bucket.blob(filename)
        if not blob.exists():
            return jsonify({'error': f'File {filename} not found.'}), 404

        content = blob.download_as_string()
        response = make_response(content)
        response.headers['Content-Disposition'] = f'attachment; filename={filename}'
        response.mimetype = 'application/json'
        return response
    except Exception as e:
        logger.error(f"Error in download_results endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload', methods=['POST'])
@firebase_auth_middleware
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        if file and file.filename.endswith(('.csv', '.json')):
            data = {}
            if file.filename.endswith('.csv'):
                import pandas as pd
                df = pd.read_csv(file)
                data = df.to_dict(orient='list')
            elif file.filename.endswith('.json'):
                data = json.load(file)

            addresses = data.get('addresses', [])
            cleaned_addresses = clean_and_validate_addresses(addresses)

            results = [
                {'address': addr, 'status': check_wallet_address(addr, [])}
                for addr in cleaned_addresses
            ]

            current_date = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            filename = f"results_{current_date}.json"
            blob = bucket.blob(filename)
            blob.upload_from_string(json.dumps(results), content_type='application/json')

            return jsonify({
                'message': 'File uploaded successfully.',
                'file_url': blob.public_url,
                'results': results,
            }), 200

        return jsonify({'error': 'Unsupported file type. Only CSV or JSON allowed.'}), 400
    except Exception as e:
        logger.error(f"Error in upload_file endpoint: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    logger.info("Starting Flask application...")
    app.run(debug=True, host='0.0.0.0', port=5328)
