import os
import json
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any, Tuple
from api.tools.etherscanv2 import get_transaction_data, is_valid_ethereum_address

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Resolve the path for known origins
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
KNOWN_ORIGINS_PATH = os.path.normpath(os.path.join(
    ROOT_DIR,
    "known_origins",
    "contract_origins.json"
))


def load_known_origins() -> List[Dict[str, Any]]:
    """
    Load known origins from a local JSON file.
    """
    try:
        logger.info(f"Resolved path for known origins: {KNOWN_ORIGINS_PATH}")
        if not os.path.exists(KNOWN_ORIGINS_PATH):
            raise FileNotFoundError(f"File not found at {KNOWN_ORIGINS_PATH}")

        with open(KNOWN_ORIGINS_PATH, "r") as f:
            known_origins = json.load(f)
        logger.info(f"Loaded {len(known_origins)} known origins successfully.")
        return known_origins
    except FileNotFoundError as e:
        logger.error(f"Known origins file not found: {e}")
        return []
    except json.JSONDecodeError as e:
        logger.error(f"Error decoding JSON from {KNOWN_ORIGINS_PATH}: {e}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error loading known origins: {e}")
        return []


def build_relationships(transactions: List[Dict[str, Any]]) -> Dict[str, List[str]]:
    """
    Build relationships between addresses based on transaction data.
    """
    relationships = {}
    for tx in transactions:
        from_addr = tx.get("from", "").lower()
        to_addr = tx.get("to", "").lower()

        if from_addr and to_addr:
            if from_addr not in relationships:
                relationships[from_addr] = []
            relationships[from_addr].append(to_addr)

    return relationships


def label_addresses(addresses: List[str], known_origins: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """
    Label unique addresses with known information or inferred data.
    """
    address_labels = {}
    origin_map = {o.get("address", "").lower(): o for o in known_origins}

    for address in addresses:
        if address in origin_map:
            origin = origin_map[address]
            address_labels[address] = {
                "name": origin.get("name", "Unknown"),
                "type": origin.get("type", "Unknown"),
                "source": "Known Origin"
            }
        else:
            address_labels[address] = {
                "name": "Unknown",
                "type": "Unknown",
                "source": "Inferred"
            }

    return address_labels


def match_transactions_with_origins(transactions: List[Dict[str, Any]], known_origins: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Match transactions with known origins.
    """
    matched_origins = []
    origin_map = {o.get("address", "").lower(): o for o in known_origins}

    for tx in transactions:
        from_addr = tx.get("from", "").lower()
        to_addr = tx.get("to", "").lower()

        if from_addr in origin_map:
            o = origin_map[from_addr]
            matched_origins.append({
                "transaction_hash": tx.get("hash"),
                "origin_name": o.get("name", "Unknown"),
                "origin_type": o.get("type", "Unknown"),
                "origin_address": from_addr
            })
        elif to_addr in origin_map:
            o = origin_map[to_addr]
            matched_origins.append({
                "transaction_hash": tx.get("hash"),
                "origin_name": o.get("name", "Unknown"),
                "origin_type": o.get("type", "Unknown"),
                "origin_address": to_addr
            })

    logger.info(f"Matched {len(matched_origins)} known origins for {len(transactions)} transactions.")
    return matched_origins


def format_timestamp(ts: str) -> str:
    """
    Convert a timestamp string (assumed to be Unix epoch in seconds) to a readable ISO 8601 format.
    """
    try:
        dt = datetime.utcfromtimestamp(int(ts))
        return dt.isoformat() + "Z"
    except:
        return ts


async def fetch_transaction_data(address: str) -> List[Dict[str, Any]]:
    """
    Fetch transactions for a given Ethereum address.
    """
    try:
        transactions = await get_transaction_data(address)
        if transactions and isinstance(transactions, list):
            total_txs = sum(len(c["transactions"]) for c in transactions if "transactions" in c)
            logger.info(f"Fetched data from {len(transactions)} chains, total {total_txs} transactions for {address}.")
            return transactions
        else:
            logger.warning(f"No transaction data returned for {address}.")
    except Exception as e:
        logger.error(f"Error fetching data for {address}: {e}")
    return []


async def process_address(address: str, known_origins: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Process an Ethereum address by fetching its transactions, matching known origins, and labeling addresses.
    """
    if not is_valid_ethereum_address(address):
        logger.warning(f"Invalid Ethereum address: {address}")
        return {"address": address, "status": "INVALID_ADDRESS", "known_origins": [], "transactions": []}

    logger.info(f"Processing address: {address}")
    result = {"address": address, "known_origins": [], "transactions": [], "status": "PROCESSED"}

    transactions = await fetch_transaction_data(address)
    if not transactions:
        logger.warning(f"No transactions found for {address}")
        result["status"] = "NO_TRANSACTIONS"
        return result

    flattened_transactions = [
        {
            "hash": tx.get("hash"),
            "from": tx.get("from", "").lower(),
            "to": tx.get("to", "").lower(),
            "value_in_eth": tx.get("value_ether", 0.0),
            "function_name": tx.get("functionName", "N/A"),
            "timestamp_utc": format_timestamp(tx.get("timeStamp", "0"))
        }
        for chain_data in transactions
        for tx in chain_data.get("transactions", [])
    ]

    unique_addresses, unique_transactions = extract_unique_addresses_and_transactions(flattened_transactions)
    relationships = build_relationships(flattened_transactions)
    address_labels = label_addresses(unique_addresses, known_origins)

    matched_origins = match_transactions_with_origins(unique_transactions, known_origins)

    # Summarize origins
    origin_counts = {}
    for mo in matched_origins:
        key = (mo["origin_name"], mo["origin_address"])
        origin_counts[key] = origin_counts.get(key, 0) + 1
    origin_summary = sorted(
        [{"origin_name": k[0], "origin_address": k[1], "count": v} for k, v in origin_counts.items()],
        key=lambda x: x["count"], reverse=True
    )

    result["known_origins"] = matched_origins
    result["transactions"] = unique_transactions
    result["relationships"] = relationships
    result["address_labels"] = address_labels
    result["origin_interaction_summary"] = origin_summary

    return result


async def process_addresses_async(addresses: List[str]) -> List[Dict[str, Any]]:
    """
    Process multiple Ethereum addresses asynchronously.
    """
    known_origins = load_known_origins()
    if not known_origins:
        logger.warning("No known origins loaded. Matches will be empty.")
    else:
        logger.info(f"Loaded {len(known_origins)} known origins for matching.")

    logger.info(f"Processing {len(addresses)} addresses.")
    tasks = [process_address(addr, known_origins) for addr in addresses]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    processed_results = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            logger.error(f"Error processing address {addresses[i]}: {result}")
            processed_results.append({
                "address": addresses[i],
                "status": "ERROR",
                "details": str(result),
                "known_origins": [],
                "transactions": []
            })
        else:
            processed_results.append(result)

    return processed_results
