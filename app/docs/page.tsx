'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/authContext';
import { auth, fetchApiKeys } from '@/utilities/firebaseClient';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import Link from 'next/link';

interface NavigationItem {
  id: number;
  label: string;
}

export default function Page() {
  const [navigationItems] = useState<NavigationItem[]>([
    { id: 1, label: '1. Get Started' },
    { id: 2, label: '2. Endpoints' },
    { id: 3, label: '3. Examples' },
    { id: 4, label: '4. FAQ' },
  ]);

  const [selectedNavItem, setSelectedNavItem] = useState<NavigationItem>(navigationItems[0]);
  const [{ apiKey: userApiKey }] = useAuth();
  const [apiKey, setApiKey] = useState<string>(userApiKey || '');
  const [loading, setLoading] = useState(false);

  const handleNavigationItemClick = (item: NavigationItem) => {
    setSelectedNavItem(item);
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        fetchUserApiKeys(user.uid);
      } else {
        setApiKey('');
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchUserApiKeys = async (uid: string) => {
    setLoading(true);
    try {
      const keys = await fetchApiKeys(uid);
      setApiKey(keys.length > 0 ? keys[0] : ''); // Use the first API key or set as empty
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (selectedNavItem.id) {
      case 1:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">{selectedNavItem.label}</h2>
            <p>Welcome to our developer documentation! Start here to integrate with our API.</p>
            <div className="mt-6">
              <label className="block font-bold text-lg mb-2">Your API Key:</label>
              <div className="flex items-center border border-gray-400 rounded-md p-2 mb-2 bg-gray-700">
                <input
                  type="text"
                  className="flex-grow bg-transparent outline-none text-white"
                  value={apiKey}
                  readOnly
                />
                <button
                  className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-md ml-2"
                  onClick={() => navigator.clipboard.writeText(apiKey)}
                >
                  Copy
                </button>
              </div>
              <p>If you don’t see an API Key, visit the Developer Portal to manage keys.</p>
              <Link href="/devs">
                <button className="bg-neorange hover:bg-orange-600 text-white py-2 px-4 rounded mt-4">
                  Developer Portal
                </button>
              </Link>
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">{selectedNavItem.label}</h2>
            <p>Descriptions of the available API endpoints:</p>
            <ul className="list-disc ml-6 mt-4">
              <li>
                <strong>/api/checkaddress</strong> - Check the status of a wallet address.
              </li>
              <li>
                <strong>/api/check_multiple_addresses</strong> - Check multiple wallet addresses.
              </li>
              <li>
                <strong>/api/transaction_summary</strong> - Get a summary of flagged transactions.
              </li>
            </ul>
          </div>
        );
      case 3:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">{selectedNavItem.label}</h2>
            <SyntaxHighlighter language="bash" style={docco}>
              {`curl -X POST \\
-H "Content-Type: application/json" \\
-d '{"addresses": ["ADDRESS_TO_CHECK"]}' \\
https://api.idefi.ai/api/checkaddress`}
            </SyntaxHighlighter>
          </div>
        );
      case 4:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">{selectedNavItem.label}</h2>
            <p>Find answers to frequently asked questions about our API.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <main className="flex min-h-screen flex-col md:flex-row bg-gradient-to-b from-gray-900 via-gray-800 to-gray-700 text-white">
      <aside className="sidebar w-full md:w-64 bg-gray-800 text-white p-6">
        <ul>
          {navigationItems.map((item) => (
            <li
              key={item.id}
              onClick={() => handleNavigationItemClick(item)}
              className={`p-4 mb-2 rounded cursor-pointer ${
                selectedNavItem.id === item.id ? 'bg-neorange' : 'hover:bg-gray-700'
              }`}
            >
              {item.label}
            </li>
          ))}
        </ul>
      </aside>
      <section className="content flex-grow p-6">
        {loading ? (
          <div className="text-center text-xl font-semibold">Loading...</div>
        ) : (
          renderContent()
        )}
      </section>
      <style jsx>{`
        @media (max-width: 768px) {
          aside {
            width: 100%;
            position: relative;
          }
          section {
            margin-top: 1rem;
          }
        }
        .sidebar ul {
          list-style-type: none;
          padding: 0;
        }
      `}</style>
    </main>
  );
}
