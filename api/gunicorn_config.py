import os
import multiprocessing
from dotenv import load_dotenv
import logging

# Define the root directory path for the .env file
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
dotenv_path = os.path.join(ROOT_DIR, '.env')

# Explicitly load the .env file
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
    logging.info(f".env loaded successfully from: {dotenv_path}")
else:
    raise FileNotFoundError(f".env file not found at: {dotenv_path}")

# Validate required environment variables
required_env_vars = [
    "NEXT_PUBLIC_FIREBASE_SERVICE_ACCOUNT_KEY",
    "NEXT_PUBLIC_ETHERSCAN_API_KEY",
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_OPENAI_API_KEY",
    "NEXT_PUBLIC_BACKEND_URL",
]

missing_vars = [var for var in required_env_vars if not os.getenv(var)]

if missing_vars:
    raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

# Gunicorn configuration
bind = "0.0.0.0:5328"  # Match the Flask app's running port
workers = multiprocessing.cpu_count() * 2 + 1  # Recommended worker count formula
timeout = 300  # Extended timeout for long-running requests (300 seconds = 5 minutes)
graceful_timeout = 30  # Time for workers to complete ongoing requests before shutdown
loglevel = "info"  # Logging level

# Enable thread workers if needed (optional, set threads > 1 for concurrency per worker)
threads = 2

# Access and error logging
accesslog = "-"  # Log access logs to stdout
errorlog = "-"   # Log error logs to stderr

# Advanced keep-alive settings to handle hanging connections
keepalive = 75  # Time to keep idle connections open

# Setup logging configuration
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)

logging.info("Gunicorn configuration loaded successfully.")
