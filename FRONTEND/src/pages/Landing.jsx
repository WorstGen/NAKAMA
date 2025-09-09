import React from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useAuth, useTheme } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';

export const Landing = () => {
  const { connected } = useWallet();
  const { user } = useAuth();
  const { classes } = useTheme();
  const currentColors = classes; // Always dark colors now

  // Redirect to dashboard if already connected and has profile
  if (connected && user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Redirect to profile setup if connected but no profile
  if (connected && !user) {
    return <Navigate to="/profile" replace />;
  }

  const containerStyle = {
    backgroundColor: '#000000',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.5s ease'
  };

  return (
    <div style={containerStyle}>
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg" style={{ color: '#ffffff' }}>
            <span className="drop-shadow-lg" style={{ color: '#fb923c' }}>NAKAMA</span>
          </h1>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto drop-shadow-md px-4" style={{ color: '#e5e7eb' }}>
            Connect with friends through secure SOL and SPL token transfers.
            Build your Web3 social network with unique usernames and profiles.
          </p>
        </div>

        <div className={`${currentColors.card} backdrop-blur-md rounded-2xl p-6 md:p-8 max-w-sm md:max-w-md mx-auto shadow-2xl border`}>
          <h2 className="text-xl md:text-2xl font-semibold text-white mb-6">Get Started</h2>

          {!connected ? (
            <div>
              <p className="text-gray-200 mb-4">
                Click the "Connect Wallet" button in the header above to get started with your Solana wallet!
              </p>
              <p className="text-gray-400 text-sm mb-4">
                Make sure you have the Phantom wallet extension installed.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-gray-200 mb-4">
                🎉 Great! Your wallet is connected. Ready to explore NAKAMA?
              </p>
              <Link
                to="/dashboard"
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 md:px-8 md:py-4 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-base md:text-lg"
              >
                Go to Dashboard
              </Link>
            </div>
          )}

          <div className="mt-6 text-gray-400 text-sm space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-orange-400">✅</span>
              <span>Secure wallet authentication</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-blue-400">✅</span>
              <span>Username-based transfers</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-orange-400">✅</span>
              <span>Contact book management</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-blue-400">✅</span>
              <span>Cross-chain support</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-orange-400">✅</span>
              <span>Light & Dark themes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
