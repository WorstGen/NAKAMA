import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const Header = () => {
  const location = useLocation();
  const { connected } = useWallet();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-white font-bold text-xl">SolConnect</span>
          </Link>

          {/* Navigation */}
          {connected && (
            <nav className="hidden md:flex space-x-6">
              <Link
                to="/dashboard"
                className={`text-white/80 hover:text-white transition-colors ${
                  isActive('/dashboard') ? 'text-white font-semibold' : ''
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/profile"
                className={`text-white/80 hover:text-white transition-colors ${
                  isActive('/profile') ? 'text-white font-semibold' : ''
                }`}
              >
                Profile
              </Link>
              <Link
                to="/contacts"
                className={`text-white/80 hover:text-white transition-colors ${
                  isActive('/contacts') ? 'text-white font-semibold' : ''
                }`}
              >
                Contacts
              </Link>
              <Link
                to="/send"
                className={`text-white/80 hover:text-white transition-colors ${
                  isActive('/send') ? 'text-white font-semibold' : ''
                }`}
              >
                Send
              </Link>
              <Link
                to="/transactions"
                className={`text-white/80 hover:text-white transition-colors ${
                  isActive('/transactions') ? 'text-white font-semibold' : ''
                }`}
              >
                History
              </Link>
            </nav>
          )}

          {/* Wallet Connect Button */}
          <WalletMultiButton />
        </div>
      </div>
    </header>
  );
};
