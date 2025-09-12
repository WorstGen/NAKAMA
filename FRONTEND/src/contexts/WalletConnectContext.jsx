import React, { createContext, useContext, useState, useCallback } from 'react';
import { useWeb3Modal } from '@web3modal/react';
import { useAccount, useDisconnect } from 'wagmi';
import toast from 'react-hot-toast';

const WalletConnectContext = createContext();

export const useWalletConnect = () => {
  const context = useContext(WalletConnectContext);
  if (!context) {
    throw new Error('useWalletConnect must be used within a WalletConnectProvider');
  }
  return context;
};

export const WalletConnectProvider = ({ children }) => {
  const { open } = useWeb3Modal();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState(null);

  // Check if WalletConnect is available
  const isWalletConnectAvailable = () => {
    return typeof window !== 'undefined' && window.ethereum;
  };

  // Connect to WalletConnect
  const connectWallet = useCallback(async () => {
    // Check if already connected
    if (isConnected && address) {
      console.log('WalletConnect already connected:', address);
      return true;
    }

    setIsConnecting(true);
    try {
      console.log('Opening WalletConnect modal...');
      
      // Open WalletConnect modal with better error handling
      try {
        await open();
      } catch (openError) {
        console.error('Failed to open WalletConnect modal:', openError);
        throw new Error('Failed to open wallet selection modal. Please try again.');
      }
      
      // Wait for connection with shorter polling interval
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds timeout
      
      console.log('Waiting for wallet connection...');
      while (!isConnected && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
        
        // Log progress every 10 seconds
        if (attempts % 10 === 0) {
          console.log(`Still waiting for connection... (${attempts}/${maxAttempts})`);
        }
      }
      
      if (isConnected && address) {
        // Get chain ID if possible
        try {
          if (window.ethereum) {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            setChainId(chainId);
            console.log('Connected to chain:', chainId);
          }
        } catch (error) {
          console.log('Could not get chain ID:', error);
        }
        
        console.log('WalletConnect connected successfully:', address);
        toast.success('Wallet connected successfully!');
        return true;
      } else {
        console.log('Connection timeout or cancelled');
        toast.error('Wallet connection timed out or was cancelled. Please try again.');
        return false;
      }
    } catch (error) {
      console.error('WalletConnect connection error:', error);
      
      // Provide specific error messages
      if (error.message?.includes('User rejected') || error.message?.includes('rejected')) {
        toast.error('Wallet connection rejected by user');
      } else if (error.message?.includes('timeout')) {
        toast.error('Connection timed out. Please try again.');
      } else if (error.message?.includes('modal')) {
        toast.error('Failed to open wallet modal. Please refresh and try again.');
      } else {
        toast.error(`Failed to connect wallet: ${error.message || 'Unknown error'}`);
      }
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [open, isConnected, address]);

  // Disconnect from WalletConnect
  const disconnectWallet = useCallback(() => {
    try {
      disconnect();
      setChainId(null);
      console.log('WalletConnect disconnected');
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('WalletConnect disconnect error:', error);
      toast.error('Failed to disconnect wallet');
    }
  }, [disconnect]);

  // Get sign message function for EVM
  const getSignMessage = useCallback(() => {
    return async (message) => {
      if (!window.ethereum || !address) {
        throw new Error('Wallet not connected');
      }
      
      try {
        // Convert message to hex string for EVM signing
        const messageHex = '0x' + Buffer.from(message).toString('hex');
        return await window.ethereum.request({
          method: 'personal_sign',
          params: [messageHex, address]
        });
      } catch (error) {
        console.error('Sign message error:', error);
        throw error;
      }
    };
  }, [address]);

  // Switch chain
  const switchChain = useCallback(async (targetChainId) => {
    if (!window.ethereum || !address) {
      throw new Error('Wallet not connected');
    }
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainId }]
      });
      setChainId(targetChainId);
      console.log('Switched to chain:', targetChainId);
    } catch (error) {
      console.error('Chain switch error:', error);
      throw error;
    }
  }, [address]);

  const value = {
    // Connection state
    isConnected,
    address,
    chainId,
    isConnecting,
    
    // Connection functions
    connect: connectWallet,
    disconnect: disconnectWallet,
    getSignMessage,
    switchChain,
    
    // Utility functions
    isAvailable: isWalletConnectAvailable
  };

  return (
    <WalletConnectContext.Provider value={value}>
      {children}
    </WalletConnectContext.Provider>
  );
};
