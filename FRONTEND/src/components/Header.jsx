import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useTheme, useAuth } from '../contexts/AuthContext';

export const Header = () => {
  const location = useLocation();
  const { connected, publicKey, wallet, connect, disconnect } = useWallet();
  const { user } = useAuth();
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

          {/* Combined Wallet Status and Connect/Disconnect */}
          <div className="hidden md:flex items-center mr-4">
            {connected && publicKey ? (
              // Connected state - show user profile with disconnect option
              <div className="flex items-center space-x-3 backdrop-blur-sm rounded-lg px-3 py-2 border"
                   style={{
                     backgroundColor: '#1f2937',
                     border: '1px solid #374151'
                   }}>
                {/* Profile Picture */}
                {user?.profilePicture ? (
                  <img
                    src={`https://nakama-production-1850.up.railway.app${user.profilePicture}`}
                    alt={`${user.username}'s profile`}
                    className="w-8 h-8 rounded-full object-cover border-2"
                    style={{ borderColor: '#fb923c' }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-400 to-blue-400 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </div>
                )}

                {/* User Info */}
                <div className="text-sm">
                  <div className="font-medium" style={{ color: '#ffffff' }}>
                    @{user?.username || 'User'}
                  </div>
                  <div className="text-xs" style={{ color: '#e5e7eb' }}>
                    ({publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)})
                  </div>
                </div>

                {/* Disconnect Button */}
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
                  className="ml-2 p-1 rounded-md hover:bg-red-600 transition-colors"
                  style={{ backgroundColor: '#dc2626' }}
                  title="Disconnect Wallet"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : (
              // Not connected state - show connect button
              window.solana?.isPhantom && (
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
                  className="px-4 py-2 rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  style={{
                    backgroundColor: '#f97316',
                    color: '#ffffff'
                  }}
                >
                  Connect Wallet
                </button>
              )
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
