import React, { useEffect, useState } from 'react';
import { usePhantomMultiChain } from '../contexts/PhantomMultiChainContext';
import { useAuth, useTheme } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';

export const Landing = () => {
  const { isAnyChainConnected, walletAddress } = usePhantomMultiChain();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { classes } = useTheme();
  const currentColors = classes;
  const [isLoading, setIsLoading] = useState(true);

  // Add loading state to prevent premature redirects
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Note: Auto-authentication is now handled in AuthContext
  // This component just monitors the state changes

  // Show loading while authentication is happening
  if (isLoading || authLoading) {
    return (
      <div style={{
        backgroundColor: '#000000',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <div className="text-white text-xl">
            {authLoading ? 'Authenticating wallet...' : 'Loading...'}
          </div>
        </div>
      </div>
    );
  }

  // Only redirect if fully authenticated AND has user profile
  if (isAuthenticated && user) {
    return <Navigate to="/dashboard" replace />;
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
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mt-4">
                <p className="text-orange-300 text-xs">
                  💡 First time? Your wallet will be automatically registered when you connect!
                </p>
              </div>
            </div>
          ) : isAuthenticated && user ? (
            <div>
              <p className="text-gray-200 mb-4">
                🎉 Great! Your wallet is connected. Ready to explore NAKAMA?
              </p>
              <Link
                to="/dashboard"
                className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 md:px-8 md:py-4 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-base md:text-lg"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : isAuthenticated && !user ? (
            <div>
              <p className="text-gray-200 mb-4">
                🎉 Great! Your wallet is connected. Create your profile to get started!
              </p>
              <Link
                to="/profile"
                className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 md:px-8 md:py-4 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-base md:text-lg mb-3"
              >
                Create Profile
              </Link>
              <p className="text-gray-400 text-sm">
                Or go directly to{' '}
                <Link to="/send" className="text-blue-400 hover:text-blue-300 underline">
                  Send
                </Link>
              </p>
            </div>
          ) : isAnyChainConnected && !isAuthenticated ? (
            <div>
              <p className="text-gray-200 mb-4">
                ⏳ Wallet detected, setting up your account...
              </p>
              <div className="animate-pulse bg-white/5 rounded-lg p-4">
                <p className="text-gray-400 text-sm">
                  Please wait while we authenticate your wallet
                </p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 text-blue-400 hover:text-blue-300 text-sm underline"
              >
                Click here if nothing happens
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-200 mb-4">
                Connect your wallet to access NAKAMA features
              </p>
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

        {/* Debug info for development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 text-xs text-gray-500">
            <p>Debug: Connected={isAnyChainConnected ? 'Yes' : 'No'} | Auth={isAuthenticated ? 'Yes' : 'No'} | User={user ? 'Yes' : 'No'}</p>
            <p>Wallet: {walletAddress || 'None'}</p>
          </div>
        )}
      </div>
    </div>
  );
};
