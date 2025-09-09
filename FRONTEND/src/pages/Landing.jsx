import React from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useAuth, useTheme } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';

export const Landing = () => {
  const { connected } = useWallet();
  const { user } = useAuth();

  let isDark = true; // default to dark
  try {
    const theme = useTheme();
    isDark = theme.isDark;
  } catch (error) {
    console.error('🎨 Landing: Theme hook failed, using dark fallback:', error);
  }

  // Redirect to dashboard if already connected and has profile
  if (connected && user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Redirect to profile setup if connected but no profile
  if (connected && !user) {
    return <Navigate to="/profile" replace />;
  }

  const containerStyle = {
    backgroundColor: isDark ? '#000000' : '#f9fafb',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.5s ease'
  };

  const cardStyle = {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
    color: isDark ? '#ffffff' : '#111827'
  };

  return (
    <div style={containerStyle}>
      <div className="text-center">
        <div className="mb-8">
          <h1 className={`text-6xl font-bold mb-4 drop-shadow-lg`} style={{ color: isDark ? '#ffffff' : '#111827' }}>
            <span className="drop-shadow-lg" style={{ color: isDark ? '#fb923c' : '#f97316' }}>NAKAMA</span>
          </h1>
          <p className={`text-xl mb-8 max-w-2xl mx-auto drop-shadow-md`} style={{ color: isDark ? '#e5e7eb' : '#4b5563' }}>
            Connect with friends through secure SOL and SPL token transfers.
            Build your Web3 social network with unique usernames and profiles.
          </p>
        </div>

        <div className="backdrop-blur-md rounded-2xl p-8 max-w-md mx-auto shadow-2xl" style={cardStyle}>
          <h2 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-6`}>Get Started</h2>

          {!connected ? (
            <div>
              <p className={`${isDark ? 'text-gray-200' : 'text-gray-600'} mb-4`}>
                Click the "Connect Wallet" button in the header above to get started with your Solana wallet!
              </p>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-400'} text-sm mb-4`}>
                Make sure you have the Phantom wallet extension installed.
              </p>
            </div>
          ) : (
            <div>
              <p className={`${isDark ? 'text-gray-200' : 'text-gray-600'} mb-4`}>
                🎉 Great! Your wallet is connected. Ready to explore NAKAMA?
              </p>
              <Link
                to="/dashboard"
                className={`${isDark ? 'bg-orange-500 hover:bg-orange-600' : 'bg-orange-500 hover:bg-orange-600'} text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5`}
              >
                Go to Dashboard
              </Link>
            </div>
          )}

          <div className={`mt-6 ${isDark ? 'text-gray-400' : 'text-gray-400'} text-sm space-y-2`}>
            <div className="flex items-center space-x-2">
              <span className={isDark ? 'text-orange-400' : 'text-orange-500'}>✅</span>
              <span>Secure wallet authentication</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={isDark ? 'text-blue-400' : 'text-blue-500'}>✅</span>
              <span>Username-based transfers</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={isDark ? 'text-orange-400' : 'text-orange-500'}>✅</span>
              <span>Contact book management</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={isDark ? 'text-blue-400' : 'text-blue-500'}>✅</span>
              <span>Cross-chain support</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={isDark ? 'text-orange-400' : 'text-orange-500'}>✅</span>
              <span>Light & Dark themes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
