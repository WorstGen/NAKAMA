import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useTheme, ThemeToggle } from '../contexts/AuthContext';

export const Header = () => {
  const location = useLocation();
  const { connected, publicKey, wallet, connect } = useWallet();
  const { isDark, colors } = useTheme();
  const currentColors = isDark ? colors.dark : colors.light;

  const isActive = (path) => location.pathname === path;


  return (
    <header className={`backdrop-blur-md border-b transition-colors duration-300 ${isDark ? 'bg-black/80 border-gray-700' : 'bg-white/80 border-gray-200'}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className={`w-8 h-8 ${isDark ? 'bg-gradient-to-r from-orange-400 to-blue-400' : 'bg-gradient-to-r from-orange-500 to-blue-500'} rounded-lg flex items-center justify-center shadow-lg`}>
              <span className={`font-bold text-lg ${currentColors.text}`}>N</span>
            </div>
            <span className={`font-bold text-xl ${currentColors.text}`}>NAKAMA</span>
          </Link>

          {/* Navigation */}
          {connected && (
            <nav className="hidden md:flex space-x-6">
              <Link
                to="/dashboard"
                className={`${currentColors.textSecondary} hover:${currentColors.accent} transition-colors ${
                  isActive('/dashboard') ? `${currentColors.accent} font-semibold` : ''
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/profile"
                className={`${currentColors.textSecondary} hover:${currentColors.accent} transition-colors ${
                  isActive('/profile') ? `${currentColors.accent} font-semibold` : ''
                }`}
              >
                Profile
              </Link>
              <Link
                to="/contacts"
                className={`${currentColors.textSecondary} hover:${currentColors.accent} transition-colors ${
                  isActive('/contacts') ? `${currentColors.accent} font-semibold` : ''
                }`}
              >
                Contacts
              </Link>
              <Link
                to="/send"
                className={`${currentColors.textSecondary} hover:${currentColors.accent} transition-colors ${
                  isActive('/send') ? `${currentColors.accent} font-semibold` : ''
                }`}
              >
                Send
              </Link>
              <Link
                to="/transactions"
                className={`${currentColors.textSecondary} hover:${currentColors.accent} transition-colors ${
                  isActive('/transactions') ? `${currentColors.accent} font-semibold` : ''
                }`}
              >
                History
              </Link>
            </nav>
          )}

          {/* Wallet Status Display */}
          {connected && publicKey && (
            <div className={`hidden md:flex items-center space-x-2 ${isDark ? 'bg-gray-700/50' : 'bg-white/50'} backdrop-blur-sm rounded-lg px-3 py-2 mr-4 ${currentColors.border} border`}>
              <div className={`${currentColors.accent} w-2 h-2 rounded-full animate-pulse`}></div>
              <div className={`${currentColors.text} text-sm`}>
                <div className="font-medium">{wallet?.adapter?.name || 'Wallet'}</div>
                <div className={`${currentColors.textSecondary} text-xs`}>
                  {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                </div>
              </div>
            </div>
          )}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Manual Connect Button - appears when Phantom available but not connected */}
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
              className={`${currentColors.accentBg} hover:${currentColors.accentHover} ${currentColors.text} px-4 py-2 rounded-lg font-medium transition-colors mr-2 shadow-lg`}
            >
              Connect Wallet
            </button>
          )}

        </div>
      </div>
    </header>
  );
};
