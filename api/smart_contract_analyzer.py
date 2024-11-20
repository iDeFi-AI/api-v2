from flask import Blueprint, request, jsonify
import os
import re
import requests
import time

# Create Blueprint
smart_contract_analyzer = Blueprint('smart_contract_analyzer', __name__)

# Environment Variables
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
ETHERSCAN_API_KEY = os.getenv('NEXT_PUBLIC_ETHERSCAN_API_KEY')
AI_SERVICE_URL = 'https://api.openai.com/v1/chat/completions'
TOKEN_LIMIT = 2048


def is_valid_solidity_code(code: str) -> bool:
    """Check for basic Solidity validity."""
    return bool(re.search(r'\bpragma solidity\b', code))


def chunk_text(text, max_tokens=TOKEN_LIMIT):
    """Chunk the Solidity code into smaller parts for analysis."""
    lines = text.splitlines()
    chunks = []
    current_chunk = []
    current_length = 0

    for line in lines:
        line_length = len(line.split())
        if current_length + line_length > max_tokens:
            chunks.append("\n".join(current_chunk))
            current_chunk = []
            current_length = 0
        current_chunk.append(line)
        current_length += line_length

    if current_chunk:
        chunks.append("\n".join(current_chunk))

    return chunks


def make_ai_request(payload, max_retries=3):
    """Send a request to the AI API with retries."""
    retries = 0
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {OPENAI_API_KEY}'
    }

    while retries < max_retries:
        response = requests.post(AI_SERVICE_URL, json=payload, headers=headers)
        if response.status_code == 200:
            return response.json()
        elif response.status_code in (429, 500):  # Rate limit or server error
            retries += 1
            time.sleep(2 ** retries)  # Exponential backoff
        else:
            response.raise_for_status()
    raise Exception("Max retries reached while communicating with the AI API.")


def format_analysis_response(analysis_result):
    """Format the AI response into a structured JSON."""
    structured_response = {
        "security_vulnerabilities": [],
        "gas_optimizations": [],
        "readability_improvements": [],
    }
    for choice in analysis_result.get('choices', []):
        content = choice['message']['content']
        if "Security vulnerabilities" in content:
            structured_response["security_vulnerabilities"].append(content)
        elif "Gas optimizations" in content:
            structured_response["gas_optimizations"].append(content)
        elif "Readability improvements" in content:
            structured_response["readability_improvements"].append(content)
    return structured_response


@smart_contract_analyzer.route('/api/analyze_smart_contract', methods=['POST'])
def analyze_smart_contract():
    """Endpoint to analyze Solidity smart contract code."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and file.filename.endswith('.sol'):
        try:
            # Read the smart contract code
            contract_code = file.read().decode('utf-8')

            if not is_valid_solidity_code(contract_code):
                return jsonify({'error': 'Invalid Solidity code'}), 400

            chunks = chunk_text(contract_code)

            # Analyze each chunk and combine results
            combined_results = []
            for chunk in chunks:
                payload = {
                    'model': 'gpt-4o-mini',
                    'messages': [{'role': 'system', 'content': f"Analyze the following Solidity smart contract: {chunk}"}]
                }
                result = make_ai_request(payload)
                combined_results.append(format_analysis_response(result))

            return jsonify({'analysis': combined_results}), 200

        except Exception as e:
            return jsonify({'error': str(e)}), 500
    else:
        return jsonify({'error': 'Unsupported file type. Only .sol files are allowed'}), 400
