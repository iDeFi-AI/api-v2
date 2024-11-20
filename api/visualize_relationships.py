import json
import asyncio
import aiohttp
import os
import base64
import logging
import networkx as nx
from pyvis.network import Network
from tqdm import tqdm
import random
import firebase_admin
from firebase_admin import credentials, storage
from api.etherscanv2 import get_etherscan_v2_details, CHAIN_API_BASE_URLS

# Setup logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# Directory for mapped addresses
UNIQUE_DIR = os.path.join(os.path.dirname(__file__), 'data')

# Initialize Firebase Admin SDK
def initialize_firebase_app(app_name):
    if app_name not in firebase_admin._apps:
        firebase_service_account_key_base64 = os.getenv('NEXT_PUBLIC_FIREBASE_SERVICE_ACCOUNT_KEY')
        if not firebase_service_account_key_base64:
            raise ValueError("Missing Firebase service account key environment variable")

        firebase_service_account_key_bytes = base64.b64decode(firebase_service_account_key_base64)
        firebase_service_account_key_str = firebase_service_account_key_bytes.decode('utf-8')

        try:
            firebase_service_account_key_dict = json.loads(firebase_service_account_key_str)
            if firebase_service_account_key_dict.get("type") != "service_account":
                raise ValueError('Invalid service account certificate.')

            cred = credentials.Certificate(firebase_service_account_key_dict)
            app = firebase_admin.initialize_app(cred, {
                'storageBucket': 'api-idefi-ai.appspot.com'
            }, name=app_name)

            logger.info(f"Firebase Admin SDK initialized successfully for app: {app_name}")
            return app

        except json.JSONDecodeError as e:
            logger.error(f"JSON Decode Error: {e}")
            raise
        except Exception as e:
            logger.error(f"Firebase Initialization Error: {e}")
            raise
    else:
        logger.info(f"Firebase app '{app_name}' already initialized.")
        return firebase_admin.get_app(app_name)

default_app = initialize_firebase_app('default')
bucket = storage.bucket(app=default_app)

def shorten_address(address, length=6):
    """Shortens an Ethereum address to show only the first and last few characters."""
    return f"{address[:length]}...{address[-length:]}" if len(address) > 2 * length else address

async def fetch_transactions_v2(address, session, chain='ethereum'):
    """
    Fetches transaction data for a given Ethereum address using Etherscan V2 API.
    Includes both regular and internal transactions.
    """
    try:
        transactions = []

        async def fetch(module, action):
            """Fetch data from the Etherscan V2 API."""
            response = await get_etherscan_v2_details(address, chain=chain, module=module, action=action)
            if response.get('status') == '1':
                return response.get('result', [])
            logger.error(f"Error fetching {action} for {address}: {response.get('message', 'Unknown error')}")
            return []

        # Fetch regular and internal transactions concurrently
        regular_tx, internal_tx = await asyncio.gather(
            fetch("account", "txlist"),
            fetch("account", "txlistinternal")
        )
        transactions.extend(regular_tx + internal_tx)

        logger.info(f"Fetched {len(transactions)} total transactions for address {address}.")
        return transactions

    except Exception as e:
        logger.error(f"Unexpected error in Etherscan V2 API fetch: {e}")
        return []

async def find_relationships_v2(address, session, chain='ethereum', progress_bar=None):
    """
    Finds parent and child addresses based on transaction history using Etherscan V2 API.
    """
    transactions = await fetch_transactions_v2(address, session, chain)
    
    if not isinstance(transactions, list):
        logger.error(f"Invalid transactions data for address {address}: {transactions}")
        return [], {}

    parents = set()
    children_map = {}

    try:
        logger.debug(f"Parsing {len(transactions)} transactions for address {address}")

        for tx in transactions:
            from_address = tx.get('from', '').lower()
            to_address = tx.get('to', '').lower()

            if from_address and from_address != address.lower():
                parents.add(from_address)
                if from_address not in children_map:
                    children_map[from_address] = []
            if to_address and to_address != address.lower():
                if from_address in children_map:
                    children_map[from_address].append(to_address)
                else:
                    children_map[from_address] = [to_address]

    except KeyError as e:
        logger.error(f"Key error while processing transactions for {address}: {e}")
        return [], {}

    if progress_bar:
        progress_bar.update(1)

    logger.info(f"Found {len(parents)} parents and {sum(len(kids) for kids in children_map.values())} children for {address}")
    await asyncio.sleep(1)

    return list(parents), children_map

async def generate_family_tree_v2(grandfather_address, chain='ethereum'):
    """Generates a family tree structure using Etherscan V2 API for Ethereum addresses."""
    async with aiohttp.ClientSession() as session:
        logger.info(f"Fetching relationships for {grandfather_address} using Etherscan V2 API.")
        
        parents, children = await find_relationships_v2(grandfather_address, session, chain)
        
        if parents:
            with tqdm(total=len(parents), desc="Fetching relationships for parents", unit="parent", ncols=100, colour='green') as progress_bar:
                for parent in parents:
                    _, parent_children = await find_relationships_v2(parent, session, chain, progress_bar)
                    if parent in children:
                        children[parent].extend(parent_children)
                    else:
                        children[parent] = parent_children

        family_tree = {
            "grandfather": grandfather_address,
            "parents": parents,
            "children": children
        }

    return family_tree

def save_family_tree(family_tree, filename):
    """Saves the family tree to a JSON file."""
    os.makedirs(UNIQUE_DIR, exist_ok=True)
    filepath = os.path.join(UNIQUE_DIR, filename)
    with open(filepath, 'w') as f:
        json.dump(family_tree, f, indent=2)
    logger.info(f"Family tree saved to {filepath}")
    return filepath

def visualize_relationships(address, max_nodes=None, chain='ethereum'):
    """Visualizes the family tree relationship using pyvis and Etherscan V2 API."""
    family_tree = asyncio.run(generate_family_tree_v2(address, chain))
    filename = f"{shorten_address(address)}_family_tree.json"
    filepath = save_family_tree(family_tree, filename)

    net = Network(height="1200px", width="100%", bgcolor="#000000", font_color="white")
    set_network_options(net)
    G = nx.Graph()

    tree = load_family_tree(filepath)

    if tree:
        num_addresses = len(tree["parents"]) + sum(len(kids) for kids in tree["children"].values()) + 1
        with tqdm(total=num_addresses, desc=f"Processing {filename} ({num_addresses} addresses)", unit="address", leave=False) as sub_progress:
            add_family_tree_to_network(net, G, tree, set(), sub_progress, max_nodes)

    output_file = "family_relationships.html"
    net.show(output_file)

    blob_path = f'visualizations/{output_file}'
    with open(output_file, 'rb') as f:
        blob = bucket.blob(blob_path)
        blob.upload_from_file(f, content_type='text/html')
        logger.info(f"Uploaded visualization to {blob_path}")

    return blob.public_url
