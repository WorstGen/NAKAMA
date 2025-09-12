import React from 'react';
import { usePhantomMultiChain } from '../contexts/PhantomMultiChainContext';
import { useWalletConnect } from '../contexts/WalletConnectContext';
import { useAuth, useTheme } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';

export const Landing = () => {
  const { isAnyChainConnected } = usePhantomMultiChain();
  const { isConnected: walletConnectConnected, address: walletConnectAddress } = useWalletConnect();
  const { user, isAuthenticated } = useAuth();

  // Check if any wallet is connected (Phantom OR WalletConnect)
  const isAnyWalletConnected = isAnyChainConnected || (walletConnectConnected && walletConnectAddress);
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

          {!isAnyWalletConnected ? (
            <div>
              <p className="text-gray-200 mb-4">
                Click the "Connect Wallet" button in the header above to get started with your wallet!
              </p>
              <p className="text-gray-400 text-sm mb-4">
                Connect with Phantom (Solana + EVM), MetaMask, or any WalletConnect-compatible wallet.
              </p>
            </div>
          ) : isAuthenticated && user ? (
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
          ) : isAuthenticated ? (
            <div>
              <p className="text-gray-200 mb-4">
                🎉 Great! Your wallet is connected. You can now use NAKAMA!
              </p>
              <p className="text-gray-400 text-sm mb-4">
                Switch between chains using the dropdown in the header to access different networks.
              </p>
              <Link
                to="/send"
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 md:px-8 md:py-4 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-base md:text-lg"
              >
                Go to Send
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-gray-200 mb-4">
                🎉 Wallet Connected! Let's complete your setup.
              </p>
              <p className="text-gray-400 text-sm mb-4">
                Click "Create Profile" to set up your NAKAMA account and start using the app.
              </p>
              <Link
                to="/profile"
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 md:px-8 md:py-4 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-base md:text-lg inline-block"
              >
                Create Profile
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
              <span>Multi-chain compatibility</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
