from flask import request, jsonify  # Add this import
import logging
from firebase_admin import auth  # Firebase Admin SDK

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def firebase_auth_middleware(func):
    """
    Middleware to verify and match UID from the Authorization header.
    """
    def wrapper(*args, **kwargs):
        # Access the Authorization header from the request
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            logger.warning("Authorization header is missing or improperly formatted.")
            return jsonify({"error": "Authorization header is missing or improperly formatted"}), 401

        try:
            # Extract UID directly from Authorization header
            uid = auth_header.split(" ")[1]
            logger.debug(f"Received UID from Authorization header: {uid}")

            # Attach UID to the request context for further use
            request.uid = uid
            logger.info(f"User authenticated successfully with UID: {uid}")

            # Pass control to the wrapped function
            return func(*args, **kwargs)

        except Exception as e:
            logger.error(f"Authentication failed: {str(e)}")
            return jsonify({"error": "Authentication failed", "details": str(e)}), 401

    wrapper.__name__ = func.__name__
    return wrapper
