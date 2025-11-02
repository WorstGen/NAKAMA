import React, { useEffect, useState } from 'react';
import { usePhantomMultiChain } from '../contexts/PhantomMultiChainContext';
import { useAuth, useTheme } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';

export const Landing = () => {
  const { isAnyChainConnected } = usePhantomMultiChain();
  const { user, isAuthenticated } = useAuth();
  const { classes } = useTheme();
  const currentColors = classes;
  const [isLoading, setIsLoading] = useState(true);

  // Add loading state to prevent premature redirects
  useEffect(() => {
    // Give time for auth context to initialize
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div style={{
        backgroundColor: '#000000',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="text-white text-xl">Loading...</div>
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
      </div>
    </div>
  );
};
