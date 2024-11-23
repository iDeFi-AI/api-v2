import React, { useState, useEffect } from 'react';
import { Disclosure } from '@headlessui/react';
import { Bars3Icon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import NextImage from 'next/image';
import Link from 'next/link';
import LogoImage from '@/public/shortV2.png';
import HeaderNavLink from './HeaderNavLink';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileCode, faFlaskVial, faBook, faShieldAlt, faCogs, faDatabase, faEye, faUser } from '@fortawesome/free-solid-svg-icons';
import { auth } from '@/utilities/firebaseClient';
import { signOut } from 'firebase/auth';

const menuItems = [
  { icon: <FontAwesomeIcon icon={faBook} />, label: 'Docs', url: '/docs' },
  { icon: <FontAwesomeIcon icon={faFileCode} />, label: 'Devs', url: '/devs' },
  {
    icon: <FontAwesomeIcon icon={faFlaskVial} />,
    label: 'Tools',
    children: [
      { icon: <FontAwesomeIcon icon={faEye} />, label: 'Origins', url: '/origins' },
      { icon: <FontAwesomeIcon icon={faCogs} />, label: 'Metrics', url: '/metrics' },
      { icon: <FontAwesomeIcon icon={faEye} />, label: 'Monitor', url: '/monitor' },
      { icon: <FontAwesomeIcon icon={faShieldAlt} />, label: 'Firewall', url: '/firewall' },
      { icon: <FontAwesomeIcon icon={faDatabase} />, label: 'Contracts', url: '/smartscan' },
      { icon: <FontAwesomeIcon icon={faShieldAlt} />, label: 'DustCheck', url: '/undust' },
      { icon: <FontAwesomeIcon icon={faEye} />, label: 'TxMapping', url: '/txmap' },
      { icon: <FontAwesomeIcon icon={faEye} />, label: 'Visualizing', url: '/visualize' },
    ],
  },
  { icon: null, label: 'Log out', url: '/' },
];

const NavMenu: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    const checkAuthToken = () => {
      setLoading(true);
      auth.onAuthStateChanged((user) => {
        setIsAuthenticated(!!user);
        setLoading(false);
      });
    };

    window.addEventListener('scroll', handleScroll);
    checkAuthToken();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setIsAuthenticated(false);
      window.location.href = '/';
    } catch (err) {
      console.error('Error logging out:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (url: string) => {
    setLoading(true);
    window.location.href = url;
  };

  const renderMenuItem = (item: any) => {
    if (!isAuthenticated && item.label === 'Profile') {
      return null;
    }

    if (item.label === 'Log out') {
      return (
        <button
          key={item.label}
          onClick={handleLogout}
          className="flex items-center space-x-1 text-gray-700 hover:text-lightlaven"
        >
          {item.icon && <span>{item.icon}</span>}
          <span>{item.label}</span>
        </button>
      );
    }

    if (item.children) {
      return (
        <div className="relative" key={item.label}>
          <Disclosure>
            {({ open }) => (
              <>
                <Disclosure.Button className="inline-flex items-center space-x-1 text-gray-700 hover:text-lightlaven">
                  {item.icon && <span>{item.icon}</span>}
                  <span className="text-sm font-medium">{item.label}</span>
                  <ChevronDownIcon className={`h-5 w-5 transform ${open ? 'rotate-180' : 'rotate-0'}`} />
                </Disclosure.Button>
                <Disclosure.Panel className="absolute mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                  <div className="py-1">
                    {item.children.map((subItem: any) => (
                      <button
                        key={subItem.label}
                        onClick={() => handleNavigation(subItem.url)}
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-lightlaven w-full text-left"
                      >
                        {subItem.icon && <span>{subItem.icon}</span>}
                        <span>{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                </Disclosure.Panel>
              </>
            )}
          </Disclosure>
        </div>
      );
    }

    return (
      <button
        key={item.label}
        onClick={() => handleNavigation(item.url)}
        className="flex items-center space-x-1 text-gray-700 hover:text-lightlaven"
      >
        {item.icon && <span>{item.icon}</span>}
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <div className="relative">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="text-white text-xl font-semibold animate-pulse">Loading...</div>
        </div>
      )}

      <Disclosure as="nav" className={`bg-white shadow ${isScrolled ? 'sticky-header' : ''}`}>
        {({ open }) => (
          <>
            <div className="mx-auto max-w-7xl px-2 sm:px-4 lg:px-8">
              <div className="flex h-16 justify-between">
                <div className="flex px-2 lg:px-0">
                  <div className="flex flex-shrink-0 items-center">
                    <Link href="/">
                      <NextImage className="h-8 w-auto" src={LogoImage} alt="Logo" width={210} height={125} />
                    </Link>
                  </div>
                </div>
                <div className="hidden lg:flex lg:space-x-8">{menuItems.map(renderMenuItem)}</div>
                <div className="flex items-center lg:hidden">
                  <Disclosure.Button className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-lightlaven">
                    <span className="sr-only">Open main menu</span>
                    {open ? (
                      <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                    ) : (
                      <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                    )}
                  </Disclosure.Button>
                </div>
              </div>
            </div>

            <Disclosure.Panel className="lg:hidden">
              <div className="flex flex-col items-center space-y-2 py-3">
                {menuItems.map(renderMenuItem)}
              </div>
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>
    </div>
  );
};

export default NavMenu;
