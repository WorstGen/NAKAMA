import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const ConnectModal = ({ isOpen, onClose }) => {
  const [connecting, setConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  if (!isOpen) return null;

  const handleConnectSolana = async () => {
    try {
      setConnecting(true);
      
      // Connect only to Solana, not all chains
      if (window.solana && window.solana.isPhantom) {
        const response = await window.solana.connect();
        console.log('Connected to Solana:', response.publicKey.toString());
        setIsConnected(true);
        toast.success(`Connected to Solana!`);
        
        // Close modal after successful connection
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        throw new Error('Phantom wallet not found');
      }
      
    } catch (error) {
      console.error('Connection failed:', error);
      toast.error(`Failed to connect: ${error.message}`);
    } finally {
      setConnecting(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-4 sm:py-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-900 rounded-2xl border border-gray-700 p-6 sm:p-8 max-w-sm w-full shadow-2xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Solana Connect Button */}
        <div className="text-center">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
              <span className="text-2xl">👻</span>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Connect to Solana</h3>
            <p className="text-gray-400 text-sm">
              Connect your Phantom wallet to get started with NAKAMA
            </p>
          </div>

          <button
            onClick={handleConnectSolana}
            disabled={connecting || isConnected}
            className={`w-full px-6 py-4 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 flex items-center justify-center ${
              isConnected
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white'
            }`}
          >
            {connecting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : isConnected ? (
              '✅ Connected to Solana'
            ) : (
              '🔗 Connect Phantom Wallet'
            )}
          </button>

          {isConnected && (
            <p className="text-green-400 text-sm mt-3">
              You're all set! You can now use NAKAMA.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectModal;

