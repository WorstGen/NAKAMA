import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAuth } from '../contexts/AuthContext';

// Enhanced Wallet Connect Button Component
const WalletConnectButton = () => {
  const { connected, publicKey, disconnect, wallet, connect, select, wallets } = useWallet();

  // Debug the actual wallet adapter state
  React.useEffect(() => {
    console.log('Header - Wallet Adapter State:');
    console.log('Connected:', connected);
    console.log('PublicKey:', publicKey?.toString());
    console.log('Wallet:', wallet?.adapter?.name);
    console.log('Wallet readyState:', wallet?.adapter?.readyState);
    console.log('Available wallets:', wallets.map(w => ({ name: w.adapter.name, readyState: w.adapter.readyState })));
  }, [connected, publicKey, wallet, wallets]);

  // Try to auto-connect to detected Phantom
  React.useEffect(() => {
    if (!connected && typeof window !== 'undefined' && window.solana?.isPhantom) {
      // Find phantom wallet in available wallets
      const phantomWallet = wallets.find(w => 
        w.adapter.name.toLowerCase().includes('phantom') || 
        w.adapter.url === 'https://phantom.app'
      );
      
      if (phantomWallet) {
        console.log('Found Phantom wallet, attempting to select and connect...');
        select(phantomWallet.adapter.name);
        setTimeout(() => {
          connect().catch(err => console.log('Auto-connect failed:', err));
        }, 100);
      } else {
        console.log('Phantom wallet not found in available wallets');
        console.log('Trying to connect to detected Phantom directly...');
        
        // Try direct connection and then manually trigger wallet adapter
        window.solana.connect({ onlyIfTrusted: true })
          .then(() => {
            console.log('Direct Phantom connection successful, wallet adapter should pick it up');
          })
          .catch(() => console.log('Direct silent connection failed'));
      }
    }
  }, [connected, wallets, select, connect]);

  if (connected) {
    return (
      <div className="flex items-center space-x-3">
        <div className="hidden sm:flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2">
          <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-blue-400 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <div className="text-white">
            <div className="text-xs font-semibold">{wallet?.adapter?.name || 'Wallet'}</div>
            <div className="text-xs opacity-80">
              {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}
            </div>
          </div>
        </div>
        <button 
          onClick={disconnect} 
          className="bg-red-500/20 hover:bg-red-500/40 text-red-200 hover:text-white px-3 py-2 rounded-lg text-sm transition-all duration-200 border border-red-500/30"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <WalletMultiButton 
      className="!bg-gradient-to-r !from-purple-500 !to-blue-500 hover:!from-purple-600 hover:!to-blue-600 !transition-all !duration-200" 
    />
  );
};

export const Header = () => {
  const location = useLocation();
  const { connected } = useWallet();
  const { user } = useAuth();

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
          {connected && user && (
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

          {/* User info and wallet button */}
          <div className="flex items-center space-x-4">
            {connected && user && (
              <div className="hidden lg:flex items-center space-x-2 text-white">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                  <span className="font-semibold text-sm">
                    {user.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="font-medium">@{user.username}</span>
              </div>
            )}
            {/* Replace the old WalletMultiButton with our enhanced component */}
            <WalletConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
};
