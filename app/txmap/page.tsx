'use client';

import React, { useState } from 'react';

const OnchainOffchain: React.FC = () => {
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [walletOrigins, setWalletOrigins] = useState<any>(null);
  const [lastOriginTransaction, setLastOriginTransaction] = useState<any>(null);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleFetchOrigins = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/origins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ addresses: [address] }),
      });
      const data = await response.json();

      if (response.ok) {
        setWalletOrigins(data.results || []);
        setLastOriginTransaction(data.last_origin_transaction || null);
      } else {
        throw new Error(data.error || 'Failed to fetch wallet origins.');
      }
    } catch (err) {
      console.error('Error fetching wallet origins:', err);
      setError('An error occurred while fetching wallet origins. Please try again.');
    }
    setLoading(false);
  };

  const handleAnalyzeTransactions = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/analyze_transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });
      const data = await response.json();

      if (response.ok) {
        setAiInsights(data.ai_insights || null);
      } else {
        throw new Error(data.error || 'Failed to analyze transactions.');
      }
    } catch (err) {
      console.error('Error analyzing transactions:', err);
      setError('An error occurred while analyzing transactions. Please try again.');
    }
    setLoading(false);
  };

  const renderWalletOrigins = () => {
    if (!walletOrigins || walletOrigins.length === 0) {
      return <p className="text-gray-400">No origins found for the specified address.</p>;
    }
    return walletOrigins.map((origin: any, index: number) => (
      <div key={index} className="p-4 bg-gray-700 rounded-md mb-4">
        <p>
          <strong>Name:</strong> {origin.name}
        </p>
        <p>
          <strong>Type:</strong> {origin.type}
        </p>
        <p>
          <strong>Address:</strong> {origin.address}
        </p>
      </div>
    ));
  };

  return (
    <main className="flex flex-col items-center min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-700 text-white px-4 py-8">
      <div className="w-full max-w-4xl bg-gray-800 p-6 rounded-lg shadow-md">
        <h1 className="text-3xl text-neorange font-bold text-center mb-6">Onchain to Offchain Analyzer</h1>
        <p className="text-lg text-center mb-6">
          Analyze wallet address origins and transaction patterns with AI-generated insights.
        </p>

        <div className="flex flex-col md:flex-row items-center gap-4 mb-6 w-full">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter Ethereum wallet address"
            className="w-full flex-grow p-3 rounded-md bg-gray-700 text-white focus:ring focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-wrap gap-4 w-full">
          <button
            onClick={handleFetchOrigins}
            disabled={loading}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition w-full md:w-auto"
          >
            {loading ? 'Fetching Origins...' : 'Check Origins'}
          </button>
          <button
            onClick={handleAnalyzeTransactions}
            disabled={loading}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-md transition w-full md:w-auto"
          >
            {loading ? 'Analyzing...' : 'Analyze Transactions'}
          </button>
        </div>

        {error && <p className="text-red-500 text-center mt-4">{error}</p>}

        {walletOrigins && (
          <div className="mt-6">
            <h2 className="text-2xl font-bold mb-4">Wallet Origins</h2>
            {renderWalletOrigins()}
          </div>
        )}

        {lastOriginTransaction && (
          <div className="mt-6">
            <h2 className="text-2xl font-bold mb-4">Last Originating Transaction</h2>
            <pre className="bg-gray-700 text-white p-4 rounded-md overflow-auto max-h-96">
              {JSON.stringify(lastOriginTransaction, null, 2)}
            </pre>
          </div>
        )}

        {aiInsights && (
          <div className="mt-6">
            <h2 className="text-2xl font-bold mb-4">AI Insights</h2>
            <pre className="bg-gray-700 text-white p-4 rounded-md overflow-auto max-h-96">
              {JSON.stringify(aiInsights, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="w-full max-w-4xl bg-yellow-100 text-yellow-800 p-4 rounded-md mt-6">
        <p>
          Note: By analyzing wallet data, you agree to share insights for improving our analysis tools.
        </p>
      </div>
    </main>
  );
};

export default OnchainOffchain;
