import json
import asyncio
import os
import base64
import logging
import datetime
from pyvis.network import Network
from tqdm import tqdm
import firebase_admin
from firebase_admin import credentials, storage
from api.tools.etherscanv2 import get_transaction_data
from api.tools.address_checker import check_address_in_dataset, load_flagged_data

# Setup logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# Directory for data files
UNIQUE_DIR = os.path.join(os.path.dirname(__file__), 'data')

# Initialize Firebase Admin SDK
def initialize_firebase_app(app_name):
    if app_name not in firebase_admin._apps:
        key_base64 = os.getenv('NEXT_PUBLIC_FIREBASE_SERVICE_ACCOUNT_KEY')
        if not key_base64:
            raise ValueError("Firebase service account key is missing.")
        try:
            key_bytes = base64.b64decode(key_base64)
            key_dict = json.loads(key_bytes.decode('utf-8'))
            cred = credentials.Certificate(key_dict)
            return firebase_admin.initialize_app(cred, {'storageBucket': 'api-v2-idefi-ai.firebasestorage.app'}, name=app_name)
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {e}")
            raise
    return firebase_admin.get_app(app_name)

default_app = initialize_firebase_app('default')
bucket = storage.bucket(app=default_app)

def get_node_color_safe(status):
    """Get node color based on risk status."""
    color_map = {"PASS": "green", "WARNING": "orange", "FAIL": "red"}
    return color_map.get(status, "gray")

async def load_flagged_data_safe():
    """Safely load flagged data asynchronously."""
    try:
        flagged_data = await load_flagged_data()
        if not flagged_data:
            logger.warning("Flagged data is empty or could not be loaded.")
        return flagged_data or {}
    except Exception as e:
        logger.error(f"Failed to load flagged data: {e}")
        return {}

async def find_relationships_v2(address, chain='ethereum'):
    """Fetch parent and child relationships for the given Ethereum address."""
    try:
        transactions = await get_transaction_data(wallet_address=address, chains=[chain])
        parents = set()
        children_map = {}

        for chain_data in transactions:
            for tx in chain_data.get("transactions", []):
                from_address = tx.get("from", "").lower()
                to_address = tx.get("to", "").lower()

                if from_address and from_address != address.lower():
                    parents.add(from_address)
                    if from_address not in children_map:
                        children_map[from_address] = []
                if to_address and to_address != address.lower():
                    if from_address in children_map:
                        children_map[from_address].append(to_address)
                    else:
                        children_map[from_address] = [to_address]

        return list(parents), children_map
    except Exception as e:
        logger.error(f"Error fetching relationships for {address}: {e}")
        raise

async def generate_family_tree_v2(grandfather_address, chain='ethereum'):
    """Generate a family tree structure using transaction data."""
    logger.info(f"Fetching relationships for {grandfather_address} on chain {chain}.")
    parents, children = await find_relationships_v2(grandfather_address, chain)

    if parents:
        with tqdm(total=len(parents), desc="Fetching relationships for parents", unit="parent", ncols=100, colour='green') as progress_bar:
            for parent in parents:
                _, parent_children = await find_relationships_v2(parent, chain)
                if parent in children:
                    children[parent].extend(parent_children)
                else:
                    children[parent] = parent_children
                progress_bar.update(1)

    return {
        "grandfather": grandfather_address,
        "parents": parents,
        "children": children
    }

async def add_limited_nodes(net, family_tree, flagged_data, chain, max_nodes=None):
    """Add nodes and edges to the Pyvis network with optional node limits."""
    node_count = 0

    # Add the grandfather node
    grandparent = family_tree["grandfather"]
    grandparent_result = await check_address_in_dataset(grandparent, flagged_data, chain)
    grandparent_color = get_node_color_safe(grandparent_result["status"])
    net.add_node(grandparent, label=f"{grandparent} ({grandparent_result['status']})", color=grandparent_color)
    node_count += 1

    # Add parent nodes and their children
    for parent, children in family_tree["children"].items():
        if max_nodes and node_count >= max_nodes:
            logger.info(f"Node limit of {max_nodes} reached. Skipping additional nodes.")
            break
        parent_result = await check_address_in_dataset(parent, flagged_data, chain)
        parent_color = get_node_color_safe(parent_result["status"])
        net.add_node(parent, label=f"{parent} ({parent_result['status']})", color=parent_color)
        net.add_edge(grandparent, parent)
        node_count += 1

        for child in children:
            if max_nodes and node_count >= max_nodes:
                logger.info(f"Node limit of {max_nodes} reached. Skipping additional nodes.")
                break
            child_result = await check_address_in_dataset(child, flagged_data, chain)
            child_color = get_node_color_safe(child_result["status"])
            net.add_node(child, label=f"{child} ({child_result['status']})", color=child_color)
            net.add_edge(parent, child)
            node_count += 1

async def visualize_risk(address, chain='ethereum', max_nodes=None):
    """Visualize risk relationships for an Ethereum address."""
    try:
        flagged_data = await load_flagged_data_safe()
        if not flagged_data:
            raise RuntimeError("Flagged data is missing or invalid.")

        logger.info(f"Generating family tree for address: {address}")
        family_tree = await generate_family_tree_v2(address, chain)
        filename = f"{address[:6]}_family_tree.json"
        filepath = save_family_tree(family_tree, filename)

        net = Network(height="1200px", width="100%", bgcolor="#000000", font_color="white")
        await add_limited_nodes(net, family_tree, flagged_data, chain, max_nodes)

        output_file = "family_risk_visualization.html"
        net.show(output_file)

        blob_path = f'visualizations/risk/{output_file}'
        return upload_to_firebase(output_file, blob_path)

    except Exception as e:
        logger.error(f"Error during visualization: {e}")
        raise

def upload_to_firebase(output_file, blob_path):
    """Upload a file to Firebase Storage."""
    try:
        with open(output_file, 'rb') as f:
            blob = bucket.blob(blob_path)
            blob.upload_from_file(f, content_type='text/html')
        logger.info(f"Uploaded visualization to Firebase at {blob_path}")
        return blob.generate_signed_url(expiration=datetime.timedelta(hours=1))
    except Exception as e:
        logger.error(f"Failed to upload {output_file} to Firebase: {e}")
        raise

def save_family_tree(family_tree, filename):
    """Save the family tree to a JSON file."""
    os.makedirs(UNIQUE_DIR, exist_ok=True)
    filepath = os.path.join(UNIQUE_DIR, filename)
    with open(filepath, 'w') as f:
        json.dump(family_tree, f, indent=2)
    logger.info(f"Family tree saved to {filepath}")
    return filepath
