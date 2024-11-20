import { openaiApiKey } from '@/constants/env';

// Define the structure for address checking results
export interface AddressCheckResult {
  address: string;
  description: string;
  grandparent?: string;  // Optional grandparent address
  parents?: string[];  // Optional array of parent addresses
  children?: Record<string, string[]>;  // Optional children structure (parent -> children map)
  transactionHash?: string;
  from?: string;
  to?: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  parentTxnHash?: string;
  etherscanUrl?: string;
  insights?: any;  // Additional analysis data if required
}

interface PromptContent {
  addresses: string[];
  results: string[];
}

// Function to generate prompt for address checking
export const generateAddressCheckPrompt = async (content: PromptContent): Promise<string> => {
  const { addresses, results } = content;

  const promptContent = `
    Firewall Analytics:
    Analyze the following Ethereum addresses and provide insights regarding their activities.

    Addresses:
    ${addresses.map(addr => `- ${addr}`).join('\n')}
  
    Results:
    ${results.map((result, index) => `Result ${index + 1}: ${result}`).join('\n')}

    Please provide detailed analysis and classify each address as 'PASS', 'FAIL', or 'WARNING' based on the results.
  `;

  return await callOpenAiApi(promptContent);
};

// Helper function to call the OpenAI API
const callOpenAiApi = async (promptContent: string): Promise<string> => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: promptContent }],
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
export const processAddressCheck = async (data: AddressCheckResult[], flaggedAddresses: Set<string>): Promise<AddressCheckResult[]> => {
  try {
    const updatedResults: AddressCheckResult[] = data.map(result => {
      // Assume that status is already determined by the backend
      let { status } = result;

      // If backend didn't set a status (i.e., it's a new entry), we determine it
      const grandparent = result.grandparent ? result.grandparent.toLowerCase() : '';
      const parents = result.parents || [];
      const children = result.children || {};

      // Check if the grandparent is flagged
      if (grandparent && flaggedAddresses.has(grandparent)) {
        status = 'FAIL';  // Immediate fail if grandparent is flagged
      }

      // Check parents if grandparent is not flagged
      if (status !== 'FAIL' && parents.length > 0) {
        for (const parent of parents) {
          if (flaggedAddresses.has(parent.toLowerCase())) {
            status = 'WARNING';  // Set to warning if any parent is flagged
            break;
          }
        }
      }

      // Check children if neither grandparent nor parents are flagged
      if (status !== 'FAIL' && status !== 'WARNING' && Object.keys(children).length > 0) {
        for (const childKey in children) {
          const childArray = children[childKey];
          if (childArray.some(child => flaggedAddresses.has(child.toLowerCase()))) {
            status = 'WARNING';  // Set to warning if any child is flagged
            break;
          }
        }
      }

      // Return the updated result with correct status
      return { ...result, status };
    });

    console.log("Final processed results:", updatedResults);
    return updatedResults;
  } catch (error) {
    console.error('Error processing address check:', error);
    throw error;
  }
};

// Example of handling the address check on the frontend
export const handleAddressCheck = async (addresses: string[]) => {
  try {
    // Fetch results from the backend API
    const addressResults: AddressCheckResult[] = await fetch('/api/check_wallet_address', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ addresses }), // Sending addresses directly
    }).then(res => res.json());

    // Call the render function to display results on the page
    renderResults(addressResults);  // No need to process further as we trust backend logic
  } catch (error) {
    console.error('Error handling address check:', error);
  }
};

// Rendering the results on the frontend
export const renderResults = (results: AddressCheckResult[]) => {
  const resultContainer = document.getElementById('results');
  if (!resultContainer) return;

  resultContainer.innerHTML = results.map(result => `
    <div>
      <h3>Address: ${result.address}</h3>
      <p>Status: ${result.status}</p>
      <p>Description: ${result.description}</p>
    </div>
  `).join('');
};
