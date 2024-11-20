import os
import requests
import logging
import json
from datetime import datetime

# Retrieve API keys from environment variables
ETHERSCAN_API_KEY = os.getenv('ETHERSCAN_API_KEY')
OPENAI_API_KEY = os.getenv('NEXT_PUBLIC_OPENAI_API_KEY')

logger = logging.getLogger(__name__)

def fetch_transactions(address):
    url = f'https://api.etherscan.io/api?module=account&action=txlist&address={address}&startblock=0&endblock=99999999&sort=asc&apikey={ETHERSCAN_API_KEY}'
    response = requests.get(url)
    data = response.json()
    return data['result'] if data['status'] == '1' else []

def analyze_transactions(address, transactions):
    on_chain_to_off_chain = {}
    off_chain_to_on_chain = {}

    for tx in transactions:
        if tx['from'].lower() == address.lower():
            if tx['to'].lower() not in on_chain_to_off_chain:
                on_chain_to_off_chain[tx['to'].lower()] = 0
            on_chain_to_off_chain[tx['to'].lower()] += int(tx['value'])
        elif tx['to'].lower() == address.lower():
            if tx['from'].lower() not in off_chain_to_on_chain:
                off_chain_to_on_chain[tx['from'].lower()] = 0
            off_chain_to_on_chain[tx['from'].lower()] += int(tx['value'])

    return on_chain_to_off_chain, off_chain_to_on_chain

def analyze_with_ai(transactions):
    try:
        prompt_content = f"Analyze the following transactions: {json.dumps(transactions, indent=2)}"
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {OPENAI_API_KEY}',
            },
            json={
                'model': 'gpt-4o-minio',
                'messages': [{'role': 'system', 'content': prompt_content}]
            }
        )
        if response.status_code != 200:
            raise Exception(f"OpenAI API request failed with status {response.status_code}")

        response_data = response.json()
        return response_data['choices'][0]['message']['content']

    except Exception as e:
        logger.error(f"Error analyzing with AI: {e}")
        return "Failed to analyze transactions with AI"

def fetch_internal_transactions(address):
    url = f'https://api.etherscan.io/api?module=account&action=txlistinternal&address={address}&startblock=0&endblock=99999999&sort=asc&apikey={ETHERSCAN_API_KEY}'
    response = requests.get(url)
    data = response.json()
    return data['result'] if data['status'] == '1' else []

def fetch_token_transfers(address):
    url = f'https://api.etherscan.io/api?module=account&action=tokentx&address={address}&startblock=0&endblock=99999999&sort=asc&apikey={ETHERSCAN_API_KEY}'
    response = requests.get(url)
    data = response.json()
    return data['result'] if data['status'] == '1' else []

def summarize_transactions(transactions, unique_addresses, flagged_addresses):
    flagged_interactions = []
    risky_transactions_count = 0
    total_value = 0.0
    dates_involved = set()

    for tx in transactions:
        from_flagged = tx['from'].lower() in flagged_addresses or tx['from'].lower() in unique_addresses
        to_flagged = tx['to'].lower() in flagged_addresses or tx['to'].lower() in unique_addresses

        if from_flagged or to_flagged:
            flagged_interactions.append(tx)
            risky_transactions_count += 1
            total_value += float(tx['value']) / 1e18  # Convert Wei to Ether
            date = datetime.fromtimestamp(int(tx['timeStamp'])).strftime('%Y-%m-%d')
            dates_involved.add(date)

    summary = {
        'number_of_interactions_with_flagged_addresses': len(flagged_interactions),
        'number_of_risky_transactions': risky_transactions_count,
        'total_value': total_value,
        'all_dates_involved': sorted(list(dates_involved))
    }

    return summary

def analyze_transactions_with_flagged_addresses(transactions, unique_addresses, flagged_addresses):
    on_chain_to_off_chain, off_chain_to_on_chain = analyze_transactions(unique_addresses, transactions)
    summary = summarize_transactions(transactions, unique_addresses, flagged_addresses)

    return {
        "on_chain_to_off_chain": on_chain_to_off_chain,
        "off_chain_to_on_chain": off_chain_to_on_chain,
        "summary": summary
    }
