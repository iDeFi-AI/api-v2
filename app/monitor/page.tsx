'use client';

import React, { useState, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const CHAIN_OPTIONS = [
  { label: 'Ethereum', value: 'ethereum' },
  { label: 'Binance Smart Chain', value: 'bsc' },
  { label: 'Polygon', value: 'polygon' },
  { label: 'Arbitrum', value: 'arbitrum' },
  { label: 'Optimism', value: 'optimism' },
  { label: 'Avalanche', value: 'avalanche' },
  { label: 'Fantom', value: 'fantom' },
];

const exampleChartData = {
  labels: ['2024-11-15 12:00', '2024-11-15 12:10', '2024-11-15 12:20'],
  datasets: [
    {
      label: 'Example Transactions (ETH)',
      data: [0.25, 0.5, 0.75],
      borderColor: 'rgba(75, 192, 192, 1)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      fill: true,
      pointRadius: 3,
    },
  ],
};

const MonitorPage: React.FC = () => {
  const [address, setAddress] = useState<string>('');
  const [chain, setChain] = useState<string>('ethereum');
  const [addresses, setAddresses] = useState<{ address: string; chain: string }[]>([]);
  const [error, setError] = useState<string>('');
  const chartRefs = useRef<{ [key: string]: any }>({});

  const addAddress = () => {
    if (!address) {
      setError('Please enter a valid address.');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setError('Invalid Ethereum address format.');
      return;
    }

    const key = `${address}_${chain}`;
    if (addresses.some((item) => item.address === address && item.chain === chain)) {
      setError('This address and chain combination is already being monitored.');
      return;
    }

    setError('');
    setAddresses((prev) => [...prev, { address, chain }]);
    setAddress('');
  };

  const removeAddress = (addressToRemove: string, chainToRemove: string) => {
    setAddresses((prev) =>
      prev.filter((item) => item.address !== addressToRemove || item.chain !== chainToRemove)
    );
  };

  const formatDataForChart = () => exampleChartData;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: (tooltipItem: any) => {
            return `Value: ${tooltipItem.raw} ETH`;
          },
        },
      },
    },
    scales: {
      x: { ticks: { color: '#fff' } },
      y: { ticks: { color: '#fff' } },
    },
  };

  return (
    <div className="monitor-page rounded">
      <h1 className="page-title text-neorange">Address Monitor</h1>
      <div className="input-section">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter address (e.g., 0x123...)"
          className="input-field"
        />
        <select
          value={chain}
          onChange={(e) => setChain(e.target.value)}
          className="chain-select"
        >
          {CHAIN_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button onClick={addAddress} className="btn-add">
          Add Address
        </button>
      </div>
      {error && <p className="error-message">{error}</p>}
      <div className="monitor-section">
        {addresses.length === 0 ? (
          <div className="placeholder-section">
            <h2 className="placeholder-title">No Addresses Monitored</h2>
            <p className="placeholder-description">
              Add an address to start monitoring. Here’s an example of what it looks like:
            </p>
            <div className="chart-container">
              <Line data={exampleChartData} options={chartOptions} />
            </div>
          </div>
        ) : (
          addresses.map(({ address, chain }) => (
            <div key={`${address}_${chain}`} className="monitor-container">
              <h3 className="monitor-title">
                Monitoring: {address} ({chain})
              </h3>
              <div className="chart-container">
                <Line
                  data={formatDataForChart()}
                  options={chartOptions}
                  ref={(el) => {
                    chartRefs.current[`${address}_${chain}`] = el;
                  }}
                />
              </div>
              <button
                className="btn-remove"
                onClick={() => removeAddress(address, chain)}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
      <style jsx>{`
        .monitor-page {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: linear-gradient(to bottom, #1e293b, #0f172a);
          color: #fff;
          min-height: 100vh;
          padding: 1rem;
        }
        .page-title {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          text-align: center;
        }
        .input-section {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 2rem;
          justify-content: center;
        }
        .input-field,
        .chain-select {
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 0.25rem;
          background: #334155;
          color: #fff;
          font-size: 1rem;
          width: 300px;
        }
        .btn-add {
          padding: 0.75rem 1rem;
          background: #ff9f66;
          color: #fff;
          border-radius: 0.25rem;
        }
        .btn-add:hover {
          background: #ff5733;
        }
        .monitor-section {
          width: 100%;
          max-width: 800px;
        }
        .placeholder-section {
          text-align: center;
          margin-top: 2rem;
        }
        .placeholder-title {
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }
        .placeholder-description {
          font-size: 1rem;
          margin-bottom: 2rem;
        }
        .chart-container {
          width: 100%;
          height: 300px;
          position: relative;
        }
        .monitor-container {
          margin-bottom: 2rem;
          background: #1e293b;
          padding: 1.5rem;
          border-radius: 0.5rem;
        }
        .monitor-title {
          font-size: 1.25rem;
          margin-bottom: 1rem;
        }
        .btn-remove {
          margin-top: 1rem;
          background: #ef4444;
          color: #fff;
          border-radius: 0.25rem;
          padding: 0.5rem 1rem;
        }
        .btn-remove:hover {
          background: #dc2626;
        }
        @media (max-width: 768px) {
          .input-field,
          .chain-select,
          .btn-add {
            width: 100%;
          }
          .chart-container {
            height: 200px;
          }
        }
      `}</style>
    </div>
  );
};

export default MonitorPage;
