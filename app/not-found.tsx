'use client';

import Image from 'next/image';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Not Authorized',
};

export default function NotAuthorized() {
  return (
    <main className="flex flex-col items-center justify-center h-screen bg-black text-white">
      <div className="text-center">
        <Image
          src="/no-auth.gif" // Replace with an appropriate warning image
          alt="Not Authorized"
          width={600}
          height={600}
        />
        <h1 className="text-4xl font-bold mt-16">Access Denied</h1>
        <p className="mt-2 text-lg">
          You do not have the necessary permissions to view this page.
        </p>
        <p className="mt-4">
          <a href="/" className="text-neorange underline hover:text-neohover">
            Back to Home
          </a>{' '}
          or{' '}
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSdH8hxby9a_uMKwQCsRnFbD3pivaoJjAhsZNiN9dSLYzMnyHg/viewform"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neorange underline hover:text-neohover"
          >
            Request Access
          </a>
        </p>
      </div>
    </main>
  );
}
