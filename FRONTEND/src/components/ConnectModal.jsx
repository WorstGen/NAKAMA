import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { usePhantomMultiChain } from '../contexts/PhantomMultiChainContext';
import toast from 'react-hot-toast';

const ConnectModal = ({ isOpen, onClose }) => {
  const { 
    connectAllChains, 
    switchToChain, 
    connectedChains, 
    activeChain, 
    isConnecting,
    phantomChains,
    connectedChainCount
  } = usePhantomMultiChain();
  const [connecting, setConnecting] = useState(null);

  if (!isOpen) return null;

  const handleConnect = async (chainName) => {
    try {
      setConnecting(chainName);
      
      if (chainName === 'all') {
        await connectAllChains();
        toast.success(`Connected to all available chains!`);
      } else {
        await switchToChain(chainName);
        toast.success(`Switched to ${phantomChains[chainName]?.name}`);
      }
      
      // Close modal after successful connection
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (error) {
      console.error('Connection failed:', error);
      toast.error(`Failed to connect: ${error.message}`);
    } finally {
      setConnecting(null);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-900 rounded-2xl border border-gray-700 p-6 max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl">
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

        {/* Connect All Chains Button */}
        <button
          onClick={() => handleConnect('all')}
          disabled={connecting === 'all' || isConnecting}
          className="w-full mb-4 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 flex items-center justify-center"
        >
          {(connecting === 'all' || isConnecting) ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
          ) : (
            '👻 Connect All Phantom Chains'
          )}
        </button>

        <div className="text-center text-gray-400 text-sm mb-4">
          {connectedChainCount > 0 ? `${connectedChainCount} chains connected` : 'Connect to individual chains'}
        </div>

        {/* Chain Options */}
        <div className="space-y-3">
          {Object.entries(phantomChains).map(([chainKey, chainConfig]) => {
            const isConnected = connectedChains[chainKey]?.isConnected;
            const isActive = activeChain === chainKey;
            const isConnectingThis = connecting === chainKey;
            
            return (
              <button
                key={chainKey}
                onClick={() => handleConnect(chainKey)}
                disabled={isConnectingThis || isConnecting}
                className={`w-full px-4 py-3 rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center space-x-3 ${
                  isConnected 
                    ? 'bg-green-900/30 border border-green-500/50 hover:bg-green-900/40' 
                    : 'bg-gray-800 hover:bg-gray-700 border border-gray-600'
                } ${isActive ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: chainConfig.color }}
                />
                <span className="text-white font-medium flex-1 text-left">
                  {isConnected ? '✅' : '🔗'} {chainConfig.name}
                  {isActive && ' (Active)'}
                </span>
                {isConnectingThis && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                )}
              </button>
            );
          })}
        </div>

        {/* Connected Status */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="text-sm text-gray-400 mb-2">Connected Chains:</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(connectedChains).map(([chainName, chain]) => {
              if (!chain?.isConnected) return null;
              const chainInfo = phantomChains[chainName];
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
                  {activeChain === chainName && (
                    <span className="text-xs text-blue-400 ml-1">●</span>
                  )}
                </div>
              );
            })}
            {connectedChainCount === 0 && (
              <span className="text-sm text-gray-500">None connected</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectModal;

