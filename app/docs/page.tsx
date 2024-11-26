'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/authContext';
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
  const [{ apiKeys }] = useAuth();
  const [apiKey, setApiKey] = useState<string>('');

  useEffect(() => {
    if (apiKeys && apiKeys.length > 0) {
      setApiKey(apiKeys[0]);
    } else {
      setApiKey('');
    }
  }, [apiKeys]);

  const handleNavigationItemClick = (item: NavigationItem) => {
    setSelectedNavItem(item);
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
                  className="flex-grow bg-transparent outline-none text-white text-sm sm:text-base"
                  value={apiKey}
                  readOnly
                  placeholder="No API Key Available"
                />
                <button
                  className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 text-xs sm:text-sm rounded-md ml-2"
                  onClick={() => navigator.clipboard.writeText(apiKey)}
                  disabled={!apiKey}
                >
                  Copy
                </button>
              </div>
              <p className="text-sm sm:text-base">
                If you don’t see an API Key, visit the Developer Portal to manage keys.
              </p>
              <Link href="/devs">
                <button className="bg-neorange hover:bg-orange-600 text-white py-2 px-4 text-sm rounded mt-4">
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
            <ul className="list-disc ml-6 mt-4 text-sm sm:text-base">
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
            <ul className="list-disc pl-6 mt-4 text-sm sm:text-base space-y-2">
              <li>
                <strong>What is the purpose of the API?</strong> Our API enables seamless integration with blockchain
                networks and enhanced transaction analysis tools.
              </li>
              <li>
                <strong>How do I reset my API key?</strong> Visit the Developer Portal and navigate to "API Keys" to reset or regenerate a key.
              </li>
              <li>
                <strong>Can I check multiple addresses simultaneously?</strong> Yes, use the <code>/api/check_multiple_addresses</code> endpoint.
              </li>
            </ul>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <main className="flex flex-col md:flex-row min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-700 text-white">
      <aside className="w-full md:w-64 bg-gray-800 p-4 md:p-6 sticky top-0 z-10">
        <ul className="space-y-2">
          {navigationItems.map((item) => (
            <li
              key={item.id}
              tabIndex={0}
              onClick={() => handleNavigationItemClick(item)}
              onKeyDown={(e) => e.key === 'Enter' && handleNavigationItemClick(item)}
              className={`p-4 rounded-md text-center cursor-pointer ${
                selectedNavItem.id === item.id ? 'bg-neorange' : 'hover:bg-gray-700'
              }`}
            >
              {item.label}
            </li>
          ))}
        </ul>
      </aside>
      <section className="flex-grow p-4 md:p-6">{renderContent()}</section>
      <style jsx>{`
        @media (max-width: 768px) {
          aside {
            width: 100%;
            position: sticky;
            top: 0;
          }
          section {
            margin-top: 1rem;
          }
        }
        input::placeholder {
          color: #888;
        }
      `}</style>
    </main>
  );
}
