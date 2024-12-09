# api_health.py
import json

def get_endpoints():
    """
    Consolidated metadata for all API endpoints currently implemented.
    """
    endpoints = [
        {
            "endpoint": "/api/health",
            "methods": ["GET"],
            "description": "Returns the health status of the API and its endpoints."
        },
        {
            "endpoint": "/api/get_flagged_addresses",
            "methods": ["GET"],
            "description": "Serve flagged addresses dataset dynamically."
        },
        {
            "endpoint": "/api/checkaddress",
            "methods": ["POST"],
            "description": "Check wallet addresses against flagged datasets."
        },
    
        {
            "endpoint": "/api/metrics",
            "methods": ["POST"],
            "description": "Fetch wallet metrics for a given address."
        },
        {
            "endpoint": "/api/narrative",
            "methods": ["POST"],
            "description": "Generate a financial narrative from provided metrics."
        },
        {
            "endpoint": "/api/origins",
            "methods": ["POST"],
            "description": "Analyze and fetch origin data for wallet addresses."
        },
        {
            "endpoint": "/api/visualize",
            "methods": ["POST"],
            "description": "Generate and upload a family tree visualization."
        },
        {
            "endpoint": "/api/full_report",
            "methods": ["POST"],
            "description": "Generate a comprehensive full report for a wallet."
        },
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
