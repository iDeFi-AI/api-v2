'use client';

import Link from 'next/link';
import React from 'react';

const TermsAndConditions = () => {
  return (
    <div className="terms-container">
      <h1 className="title">API Terms and Conditions</h1>
      <div className="content">
        <p className="intro">
          Welcome to our API platform. By using our API services, you agree to comply with and be bound by the following terms and conditions. These terms, along with our privacy policy, govern our relationship with you concerning the API.
        </p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using our API, you acknowledge that you have read, understood, and agree to these terms. If you do not agree, you must not use the API.
        </p>

        <h2>2. API Usage</h2>
        <p>
          You agree to use the API solely for lawful purposes and in accordance with these terms. You must not:
        </p>
        <ul>
          <li>Use the API to perform any action that violates any applicable law or regulation;</li>
          <li>Engage in any activity that disrupts, damages, or interferes with our services or systems;</li>
          <li>Use the API to transmit any harmful or malicious content;</li>
          <li>Attempt to gain unauthorized access to the API or its related systems;</li>
          <li>Sell, redistribute, or sublicense API access to third parties without prior approval.</li>
        </ul>

        <h2>3. API Key Management</h2>
        <p>
          API keys are provided to authenticate your use of the API. You are responsible for keeping your API keys secure and confidential. You must not:
        </p>
        <ul>
          <li>Share your API keys with any unauthorized third party;</li>
          <li>Use another user’s API keys without permission;</li>
          <li>Attempt to bypass rate limits or abuse the API.</li>
        </ul>
        <p>
          If you suspect unauthorized use of your API keys, notify us immediately at{' '}
          <Link href="mailto:k3m@idefi.ai" className="link">
            k3m@idefi.ai
          </Link>.
        </p>

        <h2>4. Licensing</h2>
        <p>
          You are granted a non-exclusive, non-transferable, revocable license to access and use the API under these terms. This license does not transfer ownership of the API or its intellectual property. You must not:
        </p>
        <ul>
          <li>Modify, copy, or create derivative works from the API;</li>
          <li>Reverse engineer, decompile, or attempt to extract source code from the API;</li>
          <li>Use the API for competitive analysis or similar purposes.</li>
        </ul>

        <h2>5. Disclaimer of Warranties</h2>
        <p>
          The API is provided "as is" without warranties of any kind, either expressed or implied. We do not guarantee that the API will be uninterrupted, error-free, or meet your specific requirements.
        </p>

        <h2>6. Limitations of Liability</h2>
        <p>
          To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or use, arising from your use of the API.
        </p>

        <h2>7. Rate Limits and Fair Use</h2>
        <p>
          We enforce rate limits to ensure fair use of the API. Exceeding these limits may result in suspension or termination of your API access. Rate limits are detailed in the API documentation.
        </p>

        <h2>8. Termination</h2>
        <p>
          We reserve the right to terminate or suspend your access to the API at our sole discretion, without prior notice, if you violate these terms or engage in misuse of the API.
        </p>

        <h2>9. Governing Law</h2>
        <p>
          These terms are governed by and construed in accordance with the laws of the jurisdiction in which our company is based. Any disputes will be subject to the exclusive jurisdiction of the courts in that jurisdiction.
        </p>

        <h2>10. Modifications to Terms</h2>
        <p>
          We may revise these terms at any time without notice. Continued use of the API after such modifications constitutes your acceptance of the revised terms.
        </p>

        <h2>11. Contact Us</h2>
        <p>
          If you have any questions or concerns about these terms, please contact us at{' '}
          <Link href="mailto:k3m@idefi.ai" className="link">
            k3m@idefi.ai
          </Link>.
        </p>

        <div className="back-link-container">
          <Link href="/docs" className="back-link">
            Back to Docs
          </Link>
        </div>
      </div>

      <style jsx>{`
        .terms-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 80px 20px;
          font-family: Arial, sans-serif;
          background-color: #1a202c;
          color: #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        .title {
          text-align: center;
          margin-bottom: 20px;
          font-size: 32px;
          font-weight: bold;
          color: #63b3ed;
        }
        .content {
          line-height: 1.8;
        }
        h2 {
          margin-top: 24px;
          font-size: 20px;
          font-weight: bold;
          color: #63b3ed;
        }
        ul {
          list-style-type: disc;
          padding-left: 20px;
          margin-top: 12px;
          margin-bottom: 12px;
        }
        ul li {
          margin-bottom: 10px;
        }
        .link {
          color: #90cdf4;
          text-decoration: none;
        }
        .link:hover {
          text-decoration: underline;
        }
        .back-link-container {
          margin-top: 20px;
          text-align: center;
        }
        .back-link {
          display: inline-block;
          padding: 10px 20px;
          background-color: #63b3ed;
          color: #1a202c;
          border-radius: 4px;
          font-weight: bold;
          text-align: center;
        }
        .back-link:hover {
          background-color: #3182ce;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default TermsAndConditions;
