'use client';

import { useState, useEffect } from 'react';
import { auth, database, ref, get, set } from '@/utilities/firebaseClient';
import { useAuth } from '@/components/authContext';
import { v4 as uuidv4 } from 'uuid';

export default function DeveloperPortal() {
  const [loading, setLoading] = useState(false);
  const [{ apiKey: userApiKey }] = useAuth();
  const [apiKey, setApiKey] = useState<string>(userApiKey || '');
  const [error, setError] = useState('');
  const [userApiKeys, setUserApiKeys] = useState<string[]>([]);
  const [userToken, setUserToken] = useState<string>('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchUserApiKeys(user.uid);
        fetchUserToken(user.uid);
      } else {
        setApiKey('');
        setUserApiKeys([]);
        setUserToken('');
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchUserApiKeys = async (uid: string) => {
    try {
      setLoading(true);
      const snapshot = await get(ref(database, `apiKeys/${uid}`));
      if (snapshot.exists()) {
        const apiKeysObject = snapshot.val();
        const apiKeysArray: string[] = Object.values(apiKeysObject);
        setUserApiKeys(apiKeysArray);
      } else {
        setUserApiKeys([]);
      }
      setError('');
    } catch (error) {
      console.error('Error fetching API keys:', error);
      setError('Error fetching API keys. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserToken = async (uid: string) => {
    try {
      setLoading(true);
      const snapshot = await get(ref(database, `users/${uid}/token`));
      if (snapshot.exists()) {
        setUserToken(snapshot.val());
      } else {
        setUserToken('');
      }
      setError('');
    } catch (error) {
      console.error('Error fetching user token:', error);
      setError('Error fetching user token. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const uid = user.uid;
      const newApiKey = uuidv4();

      const snapshot = await get(ref(database, `apiKeys/${uid}`));
      const existingApiKeys = snapshot.val() || {};
      const keyIndex = Object.keys(existingApiKeys).length + 1;
      const apiKeyName = `apiKey${keyIndex}`;
      const updatedApiKeys = { ...existingApiKeys, [apiKeyName]: newApiKey };

      await set(ref(database, `apiKeys/${uid}`), updatedApiKeys);
      setUserApiKeys(Object.values(updatedApiKeys));
      setError('');
    } catch (error) {
      console.error('Error generating API key:', error);
      setError('Error generating API key. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard
      .writeText(key)
      .then(() => alert('Copied to clipboard!'))
      .catch((err) => console.error('Error copying to clipboard:', err));
  };

  const deleteApiKey = async (keyToDelete: string) => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const uid = user.uid;
      const snapshot = await get(ref(database, `apiKeys/${uid}`));
      const existingApiKeys = snapshot.val() || {};

      const updatedApiKeys = Object.keys(existingApiKeys)
        .filter((key) => existingApiKeys[key] !== keyToDelete)
        .reduce((acc, key) => {
          acc[key] = existingApiKeys[key];
          return acc;
        }, {} as { [key: string]: string });

      await set(ref(database, `apiKeys/${uid}`), updatedApiKeys);
      setUserApiKeys(Object.values(updatedApiKeys));
      setApiKey('');
      setError('');
    } catch (error) {
      console.error('Error deleting API key:', error);
      setError('Error deleting API key. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-700 text-white px-4 py-8">
      <div className="w-full max-w-4xl bg-gray-800 p-6 rounded-lg shadow-md">
        <h1 className="text-3xl text-neorange font-bold text-center mb-6">Developer Portal</h1>
        <p className="text-lg text-center mb-6">
          Manage your API keys, access your token, and explore the capabilities of our platform.
        </p>

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
                  onClick={() => deleteApiKey(key)}
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

        <div className="mb-6">
          <h2 className="text-xl text-neorange font-bold mb-4">Your Access Token</h2>
          <div className="flex items-center bg-gray-700 rounded-md p-4">
            <input
              type="text"
              className="flex-grow bg-transparent text-white border-none outline-none"
              value={userToken}
              readOnly
            />
            <button
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-md text-white transition ml-4"
              onClick={() => copyToClipboard(userToken)}
            >
              Copy
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-4">
            If you don’t see your access token or API keys, please contact{' '}
            <a
              href="mailto:k3m@idefi.ai"
              className="text-neorange hover:text-neohover underline"
            >
              k3m@idefi.ai
            </a>{' '}
            for assistance.
          </p>
        </div>

        <button
          className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-md text-white transition w-full md:w-auto"
          onClick={generateApiKey}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate New API Key'}
        </button>
      </div>
    </main>
  );
}
