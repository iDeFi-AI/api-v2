'use client';

import React, { useState, useEffect } from 'react';
import { auth } from '@/utilities/firebaseClient'; // Import Firebase client
import { onAuthStateChanged } from 'firebase/auth';

const VisualizeRelationshipsPage: React.FC = () => {
  const [uid, setUid] = useState<string | null>(null); // Store user's UID
  const [idToken, setIdToken] = useState<string | null>(null); // Store Firebase Auth ID token
  const [newAddress, setNewAddress] = useState<string>(''); // Ethereum address input
  const [chain, setChain] = useState<string>('ethereum'); // Selected blockchain
  const [visualizationUrl, setVisualizationUrl] = useState<string | null>(null); // Visualization URL
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const shortenUrl = (url: string) => {
    if (url.length > 50) {
      return `${url.slice(0, 50)}...${url.slice(-10)}`;
    }
    return url;
  };

  // Monitor Firebase auth state and retrieve UID and ID token
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUid(currentUser.uid);
        const token = await currentUser.getIdToken(); // Get Firebase ID token
        setIdToken(token);
      } else {
        setUid(null);
        setIdToken(null);
      }
    });

    return () => unsubscribe(); // Cleanup on component unmount
  }, []);

  const handleVisualize = async () => {
    if (!uid || !idToken) {
      setError('You must be authenticated to visualize data.');
      return;
    }

    if (!newAddress) {
      setError('Please enter a valid Ethereum address.');
      return;
    }

    setLoading(true);
    setError('');
    setVisualizationUrl(null);

    try {
      const response = await fetch('/api/visualize_dataset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`, // Attach Firebase ID token
        },
        body: JSON.stringify({
          source_type: 'address', // Fixed as 'address'
          address: newAddress,
          chain,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setVisualizationUrl(data.visualization_url); // Use the returned signed URL
      } else {
        setError(data.error || 'An error occurred while visualizing the dataset. Please try again.');
      }
    } catch (error) {
      setError('An error occurred while visualizing the dataset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto min-h-screen flex flex-col rounded items-center py-12 px-4 bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <h1 className="text-3xl font-bold mb-6 text-center text-neorange">Ethereum Address Relationships</h1>
      <p className="text-lg mb-6 text-center text-gray-300">
        Enter an Ethereum address to visualize relationships across chains.
      </p>

      <div className="input-group grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        <div>
          <label className="block text-sm font-medium mb-2">Wallet Address</label>
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
            {loading ? 'Visualizing...' : 'Visualize'}
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 mt-4">{error}</p>}

      {visualizationUrl && (
        <div className="mt-8 w-full max-w-4xl">
          <h2 className="text-2xl font-bold mb-4 text-center">Visualization Result</h2>
          <p className="text-sm text-gray-300 mb-2 text-center">
            Visualization URL:{' '}
            <a href={visualizationUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              {shortenUrl(visualizationUrl)}
            </a>
          </p>
          <iframe
            src={visualizationUrl} // Use signed URL directly
            className="w-full h-96 border rounded-md shadow-md"
            allowFullScreen
          ></iframe>
        </div>
      )}
    </div>
  );
};

export default VisualizeRelationshipsPage;
