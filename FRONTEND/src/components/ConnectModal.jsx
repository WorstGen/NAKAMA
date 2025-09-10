import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useMultiWallet } from '../contexts/MultiWalletContext';
import { chainConfig, ethereumClient } from '../config/web3Config';
import toast from 'react-hot-toast';

const ConnectModal = ({ isOpen, onClose }) => {
  const { connectWallet, connectAllWallets, connectedWallets } = useMultiWallet();
  const [connecting, setConnecting] = useState(null);

  if (!isOpen) return null;

  const handleConnect = async (type, chainName = null) => {
    try {
      setConnecting(type);
      
      if (type === 'solana') {
        await connectWallet('solana');
        toast.success('Solana wallet connected!');
      } else if (type === 'evm') {
        // Trigger Web3Modal for EVM wallets
        try {
          // Use the ethereumClient from web3Config
          if (ethereumClient && typeof ethereumClient.openModal === 'function') {
            await ethereumClient.openModal();
          } else {
            // Fallback: try to find and click the Web3Modal button
            const w3mButton = document.querySelector('w3m-connect-button');
            if (w3mButton) {
              w3mButton.click();
            } else {
              throw new Error('Web3Modal not available');
            }
          }
        } catch (modalError) {
          console.error('Web3Modal error:', modalError);
          throw new Error('Unable to open wallet connection modal');
        }
      } else if (chainName) {
        await connectWallet(chainName);
      }
      
      // Close modal after successful connection
      setTimeout(() => {
        onClose();
      }, 500);
      
    } catch (error) {
      console.error('Connection failed:', error);
      toast.error(`Failed to connect: ${error.message}`);
    } finally {
      setConnecting(null);
    }
  };

  const handleConnectAll = async () => {
    try {
      setConnecting('all');
      
      // Use the connectAllWallets function from context
      await connectAllWallets();
      
      // Then trigger EVM connection via Web3Modal
      try {
        if (ethereumClient && typeof ethereumClient.openModal === 'function') {
          await ethereumClient.openModal();
        } else {
          const w3mButton = document.querySelector('w3m-connect-button');
          if (w3mButton) {
            w3mButton.click();
          }
        }
      } catch (modalError) {
        console.error('Web3Modal error in connect all:', modalError);
        // Continue even if EVM connection fails
      }
      
      toast.success('Connecting to all available wallets...');
      
    } catch (error) {
      console.error('Multi-connect failed:', error);
      toast.error('Failed to connect all wallets');
    } finally {
      setConnecting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-900 rounded-2xl border border-gray-700 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
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

        {/* Connect All Button */}
        <button
          onClick={handleConnectAll}
          disabled={connecting === 'all'}
          className="w-full mb-4 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 flex items-center justify-center"
        >
          {connecting === 'all' ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
          ) : (
            '🚀 Connect All Wallets'
          )}
        </button>

        <div className="text-center text-gray-400 text-sm mb-4">or connect individually</div>

        {/* Wallet Options */}
        <div className="space-y-3">
          {/* Solana Wallets */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Solana</h3>
            <button
              onClick={() => handleConnect('solana')}
              disabled={connecting === 'solana' || connectedWallets.solana?.isConnected}
              className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center space-x-3"
            >
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: chainConfig.solana.color }}
              />
              <span className="text-white font-medium">
                {connectedWallets.solana?.isConnected ? '✅ Phantom Connected' : '👻 Phantom Wallet'}
              </span>
              {connecting === 'solana' && (
                <div className="ml-auto animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              )}
            </button>
          </div>

          {/* EVM Wallets */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Ethereum & Layer 2</h3>
            <button
              onClick={() => handleConnect('evm')}
              disabled={connecting === 'evm'}
              className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center space-x-3"
            >
              <div className="flex -space-x-1">
                <div 
                  className="w-3 h-3 rounded-full border border-gray-600"
                  style={{ backgroundColor: chainConfig.ethereum.color }}
                />
                <div 
                  className="w-3 h-3 rounded-full border border-gray-600"
                  style={{ backgroundColor: chainConfig.polygon.color }}
                />
                <div 
                  className="w-3 h-3 rounded-full border border-gray-600"
                  style={{ backgroundColor: chainConfig.arbitrum.color }}
                />
              </div>
              <span className="text-white font-medium">
                🦊 MetaMask, WalletConnect & More
              </span>
              {connecting === 'evm' && (
                <div className="ml-auto animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              )}
            </button>
          </div>
        </div>

        {/* Connected Status */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="text-sm text-gray-400 mb-2">Connected Wallets:</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(connectedWallets).map(([chainName, wallet]) => {
              if (!wallet?.isConnected) return null;
              const chainInfo = chainConfig[chainName];
              return (
                <div
                  key={chainName}
                  className="flex items-center space-x-1 px-2 py-1 bg-gray-800 rounded-md"
                >
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: chainInfo?.color }}
                  />
                  <span className="text-xs text-white">{chainInfo?.name}</span>
                </div>
              );
            })}
            {Object.values(connectedWallets).every(wallet => !wallet?.isConnected) && (
              <span className="text-sm text-gray-500">None connected</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectModal;
