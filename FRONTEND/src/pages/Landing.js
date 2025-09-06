import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

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
          <WalletMultiButton className="!w-full !bg-gradient-to-r !from-purple-500 !to-blue-500 hover:!from-purple-600 hover:!to-blue-600 !py-3 !text-lg" />
          
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
