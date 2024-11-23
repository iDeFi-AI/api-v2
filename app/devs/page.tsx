'use client';

import { useState, useEffect } from 'react';
import { auth, fetchApiKeys, createApiKey, deleteApiKey } from '@/utilities/firebaseClient';

export default function DeveloperPortal() {
  const [loading, setLoading] = useState(false);
  const [userUid, setUserUid] = useState<string | null>(null);
  const [userApiKeys, setUserApiKeys] = useState<string[]>([]);
  const [error, setError] = useState('');

  // Fetch API keys and UID on component mount or auth state change
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserUid(user.uid);
        fetchUserApiKeys(user.uid);
      } else {
        setUserUid(null);
        setUserApiKeys([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch user's API keys
  const fetchUserApiKeys = async (uid: string) => {
    setLoading(true);
    try {
      const keys = await fetchApiKeys(uid);
      setUserApiKeys(keys);
      setError('');
    } catch (err) {
      console.error('Error fetching API keys:', err);
      setError('Error fetching API keys. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate a new API key
  const handleGenerateApiKey = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const newKey = await createApiKey(user.uid);
      setUserApiKeys((prevKeys) => [...prevKeys, newKey]);

      setError('');
    } catch (err) {
      console.error('Error generating API key:', err);
      setError('Error generating API key. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Delete an existing API key
  const handleDeleteApiKey = async (keyToDelete: string) => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const updatedKeys = await deleteApiKey(user.uid, keyToDelete);
      setUserApiKeys(updatedKeys);

      setError('');
    } catch (err) {
      console.error('Error deleting API key:', err);
      setError('Error deleting API key. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Copy API key or UID to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => alert('Copied to clipboard!'))
      .catch((err) => console.error('Error copying to clipboard:', err));
  };

  return (
    <main className="flex flex-col items-center min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-700 text-white px-4 py-8">
      <div className="w-full max-w-4xl bg-gray-800 p-6 rounded-lg shadow-md">
        <h1 className="text-3xl text-neorange font-bold text-center mb-6">Developer Portal</h1>
        <p className="text-lg text-center mb-6">
          Manage your API keys and explore the capabilities of our platform.
        </p>

        {/* User UID Section */}
        {userUid && (
          <div className="mb-6">
            <h2 className="text-xl text-neorange font-bold mb-4">Your User ID (UID)</h2>
            <div className="flex items-center bg-gray-700 rounded-md p-4">
              <input
                type="text"
                className="flex-grow bg-transparent text-white border-none outline-none"
                value={userUid}
                readOnly
              />
              <button
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-md text-white transition ml-4"
                onClick={() => copyToClipboard(userUid)}
              >
                Copy
              </button>
            </div>
            <p className="text-sm text-gray-400 mt-4">
              Your access token is securely managed by iDEFi.AI.
            </p>
          </div>
        )}

        {/* API Keys Section */}
        <div className="mb-6">
          <h2 className="text-xl text-neorange font-bold mb-4">Your API Keys</h2>
          {userApiKeys.length > 0 ? (
            userApiKeys.map((key, index) => (
              <div key={index} className="flex items-center bg-gray-700 rounded-md p-4 mb-4">
                <input
                  type="text"
                  className="flex-grow bg-transparent text-white border-none outline-none"
                  value={key}
                  readOnly
                />
                <button
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-md text-white transition ml-4"
                  onClick={() => copyToClipboard(key)}
                >
                  Copy
                </button>
                <button
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-md text-white transition ml-4"
                  onClick={() => handleDeleteApiKey(key)}
                  disabled={loading}
                >
                  Delete
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-400">No API keys available.</p>
          )}
          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>

        {/* Generate API Key Button */}
        <button
          className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-md text-white transition w-full md:w-auto"
          onClick={handleGenerateApiKey}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate New API Key'}
        </button>
      </div>
    </main>
  );
}
