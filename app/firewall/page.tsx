'use client';

import React, { useState, useEffect } from 'react';
import ScoreTable from '@/components/ScoreTable';
import { processAddressCheck, AddressCheckResult } from '@/utilities/GenAi';
import { auth, getData, storeData } from '@/utilities/firebaseClient';
import { useAuth } from '@/components/authContext';
import { TailSpin } from 'react-loader-spinner';
import { getColorForStatus } from '@/utilities/colorMapping';
import { CHAIN_API_BASE_URLS } from '@/utilities/chainURLS';

const cleanAndValidateAddresses = (addresses: string[]): string[] => {
  return addresses
    .map((address) => address.trim())
    .filter((address) => /^0x[a-fA-F0-9]{40}$/.test(address));
};

const FirewallPage: React.FC = () => {
  const [addresses, setAddresses] = useState<string>('');
  const [results, setResults] = useState<AddressCheckResult[]>([]);
  const [error, setError] = useState<string>('');
  const [loadingStatus, setLoadingStatus] = useState<string>(''); // Loading status
  const [progress, setProgress] = useState<number>(0); // Progress percentage
  const [fileUrl, setFileUrl] = useState<string>('');
  const [history, setHistory] = useState<any[]>([]);
  const [flaggedAddresses, setFlaggedAddresses] = useState<Set<string>>(new Set());
  const [selectedChain, setSelectedChain] = useState<string>('ethereum'); // Chain selector
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [{ apiKeys: userApiKey }] = useAuth();

  // Fetch flagged addresses on component mount
  useEffect(() => {
    const fetchFlaggedAddresses = async () => {
      try {
        setLoadingStatus('Loading flagged addresses...');
        setProgress(10);
        const response = await fetch('/api/get_flagged_addresses');
        if (!response.ok) throw new Error('Failed to fetch flagged addresses');

        const data = await response.json();
        setFlaggedAddresses(new Set(Object.keys(data.flagged_addresses)));
        setProgress(100);
        setLoadingStatus('');
      } catch (error) {
        console.error('Error fetching flagged addresses:', error);
        setError('Error loading flagged addresses. Please try again later.');
        setLoadingStatus('');
        setProgress(0);
      }
    };

    fetchFlaggedAddresses();
  }, []);

  // Fetch user upload history on authentication state change
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userHistory = await getData(`users/${user.uid}/upload_history`);
          setHistory(userHistory || []);
        } catch (error) {
          console.error('Error fetching user history:', error);
        }
      } else {
        setHistory([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAddressCheck = async () => {
    if (!addresses.trim()) {
      setError('Please enter addresses.');
      return;
    }

    const addressArray = cleanAndValidateAddresses(addresses.split('\n'));

    if (addressArray.length === 0) {
      setError('No valid addresses provided.');
      return;
    }

    setLoadingStatus('Checking addresses...');
    setProgress(10);

    try {
      const response = await fetch('/api/checkaddress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ addresses: addressArray, chain: selectedChain }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setProgress(70);
      const processedResults = await processAddressCheck(data, flaggedAddresses);
      setResults(processedResults);
      setError('');
      setProgress(100);
    } catch (error) {
      console.error('Error checking addresses:', error);
      setResults([]);
      setError('Error checking addresses. Please try again.');
    } finally {
      setLoadingStatus('');
      setProgress(0);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadingStatus('Uploading file...');
    setProgress(10);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setProgress(70);
      const processedResults = await processAddressCheck(data.details, flaggedAddresses);
      setResults(processedResults);
      setFileUrl(data.file_url);
      setAddresses('');
      setError('');
      setProgress(100);

      const user = auth.currentUser;
      if (user) {
        const uid = user.uid;
        const userHistoryPath = `users/${uid}/upload_history`;
        const currentHistory = (await getData(userHistoryPath)) || [];
        const updatedHistory = [
          ...currentHistory,
          { fileUrl: data.file_url, timestamp: new Date().toISOString() },
        ];
        await storeData(userHistoryPath, updatedHistory);
        setHistory(updatedHistory);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setResults([]);
      setError('Error uploading file. Please try again.');
    } finally {
      setLoadingStatus('');
      setProgress(0);
    }
  };

  const handleDownloadResults = () => {
    setIsDownloading(true);
    try {
      const csvContent =
        'data:text/csv;charset=utf-8,' +
        results.map((e) => `${e.address},${e.description},${e.status}`).join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', 'results.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading results:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClearResults = () => {
    setIsClearing(true);
    setTimeout(() => {
      setResults([]);
      setFileUrl('');
      setAddresses('');
      setIsClearing(false);
    }, 500);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-700 text-white">
      <div className="max-w-3xl w-full bg-gray-800 p-6 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center text-neorange">Address Analysis</h1>
        <p className="text-sm text-center text-gray-300 mt-2 mb-4">
          Analyze Ethereum addresses across multiple chains.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddressCheck();
          }}
          className="flex flex-col gap-4"
        >
          <select
            value={selectedChain}
            onChange={(e) => setSelectedChain(e.target.value)}
            className="px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring focus:ring-neorange"
          >
            {Object.keys(CHAIN_API_BASE_URLS).map((chain) => (
              <option key={chain} value={chain}>
                {chain.toUpperCase()}
              </option>
            ))}
          </select>
          <textarea
            placeholder="Enter EVM addresses (one per line)"
            value={addresses}
            onChange={(e) => setAddresses(e.target.value)}
            className="px-4 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-neorange bg-gray-700 text-white"
            rows={6}
          />
          <input
            type="file"
            accept=".csv, .json"
            onChange={handleFileUpload}
            className="px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-md"
          />
          <button
            type="submit"
            disabled={!!loadingStatus}
            className={`px-4 py-2 font-bold rounded-md transition focus:outline-none ${
              loadingStatus
                ? 'bg-gray-500 cursor-not-allowed'
                : 'bg-neorange text-black hover:bg-orange-500 focus:ring focus:ring-orange-300'
            }`}
          >
            {loadingStatus || 'Analyze Addresses'}
          </button>
        </form>

        {loadingStatus && (
          <div className="flex flex-col items-center mt-4">
            <TailSpin height="50" width="50" color="#ff9f66" ariaLabel="loading" />
            <p className="text-sm text-gray-300 mt-2">{loadingStatus}</p>
            <div className="w-full bg-gray-700 rounded-full mt-2">
              <div
                className="bg-neorange h-2 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {error && <p className="text-red-500 mt-2 text-center">{error}</p>}

        {results.length > 0 && (
          <div className="mt-6">
            <ScoreTable results={results} getColorForStatus={getColorForStatus} />
            <div className="flex justify-between mt-4">
              <button
                onClick={handleDownloadResults}
                disabled={isDownloading}
                className={`px-4 py-2 rounded-md transition focus:outline-none ${
                  isDownloading
                    ? 'bg-gray-500 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {isDownloading ? 'Downloading...' : 'Download Results'}
              </button>
              <button
                onClick={handleClearResults}
                disabled={isClearing}
                className={`px-4 py-2 rounded-md transition focus:outline-none ${
                  isClearing
                    ? 'bg-gray-500 cursor-not-allowed'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {isClearing ? 'Clearing...' : 'Clear Results'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default FirewallPage;
