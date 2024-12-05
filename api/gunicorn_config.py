import os
import multiprocessing
from dotenv import load_dotenv
import logging
import sys

# Load environment variables
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
dotenv_path = os.path.join(ROOT_DIR, ".env")

try:
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path)
        logging.info(f".env loaded successfully from: {dotenv_path}")
    else:
        raise FileNotFoundError(f".env file not found at: {dotenv_path}")
except Exception as e:
    logging.error(f"Failed to load .env file: {e}")
    sys.exit(1)

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
    logging.error(f"Missing required environment variables: {', '.join(missing_vars)}")
    sys.exit(1)

logging.info("All required environment variables are present.")

# Gunicorn configuration
bind = "0.0.0.0:5328"  # Match Flask app's port
workers = max(4, multiprocessing.cpu_count() * 2 + 1)  # Minimum of 4 workers
threads = max(2, multiprocessing.cpu_count())  # Threads equal to CPU count
timeout = 1200  # Extend timeout to 20 minutes
graceful_timeout = 300  # Allow 5 minutes for graceful shutdown
keepalive = 120  # Keep idle connections open for 120 seconds
loglevel = "info"

# Logging
accesslog = "-"  # Log access logs to stdout
errorlog = "-"   # Log error logs to stderr

# Persistent logging configuration
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)

logging.info("Gunicorn configuration loaded successfully.")
logging.info(f"Bind Address: {bind}")
logging.info(f"Workers: {workers}, Threads: {threads}")
logging.info(f"Timeout: {timeout}, Graceful Timeout: {graceful_timeout}")
logging.info(f"Keepalive: {keepalive} seconds")

# Debugging worker lifecycle
def worker_exit(server, worker):
    logging.info(f"Worker {worker.pid} exited. Address: {bind}")
