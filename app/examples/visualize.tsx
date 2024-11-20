'use client';

import React, { useState, useEffect } from 'react';

const VisualizeRelationshipsPage: React.FC = () => {
  const [sourceType, setSourceType] = useState<'firebase' | 'address'>('firebase');
  const [filename, setFilename] = useState('');
  const [fileOptions, setFileOptions] = useState<string[]>([]);
  const [maxNodes, setMaxNodes] = useState<number | null>(null);
  const [visualizationUrl, setVisualizationUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newAddress, setNewAddress] = useState<string>('');
  const [chain, setChain] = useState<string>('ethereum');

  // Helper function to shorten the URL
  const shortenUrl = (url: string) => {
    if (url.length > 50) {
      return `${url.slice(0, 60)}...${url.slice(-10)}`; // Show first 30 and last 10 characters
    }
    return url;
  };

  // Fetch list of files for Firebase
  useEffect(() => {
    if (sourceType === 'firebase') {
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

  // Handle visualization request
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
          filename: sourceType === 'firebase' ? filename : null,
          address: sourceType === 'address' ? newAddress : null,
          chain: sourceType === 'address' ? chain : null,
          max_nodes: maxNodes,
        }),
      });

      const data = await response.json();
      console.log('Visualization URL response:', data); // Debugging log

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
    <div className="container mx-auto min-h-screen flex flex-col items-center py-12 px-4 md:px-8 lg:px-16">
      <h1 className="text-3xl font-bold mb-6 text-center">Visualize Ethereum Address Relationships</h1>
      <p className="text-lg mb-4 text-center">
        You can select an existing file or enter an Ethereum address to visualize.
      </p>

      <div className="input-group flex flex-col md:flex-row items-start md:items-center mb-6 w-full max-w-3xl">
        {/* Select Source Type */}
        <div className="w-full md:w-auto mb-4 md:mb-0 md:mr-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Source Type</label>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as 'firebase' | 'address')}
            className="source-select p-3 border rounded-md w-full text-black"
          >
            <option value="firebase">Firebase Dataset</option>
            <option value="address">Ethereum Address</option>
          </select>
        </div>

        {/* Conditional input for Firebase filename */}
        {sourceType === 'firebase' && (
          <div className="w-full md:w-auto mb-4 md:mb-0 md:mr-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select File</label>
            <select
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="filename-select p-3 border rounded-md w-full text-black"
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

        {/* Conditional input for Ethereum address */}
        {sourceType === 'address' && (
          <>
            <div className="w-full md:w-auto mb-4 md:mb-0 md:mr-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Ethereum Address</label>
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Enter Ethereum address"
                className="new-address-input p-3 border rounded-md w-full text-black"
              />
            </div>
            <div className="w-full md:w-auto mb-4 md:mb-0 md:mr-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Blockchain Chain</label>
              <select
                value={chain}
                onChange={(e) => setChain(e.target.value)}
                className="chain-select p-3 border rounded-md w-full text-black"
              >
                <option value="ethereum">Ethereum</option>
                <option value="bsc">Binance Smart Chain</option>
                <option value="polygon">Polygon</option>
                <option value="arbitrum">Arbitrum</option>
                <option value="optimism">Optimism</option>
                {/* Add more chain options as needed */}
              </select>
            </div>
          </>
        )}

        {/* Max nodes input */}
        <div className="w-full md:w-auto mb-4 md:mb-0">
          <label className="block text-sm font-medium text-gray-700 mb-2">Max Nodes (optional)</label>
          <input
            type="number"
            value={maxNodes || ''}
            onChange={(e) => setMaxNodes(Number(e.target.value) || null)}
            placeholder="Max nodes"
            className="max-nodes-input p-3 border rounded-md w-full text-black"
          />
        </div>

        {/* Visualize button */}
        <div className="w-full md:w-auto md:ml-4">
          <button
            onClick={handleVisualize}
            disabled={loading}
            className="visualize-button bg-neorange text-white p-3 rounded-md w-full"
          >
            {loading ? 'Visualizing...' : 'Visualize'}
          </button>
        </div>
      </div>

      {error && <p className="error-message text-red-500 mb-4">{error}</p>}

      {visualizationUrl && (
        <div className="iframe-container w-full max-w-4xl mt-6">
          <h2 className="text-2xl font-bold mb-4">Visualization Result</h2>
          <p>
            Visualization URL: <a href={visualizationUrl} target="_blank" rel="noopener noreferrer">{shortenUrl(visualizationUrl)}</a>
          </p>
          <iframe
            src={visualizationUrl}
            className="w-full h-96 border rounded-md shadow-md"
            allowFullScreen
          ></iframe>
        </div>
      )}

      <style jsx>{`
        .container {
          text-align: center;
        }
        .input-group {
          margin: 20px 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .source-select,
        .filename-select,
        .new-address-input,
        .max-nodes-input,
        .chain-select {
          padding: 12px;
          font-size: 16px;
          width: 100%;
        }
        .visualize-button {
          padding: 12px 20px;
          font-size: 16px;
        }
        .error-message {
          color: red;
        }
        .iframe-container {
          margin-top: 20px;
        }
      `}</style>
    </div>
  );
};

export default VisualizeRelationshipsPage;
