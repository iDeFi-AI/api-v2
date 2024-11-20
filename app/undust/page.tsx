'use client';

import React, { useState } from 'react';

const CryptoWalletCheckPage: React.FC = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [checkResult, setCheckResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheckWallet = async () => {
    setLoading(true);
    setError('');
    setCheckResult(null);
    try {
      const response = await fetch(`/api/dustcheck?address=${walletAddress}`);
      const data = await response.json();
      if (response.ok) {
        setCheckResult(data);
      } else {
        setError(data.error || 'An error occurred while checking the wallet address. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while checking the wallet address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const placeholderData = {
    recommendations: ['Enable multi-signature security.', 'Regularly monitor your wallet.'],
    dusting_patterns: [
      {
        transactionHash: '0x123abc...',
        from: '0x456def...',
        to: walletAddress || '0x789ghi...',
        value: '0.0001 ETH',
        timestamp: '2024-01-01 12:00:00',
      },
    ],
  };

  return (
    <main className="flex rounded flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-700 text-white px-4">
      <div className="w-full max-w-3xl bg-gray-800 p-6 rounded-lg shadow-lg">
        <h1 className="text-4xl text-neorange font-bold mb-6 text-center">Wallet Dust Check</h1>
        <p className="text-lg mb-6 text-center">
          Enter your wallet address below to check for dusting or flagged activity.
        </p>

        <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="Enter your wallet address (e.g., 0x123...)"
            className="p-3 border border-gray-600 rounded-lg bg-gray-700 text-white w-full"
          />
          <button
            onClick={handleCheckWallet}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg w-full md:w-auto transition"
            disabled={loading}
          >
            {loading ? 'Checking...' : 'Check'}
          </button>
        </div>

        {error && <p className="text-red-500 text-center mt-4">{error}</p>}

        {loading && <p className="text-blue-500 text-center mt-4">Loading...</p>}

        {checkResult ? (
          <div className="bg-gray-700 text-white p-6 rounded-lg shadow-md mt-6">
            <h2 className="text-2xl font-bold mb-4">Check Result</h2>
            <pre className="bg-gray-800 text-white p-4 rounded-lg overflow-auto max-h-60">
              {JSON.stringify(checkResult, null, 2)}
            </pre>

            <h3 className="text-xl font-bold mt-6 mb-4">Recommendations</h3>
            <ul className="list-disc pl-5 space-y-2">
              {checkResult.recommendations.map((rec: string, index: number) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>

            {checkResult.dusting_patterns.length > 0 && (
              <>
                <h3 className="text-xl font-bold mt-6 mb-4">Dusting Patterns Detected</h3>
                <ul className="list-disc pl-5 space-y-4">
                  {checkResult.dusting_patterns.map((pattern: any, index: number) => (
                    <li key={index}>
                      <strong>Transaction Hash:</strong> {pattern.transactionHash} <br />
                      <strong>From:</strong> {pattern.from} <br />
                      <strong>To:</strong> {pattern.to} <br />
                      <strong>Value:</strong> {pattern.value} <br />
                      <strong>Timestamp:</strong> {pattern.timestamp}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : (
          <div className="mt-6 text-center">
            <p className="text-gray-400">No analysis data available. Showing placeholder data:</p>
            <div className="bg-gray-700 text-white p-6 rounded-lg shadow-md mt-4">
              <h2 className="text-2xl font-bold mb-4">Placeholder Result</h2>
              <pre className="bg-gray-800 text-white p-4 rounded-lg overflow-auto max-h-60">
                {JSON.stringify(placeholderData, null, 2)}
              </pre>

              <h3 className="text-xl font-bold mt-6 mb-4">Recommendations</h3>
              <ul className="list-disc pl-5 space-y-2">
                {placeholderData.recommendations.map((rec: string, index: number) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>

              {placeholderData.dusting_patterns.length > 0 && (
                <>
                  <h3 className="text-xl font-bold mt-6 mb-4">Dusting Patterns Detected</h3>
                  <ul className="list-disc pl-5 space-y-4">
                    {placeholderData.dusting_patterns.map((pattern: any, index: number) => (
                      <li key={index}>
                        <strong>Transaction Hash:</strong> {pattern.transactionHash} <br />
                        <strong>From:</strong> {pattern.from} <br />
                        <strong>To:</strong> {pattern.to} <br />
                        <strong>Value:</strong> {pattern.value} <br />
                        <strong>Timestamp:</strong> {pattern.timestamp}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}

        <div className="bg-yellow-100 p-4 rounded-lg shadow-md mt-6 text-yellow-800">
          <p>
            Note: By entering your wallet address, you agree that it may be stored and used to improve iDeFi.AI security
            and provide better features for users.
          </p>
        </div>
      </div>
    </main>
  );
};

export default CryptoWalletCheckPage;
