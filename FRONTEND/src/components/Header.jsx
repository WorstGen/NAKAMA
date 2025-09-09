import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useTheme } from '../contexts/AuthContext';

export const Header = () => {
  const location = useLocation();
  const { connected, publicKey, wallet, connect, disconnect } = useWallet();
  const theme = useTheme();
  const currentColors = theme.classes; // Always dark colors now

  const isActive = (path) => location.pathname === path;


  const headerStyle = {
    backgroundColor: '#000000',
    borderBottom: '1px solid #374151',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease'
  };

  const navItemStyle = (isActive) => ({
    color: isActive ? '#fb923c' : '#e5e7eb'
  });

  return (
    <header style={headerStyle}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-blue-400 rounded-lg flex items-center justify-center shadow-lg">
              <span className={`font-bold text-lg ${currentColors.text}`}>N</span>
            </div>
            <span className={`font-bold text-xl ${currentColors.text}`}>NAKAMA</span>
          </Link>

          {/* Navigation */}
          {connected && (
            <nav className="hidden md:flex space-x-6">
              <Link
                to="/dashboard"
                style={navItemStyle(isActive('/dashboard'))}
                className={`transition-colors font-medium ${isActive('/dashboard') ? 'font-semibold' : ''}`}
              >
                Dashboard
              </Link>
              <Link
                to="/profile"
                style={navItemStyle(isActive('/profile'))}
                className={`transition-colors font-medium ${isActive('/profile') ? 'font-semibold' : ''}`}
              >
                Profile
              </Link>
              <Link
                to="/contacts"
                style={navItemStyle(isActive('/contacts'))}
                className={`transition-colors font-medium ${isActive('/contacts') ? 'font-semibold' : ''}`}
              >
                Contacts
              </Link>
              <Link
                to="/send"
                style={navItemStyle(isActive('/send'))}
                className={`transition-colors font-medium ${isActive('/send') ? 'font-semibold' : ''}`}
              >
                Send
              </Link>
              <Link
                to="/transactions"
                style={navItemStyle(isActive('/transactions'))}
                className={`transition-colors font-medium ${isActive('/transactions') ? 'font-semibold' : ''}`}
              >
                History
              </Link>
            </nav>
          )}

          {/* Wallet Status Display */}
          {connected && publicKey && (
            <div className="hidden md:flex items-center space-x-2 backdrop-blur-sm rounded-lg px-3 py-2 mr-4"
                 style={{
                   backgroundColor: '#1f2937',
                   border: '1px solid #374151'
                 }}>
              <div className="w-2 h-2 rounded-full animate-pulse"
                   style={{ backgroundColor: '#fb923c' }}></div>
              <div className="text-sm" style={{ color: '#ffffff' }}>
                <div className="font-medium">{wallet?.adapter?.name || 'Wallet'}</div>
                <div className="text-xs" style={{ color: '#e5e7eb' }}>
                  {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                </div>
              </div>
            </div>
          )}


          {/* Connect Button - appears when Phantom available but not connected */}
          {!connected && window.solana?.isPhantom && (
            <button
              onClick={async () => {
                try {
                  console.log('🔌 Connecting to Phantom...');
                  await connect();
                  console.log('✅ Connection initiated');
                } catch (error) {
                  console.error('❌ Connection failed:', error);
                  alert(`Connection failed: ${error.message}`);
                }
              }}
              className="px-4 py-2 rounded-lg font-medium transition-colors mr-2 shadow-lg"
              style={{
                backgroundColor: '#f97316',
                color: '#ffffff'
              }}
            >
              Connect Wallet
            </button>
          )}

          {/* Disconnect Button - appears when connected */}
          {connected && (
            <button
              onClick={async () => {
                try {
                  console.log('🔌 Disconnecting from Phantom...');
                  await disconnect();
                  console.log('✅ Disconnection completed');
                } catch (error) {
                  console.error('❌ Disconnection failed:', error);
                  alert(`Disconnection failed: ${error.message}`);
                }
              }}
              className="px-4 py-2 rounded-lg font-medium transition-colors mr-2 shadow-lg"
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff'
              }}
            >
              Disconnect
            </button>
          )}

        </div>
      </div>
    </header>
  );
};
