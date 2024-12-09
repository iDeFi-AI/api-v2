import { openaiApiKey } from '@/constants/env';

// Define the structure for address checking results
export interface AddressCheckResult {
  address: string;
  description: string;
  grandparent?: string; // Optional grandparent address
  parents?: string[]; // Optional array of parent addresses
  children?: Record<string, string[]>; // Optional children structure (parent -> children map)
  transactionHash?: string;
  from?: string;
  to?: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  parentTxnHash?: string;
  etherscanUrl?: string;
  insights?: any; // Additional analysis data if required
}

interface PromptContent {
  addresses: string[];
  results: string[];
}

// Function to generate a prompt for address checking
export const generateAddressCheckPrompt = async (content: PromptContent): Promise<string> => {
  const { addresses, results } = content;

  const promptContent = `
    Firewall Analytics:
    Analyze the following Ethereum addresses and provide insights regarding their activities.

    Addresses:
    ${addresses.map((addr) => `- ${addr}`).join('\n')}

    Results:
    ${results.map((result, index) => `Result ${index + 1}: ${result}`).join('\n')}

    Please provide detailed analysis and classify each address as 'PASS', 'FAIL', or 'WARNING' based on the results.
  `;

  return await callOpenAiApi(promptContent);
};

// Helper function to call the OpenAI API
export const callOpenAiApi = async (promptContent: string): Promise<string> => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant helping users analyze Ethereum addresses and documentation.',
          },
          { role: 'user', content: promptContent },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const responseData = await response.json();
    const generatedPrompt = responseData?.choices?.[0]?.message?.content || '';
    return generatedPrompt;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
};

// Process address check results
export const processAddressCheck = async (
  data: AddressCheckResult[],
  flaggedAddresses: Set<string>
): Promise<AddressCheckResult[]> => {
  try {
    const updatedResults: AddressCheckResult[] = data.map((result) => {
      let { status } = result;
      const grandparent = result.grandparent ? result.grandparent.toLowerCase() : '';
      const parents = result.parents || [];
      const children = result.children || {};

      // Check flagged addresses
      if (grandparent && flaggedAddresses.has(grandparent)) {
        status = 'FAIL';
      } else if (parents.some((parent) => flaggedAddresses.has(parent.toLowerCase()))) {
        status = 'WARNING';
      } else if (
        Object.values(children).flat().some((child) => flaggedAddresses.has(child.toLowerCase()))
      ) {
        status = 'WARNING';
      }

      return { ...result, status };
    });

    console.log('Final processed results:', updatedResults);
    return updatedResults;
  } catch (error) {
    console.error('Error processing address check:', error);
    throw error;
  }
};

// Handle the address check
export const handleAddressCheck = async (addresses: string[]): Promise<AddressCheckResult[]> => {
  try {
    const addressResults: AddressCheckResult[] = await fetch('/api/check_wallet_address', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ addresses }),
    }).then((res) => res.json());

    return addressResults;
  } catch (error) {
    console.error('Error handling address check:', error);
    throw error;
  }
};

// Rendering the results
export const renderResults = (results: AddressCheckResult[]): void => {
  const resultContainer = document.getElementById('results');
  if (!resultContainer) return;

  resultContainer.innerHTML = results
    .map(
      (result) => `
      <div class="bg-gray-700 p-4 rounded-lg mb-4">
        <h3 class="text-green-400 font-bold">Address: ${result.address}</h3>
        <p>Status: ${result.status}</p>
        <p>Description: ${result.description}</p>
        ${result.grandparent ? `<p>Grandparent: ${result.grandparent}</p>` : ''}
        ${
          result.parents
            ? `<p>Parents: ${result.parents.map((parent) => `<span>${parent}</span>`).join(', ')}</p>`
            : ''
        }
        ${
          result.children
            ? `<p>Children: ${Object.entries(result.children)
                .map(([parent, children]) => `${parent}: [${children.join(', ')}]`)
                .join('; ')}</p>`
            : ''
        }
      </div>
    `
    )
    .join('');
};

export const callAiAssistant = async (query: string): Promise<string> => {
  try {
    const response = await callOpenAiApi(query);
    return formatGenAiResponse(response);
  } catch (error) {
    console.error('Error in AI assistant:', error);
    throw error;
  }
};

const formatGenAiResponse = (response: string): string => {
  // Format the response with Markdown for better display
  return response
    .replace(/```python/g, '<pre><code class="language-python">')
    .replace(/```javascript/g, '<pre><code class="language-javascript">')
    .replace(/```/g, '</code></pre>')
    .replace(/\n/g, '<br />');
};

