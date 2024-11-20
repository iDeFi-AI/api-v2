'use client';

import React, { useState } from 'react';
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

const SmartContractAnalyzer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [contractAddress, setContractAddress] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleAnalyzeFile = async () => {
    if (!selectedFile) {
      setError('Please select a file to analyze.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/analyze_smart_contract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze the smart contract.');
      }

      const result = await response.json();
      setAnalysisResult(result.analysis);
      setError('');
    } catch (err) {
      setError('An error occurred while analyzing the smart contract.');
      setAnalysisResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeAddress = async () => {
    if (!contractAddress) {
      setError('Please enter a smart contract address.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/analyze_contract_address?address=${contractAddress}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'An error occurred while analyzing the contract address.');
      }

      setAnalysisResult(data.analysis);
      setError('');
    } catch (err) {
      setError('An error occurred while analyzing the contract address.');
      setAnalysisResult(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDataForChart = () => {
    if (!analysisResult || !analysisResult.data) return null;

    return {
      labels: analysisResult.data.map((item: any) => item.label),
      datasets: [
        {
          label: 'Contract Data Points',
          data: analysisResult.data.map((item: any) => item.value),
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          fill: true,
        },
      ],
    };
  };

  const placeholderChartData = {
    labels: ['Example 1', 'Example 2', 'Example 3'],
    datasets: [
      {
        label: 'Placeholder Data',
        data: [100, 150, 200],
        borderColor: 'rgba(255, 159, 64, 1)',
        backgroundColor: 'rgba(255, 159, 64, 0.2)',
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: (tooltipItem: any) => `Value: ${tooltipItem.raw}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#fff' },
      },
      y: {
        ticks: { color: '#fff' },
      },
    },
  };

  return (
    <main className="flex rounded flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-700 text-white px-4">
      <div className="w-full max-w-4xl bg-gray-800 p-6 rounded-lg shadow-lg">
        <h1 className="text-4xl text-neorange font-bold text-center mb-6">Contract Analyzer</h1>
        <p className="text-lg mb-6 text-center">
          Upload your smart contract file or enter a contract address to analyze.
        </p>

        <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
          <input
            type="file"
            accept=".sol"
            onChange={handleFileChange}
            className="p-3 border border-gray-600 rounded-lg bg-gray-700 text-white w-full"
          />
          <button
            onClick={handleAnalyzeFile}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg w-full md:w-auto transition"
            disabled={loading}
          >
            {loading ? 'Analyzing...' : 'Scan'}
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
          <input
            type="text"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            placeholder="Enter smart contract address"
            className="p-3 border border-gray-600 rounded-lg bg-gray-700 text-white w-full"
          />
          <button
            onClick={handleAnalyzeAddress}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg w-full md:w-auto transition"
            disabled={loading}
          >
            {loading ? 'Analyzing...' : 'Scan'}
          </button>
        </div>

        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        {loading && <p className="text-blue-500 text-center mt-4">Loading...</p>}

        <div className="mt-6 text-center">
          <p className="text-gray-400">
            {analysisResult ? 'Analysis data:' : 'No analysis data available. Placeholder chart:'}
          </p>
          <div className="chart-container mt-6" style={{ height: '300px' }}>
            <Line data={formatDataForChart() || placeholderChartData} options={chartOptions} />
          </div>
        </div>

        <div className="mt-6 bg-yellow-100 p-4 rounded-lg shadow-md text-yellow-800">
          <p>
            Note: By uploading your smart contract or entering a contract address, you agree that it may
            be used to improve our analysis tools and enhance user experience.
          </p>
        </div>
      </div>
    </main>
  );
};

export default SmartContractAnalyzer;
