import React, { useEffect, useState } from "react";

type TransactionType = "Sent" | "Received";

interface Transaction {
  id: string;
  timestamp: string;
  type: TransactionType;
  cryptocurrency: string;
  usdAmount: number;
  thirdPartyWallet: string;
  flagged: boolean;
  risk: "High" | "Medium" | "Low" | "None";
}

interface TransactionSummary {
  number_of_interactions_with_flagged_addresses: number;
  number_of_risky_transactions: number;
  total_value: number;
  all_dates_involved: string[];
}

interface AddressCheckResult {
  address: string;
  status: "PASS" | "FAIL" | "WARNING";
  description?: string;
}

interface ScoreTableProps {
  transactions?: Transaction[]; // Optional to support results-only input
  results?: AddressCheckResult[]; // New support for results-based rendering
  getColorForStatus?: (status: "PASS" | "FAIL" | "WARNING") => string; // Function for status coloring
}

const ScoreTable: React.FC<ScoreTableProps> = ({
  transactions = [],
  results = [],
  getColorForStatus,
}) => {
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [updatedTransactions, setUpdatedTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  // Pagination logic for transactions
  const paginatedTransactions = updatedTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(updatedTransactions.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  useEffect(() => {
    if (transactions.length === 0) return;

    const fetchSummaryData = async () => {
      const primaryAddress = transactions[0].thirdPartyWallet;
      const addresses = Array.from(new Set(transactions.map((tx) => tx.thirdPartyWallet)));

      try {
        setLoading(true);

        const summaryResponse = await fetch(`/api/transaction_summary`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ address: primaryAddress }),
        });

        if (!summaryResponse.ok) {
          throw new Error("Failed to fetch transaction summary.");
        }

        const summaryData: TransactionSummary = await summaryResponse.json();
        setSummary(summaryData);

        const checkResponse = await fetch(`/api/check_multiple_addresses`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ addresses }),
        });

        if (!checkResponse.ok) {
          throw new Error("Failed to check multiple addresses.");
        }

        const checkResults: AddressCheckResult[] = await checkResponse.json();

        const newTransactions = transactions.map((tx) => ({
          ...tx,
          flagged: checkResults.some(
            (result) =>
              result.address.toLowerCase() === tx.thirdPartyWallet.toLowerCase() &&
              result.status === "FAIL"
          ),
        }));

        setUpdatedTransactions(newTransactions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred.");
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummaryData();
  }, [transactions]);

  const renderSummary = () => {
    if (!summary) return null;

    return (
      <div className="summary-card bg-gray-900 shadow-md rounded-lg p-6 mb-6 text-gray-200">
        <p className="text-lg">
          <strong>Flagged Interactions:</strong> {summary.number_of_interactions_with_flagged_addresses}
        </p>
        <p className="text-lg">
          <strong>Risky Transactions:</strong> {summary.number_of_risky_transactions}
        </p>
        <p className="text-lg">
          <strong>Total Value:</strong> ${summary.total_value.toFixed(2)}
        </p>
        <p className="text-lg">
          <strong>Dates Involved:</strong> {summary.all_dates_involved.join(", ")}
        </p>
      </div>
    );
  };

  const renderTransactions = () => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full bg-gray-800 rounded-lg shadow-md border border-gray-700">
          <thead className="bg-gray-700 text-gray-200">
            <tr>
              <th className="py-2 px-4 border-b border-gray-600">Date</th>
              <th className="py-2 px-4 border-b border-gray-600">Type</th>
              <th className="py-2 px-4 border-b border-gray-600">Amount</th>
              <th className="py-2 px-4 border-b border-gray-600">Status</th>
              <th className="py-2 px-4 border-b border-gray-600">Involved Address</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTransactions.map((txn, index) => (
              <tr
                key={txn.id}
                className={`text-center ${index % 2 === 0 ? "bg-gray-800" : "bg-gray-700"} hover:bg-gray-600`}
              >
                <td className="py-2 px-4 border-b border-gray-600">
                  {new Date(txn.timestamp).toLocaleDateString()}
                </td>
                <td className="py-2 px-4 border-b border-gray-600">{txn.type}</td>
                <td className="py-2 px-4 border-b border-gray-600">${txn.usdAmount.toFixed(2)}</td>
                <td className="py-2 px-4 border-b border-gray-600">
                  <span className={txn.flagged ? "text-red-500 font-bold" : "text-green-500 font-bold"}>
                    {txn.flagged ? "Fail" : "Pass"}
                  </span>
                </td>
                <td className="py-2 px-4 border-b border-gray-600">{txn.thirdPartyWallet}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-center mt-4">
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index}
              onClick={() => handlePageChange(index + 1)}
              className={`px-4 py-2 mx-1 ${
                currentPage === index + 1
                  ? "bg-blue-500 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              } rounded`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderResults = () => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full bg-gray-800 rounded-lg shadow-md border border-gray-700">
          <thead className="bg-gray-700 text-gray-200">
            <tr>
              <th className="py-2 px-4 border-b border-gray-600">Address</th>
              <th className="py-2 px-4 border-b border-gray-600">Status</th>
              <th className="py-2 px-4 border-b border-gray-600">Description</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result, index) => (
              <tr
                key={result.address}
                className={`text-center ${index % 2 === 0 ? "bg-gray-800" : "bg-gray-700"} hover:bg-gray-600`}
              >
                <td className="py-2 px-4 border-b border-gray-600">{result.address}</td>
                <td
                  className={`py-2 px-4 border-b border-gray-600 ${
                    getColorForStatus ? getColorForStatus(result.status) : ""
                  }`}
                >
                  {result.status}
                </td>
                <td className="py-2 px-4 border-b border-gray-600">
                  {result.description || "No description provided"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) {
    return <div className="text-center text-gray-300">Loading...</div>;
  }

  return (
    <div className="score-transactions w-full max-w-lg mx-auto my-4">
      <h2 className="text-2xl font-bold mb-4 text-center text-neorange">Transaction History</h2>
      {error && <p className="text-red-500">{error}</p>}
      {renderSummary()}
      {transactions.length > 0 ? renderTransactions() : renderResults()}
    </div>
  );
};

export default ScoreTable;
