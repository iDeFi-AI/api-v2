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
from api.tools.etherscanv2 import get_etherscan_v2_details, CHAIN_API_BASE_URLS
from api.address_checker import check_address_in_dataset, load_flagged_data  # Import risk logic

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

def get_node_color(status):
    """Return the color for a node based on its status."""
    if status == "PASS":
        return "green"
    elif status == "WARNING":
        return "orange"
    elif status == "FAIL":
        return "red"
    return "gray"  # Default color

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

def add_family_tree_to_network(net, family_tree, flagged_data, chain):
    """
    Adds nodes and edges to the Pyvis network based on the family tree.
    Assigns colors to nodes based on the risk status determined using the flagged dataset.
    """
    # Add the grandfather node
    grandparent = family_tree["grandfather"]
    grandparent_result = check_address_in_dataset(grandparent, flagged_data, chain)
    grandparent_color = get_node_color(grandparent_result["status"])
    net.add_node(grandparent, label=grandparent, color=grandparent_color)

    # Add parent nodes and edges to grandparent
    for parent in family_tree["parents"]:
        parent_result = check_address_in_dataset(parent, flagged_data, chain)
        parent_color = get_node_color(parent_result["status"])
        net.add_node(parent, label=parent, color=parent_color)
        net.add_edge(grandparent, parent)

    # Add child nodes and edges to parents
    for parent, children in family_tree["children"].items():
        for child in children:
            child_result = check_address_in_dataset(child, flagged_data, chain)
            child_color = get_node_color(child_result["status"])
            net.add_node(child, label=child, color=child_color)
            net.add_edge(parent, child)

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
    flagged_data = load_flagged_data()
    if not flagged_data:
        raise RuntimeError("Failed to load flagged data.")

    family_tree = asyncio.run(generate_family_tree_v2(address, chain))
    filename = f"{shorten_address(address)}_family_tree.json"
    filepath = save_family_tree(family_tree, filename)

    net = Network(height="1200px", width="100%", bgcolor="#000000", font_color="white")
    add_family_tree_to_network(net, family_tree, flagged_data, chain)

    output_file = "family_relationships.html"
    net.show(output_file)

    blob_path = f'visualizations/{output_file}'
    with open(output_file, 'rb') as f:
        blob = bucket.blob(blob_path)
        blob.upload_from_file(f, content_type='text/html')
        logger.info(f"Uploaded visualization to {blob_path}")

    return blob.public_url
