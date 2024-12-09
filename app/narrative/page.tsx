'use client'

import { useState } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/hljs";

const NarrativePage = () => {
  const [walletAddress, setWalletAddress] = useState("");
  const [responseData, setResponseData] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerateNarrative = async () => {
    setLoading(true);
    setError("");
    setResponseData("");

    try {
      const response = await fetch("/api/narrative", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer {your_uid}`,
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          financialMetrics: {
            totalTransactions: 150,
            transactionsByLayer: {
              Layer1: 90,
              Layer2: 60,
            },
            interactingWallets: 45,
            interactingWalletTransactions: 120,
            mostActiveWallet: {
              address: "0xDEF456",
              transactionCount: 20,
            },
            fraudRiskSummary: {
              Low: 10,
              Moderate: 25,
              High: 10,
              Flagged: 5,
            },
          },
          date: "2024-12-01",
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      setResponseData(data.narrative);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="rounded flex flex-col items-center min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-700 text-white px-4 py-8">
      <div className="w-full max-w-6xl bg-gray-800 p-6 rounded-lg shadow-md relative">
        <h1 className="text-3xl text-neorange font-bold text-center mb-6">Generate Narrative</h1>

        <div className="mb-4">
          <label htmlFor="walletAddress" className="block text-gray-300 text-sm font-medium mb-2">
            Wallet Address
          </label>
          <input
            id="walletAddress"
            type="text"
            placeholder="Enter wallet address"
            className="w-full bg-gray-700 text-white rounded-md p-2 text-sm focus:ring focus:ring-neorange outline-none"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
          />
        </div>

        <div className="flex justify-end mb-4">
          <button
            className={`bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={handleGenerateNarrative}
            disabled={loading}
          >
            {loading ? "Generating..." : "Generate Narrative"}
          </button>
        </div>

        {error && (
          <div className="bg-red-500 text-white p-4 rounded-md mb-4">
            <p>Error: {error}</p>
          </div>
        )}

        {responseData && (
          <div className="bg-gray-800 p-4 rounded-md text-sm">
            <h2 className="text-lg text-neorange font-bold mb-2">Narrative Response</h2>
            <SyntaxHighlighter language="json" style={tomorrow}>
              {JSON.stringify(responseData, null, 2)}
            </SyntaxHighlighter>
            <button
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md"
              onClick={() => navigator.clipboard.writeText(responseData)}
            >
              Copy Narrative
            </button>
          </div>
        )}
      </div>
    </main>
  );
};

export default NarrativePage;
