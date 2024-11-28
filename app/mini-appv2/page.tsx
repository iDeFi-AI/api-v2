"use client";

import React, { useState } from "react";
import Image from "next/image";
import ScoreTable from "@/components/ScoreTable";
import CodeTerminal from "@/components/CodeTerminal";
import { generateAddressCheckPrompt } from "@/utilities/GenAi";

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

const isValidAddress = (address: string): boolean => {
  const ethRegExp = /^(0x)?[0-9a-fA-F]{40}$/;
  return ethRegExp.test(address);
};

const SecurityCheck: React.FC = () => {
  const [address, setAddress] = useState<string>("");
  const [status, setStatus] = useState<"Pass" | "Fail" | "Warning" | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [insights, setInsights] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);

  const fetchTransactionData = async () => {
    if (!isValidAddress(address)) {
      setAlertMessage("Invalid Ethereum address. Please enter a valid address.");
      return;
    }

    setLoading(true);
    setAlertMessage(null);

    try {
      const response = await fetch(`/api/native/checkaddress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) throw new Error("Failed to fetch data.");

      const { status: responseStatus, transactions: fetchedTransactions } =
        await response.json();

      setStatus(responseStatus || "Pass");
      setTransactions(fetchedTransactions || []);
      setShowTransactions(true);
    } catch (error) {
      console.error("Error fetching transaction data:", error);
      setAlertMessage("Error fetching data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    if (!isValidAddress(address)) {
      setAlertMessage("Invalid Ethereum address. Please enter a valid address.");
      return;
    }

    setLoadingInsights(true);

    try {
      const promptContent = {
        addresses: [address],
        results: transactions.map((txn) => (txn.flagged ? "Flagged" : "Clean")),
      };
      const insightsData = await generateAddressCheckPrompt(promptContent);

      setInsights(insightsData || "No significant insights available.");
      setAlertMessage(null);
    } catch (error) {
      console.error("Error generating insights:", error);
      setAlertMessage("Failed to generate insights. Please try again.");
    } finally {
      setLoadingInsights(false);
    }
  };

  const getHexagonImage = () => {
    switch (status) {
      case "Pass":
        return "/score/green.png";
      case "Fail":
        return "/score/red.png";
      case "Warning":
        return "/score/yellow.png";
      default:
        return "/score/yellow.png";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-700 text-white flex flex-col items-center text-center p-6">
      <div className="w-full max-w-lg bg-gray-800 shadow-lg rounded-lg p-6 mb-8">
        <h2 className="text-3xl font-bold text-neorange mb-6">Security Check</h2>

        <div className="relative mb-4">
          <Image
            src="/score/arch-scorewh.png"
            alt="Risk Status Arch"
            width={450}
            height={180}
            className="w-full max-w-xs md:max-w-md mx-auto"
          />
          {status && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Image src={getHexagonImage()} alt="Hexagon status" width={100} height={115} />
            </div>
          )}
        </div>

        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter Ethereum address"
          className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white mb-4 focus:outline-none focus:ring-2 focus:ring-neorange"
        />

        <div className="flex flex-col md:flex-row justify-between space-y-4 md:space-y-0 md:space-x-4">
          <button
            onClick={fetchTransactionData}
            className="w-full md:w-1/3 bg-neorange text-white p-2 rounded hover:bg-orange-600 transition-colors"
            disabled={loading}
          >
            {loading ? "Checking..." : "Check Status"}
          </button>
          <button
            onClick={handleGenerateInsights}
            className="w-full md:w-1/3 bg-blue-500 text-white p-2 rounded hover:bg-blue-700 transition-colors"
            disabled={loadingInsights}
          >
            {loadingInsights ? "Generating Insights..." : "Generate Insights"}
          </button>
        </div>

        {alertMessage && <p className="text-red-500 mt-4">{alertMessage}</p>}
      </div>

      <div className="w-full max-w-3xl">
        {showTransactions && <ScoreTable transactions={transactions} />}
        <div className="mt-4">
          <CodeTerminal>{insights || "No insights generated yet."}</CodeTerminal>
        </div>
      </div>

      <style jsx>{`
        .bg-neorange {
          background-color: #ff6600;
        }
        .hover\:bg-orange-600:hover {
          background-color: #e55c00;
        }
        .focus\:ring-neorange:focus {
          ring-color: #ff6600;
        }
        @media (max-width: 768px) {
          .flex-column {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default SecurityCheck;
