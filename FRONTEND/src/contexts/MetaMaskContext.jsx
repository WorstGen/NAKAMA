import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

const MetaMaskContext = createContext();

export const useMetaMask = () => {
  const context = useContext(MetaMaskContext);
  if (!context) {
    throw new Error('useMetaMask must be used within a MetaMaskProvider');
  }
  return context;
};

export const MetaMaskProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && window.ethereum && window.ethereum.isMetaMask;
  };

  // Check if any Ethereum provider is available
  const isEthereumProviderAvailable = () => {
    return typeof window !== 'undefined' && window.ethereum;
  };

  // Connect to MetaMask
  const connect = useCallback(async () => {
    // Check if any Ethereum provider is available
    if (!isEthereumProviderAvailable()) {
      toast.error(
        <div>
          <div className="font-semibold">No Ethereum wallet detected</div>
          <div className="text-sm mt-1">Please install MetaMask or another Ethereum wallet to continue.</div>
        </div>,
        { duration: 5000 }
      );
      return false;
    }

    // Check if it's specifically MetaMask
    if (!isMetaMaskInstalled()) {
      toast.error(
        <div>
          <div className="font-semibold">MetaMask not detected</div>
          <div className="text-sm mt-1">Please install MetaMask browser extension to continue.</div>
        </div>,
        { duration: 5000 }
      );
      return false;
    }

    setIsConnecting(true);
    try {
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        
        // Get chain ID
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        setChainId(chainId);
        
        toast.success('MetaMask connected successfully!');
        return true;
      } else {
        toast.error('No MetaMask accounts found. Please create an account in MetaMask.');
        return false;
      }
    } catch (error) {
      console.error('MetaMask connection error:', error);
      if (error.code === 4001) {
        toast.error('MetaMask connection rejected by user');
      } else if (error.code === -32002) {
        toast.error('MetaMask connection request already pending. Please check MetaMask.');
      } else if (error.message?.includes('Requested resource not available')) {
        toast.error(
          <div>
            <div className="font-semibold">MetaMask not available</div>
            <div className="text-sm mt-1">Please make sure MetaMask is installed, unlocked, and refresh the page.</div>
          </div>,
          { duration: 5000 }
        );
      } else {
        toast.error(`Failed to connect to MetaMask: ${error.message || 'Unknown error'}`);
      }
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Disconnect from MetaMask
  const disconnect = useCallback(() => {
    setAccount(null);
    setIsConnected(false);
    setChainId(null);
    toast.success('MetaMask disconnected');
  }, []);

  // Sign message with MetaMask
  const signMessage = useCallback(async (message) => {
    if (!isConnected || !account) {
      throw new Error('MetaMask not connected');
    }

    try {
      const messageHex = '0x' + Buffer.from(message).toString('hex');
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [messageHex, account]
      });
      return signature;
    } catch (error) {
      console.error('MetaMask signing error:', error);
      throw error;
    }
  }, [isConnected, account]);

  // Switch to Ethereum mainnet
  const switchToEthereum = useCallback(async () => {
    if (!isMetaMaskInstalled()) return false;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x1' }], // Ethereum mainnet
      });
      setChainId('0x1');
      return true;
    } catch (error) {
      console.error('Failed to switch to Ethereum:', error);
      return false;
    }
  }, []);

  // Check connection status on mount - DISABLED to prevent auto-connection
  useEffect(() => {
    // Removed automatic connection check to prevent unwanted MetaMask connections
    // Users must explicitly choose to connect via the wallet selector

    // Listen for account changes
    if (isMetaMaskInstalled()) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          setAccount(accounts[0]);
          setIsConnected(true);
        }
      };

      const handleChainChanged = (chainId) => {
        setChainId(chainId);
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [disconnect]);

  const value = {
    isConnected,
    account,
    chainId,
    isConnecting,
    isMetaMaskInstalled: isMetaMaskInstalled(),
    connect,
    disconnect,
    signMessage,
    switchToEthereum
  };

  return (
    <MetaMaskContext.Provider value={value}>
      {children}
    </MetaMaskContext.Provider>
  );
};
