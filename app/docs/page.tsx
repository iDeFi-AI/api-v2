'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/utilities/firebaseClient';

export default function DocsPage() {
  const [userUid, setUserUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch UID on auth state change
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

  return (
    <main className="rounded flex flex-col items-center min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-700 text-white px-4 py-8">
      <div className="w-full max-w-4xl bg-gray-800 p-6 rounded-lg shadow-md">
        <h1 className="text-3xl text-neorange font-bold text-center mb-6">API Documentation</h1>
        <p className="text-lg text-center mb-6">
          Learn how to integrate with our APIs using your User ID (UID).
        </p>

        {/* UID Section */}
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
                <p className="text-sm sm:text-base text-gray-400">
                  Use your UID to authenticate API requests.
                </p>
              </div>
            )}

            {/* Example Section */}
            <div className="mt-8">
              <h2 className="text-xl text-neorange font-bold mb-4">API Usage Examples</h2>
              <div className="grid grid-cols-1 gap-6">
                {/* Curl Example */}
                <div className="bg-gray-700 rounded-md p-4 overflow-auto">
                  <h3 className="font-bold text-white mb-2">Curl Example:</h3>
                  <code className="block whitespace-pre-wrap">
                    {`curl -X POST https://api-v2.idefi.ai/api/turnqey_report \\
-H "Content-Type: application/json" \\
-H "Authorization: Bearer ${userUid}" \\
-d '{"wallet_address": "0xBcB42948c56906eAd635fC268653aD5286d8b88B"}'`}
                  </code>
                </div>

                {/* JavaScript Example */}
                <div className="bg-gray-700 rounded-md p-4 overflow-auto">
                  <h3 className="font-bold text-white mb-2">JavaScript Example:</h3>
                  <code className="block whitespace-pre-wrap">
                    {`fetch('https://api-v2.idefi.ai/api/turnqey_report', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${userUid}',
  },
  body: JSON.stringify({ wallet_address: '0xBcB42948c56906eAd635fC268653aD5286d8b88B' }),
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`}
                  </code>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
