'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { signInWithEmailPassword } from '@/utilities/firebaseClient';

export default function Home() {
  const [hasAccount, setHasAccount] = useState(true); // Tracks if the user has an account
  const [apiHealth, setApiHealth] = useState<{ overall_status: string; endpoints: any[] } | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [showEndpoints, setShowEndpoints] = useState(false); // Controls visibility of the endpoints dropdown

  // Define priority-based status colors
  const statusColors: { [key: string]: string } = {
    Offline: 'text-red-500',
    Migrating: 'text-yellow-500',
    Maintenance: 'text-orange-500',
    Online: 'text-green-500',
  };

  // Fetch API health status
  useEffect(() => {
    const fetchHealthStatus = async () => {
      try {
        const response = await fetch('/api/health');
        if (!response.ok) throw new Error(`Error: ${response.statusText}`);
        const healthData = await response.json();
        setApiHealth(healthData);
      } catch (error) {
        console.error('Failed to fetch API health:', error);
        setHealthError('Unable to fetch API health. Please try again later.');
      }
    };

    fetchHealthStatus();
  }, []);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-700 text-white">
      {/* Logo Section */}
      <div className="mt-6">
        <Image src="/shortV2w.png" alt="API.iDEFi.AI Logo" width={200} height={200} />
      </div>

      {/* Toggle between Login and Form */}
      <div className="flex flex-col items-center w-full max-w-lg mt-10 bg-gray-800 p-6 rounded-lg shadow-lg">
        {hasAccount ? (
          <LoginSection setHasAccount={setHasAccount} />
        ) : (
          <AccessRequestForm setHasAccount={setHasAccount} />
        )}
      </div>
      {/* API Health Status */}
      <div className="w-full max-w-lg bg-gray-800 p-4 rounded-lg shadow-md mt-6 text-center">
        {healthError ? (
          <p className="text-red-500">{healthError}</p>
        ) : apiHealth ? (
          <>
            <p
              className={`mt-4 text-sm ${
                statusColors[apiHealth.overall_status] || 'text-gray-500'
              }`}
            >
              Overall Status: {apiHealth.overall_status}
            </p>
            <p className="mt-2 text-gray-300 text-sm">
              {
                {
                  Online: 'All systems operational. You can use all endpoints without issues.',
                  Migrating: 'Some endpoints are undergoing migration. Expect minor delays or unavailability.',
                  Maintenance: 'Scheduled maintenance is in progress. Some endpoints may be unavailable.',
                  Offline: 'The API is currently offline. Please check back later.',
                }[apiHealth.overall_status] || 'Status unknown. Please contact support.'
              }
            </p>

            {/* Toggle Button */}
            <button
              className="mt-4 px-4 py-2 bg-neorange text-black font-bold rounded-md hover:bg-orange-500 transition focus:outline-none"
              onClick={() => setShowEndpoints((prev) => !prev)}
            >
              {showEndpoints ? 'Hide Endpoints' : 'View Endpoints'}
            </button>

            {/* Endpoints Table */}
            {showEndpoints && (
              <div className="mt-4">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full bg-gray-900 rounded-md border border-gray-700">
                    <thead className="bg-gray-700 sticky top-0">
                      <tr>
                        <th className="py-2 px-4 text-left text-sm">Endpoint</th>
                        <th className="py-2 px-4 text-left text-sm">Status</th>
                        <th className="py-2 px-4 text-left text-sm">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiHealth.endpoints.map((endpoint, index) => (
                        <tr
                          key={index}
                          className={`${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700'}`}
                        >
                          <td className="py-2 px-4 text-sm truncate max-w-xs">{endpoint.endpoint}</td>
                          <td
                            className={`py-2 px-4 ${
                              statusColors[endpoint.status] || 'text-gray-500'
                            }`}
                          >
                            {endpoint.status}
                          </td>
                          <td className="py-2 px-4 text-sm">{endpoint.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile List View */}
                <div className="md:hidden mt-4 space-y-4">
                  {apiHealth.endpoints.map((endpoint, index) => (
                    <div
                      key={index}
                      className="bg-gray-800 p-4 rounded-md shadow-md text-sm space-y-2"
                    >
                      <p>
                        <strong>Endpoint:</strong>{' '}
                        <span className="truncate block max-w-full">{endpoint.endpoint}</span>
                      </p>
                      <p>
                        <strong>Status:</strong>{' '}
                        <span className={statusColors[endpoint.status] || 'text-gray-500'}>
                          {endpoint.status}
                        </span>
                      </p>
                      <p>
                        <strong>Message:</strong> {endpoint.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-300 text-sm">Loading API health status...</p>
        )}
      </div>

    </main>
  );
}

/* Login Section */
function LoginSection({ setHasAccount }: { setHasAccount: (value: boolean) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setAuthToken = (token: string) => {
    document.cookie = `auth_token=${token}; path=/; max-age=${30 * 24 * 60 * 60}`; // 30 days
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const userCredential = await signInWithEmailPassword(email, password);

      const idToken = await userCredential.user.getIdToken();
      const response = await fetch('/api/validate_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        throw new Error('User validation failed.');
      }

      const { uid, email: userEmail } = await response.json();

      setAuthToken(idToken);
      console.log(`User authenticated: ${uid}, ${userEmail}`);

      window.location.href = '/docs';
    } catch (err: any) {
      console.error('Error authenticating:', err);
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form className="flex flex-col gap-4 mt-4" onSubmit={(e) => e.preventDefault()}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email Address"
          className="px-4 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-neorange bg-gray-700 text-white"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="px-4 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-neorange bg-gray-700 text-white"
        />
        <button
          onClick={handleLogin}
          disabled={loading}
          className="px-4 py-2 bg-neorange text-black font-bold rounded-md hover:bg-orange-500 transition focus:outline-none focus:ring focus:ring-orange-300"
        >
          {loading ? 'Authenticating...' : 'Log In'}
        </button>
      </form>
      {error && <p className="text-red-500 mt-2 text-center">{error}</p>}
      <p className="text-gray-300 text-sm mt-4 text-center">
        Don’t have an account?{' '}
        <button
          onClick={() => setHasAccount(false)}
          className="text-neorange hover:underline focus:outline-none"
        >
          Request Access
        </button>
      </p>
    </div>
  );
}

/* Access Request Form */
function AccessRequestForm({ setHasAccount }: { setHasAccount: (value: boolean) => void }) {
  return (
    <div className="w-full">
      <p className="text-gray-300 text-sm mt-4 text-center">
        Already have an account?{' '}
        <button
          onClick={() => setHasAccount(true)}
          className="text-neorange hover:underline focus:outline-none"
        >
          Log In
        </button>
      </p>
      <h2 className="text-2xl font-semibold text-center">Request Access</h2>
      <p className="text-gray-300 text-sm text-center mt-2 mb-6">
        Fill out the form below to request access to our API V2. Our team will review your request
        and get back to you shortly.
      </p>
      <iframe
        src="https://docs.google.com/forms/d/e/1FAIpQLScazJ2Bp-h7XlcE6RewIoL8mKlkg5wrP79fgLo7VI08-VP9jA/viewform?embedded=true"
        width="100%"
        height="500"
        frameBorder="0"
        marginHeight={0}
        marginWidth={0}
        className="border border-gray-600 rounded-md shadow-md"
      >
        Loading…
      </iframe>
    </div>
  );
}
