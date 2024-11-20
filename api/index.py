import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import datetime
import logging
import base64
import re
import json
import threading
import time
from flask import Flask, request, jsonify, send_file, url_for, make_response
import firebase_admin
from firebase_admin import credentials, db, auth, initialize_app, storage
from dotenv import load_dotenv
import pandas as pd
from flask_cors import CORS
from io import BytesIO
import requests
from api.visualize_relationships import visualize_relationships, UNIQUE_DIR  
from api.monitor_address import monitor_address
from api.onchain_offchain import analyze_transactions, analyze_with_ai
from api.data_metrics import calculate_metrics
from api.v1basic_metrics import fetch_transactions, process_data
from api.v2intermediate_metrics import generate_security_alerts, calculate_portfolio_health_score, calculate_tax_implications
from api.v3advanced_metrics import analyze_defi_exposure, perform_onchain_analysis, analyze_tokenized_assets, generate_wealth_plan
from api.address_checker import check_wallet_address, clean_and_validate_addresses
from api.origins import check_addresses_with_origins
import api.smart_contract_analyzer

load_dotenv()
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["https://api.idefi.ai", "https://idefi-ai-api.vercel.app", "https://q.idefi.ai", "https://mup-nine.vercel.app", "http://localhost:3000", "https://agents.idefi.ai"]}})

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Get the base64-encoded service account key string
firebase_service_account_key_base64 = os.getenv('NEXT_PUBLIC_FIREBASE_SERVICE_ACCOUNT_KEY')
if not firebase_service_account_key_base64:
    raise ValueError("Missing Firebase service account key environment variable")
# Decode the base64-encoded string to bytes
firebase_service_account_key_bytes = base64.b64decode(firebase_service_account_key_base64)
# Convert bytes to JSON string
firebase_service_account_key_str = firebase_service_account_key_bytes.decode('utf-8')
# Initialize Firebase Admin SDK
try:
    firebase_service_account_key_dict = json.loads(firebase_service_account_key_str)
    cred = credentials.Certificate(firebase_service_account_key_dict)
    initialize_app(cred, {
        'databaseURL': 'https://api-idefi-ai-default-rtdb.firebaseio.com/',
        'storageBucket': 'api-idefi-ai.appspot.com'
    })
    logger.debug("Firebase Admin SDK initialized successfully.")
except json.JSONDecodeError as e:
    logger.error(f"JSON Decode Error: {e}")
    raise
except Exception as e:
    logger.error(f"Firebase Initialization Error: {e}")
    raise

# Get a reference to the Firebase Realtime Database and Storage
database = db.reference()
bucket = storage.bucket()

# Define Coinbase origin address
COINBASE_ORIGIN_ADDRESS = '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43'

# Define the directory containing the .json files
MAPPED_ADDRESSES_DIR = os.path.join(os.path.dirname(__file__), 'data')
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'upload')
UNIQUE_DIR = os.path.join(os.path.dirname(__file__), 'unique')
FLAGGED_JSON_PATH = os.path.join(UNIQUE_DIR, 'flagged.json')
OPENAI_API_KEY = os.getenv('NEXT_PUBLIC_OPENAI_API_KEY')
ETHERSCAN_API_KEY = os.getenv('NEXT_PUBLIC_ETHERSCAN_API_KEY')

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Middleware to log the endpoint being called
@app.before_request
def log_request_info():
    logger.debug('Endpoint: %s, Method: %s', request.endpoint, request.method)

# Function to load flagged addresses
@app.route('/api/get_flagged_addresses', methods=['GET'])
def get_flagged_addresses():
    try:
        logging.info(f"Attempting to load flagged.json from: {FLAGGED_JSON_PATH}")

        if os.path.exists(FLAGGED_JSON_PATH):
            logging.info(f"Flagged JSON file found at: {FLAGGED_JSON_PATH}")

            # Correcting indentation here
            with open(FLAGGED_JSON_PATH, 'r') as f:
                content = f.read()  # Read the raw content before parsing
                logging.debug(f"Raw flagged.json content: {content}")

                try:
                    flagged_addresses = json.loads(content)
                except json.JSONDecodeError as json_error:
                    logging.error(f"JSON Decode Error: {json_error}")
                    flagged_addresses = handle_json_errors(content)  # Call handle_json_errors
                    if not flagged_addresses:
                        return jsonify({'error': f"JSON decode error: {str(json_error)}"}), 500

            logging.info(f"Loaded flagged addresses successfully.")
            return jsonify({'status': 'success', 'flagged_addresses': flagged_addresses, 'total': len(flagged_addresses)}), 200
        else:
            logging.error(f"File not found: {FLAGGED_JSON_PATH}")
            return jsonify({'error': f'File not found: {FLAGGED_JSON_PATH}'}), 404
    except Exception as e:
        logging.error(f"Error loading flagged addresses: {e}")
        return jsonify({'error': 'Error loading flagged addresses'}), 500

# Define the handle_json_errors function to handle malformed JSON content
def handle_json_errors(raw_content):
    """
    Attempts to recover from common JSON errors, such as trailing commas
    or improper structure, and returns corrected content if possible.
    If correction fails, processes entries individually to retain valid data.
    """
    try:
        # Remove trailing commas (this handles basic JSON issues)
        corrected_content = re.sub(r',\s*([}\]])', r'\1', raw_content)

        # Attempt to load the corrected content as JSON
        return json.loads(corrected_content)

    except json.JSONDecodeError as e:
        logging.error(f"Failed to correct JSON: {e}")

        # Handle more severe errors by processing line by line or entry by entry
        valid_entries = []
        try:
            # Assume it's an array of objects
            for entry in raw_content.strip().splitlines():
                try:
                    # Try to parse each entry individually
                    parsed_entry = json.loads(entry)
                    valid_entries.append(parsed_entry)
                except json.JSONDecodeError as entry_error:
                    logging.error(f"Skipping invalid entry: {entry_error}")
            return valid_entries if valid_entries else None
        except Exception as e:
            logging.error(f"Error while attempting to process entries individually: {e}")
            return None

@app.route('/api/checkaddress', methods=['GET', 'POST'])
def check_wallet_address_endpoint():
    if request.method == 'GET':
        address = request.args.get('address')

        if not address:
            return jsonify({'error': 'Address is required'}), 400

        # Perform wallet address check
        results = check_wallet_address([address])  # Pass the address in a list

        # Send response to the frontend
        return jsonify(results[0])  # Only return the result for the single address

    elif request.method == 'POST':
        data = request.get_json()
        addresses = data.get('addresses', [])

        if not addresses:
            return jsonify({'error': 'Addresses parameter is required'}), 400

        # Perform wallet address check for all addresses
        results = check_wallet_address(addresses)

        # Send results to the frontend
        return jsonify(results)

# Route to generate GPT analysis
@app.route('/api/generate_gpt_analysis', methods=['POST'])
def generate_gpt_analysis_endpoint():
    data = request.get_json()
    grandparent = data.get('grandparent')
    status = data.get('status')
    description = data.get('description')

    if not grandparent or not status or not description:
        return jsonify({'error': 'Missing required fields'}), 400

    gpt_analysis = generate_gpt_analysis(grandparent, status, description)
    return jsonify({'gpt_analysis': gpt_analysis})


@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and file.filename.endswith(('.csv', '.json')):
        try:
            unique_addresses = load_unique_addresses()
            flagged_addresses = load_flagged_addresses()
            results = []
            data = {}

            if file.filename.endswith('.csv'):
                df = pd.read_csv(file)
                for index, row in df.iterrows():
                    data[row['address']] = None  # Only care about addresses for now

            elif file.filename.endswith('.json'):
                data = json.load(file)

            addresses = [address for address in data.keys()]

            # Clean and validate addresses
            addresses = clean_and_validate_addresses(addresses)

            for address in addresses:
                status, description = check_wallet_address(address, [], {}, unique_addresses, flagged_addresses)
                
                if status == 'FAIL':
                    description += get_etherscan_details(address, unique_addresses)
                
                results.append({
                    'address': address,
                    'status': status,  # Now can be Pass, Fail, or Warning
                    'description': description
                })

            # Convert results to CSV format
            csv_content = 'address,status,description\n'
            for result in results:
                csv_content += '{},{},{}\n'.format(result['address'], result['status'], result['description'])

            # Create BytesIO object to store CSV content
            output = BytesIO()
            output.write(csv_content.encode())
            output.seek(0)

            # Generate filename based on date/time and user UID
            current_date = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            filename = f"results_{current_date}.csv"

            # Upload CSV to Firebase Storage
            blob = bucket.blob(filename)
            blob.upload_from_file(output, content_type='text/csv')

            # Return URL to access the uploaded file
            file_url = blob.public_url

            # Prepare response with file download URL
            response = jsonify({
                'details': results,
                'file_url': file_url
            })

            return response

        except Exception as e:
            return jsonify({'error': str(e)}), 500
    else:
        return jsonify({'error': 'Unsupported file type'}), 400


@app.route('/api/download/<filename>', methods=['GET'])
def download_results(filename):
    try:
        # Download file from Firebase Storage
        blob = bucket.blob(filename)
        content = blob.download_as_string()

        # Send file as attachment
        response = make_response(content)
        response.headers['Content-Disposition'] = f'attachment; filename={filename}'
        response.mimetype = 'text/csv'
        return response

    except Exception as e:
        return jsonify({'error': str(e)}), 404

# Endpoint for fetching all API tokens associated with the user
@app.route('/api/get_all_tokens', methods=['GET'])
def get_all_tokens():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'error': 'Token required'}), 401
    decoded_token = verify_api_token(token)
    if not decoded_token:
        return jsonify({'error': 'Invalid token'}), 401

    uid = decoded_token['uid']
    api_tokens_ref = database.child('apiTokens').child(uid)
    all_tokens = api_tokens_ref.get()
    if all_tokens:
        tokens_list = list(all_tokens.values())
        return jsonify({'tokens': tokens_list}), 200
    else:
        return jsonify({'tokens': []}), 200

# Endpoint for generating API token
@app.route('/api/generate_token', methods=['POST'])
def generate_user_token():
    try:
        data = request.json
        uid = data.get('uid')
        if not uid:
            return jsonify({'error': 'UID required'}), 400

        custom_token = auth.create_custom_token(uid)
        token = custom_token.decode('utf-8')

        return jsonify({'token': token}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Endpoint for getting API key
@app.route('/api/get_api_key', methods=['GET'])
def get_api_key():
    return jsonify({'api_key': 'your_api_key_here'})

# Protected API endpoint (requires authentication)
@app.route('/api/protected_endpoint', methods=['GET'])
def protected_endpoint():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'error': 'Token required'}), 401
    decoded_token = verify_api_token(token)
    if not decoded_token:
        return jsonify({'error': 'Invalid token'}), 401
    # Perform actions for the protected endpoint
    return jsonify({'message': 'Access granted'})

@app.route('/api/basic_metrics', methods=['GET'])
def basic_metrics_endpoint():
    address = request.args.get('address')
    transactions = fetch_transactions(address)
    internal_transactions = []  # Could fetch if needed
    token_transfers = []  # Could fetch if needed
    data = process_data(address, transactions, internal_transactions, token_transfers)
    return jsonify(data)

@app.route('/api/intermediate_metrics', methods=['GET'])
def intermediate_metrics_endpoint():
    address = request.args.get('address')
    transactions = fetch_transactions(address)
    alerts = generate_security_alerts(transactions, [])
    portfolio_health = calculate_portfolio_health_score({}, 50)  # Replace with real data
    tax_implications = calculate_tax_implications(transactions)
    return jsonify({
        'security_alerts': alerts,
        'portfolio_health_score': portfolio_health,
        'tax_implications': tax_implications
    })

@app.route('/api/advanced_metrics', methods=['GET'])
def advanced_metrics_endpoint():
    address = request.args.get('address')
    transactions = fetch_transactions(address)
    defi_exposure = analyze_defi_exposure(transactions)
    onchain_analysis = perform_onchain_analysis(transactions)
    tokenized_assets = analyze_tokenized_assets(transactions)
    wealth_plan = generate_wealth_plan(address, transactions)
    return jsonify({
        'defi_exposure': defi_exposure,
        'onchain_analysis': onchain_analysis,
        'tokenized_assets': tokenized_assets,
        'wealth_plan': wealth_plan
    })

@app.route('/api/list_json_files', methods=['GET'])
def list_json_files():
    try:
        # List all JSON files in the mapped_addresses directory
        json_files = [f for f in os.listdir(MAPPED_ADDRESSES_DIR) if f.endswith('.json')]
        return jsonify({'files': json_files}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/visualize_dataset', methods=['POST'])
def visualize_dataset():
    data = request.json
    source_type = data.get('source_type')  # Expected: 'data' or 'address'
    address = data.get('address', None)
    filename = data.get('filename', None)
    max_nodes = data.get('max_nodes', None)

    if not address and not filename:
        return jsonify({'error': 'Either an Ethereum address or a filename is required'}), 400

    try:
        if source_type == 'address' and address:
            logger.info(f"Visualizing address: {address}")
            visualization_url = visualize_relationships(address=address, max_nodes=max_nodes)
            return jsonify({'visualization_url': visualization_url})

        elif source_type == 'data' and filename:
            filepath = os.path.join(MAPPED_ADDRESSES_DIR, filename)
            if not os.path.isfile(filepath):
                logger.error(f"File not found: {filepath}")
                return jsonify({'error': f'The file {filename} does not exist in the data directory.'}), 404

            logger.info(f"Visualizing sample file: {filename}")
            visualization_url = visualize_relationships(filepath=filepath, max_nodes=max_nodes)
            return jsonify({'visualization_url': visualization_url})

        else:
            return jsonify({'error': 'Invalid source type or missing data.'}), 400

    except Exception as e:
        logger.error(f"Error during visualization: {str(e)}")
        return jsonify({'error': f"An error occurred: {str(e)}"}), 500


# Endpoint for checking multiple wallet addresses (including family structure)
@app.route('/api/check_multiple_addresses', methods=['POST'])
def check_multiple_addresses():
    try:
        data = request.get_json()
        families = data.get('families', [])

        if not families:
            return jsonify({'error': 'Families parameter is required'}), 400

        flagged_index = load_flagged_addresses()
        results = []

        for family in families:
            grandparent = family.get('grandparent')
            parents = family.get('parents', [])
            children = family.get('children', {})

            if not grandparent:
                results.append({'error': 'Grandparent address is required'})
                continue

            # Check wallet (family) address for PASS | FAIL | WARNING
            status, description = check_wallet_address(grandparent, parents, children, flagged_index)

            results.append({
                'grandparent': grandparent,
                'status': status,  # 'PASS', 'FAIL', or 'WARNING'
                'description': description  # Detailed information on why the status was assigned
            })

        return jsonify(results)

    except Exception as e:
        logger.error(f"Exception: {e}")
        return jsonify({'error': f'An error occurred: {e}'}), 500

def check_address_status(address, unique_addresses, flagged_addresses):
    lower_address = address.lower()
    if lower_address in flagged_addresses:
        return 'Fail', 'Flagged for suspicious activities'
    elif lower_address in unique_addresses:
        return 'Fail', 'Address on watch list'
    return 'Pass', 'No issues found'       

# Route to clean and validate addresses
@app.route('/api/clean_addresses', methods=['POST'])
def clean_addresses_endpoint():
    data = request.get_json()
    addresses = data.get('addresses', [])
    if not addresses:
        return jsonify({'error': 'No addresses provided'}), 400

    validated_addresses = clean_and_validate_addresses(addresses)
    return jsonify({'validated_addresses': validated_addresses})


def analyze_transactions_with_flagged_addresses(transactions, unique_addresses, flagged_addresses):
    flagged_interactions = []
    risky_transactions_count = 0
    total_value = 0.0
    dates_involved = set()

    for tx in transactions:
        # Check both sender and receiver addresses against flagged and unique addresses
        from_flagged = is_address_flagged(tx['from'], flagged_addresses) or tx['from'].lower() in unique_addresses
        to_flagged = is_address_flagged(tx['to'], flagged_addresses) or tx['to'].lower() in unique_addresses

        # Consider transaction flagged if either address is flagged
        if from_flagged or to_flagged:
            flagged_interactions.append(tx)
            risky_transactions_count += 1
            total_value += float(tx['value'])
            # Add date to the set of involved dates
            date = datetime.datetime.fromtimestamp(int(tx['timeStamp'])).strftime('%Y-%m-%d')
            dates_involved.add(date)

    summary = {
        'number_of_interactions_with_flagged_addresses': len(flagged_interactions),
        'number_of_risky_transactions': risky_transactions_count,
        'total_value': total_value,
        'all_dates_involved': sorted(list(dates_involved))
    }

    return summary

@app.route('/api/transaction_summary', methods=['GET', 'POST'])
def transaction_summary():
    address = request.args.get('address')
    if not address:
        return jsonify({'error': 'Address parameter is required'}), 400

    # Load unique and flagged addresses
    unique_addresses = load_unique_addresses()
    flagged_addresses = load_flagged_addresses()

    # Fetch transaction history
    transactions = fetch_transactions(address)
    if not transactions:
        return jsonify({'error': 'No transactions found'}), 404

    # Analyze transactions
    summary = analyze_transactions_with_flagged_addresses(transactions, unique_addresses, flagged_addresses)

    return jsonify(summary)

@app.route('/api/get_upload_history', methods=['GET'])
def get_upload_history():
    uid = request.args.get('uid')
    if not uid:
        return jsonify({'error': 'UID required'}), 400

    history_ref = db.reference(f'users/{uid}/upload_history')
    history = history_ref.get()
    if history:
        return jsonify({'history': list(history.values())}), 200
    else:
        return jsonify({'history': []}), 200


@app.route('/api/monitor_address', methods=['POST'])
def monitor_address_endpoint():
    data = request.get_json()
    address = data.get('address')
    if not address:
        return jsonify({'error': 'Address parameter is required'}), 400

    try:
        monitoring_data = monitor_address(address)
        if 'error' in monitoring_data:
            return jsonify({'error': monitoring_data['error']}), 500
        else:
            return jsonify(monitoring_data), 200
    except Exception as e:
        app.logger.error(f"Error monitoring address: {e}")
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

def get_transaction_history(address):
    try:
        url = f'https://api.etherscan.io/api?module=account&action=txlist&address={address}&sort=asc&apikey={ETHERSCAN_API_KEY}'
        response = requests.get(url)
        if response.status_code != 200:
            raise Exception(f"Error fetching data from Etherscan API: {response.status_code}")

        data = response.json()
        if data['status'] != '1':
            raise Exception(f"No transactions found: {data['message']}")

        transactions = data['result']
        formatted_transactions = [{
            'hash': tx['hash'],
            'from': tx['from'],
            'to': tx['to'],
            'value': int(tx['value']) / 1e18,  # Convert from Wei to Ether
            'timestamp': int(tx['timeStamp']),
            'type': tx.get('type', 'Unknown')  # Assuming type may be missing
        } for tx in transactions]

        return formatted_transactions
    except Exception as e:
        app.logger.error(f"Error fetching transaction history: {e}")
        return []

def check_dusting_patterns(wallet_address):
    # Placeholder function for checking dusting patterns
    dusting_patterns = []
    
    try:
        # Fetch the wallet's transactions from Etherscan API
        url = f'https://api.etherscan.io/api?module=account&action=txlist&address={wallet_address}&sort=asc&apikey={ETHERSCAN_API_KEY}'
        response = requests.get(url)
        if response.status_code != 200:
            return dusting_patterns

        data = response.json()
        if data['status'] != '1':
            return dusting_patterns

        transactions = data['result']
        
        # Analyze transactions for dusting behavior
        for tx in transactions:
            value_eth = int(tx['value']) / 1e18  # Convert from Wei to Ether
            # Consider dust transactions as those with very small amounts, e.g., less than 0.001 ETH
            if value_eth > 0 and value_eth < 0.001:
                dusting_patterns.append({
                    'transactionHash': tx['hash'],
                    'from': tx['from'],
                    'to': tx['to'],
                    'value': value_eth,
                    'timestamp': datetime.datetime.fromtimestamp(int(tx['timeStamp'])).isoformat()
                })

    except Exception as e:
        logger.error(f"Error fetching transaction history: {e}")

    return dusting_patterns


# Function to provide recommendations based on dusting patterns
def provide_dusting_recommendations(dusting_patterns):
    recommendations = []
    if dusting_patterns:
        recommendations.append("Your wallet has been dusted. It's recommended to not interact with these dust transactions.")
        recommendations.append("Consider using a different wallet address for your transactions.")
        recommendations.append("Monitor your wallet closely for any unauthorized transactions.")
    else:
        recommendations.append("No dusting patterns detected. Your wallet appears to be safe.")
    return recommendations

@app.route('/api/dustcheck', methods=['GET'])
def dust_check_endpoint():
    address = request.args.get('address')
    if not address:
        return jsonify({'error': 'Address parameter is required'}), 400

    # Load unique addresses and flagged addresses
    unique_addresses = load_unique_addresses()
    flagged_addresses = load_flagged_addresses()

    description = check_wallet_address(address, unique_addresses, flagged_addresses)
    if 'Flagged' in description:
        description += get_etherscan_details(address, unique_addresses)

    dusting_patterns = check_dusting_patterns(address)
    recommendations = provide_dusting_recommendations(dusting_patterns)

    response_data = {
        'address': address,
        'description': description,
        'dusting_patterns': dusting_patterns,
        'recommendations': recommendations
    }

    return jsonify(response_data)


# New endpoint for analyzing smart contracts
@app.route('/api/analyze_smart_contract', methods=['POST'])
def analyze_smart_contract():
    """Endpoint to analyze Solidity smart contract code."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and file.filename.endswith('.sol'):
        try:
            # Read the smart contract code
            contract_code = file.read().decode('utf-8')

            if not is_valid_solidity_code(contract_code):
                return jsonify({'error': 'Invalid Solidity code'}), 400

            chunks = chunk_text(contract_code)

            # Analyze each chunk and combine results
            combined_results = []
            for chunk in chunks:
                payload = {
                    'model': 'gpt-4o-mini',
                    'messages': [{'role': 'system', 'content': f"Analyze the following Solidity smart contract: {chunk}"}]
                }
                result = make_ai_request(payload)
                combined_results.append(format_analysis_response(result))

            return jsonify({'analysis': combined_results}), 200

        except Exception as e:
            return jsonify({'error': str(e)}), 500
    else:
        return jsonify({'error': 'Unsupported file type. Only .sol files are allowed'}), 400

# Utility functions
def fetch_transactions(address):
    url = f'https://api.etherscan.io/api?module=account&action=txlist&address={address}&startblock=0&endblock=99999999&sort=asc&apikey={ETHERSCAN_API_KEY}'
    response = requests.get(url)
    data = response.json()
    return data['result'] if data['status'] == '1' else []

def fetch_internal_transactions(address):
    url = f'https://api.etherscan.io/api?module=account&action=txlistinternal&address={address}&startblock=0&endblock=99999999&sort=asc&apikey={ETHERSCAN_API_KEY}'
    response = requests.get(url)
    data = response.json()
    return data['result'] if data['status'] == '1' else []

def fetch_token_transfers(address):
    url = f'https://api.etherscan.io/api?module=account&action=tokentx&address={address}&startblock=0&endblock=99999999&sort=asc&apikey={ETHERSCAN_API_KEY}'
    response = requests.get(url)
    data = response.json()
    return data['result'] if data['status'] == '1' else []

def calculate_metrics(address, transactions, token_transfers):
    metrics = {}
    eth_sent = sum(float(tx['value']) for tx in transactions if tx['from'].lower() == address.lower())
    eth_received = sum(float(tx['value']) for tx in transactions if tx['to'].lower() == address.lower())
    avg_gas_price = sum(float(tx['gasPrice']) for tx in transactions) / len(transactions)
    
    metrics['Total ETH Sent'] = eth_sent / 1e18
    metrics['Total ETH Received'] = eth_received / 1e18
    metrics['Average Gas Price (Gwei)'] = avg_gas_price / 1e9
    
    token_counts = {}
    for tx in token_transfers:
        token_symbol = tx['tokenSymbol']
        if token_symbol not in token_counts:
            token_counts[token_symbol] = 0
        token_counts[token_symbol] += 1
    
    metrics['Token Transfers'] = token_counts
    return metrics

def calculate_capital_gains(address, transactions):
    purchase_history = []
    capital_gains = 0.0
    for tx in transactions:
        if tx['to'].lower() == address.lower():
            purchase_history.append({
                'date': datetime.datetime.fromtimestamp(int(tx['timeStamp'])),
                'amount': float(tx['value']) / 1e18,
                'price': 2000.0  # Example purchase price, replace with real-time price
            })
        elif tx['from'].lower() == address.lower():
            sale_amount = float(tx['value']) / 1e18
            sale_price = 3000.0  # Example sale price, replace with real-time price
            for purchase in purchase_history:
                if sale_amount == 0:
                    break
                if purchase['amount'] <= sale_amount:
                    gain = (sale_price - purchase['price']) * purchase['amount']
                    capital_gains += gain
                    sale_amount -= purchase['amount']
                    purchase_history.remove(purchase)
                else:
                    gain = (sale_price - purchase['price']) * sale_amount
                    capital_gains += gain
                    purchase['amount'] -= sale_amount
                    sale_amount = 0
    return capital_gains

def process_data(address, transactions, internal_transactions, token_transfers):
    metrics = calculate_metrics(address, transactions, token_transfers)
    capital_gains = calculate_capital_gains(address, transactions)
    
    store_data(address, transactions, metrics, capital_gains)

def store_data(address, transactions, metrics, capital_gains):
    # Implement storage logic, e.g., save to a database or update a cache
    pass

@app.route('/api/analyze_transactions', methods=['POST'])
def analyze_transactions_endpoint():
    try:
        data = request.get_json()
        address = data.get('address')
        if not address:
            return jsonify({'error': 'Address parameter is required'}), 400

        transactions = fetch_transactions(address)
        if not transactions:
            return jsonify({'error': 'No transactions found'}), 404

        unique_addresses = load_unique_addresses()
        flagged_addresses = load_flagged_addresses()

        summary = analyze_transactions_with_flagged_addresses(transactions, unique_addresses, flagged_addresses)

        return jsonify(summary)
    except Exception as e:
        logger.error(f"Exception: {e}")
        return jsonify({'error': f'An error occurred: {e}'}), 500

@app.route('/api/get_data_and_metrics', methods=['GET'])
def get_data_and_metrics():
    try:
        address = request.args.get('address')
        if not address:
            return jsonify({'error': 'Address parameter is required'}), 400

        transactions = fetch_transactions(address)
        internal_transactions = fetch_internal_transactions(address)
        token_transfers = fetch_token_transfers(address)

        if not transactions:
            return jsonify({'error': 'No transactions found'}), 404

        metrics = calculate_metrics(address, transactions, token_transfers)
        capital_gains = calculate_capital_gains(address, transactions)

        metrics['Capital Gains'] = capital_gains

        transformed_data = {
            'address': address,
            'transactions': transactions,
            'internal_transactions': internal_transactions,
            'token_transfers': token_transfers
        }

        return jsonify({
            'raw_data': transactions,
            'transformed_data': transformed_data,
            'metrics': metrics
        })

    except requests.exceptions.RequestException as e:
        logger.error(f"RequestException: {e}")
        return jsonify({'error': f'Failed to fetch data from Etherscan: {e}'}), 500
    except Exception as e:
        logger.error(f"Exception: {e}")
        return jsonify({'error': f'An error occurred: {e}'}), 500

# Define the /api/origins route
@app.route('/api/origins', methods=['GET', 'POST'])
def check_origins_endpoint():
    if request.method == 'GET':
        address = request.args.get('address')
        if not address:
            return jsonify({'error': 'Address is required'}), 400

        # Perform address check for a single address
        results = check_addresses_with_origins([address])
        return jsonify(results[0])  # Return result for single address

    elif request.method == 'POST':
        data = request.get_json()
        addresses = data.get('addresses', [])
        if not addresses:
            return jsonify({'error': 'Addresses parameter is required'}), 400

        # Perform address check for all provided addresses
        results = check_addresses_with_origins(addresses)
        return jsonify(results)


if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5328)
