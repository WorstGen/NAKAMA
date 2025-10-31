import React from 'react';
import { usePhantomMultiChain } from '../contexts/PhantomMultiChainContext';
import { useAuth, useTheme } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';

export const Landing = () => {
  const { isAnyChainConnected } = usePhantomMultiChain();
  const { user, isAuthenticated } = useAuth();
  const { classes } = useTheme();
  const currentColors = classes; // Always dark colors now

  // Redirect to dashboard if already authenticated and has profile
  if (isAuthenticated && user) {
    return <Navigate to="/dashboard" replace />;
  }

  // If authenticated but no profile, stay on landing page
  // This handles EVM addresses that don't have profiles yet
  if (isAuthenticated && !user) {
    // Don't redirect, let user stay on landing page
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
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto drop-shadow-md px-4" style={{ color: '#e5e7eb' }}>
            Connect with friends to make secure SOL and SPL token transfers using only a username.
            Build your on chain social network with unique usernames and profiles.
          </p>
        </div>

        <div className={`${currentColors.card} backdrop-blur-md rounded-2xl p-6 md:p-8 max-w-sm md:max-w-md mx-auto shadow-2xl border`}>
          <h2 className="text-xl md:text-2xl font-semibold text-white mb-6">Get Started</h2>

          {!isAnyChainConnected ? (
            <div>
              <p className="text-gray-200 mb-4">
                Click the "Connect Wallet" button in the header above to get started with your Solana wallet!
              </p>
              <p className="text-gray-400 text-sm mb-4">
                Make sure you are using Phantom wallet on mobile or have the Phantom wallet extension installed on your browser.
              </p>
            </div>
          ) : isAuthenticated && user ? (
            <div>
              <p className="text-gray-200 mb-4">
                🎉 Great! Your wallet is connected. Ready to explore NAKAMA?
              </p>
              <div className="space-y-3">
                <Link
                  to="/dashboard"
                  className="block bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 md:px-8 md:py-4 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-base md:text-lg"
                >
                  Go to Dashboard
                </Link>
                <Link
                  to="/swap"
                  className="block bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 md:px-8 md:py-4 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-base md:text-lg"
                >
                  🔄 Swap Tokens
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-200 mb-4">
                🎉 Great! Your wallet is connected. You can now use NAKAMA!
              </p>
              <p className="text-gray-400 text-sm mb-4">
                Switch between chains using the dropdown in the header to access different networks.
              </p>
              <div className="space-y-3">
                <Link
                  to="/send"
                  className="block bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 md:px-8 md:py-4 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-base md:text-lg"
                >
                  Go to Send
                </Link>
                <Link
                  to="/swap"
                  className="block bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 md:px-8 md:py-4 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-base md:text-lg"
                >
                  🔄 Swap Tokens
                </Link>
              </div>
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
              <span>Multi-chain compatibility</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-orange-400">✅</span>
              <span>Token swaps via Jupiter</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
