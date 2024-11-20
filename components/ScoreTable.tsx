'use client';

import React, { useState } from 'react';
import { AddressCheckResult } from '@/utilities/GenAiFirewall';
import { getColorForStatus } from '@/utilities/colorMapping'; // Function to map status to color

interface ScoreTableProps {
  results: AddressCheckResult[];
  getColorForStatus: (status: 'PASS' | 'FAIL' | 'WARNING') => string; // Maps status to color
}

const ScoreTable: React.FC<ScoreTableProps> = ({ results, getColorForStatus }) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Toggle expanded rows to show more details
  const toggleRow = (index: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(index)) {
      newExpandedRows.delete(index);
    } else {
      newExpandedRows.add(index);
    }
    setExpandedRows(newExpandedRows);
  };

  // Shorten Ethereum addresses for better display
  const shortenAddress = (address?: string): string => {
    if (!address) return 'N/A'; // Handle cases where the address is missing or undefined
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Render description with proper formatting and clickable Etherscan links
  const renderDescription = (description: string) => {
    return (
      <div
        dangerouslySetInnerHTML={{
          __html: description
            .replace(/\n/g, '<br />') // Replace newlines with <br />
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>') // Convert Markdown links to HTML links
        }}
      />
    );
  };

  // Download results as JSON
  const handleDownloadResults = () => {
    const jsonData = JSON.stringify(results, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'firewall_results.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="score-table-container">
      <h2>Firewall Address Results</h2>
      <div className="table-responsive">
        <div className="table-header">
          <div className="table-cell">Address</div>
          <div className="table-cell">Status</div>
        </div>
        {results.map((result, index) => (
          <div key={index} className="table-row" onClick={() => toggleRow(index)}>
            <div className="table-cell">
              <span className="wallet-address">{shortenAddress(result.address)}</span>
            </div>
            <div className={`table-cell ${getColorForStatus(result.status)}`}>
              {result.status} {/* Directly using backend status */}
            </div>
            {expandedRows.has(index) && (
              <div className="expanded-content">
                <p><strong>Description:</strong> {renderDescription(result.description)}</p>
                {result.transactionHash && <p><strong>Transaction Hash:</strong> {result.transactionHash}</p>}
                {result.from && <p><strong>From:</strong> {result.from}</p>}
                {result.to && <p><strong>To:</strong> {result.to}</p>}
                {result.parentTxnHash && <p><strong>Parent Txn Hash:</strong> {result.parentTxnHash}</p>}
                {result.etherscanUrl && (
                  <p>
                    <strong>Etherscan URL:</strong>{' '}
                    <a href={result.etherscanUrl} target="_blank" rel="noopener noreferrer" className="etherscan-link">
                      Open Link
                    </a>
                  </p>
                )}
                {result.insights && (
                  <div className="insights">
                    <p><strong>Insights:</strong></p>
                    <pre>{JSON.stringify(result.insights, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <button className="download-button" onClick={handleDownloadResults}>
        Download Full Results.json
      </button>
      <style jsx>{`
        .score-table-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 20px;
          padding: 0 20px;
          width: 100%;
        }
        .table-responsive {
          width: 100%;
        }
        .table-header, .table-row {
          display: flex;
          justify-content: space-between;
          padding: 10px;
          border: 1px solid #ccc;
          cursor: pointer;
          transition: background-color 0.3s ease;
          flex-wrap: wrap;
        }
        .table-header {
          background-color: #f8f9fa;
          color: #000;
          font-weight: bold;
        }
        .table-cell {
          flex: 1;
          text-align: left;
          padding: 0 10px;
          min-width: 120px;
          word-wrap: break-word;
        }
        .wallet-address {
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 5px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          width: 100%;
        }
        .green {
          color: green;
        }
        .red {
          color: red;
        }
        .yellow {
          color: #FDDA0D;
        }
        .expanded-content {
          padding: 10px;
          border-top: 1px solid #ccc;
          width: 100%;
          word-wrap: break-word;
        }
        .insights {
          margin-top: 10px;
        }
        .etherscan-link {
          color: #913d88;
          text-decoration: none;
        }
        .etherscan-link:hover {
          color: #6f1d6b;
        }
        .download-button {
          margin-top: 20px;
          background-color: #28a745;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }
        .download-button:hover {
          background-color: #218838;
        }
        @media (max-width: 600px) {
          .wallet-address {
            font-size: 12px;
          }
          .table-cell {
            padding: 5px;
          }
          .expanded-content {
            padding: 5px;
          }
        }
      `}</style>
    </div>
  );
};

export default ScoreTable;
