import json
import asyncio
import logging
from datetime import datetime
from tqdm.asyncio import tqdm

# Import modules from api.turnqey
from api.turnqey.metrics import generate_metrics
from api.turnqey.narrative import generate_narrative
from api.turnqey.origins import process_addresses_async
from api.turnqey.visualize import create_visualization

# Logging configuration
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

async def generate_turnqey_report(wallet_address: str):
    """
    Generates a comprehensive Turnqey report by integrating multiple Turnqey APIs.

    Args:
        wallet_address (str): The Ethereum wallet address to analyze.

    Returns:
        dict: Report metadata, including URLs for metrics, narrative, and visualization.
    """
    try:
        if not wallet_address:
            raise ValueError("Wallet address is required.")

        logger.info(f"Starting Turnqey report generation for wallet: {wallet_address}")

        with tqdm(total=4, desc="Generating Report", unit="step") as progress_bar:
            # Step 1: Fetch metrics
            logger.info("Fetching metrics...")
            metrics = generate_metrics(wallet_address)
            progress_bar.update(1)

            # Step 2: Analyze origins
            logger.info("Analyzing origins...")
            origins = process_addresses_async(wallet_address)
            progress_bar.update(1)

            # Step 3: Generate narrative
            logger.info("Generating narrative...")
            date = datetime.now().strftime("%Y-%m-%d")
            narrative = await generate_narrative(metrics, date)
            progress_bar.update(1)

            # Step 4: Create visualization
            logger.info("Creating visualization...")
            visualization_url = await create_visualization(wallet_address)
            progress_bar.update(1)

        # Combine all data into a single report
        full_report = {
            "date": date,
            "wallet_address": wallet_address,
            "metrics": metrics,
            "origins": origins,
            "narrative": narrative,
            "visualization_url": visualization_url,
        }

        # Save the full report to a JSON file
        report_file = f"{wallet_address}_turnqey_full_report.json"
        with open(report_file, "w") as file:
            json.dump(full_report, file, indent=4)

        logger.info(f"Full report generated: {report_file}")
        return full_report

    except Exception as e:
        logger.error(f"Error generating Turnqey Report: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python full_report.py <wallet_address>")
        sys.exit(1)

    wallet_address = sys.argv[1].strip()
    report = asyncio.run(generate_turnqey_report(wallet_address))
    print(json.dumps(report, indent=4))
