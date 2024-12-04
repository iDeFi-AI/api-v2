import os
import multiprocessing
from dotenv import load_dotenv
import logging

# Load environment variables
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
dotenv_path = os.path.join(ROOT_DIR, ".env")

if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
    logging.info(f".env loaded successfully from: {dotenv_path}")
else:
    raise FileNotFoundError(f".env file not found at: {dotenv_path}")

# Validate environment variables
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
bind = "0.0.0.0:5328"  # Match Flask app's port
workers = max(4, multiprocessing.cpu_count() * 2 + 1)  # Increase minimum workers to 4
timeout = 1200  # Extend timeout to 20 minutes for longer requests
graceful_timeout = 300  # Allow 5 minutes for workers to finish ongoing requests
loglevel = "info"

# Enable threading for better concurrency
threads = max(2, multiprocessing.cpu_count())  # Threads equal to CPU count for concurrency

# Logging
accesslog = "-"  # Log access logs to stdout
errorlog = "-"   # Log error logs to stderr

# Persistent connections
keepalive = 120  # Keep idle connections open for 120 seconds

# Logging configuration
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)

logging.info("Gunicorn configuration loaded successfully.")
