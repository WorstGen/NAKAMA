import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWeb3Modal } from '@web3modal/react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
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
  const { open, close } = useWeb3Modal();
  const { address, isConnected } = useAccount();
  const { connect, connectors, error, isLoading } = useConnect();
  const { disconnect } = useDisconnect();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState(null);

  // Check if WalletConnect is available
  const isWalletConnectAvailable = () => {
    return typeof window !== 'undefined' && window.ethereum;
  };

  // Connect to WalletConnect
  const connectWallet = useCallback(async () => {
    if (!isWalletConnectAvailable()) {
      toast.error(
        <div>
          <div className="font-semibold">No wallet detected</div>
          <div className="text-sm mt-1">Please install a compatible wallet to continue.</div>
        </div>,
        { duration: 5000 }
      );
      return false;
    }

    setIsConnecting(true);
    try {
      // Open WalletConnect modal
      await open();
      
      // Wait for connection
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      
      while (!isConnected && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      
      if (isConnected && address) {
        // Get chain ID
        try {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          setChainId(chainId);
        } catch (error) {
          console.log('Could not get chain ID:', error);
        }
        
        console.log('WalletConnect connected successfully:', address);
        toast.success('Wallet connected successfully!');
        return true;
      } else {
        toast.error('Wallet connection failed or was cancelled');
        return false;
      }
    } catch (error) {
      console.error('WalletConnect connection error:', error);
      if (error.message?.includes('User rejected')) {
        toast.error('Wallet connection rejected by user');
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
