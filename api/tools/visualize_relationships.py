import json
import asyncio
import aiohttp
import os
import base64
import logging
import networkx as nx
import datetime
import firebase_admin
from pyvis.network import Network
from tqdm import tqdm
from firebase_admin import credentials, storage
from api.tools.etherscanv2 import get_transaction_data, SUPPORTED_CHAINS

# Setup logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# Directory for mapped addresses
UNIQUE_DIR = os.path.join(os.path.dirname(__file__), 'data')

# Firebase initialization
def initialize_firebase_app(app_name):
    """Initializes Firebase Admin SDK."""
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
                'storageBucket': 'api-v2-idefi-ai.firebasestorage.app'
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

async def fetch_transactions(address, chain='ethereum'):
    """
    Fetches transaction data for a given Ethereum address using Etherscan API V2.
    Includes both regular and internal transactions.
    """
    try:
        transactions = await get_transaction_data(address, chains=[chain])
        if transactions and len(transactions) > 0:
            return transactions[0].get('transactions', [])
        logger.info(f"No transactions found for {address} on chain {chain}")
    except Exception as e:
        logger.error(f"Error fetching transactions for {address} on chain {chain}: {e}")
    return []

async def find_relationships(address, chain='ethereum', progress_bar=None):
    """Finds parent and child relationships based on transactions."""
    transactions = await fetch_transactions(address, chain)
    parents = set()
    children_map = {}

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

    if progress_bar:
        progress_bar.update(1)

    logger.info(f"Found {len(parents)} parents and {sum(len(kids) for kids in children_map.values())} children for {address}")
    return list(parents), children_map

async def generate_family_tree(grandfather_address, chain='ethereum'):
    """Generates a family tree of relationships using Etherscan V2 API."""
    parents, children = await find_relationships(grandfather_address, chain)

    if parents:
        with tqdm(total=len(parents), desc="Fetching parent relationships", unit="parent", ncols=100, colour='green') as progress_bar:
            for parent in parents:
                _, parent_children = await find_relationships(parent, chain, progress_bar)
                if parent in children:
                    children[parent].extend(parent_children)
                else:
                    children[parent] = parent_children

    return {
        "grandfather": grandfather_address,
        "parents": parents,
        "children": children
    }

def save_family_tree(family_tree, filename):
    """Saves the family tree to a JSON file."""
    os.makedirs(UNIQUE_DIR, exist_ok=True)
    filepath = os.path.join(UNIQUE_DIR, filename)
    with open(filepath, 'w') as f:
        json.dump(family_tree, f, indent=2)
    logger.info(f"Family tree saved to {filepath}")
    return filepath

def set_network_options(net):
    """Sets physics settings for the network visualization."""
    net.set_options("""
    {
      "physics": {
        "stabilization": {
          "enabled": true,
          "iterations": 1000
        },
        "solver": "forceAtlas2Based",
        "forceAtlas2Based": {
          "gravitationalConstant": -100,
          "centralGravity": 0.01,
          "springLength": 100,
          "springConstant": 0.08,
          "damping": 0.4,
          "avoidOverlap": 0.2
        }
      },
      "interaction": {
        "hideEdgesOnDrag": true,
        "tooltipDelay": 200
      }
    }
    """)

def visualize_relationships(address, uid, max_nodes=None, chain='ethereum'):
    """
    Visualizes the family tree relationships using PyVis and Etherscan V2 API.
    Stores the visualization in a user-specific directory on Firebase.
    """
    family_tree = asyncio.run(generate_family_tree(address, chain))
    filename = f"{shorten_address(address)}_family_tree.json"
    filepath = save_family_tree(family_tree, filename)

    net = Network(height="1200px", width="100%", bgcolor="#000000", font_color="white")
    set_network_options(net)

    if family_tree:
        num_addresses = len(family_tree["parents"]) + sum(len(kids) for kids in family_tree["children"].values()) + 1
        with tqdm(total=num_addresses, desc="Processing visualization", unit="address") as sub_progress:
            for parent, children in family_tree["children"].items():
                net.add_node(parent)
                for child in children:
                    net.add_node(child)
                    net.add_edge(parent, child)
                    sub_progress.update(1)

    output_file = "family_relationships.html"
    net.show(output_file)

    # Upload the visualization to the user's directory in Firebase
    blob_path = f'visualizations/{uid}/{output_file}'
    with open(output_file, 'rb') as f:
        blob = bucket.blob(blob_path)
        # Add metadata and upload file
        blob.metadata = {"uid": uid}
        blob.upload_from_file(f, content_type='text/html')
        logger.info(f"Uploaded visualization to {blob_path}")

    # Return the secure URL for the file
    return blob.generate_signed_url(expiration=datetime.timedelta(hours=1))
