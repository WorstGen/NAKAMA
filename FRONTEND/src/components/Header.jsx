import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAuth } from '../contexts/AuthContext';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

// Wallet Troubleshooting Modal Component
const WalletTroubleshootingModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Wallet Connection Help</h3>

          <div className="space-y-4 text-sm text-gray-600">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">🔧 Common Issues:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Multiple blockchain networks enabled in wallet</li>
                <li>Wallet extension conflicts</li>
                <li>Network connection issues</li>
                <li>Browser cache problems</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">🛠️ Quick Fixes:</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Ensure only Solana network is enabled in your wallet</li>
                <li>Try refreshing the page</li>
                <li>Disconnect and reconnect your wallet</li>
                <li>Try a different browser or incognito mode</li>
                <li>Check if other wallet extensions are disabled</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">🎯 For Phantom Users:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Go to Settings → Networks</li>
                <li>Disable Ethereum and Sui networks</li>
                <li>Ensure Solana Mainnet is selected</li>
                <li>Try resetting your wallet account</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Wallet Connect Button Component
const WalletConnectButton = () => {
  const { connected, publicKey, disconnect, wallet, connect, select, wallets, connecting } = useWallet();
  const [connectionError, setConnectionError] = React.useState(null);
  const [showTroubleshooting, setShowTroubleshooting] = React.useState(false);

  // Debug the actual wallet adapter state
  React.useEffect(() => {
    console.log('Header - Wallet Adapter State:');
    console.log('Connected:', connected);
    console.log('Connecting:', connecting);
    console.log('PublicKey:', publicKey?.toString());
    console.log('Wallet:', wallet?.adapter?.name);
    console.log('Wallet readyState:', wallet?.adapter?.readyState);
    console.log('Available wallets:', wallets.map(w => ({ name: w.adapter.name, readyState: w.adapter.readyState })));
  }, [connected, connecting, publicKey, wallet, wallets]);

  // Try to auto-connect to detected Phantom
  React.useEffect(() => {
    if (!connected && !connecting && typeof window !== 'undefined' && window.solana?.isPhantom) {
      // Find phantom wallet in available wallets
      const phantomWallet = wallets.find(w =>
        w.adapter.name.toLowerCase().includes('phantom') ||
        w.adapter.url === 'https://phantom.app'
      );

      if (phantomWallet) {
        console.log('Found Phantom wallet, attempting to select and connect...');
        select(phantomWallet.adapter.name);
        setTimeout(() => {
          connect().catch(err => {
            console.log('Auto-connect failed:', err);
            setConnectionError('Failed to connect to Phantom wallet. Please try connecting manually.');
          });
        }, 100);
      } else {
        console.log('Phantom wallet not found in available wallets');
        console.log('Trying to connect to detected Phantom directly...');

        // Try direct connection and then manually trigger wallet adapter
        window.solana.connect({ onlyIfTrusted: true })
          .then(() => {
            console.log('Direct Phantom connection successful, wallet adapter should pick it up');
            setConnectionError(null);
          })
          .catch((err) => {
            console.log('Direct silent connection failed:', err);
            // Don't set error for silent connection failures as they're expected
          });
      }
    }
  }, [connected, connecting, wallets, select, connect]);

  if (connected) {
    return (
      <div className="flex items-center space-x-3">
        <div className="hidden sm:flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            publicKey ? 'bg-gradient-to-r from-green-400 to-blue-400' : 'bg-yellow-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              publicKey ? 'bg-white' : 'bg-yellow-600'
            }`}></div>
          </div>
          <div className="text-white">
            <div className="text-xs font-semibold">{wallet?.adapter?.name || 'Wallet'}</div>
            <div className="text-xs opacity-80">
              {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4) || 'Connecting...'}
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            disconnect();
            setConnectionError(null);
          }}
          className="bg-red-500/20 hover:bg-red-500/40 text-red-200 hover:text-white px-3 py-2 rounded-lg text-sm transition-all duration-200 border border-red-500/30"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end space-y-2">
      {connectionError && (
        <div className="text-red-300 text-xs bg-red-500/10 px-3 py-1 rounded-lg border border-red-500/20 max-w-xs text-center">
          {connectionError}
        </div>
      )}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setShowTroubleshooting(true)}
          className="text-white/60 hover:text-white transition-colors p-1"
          title="Wallet Connection Help"
        >
          <QuestionMarkCircleIcon className="w-5 h-5" />
        </button>
        <WalletMultiButton
          className="!bg-gradient-to-r !from-purple-500 !to-blue-500 hover:!from-purple-600 hover:!to-blue-600 !transition-all !duration-200"
        />
      </div>
      {connecting && (
        <div className="text-white/60 text-xs">Connecting...</div>
      )}

      <WalletTroubleshootingModal
        isOpen={showTroubleshooting}
        onClose={() => setShowTroubleshooting(false)}
      />
    </div>
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
