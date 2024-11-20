// Footer.tsx
import React from 'react';
import Link from 'next/link';

export const Footer: React.FC<FooterProps> = ({}) => {
  return (
    <footer id='App:Footer' className="mx-auto px-2 sm:px-4 lg:px-8 bg-black bottom-0 w-full shadow-md p-4">
      <div className="flex justify-between text-black">
        <p>&copy; {new Date().getFullYear().toString()} API.iDEFi.AI  </p>
        <p>
          <Link 
            href="https://iDEFi.AI"
            className="text-black  hover:underline">iDEFi.AI 
          </Link>{' '}
        </p>
        <p>
          <Link 
            href="/terms"
            className="text-black hover:underline">Disclosure of Terms
          </Link>{' '}
        </p>
      </div>
    </footer>
  );
};

interface FooterProps {}

export default Footer;
