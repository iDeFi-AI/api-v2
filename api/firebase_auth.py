from flask import request, jsonify
import logging
from firebase_admin import auth  # Ensure firebase_admin SDK is properly configured

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def firebase_auth_middleware(func):
    """
    Middleware to verify Firebase ID token and extract UID.
    """
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            logger.warning("Authorization header is missing or improperly formatted.")
            return jsonify({"error": "Authorization header is missing or improperly formatted"}), 401

        try:
            # Extract the token from the "Bearer <token>" format
            id_token = auth_header.split(" ")[1]
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token.get("uid")

            if not uid:
                logger.error("UID not found in token.")
                return jsonify({"error": "Invalid token: UID not found"}), 401

            # Attach UID to the request context for further use
            request.uid = uid
            logger.info(f"User authenticated successfully with UID: {uid}")
            return func(*args, **kwargs)

        except Exception as e:
            logger.error(f"Authentication failed: {str(e)}")
            return jsonify({"error": "Authentication failed", "details": str(e)}), 401

    wrapper.__name__ = func.__name__  # Preserve the original function's name
    return wrapper
