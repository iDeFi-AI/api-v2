# api_health.py
import json

def get_endpoints():
    """
    Consolidated metadata for all API endpoints.
    """
    endpoints = [
        {"endpoint": "/api/get_flagged_addresses", "methods": ["GET"], "description": "Fetches flagged wallet addresses"},
        {"endpoint": "/api/checkaddress", "methods": ["GET", "POST"], "description": "Validates wallet addresses"},
        {"endpoint": "/api/generate_gpt_analysis", "methods": ["POST"], "description": "Generates GPT-based analysis"},
        {"endpoint": "/api/upload", "methods": ["POST"], "description": "Uploads a file for processing"},
        {"endpoint": "/api/download/<filename>", "methods": ["GET"], "description": "Downloads processed files"},
        {"endpoint": "/api/get_all_tokens", "methods": ["GET"], "description": "Fetches all API tokens for the user"},
        {"endpoint": "/api/validate_user", "methods": ["POST"], "description": "Validates Firebase user credentials"},
        {"endpoint": "/api/basic_metrics", "methods": ["GET"], "description": "Fetches basic metrics for a wallet"},
        {"endpoint": "/api/advanced_metrics", "methods": ["GET"], "description": "Fetches advanced metrics for a wallet"},
        {"endpoint": "/api/visualize_dataset", "methods": ["POST"], "description": "Visualizes datasets from files or addresses"},
        {"endpoint": "/api/transaction_summary", "methods": ["GET", "POST"], "description": "Provides a summary of transactions for a wallet"},
        {"endpoint": "/api/analyze_smart_contract", "methods": ["POST"], "description": "Analyzes Solidity smart contracts for issues"},
        {"endpoint": "/api/origins", "methods": ["GET", "POST"], "description": "Fetches origin data for wallet addresses"},
    ]
    return endpoints


def calculate_health(overrides=None):
    """
    Simulates health checks for API endpoints, allowing manual overrides.
    
    Args:
        overrides (dict): A dictionary where keys are endpoint paths, and values
                          are dicts with 'status' and/or 'message' to override.

    Returns:
        dict: A dictionary containing the overall API health status and endpoints.
    """
    if overrides is None:
        overrides = {}

    endpoints = get_endpoints()

    # Priority mapping for statuses
    status_priority = {"Offline": 1, "Migrating": 2, "Degraded": 3, "Online": 4}

    # Default to the highest priority (Online)
    overall_status = "Online"

    for endpoint in endpoints:
        try:
            # Default mock health status
            endpoint["status"] = "Online"
            endpoint["message"] = "Endpoint is functional"

            # Apply overrides if available
            if endpoint["endpoint"] in overrides:
                override = overrides[endpoint["endpoint"]]
                if "status" in override:
                    endpoint["status"] = override["status"]
                if "message" in override:
                    endpoint["message"] = override["message"]

            # Update overall status based on priority
            if status_priority[endpoint["status"]] < status_priority[overall_status]:
                overall_status = endpoint["status"]

        except Exception as e:
            endpoint["status"] = "Offline"
            endpoint["message"] = f"Error: {str(e)}"
            overall_status = "Offline"  # Override overall status to the lowest priority

    return {
        "overall_status": overall_status,
        "endpoints": endpoints
    }

