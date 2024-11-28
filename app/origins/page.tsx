"use client";

import React, { useState } from "react";
import Head from "next/head";

interface Transaction {
  hash: string;
  value: number;
  timestamp: string;
}

interface OriginResult {
  chain: string;
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
    transactions: Transaction[];
  };
}

const validateEthereumAddress = (address: string) =>
  /^0x[a-fA-F0-9]{40}$/.test(address.trim());

const ChainResult: React.FC<{ chain: string; result: OriginResult }> = ({
  chain,
  result,
}) => (
  <div className="mt-4">
    <h4 className="text-md font-semibold text-white">Chain: {chain}</h4>
    {result.status === "NO_MATCH" ? (
      <p className="text-gray-400">No matches found on this chain.</p>
    ) : (
      <div>
        {/* Known Origins */}
        {result.matches && result.matches.length > 0 && (
          <div className="mb-4">
            <h5 className="font-semibold text-neorange">Known Origins:</h5>
            <ul className="list-disc pl-6 text-gray-300">
              {result.matches.map((match, idx) => (
                <li key={idx}>
                  <strong>{match.name}</strong> ({match.type}) — {match.address}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Etherscan Information */}
        {result.etherscan_info && (
          <div className="mb-4">
            <h5 className="font-semibold text-neorange">Etherscan Information:</h5>
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
                    Hash: {tx.hash} — Value: {tx.value} ETH —{" "}
                    Date: {new Date(tx.timestamp).toLocaleString()}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>
    )}
  </div>
);

const OriginsCheck: React.FC = () => {
  const [inputAddress, setInputAddress] = useState<string>("");
  const [addresses, setAddresses] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, Record<string, OriginResult>> | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [isRequestInProgress, setIsRequestInProgress] = useState<boolean>(false);

  const handleAddAddress = () => {
    if (inputAddress.trim() && validateEthereumAddress(inputAddress)) {
      setAddresses((prev) => [...prev, inputAddress.trim()]);
      setInputAddress("");
      setAlertMessage(null);
    } else {
      setAlertMessage("Invalid Ethereum address format.");
    }
  };

  const handleCheckOrigins = async () => {
    if (addresses.length === 0) {
      setAlertMessage("Please add at least one address.");
      return;
    }

    if (isRequestInProgress) {
      setAlertMessage("A request is already in progress. Please wait.");
      return;
    }

    setIsLoading(true);
    setIsRequestInProgress(true);
    setAlertMessage(null);

    try {
      const response = await fetch("/api/origins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data);

      if (Object.keys(data).length === 0) {
        setAlertMessage("No matches found. The addresses might be unknown origins.");
      }
    } catch (error: any) {
      setAlertMessage(`An error occurred: ${error.message}`);
    } finally {
      setIsLoading(false);
      setIsRequestInProgress(false);
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
          <div
            className={`p-4 rounded-lg mb-4 ${
              alertMessage.includes("error") ? "bg-red-700" : "bg-green-700"
            } text-white`}
          >
            {alertMessage}
          </div>
        )}

        {/* Address Input */}
        <div className="flex items-center gap-4 mb-6">
          <input
            type="text"
            value={inputAddress}
            onChange={(e) => setInputAddress(e.target.value)}
            placeholder="Enter Ethereum address"
            className="w-full px-4 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-neorange bg-gray-700 text-white"
          />
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
          disabled={isLoading || isRequestInProgress}
        >
          {isLoading ? "Checking..." : "Check Origins"}
        </button>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="mt-4 text-center">
            <svg
              className="animate-spin h-6 w-6 text-neorange mx-auto"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
            <p className="mt-2">Fetching data, please wait...</p>
          </div>
        )}

        {/* Results Section */}
        {results && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-6 text-neorange">Results</h2>

            {Object.entries(results).map(([address, chainResults]) => (
              <div key={address} className="mb-8 border border-gray-700 rounded-lg p-4 bg-gray-900 shadow-md">
                <h3 className="text-lg font-bold text-neorange">
                  Address: <span className="text-orange-400">{address}</span>
                </h3>

                {Object.entries(chainResults).map(([chain, result]) => (
                  <ChainResult key={chain} chain={chain} result={result} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OriginsCheck;
