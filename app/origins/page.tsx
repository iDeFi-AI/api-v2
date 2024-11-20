"use client";

import React, { useState } from "react";
import Head from "next/head";

interface OriginResult {
  address: string;
  status: string;
  matches?: {
    name: string;
    type: string;
    address: string;
  }[];
  etherscan_info?: {
    message: string;
    transaction_count: number;
    transactions: any[];
  };
}

const OriginsCheck: React.FC = () => {
  const [inputAddress, setInputAddress] = useState<string>("");
  const [addresses, setAddresses] = useState<string[]>([]);
  const [results, setResults] = useState<OriginResult[]>([]);
  const [selectedChain, setSelectedChain] = useState<string>("ethereum"); // Chain selection
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const handleAddAddress = () => {
    if (inputAddress.trim()) {
      setAddresses([...addresses, inputAddress.trim()]);
      setInputAddress("");
      setAlertMessage(null);
    } else {
      setAlertMessage("Please enter a valid Ethereum address.");
    }
  };

  const handleCheckOrigins = async () => {
    if (addresses.length === 0) {
      setAlertMessage("Please add at least one address.");
      return;
    }

    setIsLoading(true);
    setAlertMessage(null);

    try {
      const response = await fetch("/api/origins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses, chain: selectedChain }),
      });

      const data = await response.json();
      setResults(data);
    } catch (error) {
      setAlertMessage("An error occurred while checking origins. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen rounded bg-gradient-to-b from-gray-900 via-gray-800 to-gray-700 text-white flex flex-col items-center p-6">
      <Head>
        <title>Origins Address Checker</title>
      </Head>

      <div className="bg-gray-800 shadow-lg rounded-lg p-8 w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-neorange">Origins Address Checker</h1>

        {alertMessage && (
          <div className="bg-red-700 text-white p-4 rounded-lg mb-4">{alertMessage}</div>
        )}

        {/* Address and Chain Selection */}
        <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
          <input
            type="text"
            value={inputAddress}
            onChange={(e) => setInputAddress(e.target.value)}
            placeholder="Enter Ethereum address"
            className="w-full md:w-1/2 px-4 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-neorange bg-gray-700 text-white"
          />
          <select
            value={selectedChain}
            onChange={(e) => setSelectedChain(e.target.value)}
            className="w-full md:w-1/4 px-4 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-neorange bg-gray-700 text-white"
          >
            <option value="ethereum">Ethereum</option>
            <option value="base">Base</option>
            <option value="bsc">Binance Smart Chain</option>
            <option value="polygon">Polygon</option>
            <option value="arbitrum">Arbitrum</option>
            <option value="optimism">Optimism</option>
            <option value="avalanche">Avalanche</option>
            <option value="fantom">Fantom</option>
          </select>
          <button
            onClick={handleAddAddress}
            className="bg-neorange text-black font-bold px-4 py-2 rounded-md hover:bg-orange-500 transition focus:outline-none focus:ring focus:ring-orange-300"
          >
            Add Address
          </button>
        </div>

        {/* Addresses to Check */}
        <div className="w-full">
          <h2 className="text-lg font-semibold mb-4 text-neorange">Addresses to Check</h2>
          <ul className="list-disc pl-6">
            {addresses.map((addr, idx) => (
              <li key={idx} className="mb-2 text-white">
                {addr}
              </li>
            ))}
          </ul>
        </div>

        {/* Check Origins Button */}
        <button
          onClick={handleCheckOrigins}
          className="w-full md:w-auto bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-md mt-4"
          disabled={isLoading}
        >
          {isLoading ? "Checking..." : "Check Origins"}
        </button>

        {/* Results Section */}
        {results.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-6 text-neorange">Results</h2>

            <div className="space-y-6">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className="border border-gray-700 rounded-lg p-4 bg-gray-900 shadow-md"
                >
                  <h3 className="text-lg font-bold mb-2 text-neorange">
                    Address: <span className="text-orange-400">{result.address}</span>
                  </h3>
                  <p className="mb-4 text-white">
                    <strong>Status: </strong>
                    {result.status}
                  </p>

                  {result.matches && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-white">Matches Found:</h4>
                      <ul className="list-disc pl-6 text-gray-300">
                        {result.matches.map((match, index) => (
                          <li key={index}>
                            <strong>Name: </strong> {match.name} (<strong>Type:</strong>{" "}
                            {match.type}) — {match.address}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.etherscan_info && (
                    <div>
                      <h4 className="font-semibold text-white">Etherscan Information:</h4>
                      <p>
                        <strong>Transaction Count:</strong> {result.etherscan_info.transaction_count}
                      </p>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-neorange">
                          View Transactions
                        </summary>
                        <ul className="list-disc pl-6 mt-2 text-gray-300">
                          {result.etherscan_info.transactions.slice(0, 5).map((tx, idx) => (
                            <li key={idx}>
                              Hash: {tx.hash} — Value: {tx.value / 1e18} ETH
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OriginsCheck;
