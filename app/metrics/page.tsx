'use client';

import React, { useState } from 'react';
import { Bar, Line, Radar } from 'react-chartjs-2';
import { Chart as ChartJS, registerables } from 'chart.js';

ChartJS.register(...registerables);

const CHAIN_OPTIONS = [
  { label: 'Ethereum', value: 'ethereum' },
  { label: 'Polygon', value: 'polygon' },
  { label: 'Arbitrum', value: 'arbitrum' },
  { label: 'Optimism', value: 'optimism' },
  { label: 'Avalanche', value: 'avalanche' },
  { label: 'Fantom', value: 'fantom' },
];

interface MetricsData {
  totalTransactions: number;
  transactionsByChain: Record<string, number>;
  transactionsByLayer: { Layer1: number; Layer2: number };
  interactingWallets: number;
  interactingWalletTransactions: number;
  mostActiveWallet: { address: string; transactionCount: number };
  fraudRiskSummary: Record<string, number>;
}

const MetricsPage: React.FC = () => {
  const [address, setAddress] = useState<string>('');
  const [chain, setChain] = useState<string>('ethereum');
  const [loading, setLoading] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [error, setError] = useState<string>('');

  const fetchMetrics = async () => {
    if (!address) {
      setError('Wallet address is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer {your_uid}`, // Replace with your actual auth logic
        },
        body: JSON.stringify({
          wallet_address: address,
          chains: [chain],
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      setMetrics(data.financialMetrics || null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = (data: Record<string, number>, label: string) => ({
    labels: Object.keys(data),
    datasets: [
      {
        label,
        data: Object.values(data),
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1,
        hoverBackgroundColor: 'rgba(59, 130, 246, 0.2)',
        hoverBorderColor: 'rgba(59, 130, 246, 1)',
      },
    ],
  });

  return (
    <main className="rounded flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-700 text-white px-4">
      <div className="w-full max-w-4xl bg-gray-800 p-8 rounded-lg shadow-lg">
        <h1 className="text-4xl font-bold text-center text-neorange mb-8">Wallet Metrics</h1>
        <div className="flex flex-col items-center mb-8">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter wallet address"
            className="w-full max-w-lg px-4 py-2 mb-4 border border-gray-600 rounded-lg focus:ring focus:ring-neorange bg-gray-700 text-white"
          />
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            className="w-full max-w-lg px-4 py-2 mb-4 border border-gray-600 rounded-lg focus:ring focus:ring-neorange bg-gray-700 text-white"
          >
            {CHAIN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className={`px-6 py-3 rounded-lg font-semibold ${
              loading
                ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                : 'bg-neorange text-white hover:bg-indigo-600'
            }`}
          >
            {loading ? 'Loading...' : 'Fetch Metrics'}
          </button>
          {error && (
            <div className="mt-4 p-4 bg-red-500 text-red-100 rounded-lg text-center">{error}</div>
          )}
        </div>

        {metrics && (
          <>
            <h2 className="text-3xl font-semibold mb-6 text-neorange text-center">Metrics Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-indigo-300">Transactions by Chain</h3>
                <Bar data={prepareChartData(metrics.transactionsByChain, 'Transactions by Chain')} />
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-indigo-300">Transactions by Layer</h3>
                <Radar data={prepareChartData(metrics.transactionsByLayer, 'Transactions by Layer')} />
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-indigo-300">Fraud Risk Summary</h3>
                <Bar data={prepareChartData(metrics.fraudRiskSummary, 'Fraud Risk Summary')} />
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default MetricsPage;
