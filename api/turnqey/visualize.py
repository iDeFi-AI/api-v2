import asyncio
from pyvis.network import Network
from collections import defaultdict
import json
import os
import base64
import logging
from firebase_admin import credentials, storage
import firebase_admin
from api.tools.etherscanv2 import get_transaction_data, is_valid_ethereum_address

# Initialize logger
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# Firebase initialization
def initialize_firebase(app_name="visualize_relationships"):
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

# Helper to shorten Ethereum addresses
def shorten_address(address, length=6):
    return f"{address[:length]}...{address[-length:]}" if len(address) > 2 * length else address

# Fetch transactions for a wallet and build relationships
async def build_relationships(root_address):
    """Builds parent-child relationships for a wallet."""
    try:
        transactions = await get_transaction_data(root_address)
        relationships = defaultdict(list)

        for chain_data in transactions:
            for tx in chain_data.get("transactions", []):
                from_address = tx.get("from", "").lower()
                to_address = tx.get("to", "").lower()

                if from_address and from_address != root_address.lower():
                    relationships[root_address].append(from_address)
                if to_address and to_address != root_address.lower():
                    relationships[root_address].append(to_address)

        return relationships
    except Exception as e:
        logger.error(f"Error building relationships for {root_address}: {e}")
        raise

# Visualize relationships using PyVis
def visualize_relationships(relationships, root_address):
    """Visualizes relationships using PyVis."""
    net = Network(height="1000px", width="100%", bgcolor="#222222", font_color="white")
    net.set_options("""{
        "physics": {
            "solver": "forceAtlas2Based"
        },
        "nodes": {
            "font": {"size": 12},
            "borderWidth": 2
        }
    }""")

    # Add nodes and edges
    for parent, children in relationships.items():
        net.add_node(parent, label=shorten_address(parent), color="purple", shape="star")
        for child in children:
            net.add_node(child, label=shorten_address(child), color="blue")
            net.add_edge(parent, child)

    # Save the visualization locally
    output_file = f"{shorten_address(root_address)}_family_tree.html"
    net.show(output_file)
    return output_file

# Upload visualization to Firebase
def upload_to_firebase(local_path, root_address):
    """Uploads the visualization to Firebase and returns the public URL."""
    blob_path = f"visualizations/{shorten_address(root_address)}_family_tree.html"
    blob = bucket.blob(blob_path)
    with open(local_path, "rb") as f:
        blob.upload_from_file(f, content_type="text/html")
    blob.make_public()
    return blob.public_url

# Main function to create visualization
async def create_visualization(wallet_address):
    """Generates and uploads a visualization for a wallet."""
    try:
        # Validate wallet address
        if not is_valid_ethereum_address(wallet_address):
            raise ValueError("Invalid Ethereum address.")

        # Build relationships
        relationships = await build_relationships(wallet_address)
        if not relationships:
            raise ValueError("No transactions or relationships found for this wallet.")

        # Generate visualization
        visualization_path = visualize_relationships(relationships, wallet_address)

        # Upload visualization to Firebase
        firebase_url = upload_to_firebase(visualization_path, wallet_address)

        # Clean up local files
        if os.path.exists(visualization_path):
            os.remove(visualization_path)

        return {"visualization_url": firebase_url}

    except Exception as e:
        logger.error(f"Error creating visualization: {e}")
        raise
