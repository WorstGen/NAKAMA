import React, { useState } from 'react';
import { usePhantomMultiChain } from '../contexts/PhantomMultiChainContext';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export const ChainSelector = () => {
  const { 
    activeChain, 
    connectedChains, 
    phantomChains, 
    switchToChain 
  } = usePhantomMultiChain();
  
  const [isOpen, setIsOpen] = useState(false);

  const activeChainConfig = phantomChains[activeChain];
  const connectedChainEntries = Object.entries(connectedChains).filter(([_, chain]) => chain.isConnected);

  if (connectedChainEntries.length <= 1) {
    // If only one chain is connected, show it without dropdown
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg">
        <div 
          className="w-2 h-2 rounded-full" 
          style={{ backgroundColor: activeChainConfig?.color || '#666' }}
        ></div>
        <span className="text-white text-sm font-medium">
          {activeChainConfig?.name || 'Unknown'}
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
      >
        <div 
          className="w-2 h-2 rounded-full" 
          style={{ backgroundColor: activeChainConfig?.color || '#666' }}
        ></div>
        <span className="text-white text-sm font-medium">
          {activeChainConfig?.name || 'Unknown'}
        </span>
        <ChevronDownIcon className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20">
            <div className="py-1">
              {connectedChainEntries.map(([chainId, chain]) => {
                const chainConfig = phantomChains[chainId];
                const isActive = activeChain === chainId;
                
                return (
                  <button
                    key={chainId}
                    onClick={() => {
                      switchToChain(chainId);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-700 transition-colors ${
                      isActive ? 'bg-gray-700' : ''
                    }`}
                  >
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: chainConfig?.color || '#666' }}
                    ></div>
                    <div className="flex-1">
                      <div className="text-white text-sm font-medium">
                        {chainConfig?.name || 'Unknown'}
                      </div>
                      <div className="text-gray-400 text-xs font-mono">
                        {chain.address?.slice(0, 6)}...{chain.address?.slice(-4)}
                      </div>
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
