"use client";

import React, { useState } from "react";
import Head from "next/head";
import ScoreTable from "@/components/ScoreTable";
import CodeTerminal from "@/components/CodeTerminal";
import { generateAddressCheckPrompt } from "@/utilities/GenAi";
import { pushData } from "@/utilities/firebaseClient";

interface Transaction {
  id: string;
  timestamp: string;
  type: "Sent" | "Received";
  cryptocurrency: string;
  usdAmount: number;
  thirdPartyWallet: string;
  flagged: boolean;
  risk: "High" | "Medium" | "Low" | "None";
}

interface Metric {
  name: string;
  value: number;
  color: string;
}

const SourceDestination: React.FC = () => {
  const [sourceAddress, setSourceAddress] = useState<string>("");
  const [destinationAddress, setDestinationAddress] = useState<string>("");
  const [sourceTransactions, setSourceTransactions] = useState<Transaction[]>([]);
  const [destinationTransactions, setDestinationTransactions] = useState<Transaction[]>([]);
  const [sourceInsights, setSourceInsights] = useState<string | null>(null);
  const [destinationInsights, setDestinationInsights] = useState<string | null>(null);
  const [sourceMetrics, setSourceMetrics] = useState<Metric[]>([]);
  const [destinationMetrics, setDestinationMetrics] = useState<Metric[]>([]);
  const [loadingSource, setLoadingSource] = useState(false);
  const [loadingDestination, setLoadingDestination] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [showSourceTransactions, setShowSourceTransactions] = useState(false);
  const [showDestinationTransactions, setShowDestinationTransactions] = useState(false);

  const handleFetchData = async (isSource: boolean) => {
    const address = isSource ? sourceAddress : destinationAddress;

    if (!address) {
      setAlertMessage(`Please enter a valid ${isSource ? "source" : "destination"} address.`);
      return;
    }

    try {
      isSource ? setLoadingSource(true) : setLoadingDestination(true);

      const response = await fetch(`/api/transaction_summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) throw new Error("Failed to fetch transaction data.");

      const data = await response.json();
      const transactions = data.transactions || [];
      const metrics = data.metrics || [];

      if (isSource) {
        setSourceTransactions(transactions);
        setSourceMetrics(metrics);
        setShowSourceTransactions(true);
      } else {
        setDestinationTransactions(transactions);
        setDestinationMetrics(metrics);
        setShowDestinationTransactions(true);
      }

      const insights = await generateAddressCheckPrompt({
        addresses: [address],
        results: transactions.map((txn: Transaction) => (txn.flagged ? "Flagged" : "Clean")),
      });

      if (isSource) {
        setSourceInsights(insights);
        await pushData(`insights/${address}/source`, { address, insights, timestamp: Date.now() });
      } else {
        setDestinationInsights(insights);
        await pushData(`insights/${address}/destination`, { address, insights, timestamp: Date.now() });
      }

      setAlertMessage(null);
    } catch (error) {
      console.error("Error fetching data:", error);
      setAlertMessage("An error occurred while fetching data. Please try again.");
    } finally {
      isSource ? setLoadingSource(false) : setLoadingDestination(false);
    }
  };

  const clearSourceResults = () => {
    setSourceTransactions([]);
    setSourceAddress("");
    setSourceMetrics([]);
    setSourceInsights(null);
    setShowSourceTransactions(false);
    setAlertMessage(null);
  };

  const clearDestinationResults = () => {
    setDestinationTransactions([]);
    setDestinationAddress("");
    setDestinationMetrics([]);
    setDestinationInsights(null);
    setShowDestinationTransactions(false);
    setAlertMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-700 flex flex-col items-center text-center p-6">
      <Head>
        <title>Wallet Analytics</title>
      </Head>
      <section className="w-full max-w-6xl bg-gray-800 shadow-lg rounded-lg p-8">
        {alertMessage && (
          <div className="alert bg-red-500 text-white px-4 py-2 rounded mb-4">{alertMessage}</div>
        )}
        <h4 className="text-3xl font-semibold text-neorange mb-6">Wallet Analytics</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 w-full">
          {/* Source Address */}
          <div className="p-6 bg-gray-700 rounded-lg shadow-md">
            <h5 className="text-lg font-medium text-gray-200 mb-4">Source Address</h5>
            <input
              type="text"
              placeholder="Enter Source Address"
              value={sourceAddress}
              onChange={(e) => setSourceAddress(e.target.value)}
              className="input w-full border border-gray-600 rounded-md p-2 text-gray-300 bg-gray-800 focus:ring-2 focus:ring-neorange mb-4"
            />
            <div className="flex justify-between">
              <button
                onClick={() => handleFetchData(true)}
                className={`button px-4 py-2 rounded-md ${
                  loadingSource ? "bg-gray-500" : "bg-neorange hover:bg-orange-600"
                } text-white`}
                disabled={loadingSource}
              >
                {loadingSource ? "Loading..." : "Fetch Data"}
              </button>
              <button
                onClick={clearSourceResults}
                className="button-clear px-4 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Destination Address */}
          <div className="p-6 bg-gray-700 rounded-lg shadow-md">
            <h5 className="text-lg font-medium text-gray-200 mb-4">Destination Address</h5>
            <input
              type="text"
              placeholder="Enter Destination Address"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              className="input w-full border border-gray-600 rounded-md p-2 text-gray-300 bg-gray-800 focus:ring-2 focus:ring-neorange mb-4"
            />
            <div className="flex justify-between">
              <button
                onClick={() => handleFetchData(false)}
                className={`button px-4 py-2 rounded-md ${
                  loadingDestination ? "bg-gray-500" : "bg-neorange hover:bg-orange-600"
                } text-white`}
                disabled={loadingDestination}
              >
                {loadingDestination ? "Loading..." : "Fetch Data"}
              </button>
              <button
                onClick={clearDestinationResults}
                className="button-clear px-4 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {showSourceTransactions && (
            <div className="bg-gray-800 shadow-md rounded-lg p-6">
              <h2 className="text-lg font-bold text-neorange mb-4">Source Results</h2>
              <ScoreTable transactions={sourceTransactions} />
              {sourceMetrics.map((metric, index) => (
                <p key={index} className={`text-${metric.color} text-gray-300`}>
                  {metric.name}: {metric.value}
                </p>
              ))}
              <CodeTerminal>{sourceInsights || "No insights generated yet."}</CodeTerminal>
            </div>
          )}

          {showDestinationTransactions && (
            <div className="bg-gray-800 shadow-md rounded-lg p-6">
              <h2 className="text-lg font-bold text-neorange mb-4">Destination Results</h2>
              <ScoreTable transactions={destinationTransactions} />
              {destinationMetrics.map((metric, index) => (
                <p key={index} className={`text-${metric.color} text-gray-300`}>
                  {metric.name}: {metric.value}
                </p>
              ))}
              <CodeTerminal>{destinationInsights || "No insights generated yet."}</CodeTerminal>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default SourceDestination;
