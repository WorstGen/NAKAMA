import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAuth } from '../contexts/AuthContext';

export const Header = () => {
  const location = useLocation();
  const { connected, publicKey, wallet, connect, wallets } = useWallet();
  const { user } = useAuth();
  const [showDebug, setShowDebug] = useState(false);

  const isActive = (path) => location.pathname === path;

  // Manual connect function for debugging
  const manualConnect = async () => {
    try {
      console.log('🔌 Manual connect attempt...');
      console.log('Phantom available:', !!window.solana);
      console.log('Is Phantom:', !!(window.solana && window.solana.isPhantom));
      console.log('Phantom connected:', !!(window.solana && window.solana.isConnected));
      console.log('Phantom publicKey:', window.solana?.publicKey?.toString());

      if (window.solana && window.solana.isPhantom) {
        console.log('👻 Phantom detected, attempting direct connect...');
        const response = await window.solana.connect();
        console.log('✅ Phantom connected:', response);
        console.log('New connection state:', window.solana.isConnected);
        console.log('New publicKey:', window.solana.publicKey?.toString());

        // Force a re-render by updating local state
        setTimeout(() => {
          console.log('🔄 Triggering state update...');
          window.location.reload();
        }, 1000);
      } else {
        console.log('❌ Phantom not available - checking alternatives...');

        // Try standard wallet adapter connect
        if (connect) {
          console.log('🔄 Trying standard wallet adapter connect...');
          await connect();
        } else {
          console.log('❌ No connect function available');
        }
      }
    } catch (error) {
      console.error('❌ Manual connect failed:', error);
      console.error('Error details:', error.message);
    }
  };

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

          {/* Wallet Status */}
          <div className="flex items-center space-x-3">
            {connected && publicKey && (
              <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <div className="text-white text-sm">
                  <div className="font-medium">{wallet?.adapter?.name || 'Wallet'}</div>
                  <div className="text-white/70 text-xs">
                    {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                  </div>
                </div>
              </div>
            )}

            {/* Debug Info */}
            {!connected && (
              <div className="text-white/60 text-xs bg-black/20 px-2 py-1 rounded">
                {window.solana?.isConnected ? '🔗 Browser Connected' : '❌ Not Connected'}
              </div>
            )}

            {/* Temporary debug button */}
            {!connected && (
              <button
                onClick={manualConnect}
                className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"
              >
                🔌 Direct Connect
              </button>
            )}

            <WalletMultiButton />
          </div>

          {/* Debug Panel */}
          {showDebug && (
            <div className="absolute top-full right-0 mt-2 bg-black/90 text-white text-xs p-4 rounded-lg max-w-sm z-50">
              <div className="space-y-2">
                <div className="font-bold text-yellow-400">🔧 Wallet Debug Info</div>
                <div>React Connected: {connected ? '✅' : '❌'}</div>
                <div>React PublicKey: {publicKey?.toString() || 'None'}</div>
                <div>React Wallet: {wallet?.adapter?.name || 'None'}</div>
                <div>Browser Phantom: {window.solana?.isPhantom ? '✅' : '❌'}</div>
                <div>Browser Connected: {window.solana?.isConnected ? '✅' : '❌'}</div>
                <div>Browser PublicKey: {window.solana?.publicKey?.toString() || 'None'}</div>
                <div>Wallets Count: {wallets?.length || 0}</div>
                <div className="border-t pt-2 mt-2">
                  <div className="font-semibold text-blue-400">Available Wallets:</div>
                  {wallets?.map((w, i) => (
                    <div key={i} className="text-xs">
                      {w.adapter.name}: {w.adapter.readyState}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Debug Toggle */}
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="absolute top-2 right-2 text-white/50 hover:text-white text-xs bg-black/20 px-2 py-1 rounded"
          >
            🐛
          </button>
        </div>
      </div>
    </header>
  );
};
