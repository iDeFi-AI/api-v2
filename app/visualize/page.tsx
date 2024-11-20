'use client';

import React, { useState, useEffect } from 'react';

const VisualizeRelationshipsPage: React.FC = () => {
  const [sourceType, setSourceType] = useState<'sample_data' | 'address'>('sample_data');
  const [filename, setFilename] = useState('');
  const [fileOptions, setFileOptions] = useState<string[]>([]);
  const [maxNodes, setMaxNodes] = useState<number | null>(null);
  const [visualizationUrl, setVisualizationUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newAddress, setNewAddress] = useState<string>('');
  const [chain, setChain] = useState<string>('ethereum');

  const shortenUrl = (url: string) => {
    if (url.length > 50) {
      return `${url.slice(0, 50)}...${url.slice(-10)}`;
    }
    return url;
  };

  useEffect(() => {
    if (sourceType === 'sample_data') {
      const fetchFiles = async () => {
        try {
          const response = await fetch('/api/list_json_files');
          const data = await response.json();
          setFileOptions(data.files || []);
        } catch (error) {
          setError('Failed to load file options.');
        }
      };
      fetchFiles();
    }
  }, [sourceType]);

  const handleVisualize = async () => {
    setLoading(true);
    setError('');
    setVisualizationUrl(null);

    try {
      const response = await fetch('/api/visualize_dataset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_type: sourceType,
          filename: sourceType === 'sample_data' ? filename : null,
          address: sourceType === 'address' ? newAddress : null,
          chain: sourceType === 'address' ? chain : null,
          max_nodes: maxNodes,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setVisualizationUrl(data.visualization_url);
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
        Select a sample dataset or enter an Ethereum address to visualize relationships across chains.
      </p>

      <div className="input-group grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
        <div>
          <label className="block text-sm font-medium mb-2">Source Type</label>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as 'sample_data' | 'address')}
            className="w-full px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-neorange"
          >
            <option value="sample_data">Sample Data</option>
            <option value="address">Ethereum Address</option>
          </select>
        </div>

        {sourceType === 'sample_data' && (
          <div>
            <label className="block text-sm font-medium mb-2">Select File</label>
            <select
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-neorange"
            >
              <option value="">Select a file</option>
              {fileOptions.map((file) => (
                <option key={file} value={file}>
                  {file}
                </option>
              ))}
            </select>
          </div>
        )}

        {sourceType === 'address' && (
          <>
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
              <label className="block text-sm font-medium mb-2">Blockchain Chain</label>
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
          </>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">Max Nodes (optional)</label>
          <input
            type="number"
            value={maxNodes || ''}
            onChange={(e) => setMaxNodes(Number(e.target.value) || null)}
            placeholder="Max nodes"
            className="w-full px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-neorange"
          />
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
            src={visualizationUrl}
            className="w-full h-96 border rounded-md shadow-md"
            allowFullScreen
          ></iframe>
        </div>
      )}
    </div>
  );
};

export default VisualizeRelationshipsPage;
