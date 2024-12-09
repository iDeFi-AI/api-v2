'use client';

import React, { useState, useEffect } from 'react';
import ScoreTable from '@/components/ScoreTable';
import { processAddressCheck, AddressCheckResult } from '@/utilities/GenAi';
import { auth, getData } from '@/utilities/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';
import { TailSpin } from 'react-loader-spinner';
import { getColorForStatus } from '@/utilities/colorMapping';
import { CHAIN_API_BASE_URLS } from '@/utilities/chainURLS';

// Define the User type for proper typing
interface User {
  uid: string;
  email?: string;
  displayName?: string;
}

const cleanAndValidateAddresses = (addresses: string[]): string[] => {
  return addresses
    .map((address) => address.trim())
    .filter((address) => /^0x[a-fA-F0-9]{40}$/.test(address));
};

const FirewallPage: React.FC = () => {
  const [addresses, setAddresses] = useState<string>('');
  const [results, setResults] = useState<AddressCheckResult[]>([]);
  const [error, setError] = useState<string>('');
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [isLoadingFlagged, setIsLoadingFlagged] = useState<boolean>(true); // Track flagged data loading
  const [fileUrl, setFileUrl] = useState<string>('');
  const [history, setHistory] = useState<any[]>([]);
  const [flaggedAddresses, setFlaggedAddresses] = useState<Set<string>>(new Set());
  const [selectedChain, setSelectedChain] = useState<string>('ethereum');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  // Monitor Firebase authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({ uid: currentUser.uid, email: currentUser.email || '' });
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch flagged addresses
  useEffect(() => {
    const fetchFlaggedAddresses = async () => {
      try {
        setLoadingStatus('Loading flagged addresses...');
        setIsLoadingFlagged(true);
        const response = await fetch('/api/get_flagged_addresses', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error('Failed to fetch flagged addresses');

        const data = await response.json();
        setFlaggedAddresses(new Set(Object.keys(data.flagged_addresses)));
        setLoadingStatus('');
      } catch (error) {
        console.error('Error fetching flagged addresses:', error);
        setError('Error loading flagged addresses. Please try again later.');
        setLoadingStatus('');
      } finally {
        setIsLoadingFlagged(false);
      }
    };
    fetchFlaggedAddresses();
  }, []);

  // Fetch user history
  useEffect(() => {
    const fetchUserHistory = async () => {
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
    };
    fetchUserHistory();
  }, [user]);

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
    const results: AddressCheckResult[] = [];

    try {
      for (const address of addressArray) {
        const response = await fetch('/api/checkaddress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user?.uid || ''}`,
          },
          body: JSON.stringify({ address, chain: selectedChain }), // Include chain
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
        results.push(data); // Accumulate results for all addresses
      }

      const processedResults = await processAddressCheck(results, flaggedAddresses);
      setResults(processedResults);
      setError('');
    } catch (error) {
      console.error('Error checking addresses:', error);
      setResults([]);
      setError('Error checking addresses. Please try again.');
    } finally {
      setLoadingStatus('');
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

        {isLoadingFlagged && (
          <div className="flex justify-center mt-4">
            <TailSpin height="50" width="50" color="#ff9f66" ariaLabel="loading" />
            <p className="text-sm text-gray-300 mt-2">Loading flagged addresses...</p>
          </div>
        )}

        {!isLoadingFlagged && (
          <>
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
                className="px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
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
                className="px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
                rows={6}
              />
              <button
                type="submit"
                className={`px-4 py-2 font-bold rounded-md ${
                  loadingStatus
                    ? 'bg-gray-500 cursor-not-allowed'
                    : 'bg-neorange text-black hover:bg-orange-500'
                }`}
              >
                {loadingStatus || 'Analyze Addresses'}
              </button>
            </form>

            {results.length > 0 && (
              <div className="mt-6">
                <ScoreTable results={results} getColorForStatus={getColorForStatus} />
              </div>
            )}
          </>
        )}

        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
      </div>
    </main>
  );
};

export default FirewallPage;
