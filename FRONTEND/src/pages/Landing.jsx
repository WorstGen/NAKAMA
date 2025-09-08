import React from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useAuth, useTheme } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';

export const Landing = () => {
  const { connected } = useWallet();
  const { user } = useAuth();
  const { isDark, colors } = useTheme();
  const currentColors = isDark ? colors.dark : colors.light;

  // Redirect to dashboard if already connected and has profile
  if (connected && user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Redirect to profile setup if connected but no profile
  if (connected && !user) {
    return <Navigate to="/profile" replace />;
  }

  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${currentColors.bg}`}>
      <div className="text-center">
        <div className="mb-8">
          <h1 className={`text-6xl font-bold mb-4 ${currentColors.text}`}>
            <span className={currentColors.accent}>NAKAMA</span>
          </h1>
          <p className={`text-xl ${currentColors.textSecondary} mb-8 max-w-2xl mx-auto`}>
            Connect with friends through secure SOL and SPL token transfers.
            Build your Web3 social network with unique usernames and profiles.
          </p>
        </div>

        <div className={`${currentColors.surface} backdrop-blur-md rounded-2xl p-8 max-w-md mx-auto shadow-2xl ${currentColors.border} border`}>
          <h2 className={`text-2xl font-semibold ${currentColors.text} mb-6`}>Get Started</h2>

          {!connected ? (
            <div>
              <p className={`${currentColors.textSecondary} mb-4`}>
                Click the "Connect Wallet" button in the header above to get started with your Solana wallet!
              </p>
              <p className={`${currentColors.textMuted} text-sm mb-4`}>
                Make sure you have the Phantom wallet extension installed.
              </p>
            </div>
          ) : (
            <div>
              <p className={`${currentColors.textSecondary} mb-4`}>
                🎉 Great! Your wallet is connected. Ready to explore NAKAMA?
              </p>
              <Link
                to="/dashboard"
                className={`${currentColors.accentBg} hover:${currentColors.accentHover} ${currentColors.text} px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5`}
              >
                Go to Dashboard
              </Link>
            </div>
          )}

          <div className={`mt-6 ${currentColors.textMuted} text-sm space-y-2`}>
            <div className="flex items-center space-x-2">
              <span className={currentColors.accent}>✅</span>
              <span>Secure wallet authentication</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={currentColors.secondary}>✅</span>
              <span>Username-based transfers</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={currentColors.accent}>✅</span>
              <span>Contact book management</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={currentColors.secondary}>✅</span>
              <span>Cross-chain support</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={currentColors.accent}>✅</span>
              <span>Light & Dark themes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
