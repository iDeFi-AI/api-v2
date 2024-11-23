'use client';

import { useState } from 'react';
import Image from 'next/image';
import { signInWithEmailPassword } from '@/utilities/firebaseClient';

export default function Home() {
  const [hasAccount, setHasAccount] = useState(true); // Tracks if the user has an account

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white-900 via-white-800 to-white-700 text-white">
      {/* Logo Section */}
      <div className="mt-6">
        <Image src="/shortV2.png" alt="API.iDEFi.AI Logo" width={200} height={200} />
      </div>
      {/* Toggle between Login and Form */}
      <div className="flex flex-col items-center w-full max-w-lg mt-10 bg-gray-800 p-6 rounded-lg shadow-lg">
        {hasAccount ? (
          <LoginSection setHasAccount={setHasAccount} />
        ) : (
          <AccessRequestForm setHasAccount={setHasAccount} />
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
      // Firebase Authentication
      const userCredential = await signInWithEmailPassword(email, password);

      // Verify email and set user details
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

      // Set user details in cookies
      setAuthToken(idToken);
      console.log(`User authenticated: ${uid}, ${userEmail}`);

      // Redirect to '/devs'
      window.location.href = '/devs';
    } catch (err: any) {
      console.error('Error logging in:', err);
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
          {loading ? 'Logging In...' : 'Log In'}
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
        Fill out the form below to request access to our API V2. Our team will review your
        request and get back to you shortly.
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
