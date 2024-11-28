'use client';

import React, { useState } from 'react';
import { auth } from '@/utilities/firebaseClient'; // Firebase client setup

const FamilyRiskPage: React.FC = () => {
  const [newAddress, setNewAddress] = useState<string>(''); // Ethereum address input
  const [chain, setChain] = useState<string>('ethereum'); // Selected blockchain
  const [visualizationUrl, setVisualizationUrl] = useState<string | null>(null); // Visualization URL
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVisualize = async () => {
    setLoading(true);
    setError('');
    setVisualizationUrl(null);

    if (!newAddress) {
      setError('Please enter a valid Ethereum address.');
      setLoading(false);
      return;
    }

    try {
      const currentUser = auth.currentUser; // Retrieve current Firebase user
      if (!currentUser) {
        setError('You must be logged in to perform this action.');
        setLoading(false);
        return;
      }

      // Get Firebase ID token
      const idToken = await currentUser.getIdToken();

      // Make the API request
      const response = await fetch('/api/visualize_risk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`, // Attach ID token
        },
        body: JSON.stringify({
          address: newAddress,
          chain,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setVisualizationUrl(data.visualization_url);
      } else {
        setError(data.error || 'An error occurred while generating the visualization. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while processing your request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container rounded mx-auto min-h-screen flex flex-col items-center py-8 px-4 bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <h1 className="text-3xl font-bold mb-4 text-center text-neorange">Family Risk Visualization</h1>
      <p className="text-lg mb-6 text-center text-gray-300">
        Enter an Ethereum address to visualize risk-based relationships.
      </p>

      <div className="input-group grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <div>
          <label className="block text-sm font-medium mb-2">Ethereum Address</label>
          <input
            type="text"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="Enter Ethereum address"
            className="w-full px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-neorange"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Blockchain</label>
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            className="w-full px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-neorange"
          >
            <option value="ethereum">Ethereum</option>
            <option value="base">Base</option>
            <option value="bsc">Binance Smart Chain</option>
            <option value="polygon">Polygon</option>
            <option value="arbitrum">Arbitrum</option>
            <option value="optimism">Optimism</option>
            <option value="avalanche">Avalanche</option>
            <option value="fantom">Fantom</option>
          </select>
        </div>
        <div className="col-span-full">
          <button
            onClick={handleVisualize}
            disabled={loading}
            className="w-full px-4 py-2 bg-neorange text-black font-bold rounded-md hover:bg-orange-500 transition focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            {loading ? 'Generating Visualization...' : 'Visualize'}
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 mt-4">{error}</p>}

      {visualizationUrl && (
        <div className="mt-8 w-full max-w-4xl">
          <h2 className="text-2xl font-bold mb-4 text-center">Visualization Result</h2>
          <iframe
            src={visualizationUrl}
            className="w-full h-96 border rounded-md shadow-md"
            allowFullScreen
          ></iframe>
        </div>
      )}
    </div>
  );
};

export default FamilyRiskPage;
