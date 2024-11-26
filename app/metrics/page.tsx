'use client';

import React, { useState } from 'react';
import { Bar, Line, Radar } from 'react-chartjs-2';
import { Chart as ChartJS, registerables } from 'chart.js';
import { generateAddressCheckPrompt } from '@/utilities/GenAi';

ChartJS.register(...registerables);

const CHAIN_OPTIONS = [
  { label: 'Ethereum', value: 'ethereum' },
  { label: 'Binance Smart Chain', value: 'bsc' },
  { label: 'Polygon', value: 'polygon' },
  { label: 'Arbitrum', value: 'arbitrum' },
  { label: 'Optimism', value: 'optimism' },
  { label: 'Avalanche', value: 'avalanche' },
  { label: 'Fantom', value: 'fantom' },
];

interface MetricsData {
  activity_score: number;
  risk_scores: Record<string, number>;
  opportunity_scores: Record<string, number>;
  trust_scores: Record<string, number>;
  volatility_scores: Record<string, number>;
}

const exampleMetrics: MetricsData = {
  activity_score: 75,
  risk_scores: {
    phishing: 30,
    draining: 50,
    dusting: 20,
    targeted_attacks: 40,
  },
  opportunity_scores: {
    investment: 80,
    staking: 60,
    tax_efficiency: 50,
  },
  trust_scores: {
    trusted_sources: 70,
    trusted_recipients: 65,
    wallet_trust: 60,
  },
  volatility_scores: {
    by_coin: 40,
    by_wallet: 55,
  },
};

const placeholderInsights = `
The wallet shows a balanced activity score, indicating moderate usage.
- Risk Scores:
  * Moderate phishing risk detected.
  * Draining risk is above average—consider additional security measures.
- Opportunity Scores:
  * Excellent investment opportunities available.
  * Staking score suggests untapped potential for rewards.
- Trust Scores:
  * Trusted sources and recipients indicate secure transaction patterns.
- Volatility Scores:
  * Wallet and coin volatility is within acceptable ranges.
`;

const MetricsPage: React.FC = () => {
  const [address, setAddress] = useState<string>('');
  const [chain, setChain] = useState<string>('ethereum'); // Default blockchain
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('Fetching Metrics...');
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [insights, setInsights] = useState<string>('');
  const [noTransactionsMessage, setNoTransactionsMessage] = useState<string>('');

  const handleFetchMetrics = async () => {
    if (!address) {
      setLoadingMessage('Address is required');
      return;
    }

    setLoading(true);
    setLoadingMessage('Fetching blockchain metrics...');
    try {
      const response = await fetch(`/api/get_data_and_metrics?address=${address}&chain=${chain}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        setNoTransactionsMessage(data.error);
        setMetrics(null);
        setInsights('');
        setLoading(false);
        return;
      }

      setMetrics(data.metrics || exampleMetrics); // Use exampleMetrics if no data available
      const generatedInsights = await generateAddressCheckPrompt({
        addresses: [address],
        results: data.transformed_data?.transactions?.map((tx: any) => tx.description) || [],
      });
      setInsights(generatedInsights || placeholderInsights); // Use placeholderInsights if none are generated

      setLoading(false);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error occurred');
      setLoadingMessage('');
      setMetrics(exampleMetrics); // Fallback to example metrics
      setInsights(placeholderInsights); // Fallback to placeholder insights
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
    <main className="flex flex-col rounded items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-700 text-white px-4">
      <div className="w-full max-w-4xl bg-gray-800 p-8 rounded-lg shadow-lg mt-8">
        <h1 className="text-4xl font-bold text-center text-neorange mb-8">Address Metrics</h1>
        <div className="flex flex-col items-center">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x123... Example address"
            className="w-full max-w-lg px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-neorange bg-gray-700 text-white mb-4"
          />
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            className="w-full max-w-lg px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-neorange bg-gray-700 text-white mb-6"
          >
            {CHAIN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleFetchMetrics}
            disabled={loading}
            className={`px-6 py-3 mb-20 rounded-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
              loading
                ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                : 'bg-neorange text-white hover:bg-indigo-600'
            }`}
          >
            {loading ? loadingMessage : 'Fetch Metrics'}
          </button>
          {noTransactionsMessage && (
            <div className="mt-4 p-4 bg-yellow-500 text-yellow-100 rounded-lg text-center">
              {noTransactionsMessage}
            </div>
          )}
        </div>

        {(metrics || exampleMetrics) && (
          <div className="mt-10">
            <h2 className="text-3xl font-semibold mb-6 text-neorange text-center">Metrics Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded bg-black py-6 px-4">
                <h3 className="text-lg font-medium mb-2 text-indigo-300">Activity Score</h3>
                <p className="p-4 bg-gray-700 text-white rounded-lg text-center">
                  {metrics?.activity_score || exampleMetrics.activity_score}
                </p>
              </div>
              <div className="rounded bg-black py-6 px-4">
                <h3 className="text-lg font-medium mb-2 text-indigo-300">Risk Scores</h3>
                <Bar data={prepareChartData(metrics?.risk_scores || exampleMetrics.risk_scores, 'Risk Scores')} />
              </div>
              <div className="rounded bg-black py-6 px-4">
                <h3 className="text-lg font-medium mb-2 text-indigo-300">Opportunity Scores</h3>
                <Radar
                  data={prepareChartData(
                    metrics?.opportunity_scores || exampleMetrics.opportunity_scores,
                    'Opportunity Scores'
                  )}
                />
              </div>
              <div className="rounded bg-black py-6 px-4">
                <h3 className="text-lg font-medium mb-2 text-indigo-300">Trust Scores</h3>
                <Bar
                  data={prepareChartData(metrics?.trust_scores || exampleMetrics.trust_scores, 'Trust Scores')}
                />
              </div>
              <div className="rounded bg-black py-6 px-4">
                <h3 className="text-lg font-medium mb-2 text-indigo-300">Volatility Scores</h3>
                <Line
                  data={prepareChartData(
                    metrics?.volatility_scores || exampleMetrics.volatility_scores,
                    'Volatility Scores'
                  )}
                />
              </div>
            </div>
          </div>
        )}

        {(insights || placeholderInsights) && (
          <div className="mt-20">
            <h2 className="text-3xl text-neorange font-semibold mb-6 text-center">Insights</h2>
            <pre className="bg-gray-700 text-white p-4 rounded-lg overflow-auto text-left max-h-96">
              {insights || placeholderInsights}
            </pre>
          </div>
        )}
      </div>

      <style jsx>{`
        input,
        select {
          max-width: 500px;
        }
        button {
          max-width: 200px;
        }
        pre {
          white-space: pre-wrap;
          word-wrap: break-word;
        }
      `}</style>
    </main>
  );
};

export default MetricsPage;
