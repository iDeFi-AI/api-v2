'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/utilities/firebaseClient';
import { callAiAssistant } from '@/utilities/GenAi';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function DocsPage() {
  const [userUid, setUserUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [genAiResponse, setGenAiResponse] = useState<string>('');
  const [genAiLoading, setGenAiLoading] = useState(false);
  const [genAiPrompt, setGenAiPrompt] = useState<string>('');
  const [splitView, setSplitView] = useState(false); // New state for view toggle
  const [activeTab, setActiveTab] = useState('curl'); // Default active tab

  const iframeSrc = '/family_trees.html'; // Example iframe if needed

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserUid(user.uid);
        setError(null);
      } else {
        setUserUid(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => alert('Copied to clipboard!'))
      .catch((err) => console.error('Error copying to clipboard:', err));
  };

  const handleGenAiSubmit = async () => {
    if (!genAiPrompt) return;

    setGenAiLoading(true);
    try {
      const response = await callAiAssistant(genAiPrompt);
      setGenAiResponse(response.trim() || 'No response received.');
    } catch (err) {
      console.error('Error generating AI response:', err);
      setGenAiResponse('An error occurred while generating the response. Please try again.');
    } finally {
      setGenAiLoading(false);
    }
  };

  const parseResponse = (response: string) => {
    const sections = response.split(/```/); // Split response by code block markers
    return sections.map((section, index) => {
      const isCodeBlock = index % 2 !== 0; // Odd indices represent code blocks
      const languageMatch = section.match(/^(\w+)/);
      const language = languageMatch ? languageMatch[1] : 'text';

      if (isCodeBlock) {
        const codeContent = section.replace(/^(\w+)\n/, '');
        return (
          <div key={index} className="mb-4">
            <SyntaxHighlighter language={language} style={tomorrow}>
              {codeContent.trim()}
            </SyntaxHighlighter>
          </div>
        );
      }

      // Plain text sections
      return (
        <p key={index} className="text-gray-300 leading-relaxed mb-4">
          {section.trim().split('\n').map((line, idx) => (
            <span key={idx}>
              {line}
              <br />
            </span>
          ))}
        </p>
      );
    });
  };

  const examplePrompts = [
    {
      title: 'Fetch Metrics',
      endpoint: 'POST /api/metrics',
      prompt: `How do I retrieve wallet metrics using POST /api/metrics? Here is the request example you can copy:
  
  Method: POST
  URL: https://api-v2.idefi.ai/api/metrics
  Headers:
  Authorization: Bearer {your_uid}
  Content-Type: application/json
  Body:
  {
    "wallet_address": "0xYourWalletAddressHere"
  }

  How can I implement this in:
  1. A Python Flask backend?
  2. A JavaScript frontend?`,
    },
    {
      title: 'Generate Narrative',
      endpoint: 'POST /api/narrative',
      prompt: `How can I generate a professional financial report narrative using POST /api/narrative? Here is the request example:
  
  Method: POST
  URL: https://api-v2.idefi.ai/api/narrative
  Headers:
  Authorization: Bearer {your_uid}
  Content-Type: application/json
  Body:
  {
    "wallet_address": "0xYourWalletAddressHere",
    "financialMetrics": {
      "totalTransactions": 150,
      "transactionsByLayer": {
        "Layer1": 90,
        "Layer2": 60
      },
      "interactingWallets": 45,
      "interactingWalletTransactions": 120,
      "mostActiveWallet": {
        "address": "0xDEF456",
        "transactionCount": 20
      },
      "fraudRiskSummary": {
        "Low": 10,
        "Moderate": 25,
        "High": 10,
        "Flagged": 5
      }
    },
    "date": "2024-12-01"
  }
  
  How can I implement this in:
  1. A Python Flask backend?
  2. A JavaScript frontend?`,
    },
    {
      title: 'Visualize Transactions',
      endpoint: 'POST /api/visualize',
      prompt: `How can I generate and visualize wallet relationships using POST /api/visualize? Here is the request example:
  
  Method: POST
  URL: https://api-v2.idefi.ai/api/visualize
  Headers:
  Authorization: Bearer {your_uid}
  Content-Type: application/json
  Body:
  {
    "wallet_address": "0xYourWalletAddressHere",
    "chain": "ethereum",
    "max_depth": 3
  }
  
  How can I implement this in:
  1. A Python Flask backend?
  2. A JavaScript frontend?`,
    },
  ];

   // Updated renderEndpointExample function to allow for splitView
   const renderEndpointExample = (
    title: string,
    description: string,
    method: string,
    url: string,
    headers: string,
    body: string | null,
    response: string,
    status: number,
    iframeSrc?: string
  ) => (
    <div className="bg-gray-700 p-4 rounded-md mb-6 relative">
      <h3 className="text-white font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 mb-4">{description}</p>

      <div className={splitView ? "grid grid-cols-2 gap-4" : "flex flex-col gap-4"}>
  {/* Request Section */}
  <div className="bg-gray-800 p-4 rounded-md text-sm relative">
    <SyntaxHighlighter
      language={activeTab === "cURL" ? "bash" : activeTab === "JavaScript" ? "javascript" : "python"}
      style={tomorrow}
    >
      {activeTab === "cURL"
        ? `${method} "${url}" \\\n-H "${headers}"${body ? ` \\\n-d '${body}'` : ''}`
        : activeTab === "JavaScript"
        ? `fetch("${url}", {\n  method: "${method}",\n  headers: {\n    ${headers.replace(
            /: /g,
            ': "'
          )}",\n  },${body ? `\n  body: JSON.stringify(${body}),` : ''}\n}).then(res => res.json()).then(console.log);`
        : `import requests\n\nresponse = requests.${method.toLowerCase()}(\n  "${url}",\n  headers={${headers.replace(
            /: /g,
            ': "'
          )}},${body ? `\n  json=${body},` : ''}\n)\nprint(response.json())`}
    </SyntaxHighlighter>
    <button
      className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded"
      onClick={() =>
        copyToClipboard(
          activeTab === "cURL"
            ? `${method} "${url}" \\\n-H "${headers}"${body ? ` \\\n-d '${body}'` : ''}`
            : activeTab === "JavaScript"
            ? `fetch("${url}", {\n  method: "${method}",\n  headers: {\n    ${headers.replace(
                /: /g,
                ': "'
              )}",\n  },${body ? `\n  body: JSON.stringify(${body}),` : ''}\n}).then(res => res.json()).then(console.log);`
            : `import requests\n\nresponse = requests.${method.toLowerCase()}(\n  "${url}",\n  headers={${headers.replace(
                /: /g,
                ': "'
              )}},${body ? `\n  json=${body},` : ''}\n)\nprint(response.json())`
        )
      }
    >
      Copy Request
    </button>
  </div>

  {/* Response Section */}
  <div className="bg-gray-800 p-4 rounded-md text-sm relative">
    <p className="text-green-400 mb-2">Response ({status}):</p>
    <SyntaxHighlighter language="json" style={tomorrow}>
      {response}
    </SyntaxHighlighter>
    <button
      className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded"
      onClick={() => copyToClipboard(response)}
    >
      Copy Response
    </button>
  </div>
</div>


      {iframeSrc && (
        <div className="mt-8">
          <h2 className="text-xl text-neorange font-bold mb-4">Visual Example</h2>
          <iframe
            src={iframeSrc}
            title="Family Tree Visualization"
            className="w-full h-[800px] border-2 border-gray-700 rounded-md"
          ></iframe>
        </div>
      )}
    </div>
  );

  return (
    <main className="rounded flex flex-col items-center min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-700 text-white px-4 py-8">
      <div className="w-full max-w-6xl bg-gray-800 p-6 rounded-lg shadow-md relative">
        <h1 className="text-3xl text-neorange font-bold text-center mb-6">API Documentation</h1>

        {loading ? (
          <p className="text-center text-gray-400">Loading your details...</p>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : (
          <>
            {userUid && (
              <div className="mb-6">
                <h2 className="text-xl text-neorange font-bold mb-4">Your User ID (UID)</h2>
                <div className="flex items-center border border-gray-400 rounded-md p-2 mb-4 bg-gray-700">
                  <input
                    type="text"
                    className="flex-grow bg-transparent text-white text-sm sm:text-base outline-none"
                    value={userUid}
                    readOnly
                  />
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 text-xs sm:text-sm rounded-md ml-2"
                    onClick={() => copyToClipboard(userUid)}
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            {/* GenAI Assistant Section */}
            <div className="mt-8 bg-gray-900 p-6 rounded-lg">
              <h2 className="text-xl text-neorange font-bold mb-4">GenAI Assistant</h2>
              <div className="mb-4">
                <ul className="list-disc list-inside text-gray-400">
                  {examplePrompts.map((example, idx) => (
                    <li key={idx} className="mb-2">
                      <button
                        className="text-blue-400 hover:underline"
                        onClick={() => setGenAiPrompt(example.prompt)}
                      >
                        {example.title}
                      </button>{' '}
                      - <span>{example.endpoint}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <textarea
                className="w-full bg-gray-700 rounded-md p-4 text-sm text-white mb-4"
                rows={4}
                placeholder="Type a question or click an example prompt..."
                value={genAiPrompt}
                onChange={(e) => setGenAiPrompt(e.target.value)}
              ></textarea>

              <div className="bg-gray-800 p-6 rounded-md text-sm text-white">
                {genAiResponse && (
                  <>
                    <div className="mb-4">
                      <h3 className="font-bold text-green-400">GenAI Response:</h3>
                      <div className="space-y-4">{parseResponse(genAiResponse)}</div>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <button
                        className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md"
                        onClick={() => copyToClipboard(genAiResponse)}
                      >
                        Copy Full Response
                      </button>
                      <button
                        className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md"
                        onClick={() => setGenAiResponse('')}
                      >
                        Clear Response
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end mt-4">
                <button
                  className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md"
                  onClick={handleGenAiSubmit}
                  disabled={genAiLoading}
                >
                  {genAiLoading ? 'Generating...' : genAiResponse ? 'Submit Again' : 'Submit'}
                </button>
              </div>
            </div>

            {/* Title for Endpoints */}
            <div className="mt-8 flex items-center justify-between">
              <h2 className="text-xl text-neorange font-bold">Endpoints</h2>
              {/* Toggle View Button with Tooltip and Icons */}
              <div className="relative group">
                <button
                  className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-full focus:outline-none focus:ring focus:ring-orange-300"
                  onClick={() => setSplitView(!splitView)}
                >
                  {splitView ? (
                    // Heroicon: Bars3Icon (For single column)
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 5.25h16.5M3.75 12h16.5m-16.5 6.75h16.5"
                      />
                    </svg>
                  ) : (
                    // Heroicon: ViewColumnsIcon (For double column)
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.75 3.75h10.5v16.5H9.75zM3.75 3.75h4.5v16.5h-4.5z"
                      />
                    </svg>
                  )}
                </button>
                <div className="absolute bottom-10 right-0 bg-gray-800 text-white text-xs rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {splitView ? 'Single Column' : 'Double Column'}
                </div>
              </div>
            </div>
            {/* API Endpoints */}
            <div className="mt-6">
            {/* Tabs for Language Selection */}
            <div className="flex items-center justify-center gap-4 mb-4">
                {['cURL', 'JavaScript', 'Python'].map((language) => (
                  <button
                    key={language}
                    className={`p-2 px-4 rounded-md ${
                      activeTab === language ? 'bg-neorange text-white' : 'bg-gray-600 text-gray-200'
                    }`}
                    onClick={() => setActiveTab(language)}
                  >
                    {language}
                  </button>
                ))}
              </div>
            </div>

            {/* API Endpoints */}
            <div>
          {renderEndpointExample(
            'POST /api/metrics',
            'Fetch wallet metrics including Layer 1 and Layer 2 breakdowns, interacting wallets, and fraud risk analysis.',
            activeTab === 'cURL'
              ? 'curl -X POST'
              : activeTab === 'JavaScript'
              ? 'fetch("https://api-v2.idefi.ai/api/metrics", {'
              : 'import requests\n\nresponse = requests.post(',
            activeTab === 'cURL'
              ? 'https://api-v2.idefi.ai/api/metrics'
              : activeTab === 'JavaScript'
              ? ''
              : '"https://api-v2.idefi.ai/api/metrics",',
            activeTab === 'cURL'
              ? 'Authorization: Bearer {your_uid}"\n-H "Content-Type: application/json'
              : activeTab === 'JavaScript'
              ? '  method: "POST",\n  headers: {\n    Authorization: "Bearer {your_uid}",\n    "Content-Type": "application/json"\n  }'
              : 'headers={"Authorization": "Bearer {your_uid}", "Content-Type": "application/json"}',
            activeTab === 'cURL'
              ? '{"wallet_address": "0xYourWalletAddressHere"}'
              : activeTab === 'JavaScript'
              ? '{\n    wallet_address: "0xYourWalletAddressHere"}'
              : '{"wallet_address": "0xYourWalletAddressHere"}\n',
`{
    "wallet_address": "0xYourWalletAddressHere",
    "financialMetrics": {
    "totalTransactions": 250,
    "transactionsByChain": {
    "ethereum": 120,
    "polygon": 80,
    "arbitrum": 30,
    "optimism": 20
    },
      "transactionsByLayer": {
      "Layer1": 200,
      "Layer2": 50
    },
      "interactingWallets": 85,
      "fraudRiskSummary": {
      "Low": 40,
      "Moderate": 30,
      "High": 10,
      "Flagged": 5
    }
  }
}`,
            200
          )}

          {renderEndpointExample(
            'POST /api/narrative',
            'Generate a professional financial report narrative based on wallet metrics.',
            activeTab === 'cURL'
              ? 'curl -X POST'
              : activeTab === 'JavaScript'
              ? 'fetch("https://api-v2.idefi.ai/api/narrative", {'
              : 'import requests\n\nresponse = requests.post(',
            activeTab === 'cURL'
              ? 'https://api-v2.idefi.ai/api/narrative'
              : activeTab === 'JavaScript'
              ? ''
              : '"https://api-v2.idefi.ai/api/narrative",',
            activeTab === 'cURL'
              ? 'Authorization: Bearer {your_uid}"\n-H "Content-Type: application/json'
              : activeTab === 'JavaScript'
              ? '  method: "POST",\n  headers: {\n    Authorization: "Bearer {your_uid}",\n    "Content-Type": "application/json"\n  }'
              : 'headers={"Authorization": "Bearer {your_uid}", "Content-Type": "application/json"}',
            activeTab === 'cURL'
              ? '{"wallet_address": "0xYourWalletAddressHere"}'
              : activeTab === 'JavaScript'
              ? `{\n    wallet_address: "0xYourWalletAddressHere"}`
              : `{"wallet_address": "0xYourWalletAddressHere"`,
`{
  "narrative": "On 2024-12-01, wallet 0xYourWalletAddressHere recorded 150 transactions. Layer 1 networks accounted for 90 transactions, while Layer 2 networks contributed 60 transactions. The wallet interacted with 45 other wallets in 120 total transactions. The most active wallet interacting with this address was 0xDEF456, engaging in 20 transactions. Risk assessment flagged 5 wallets, with 10 wallets deemed high risk. Moderate and low-risk wallets totaled 25 and 10, respectively."
}`,
            200
          )}

          {renderEndpointExample(
            'POST /api/visualize',
            'Generate and visualize wallet relationships as an interactive graph.',
            activeTab === 'cURL'
              ? 'curl -X POST'
              : activeTab === 'JavaScript'
              ? 'fetch("https://api-v2.idefi.ai/api/visualize", {'
              : 'import requests\n\nresponse = requests.post(',
            activeTab === 'cURL'
              ? 'https://api-v2.idefi.ai/api/visualize'
              : activeTab === 'JavaScript'
              ? ''
              : '"https://api-v2.idefi.ai/api/visualize",',
            activeTab === 'cURL'
              ? 'Authorization: Bearer {your_uid}"\n-H "Content-Type: application/json"'
              : activeTab === 'JavaScript'
              ? '  method: "POST",\n  headers: {\n    Authorization: "Bearer {your_uid}",\n    "Content-Type": "application/json"\n  }'
              : 'headers={"Authorization": "Bearer {your_uid}", "Content-Type": "application/json"}',
            activeTab === 'cURL'
              ? '{"wallet_address": "0xYourWalletAddressHere"}'
              : activeTab === 'JavaScript'
              ? `{\n    wallet_address: "0xYourWalletAddressHere",\n }`
              : `{"wallet_address": "0xYourWalletAddressHere"}`,
`{
   "family_tree_file": "/data/family_trees/0xYour...ess_family_tree.json",
   "visualization_url": "https://api-v2-idefi-ai.firebasestorage.app/visualizations/0xYour...ess_family_tree.html"
}`,
            200,
            '/family_trees.html'
          )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
