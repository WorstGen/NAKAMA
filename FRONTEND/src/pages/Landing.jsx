import React from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';

export const Landing = () => {
  const { connected } = useWallet();
  const { user } = useAuth();

  // Redirect to dashboard if already connected and has profile
  if (connected && user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Redirect to profile setup if connected but no profile
  if (connected && !user) {
    return <Navigate to="/profile" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-white mb-4">
            Sol<span className="text-purple-300">Connect</span>
          </h1>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            The secure way to send SOL and SPL tokens using usernames.
            Connect your wallet and create your unique identity on Solana.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-md mx-auto">
          <h2 className="text-2xl font-semibold text-white mb-6">Get Started</h2>

          {!connected ? (
            <div>
              <p className="text-white/80 mb-4">
                Click the "Connect Phantom" button in the header above to get started with your Solana wallet!
              </p>
              <p className="text-white/60 text-sm mb-4">
                Make sure you have the Phantom wallet extension installed.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-white/80 mb-4">
                🎉 Great! Your wallet is connected. Ready to explore SolConnect?
              </p>
              <Link
                to="/dashboard"
                className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          )}

          <div className="mt-6 text-white/60 text-sm">
            <p>✅ Secure wallet authentication</p>
            <p>✅ Username-based transfers</p>
            <p>✅ Contact book management</p>
            <p>✅ Cross-chain support</p>
          </div>
        </div>
      </div>
    </div>
  );
};
