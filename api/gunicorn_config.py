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
bind = "0.0.0.0:5328"  # Match the Flask port
workers = multiprocessing.cpu_count() * 2 + 1  # Dynamic worker count
timeout = 300  # Match the maximum duration of your serverless function
loglevel = "info"

# Logging setup
accesslog = "-"  # Log to stdout
errorlog = "-"   # Log to stderr

# Setup logging configuration
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)

logging.info("Gunicorn configuration loaded successfully.")
