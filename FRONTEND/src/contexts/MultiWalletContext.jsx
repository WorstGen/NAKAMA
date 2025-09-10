import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect, useSignMessage, useSwitchNetwork } from 'wagmi';
import { useWallet as useSolanaWallet } from './WalletContext';
import { chainConfig } from '../config/web3Config';
import toast from 'react-hot-toast';

const MultiWalletContext = createContext({});

export const useMultiWallet = () => {
  const context = useContext(MultiWalletContext);
  if (!context) {
    throw new Error('useMultiWallet must be used within a MultiWalletProvider');
  }
  return context;
};

export const MultiWalletProvider = ({ children }) => {
  // Solana wallet state (existing)
  const solanaWallet = useSolanaWallet();
  
  // EVM wallet state (new)
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  const { connect: evmConnect, connectors } = useConnect();
  const { disconnect: evmDisconnect } = useDisconnect();
  const { signMessageAsync: evmSignMessage } = useSignMessage();
  const { switchNetwork } = useSwitchNetwork();

  // Multi-wallet state
  const [activeChain, setActiveChain] = useState('solana');
  const [connectedWallets, setConnectedWallets] = useState({
    solana: null,
    ethereum: null,
    polygon: null,
    arbitrum: null,
    optimism: null,
    base: null
  });

  // Update connected wallets when Solana wallet changes
  useEffect(() => {
    if (solanaWallet.connected && solanaWallet.publicKey) {
      setConnectedWallets(prev => ({
        ...prev,
        solana: {
          address: solanaWallet.publicKey.toString(),
          connector: 'phantom',
          isConnected: true
        }
      }));
      
      // Set Solana as active if no chain is selected and Solana connects
      if (activeChain === null) {
        setActiveChain('solana');
      }
    } else {
      setConnectedWallets(prev => ({
        ...prev,
        solana: null
      }));
    }
  }, [solanaWallet.connected, solanaWallet.publicKey, activeChain]);

  // Update connected wallets when EVM wallet changes
  useEffect(() => {
    if (evmConnected && evmAddress) {
      // For Wagmi v1, we'll default to Ethereum and let users switch networks
      const chainName = 'ethereum';
      setConnectedWallets(prev => ({
        ...prev,
        [chainName]: {
          address: evmAddress,
          connector: 'evm',
          isConnected: true,
          chainId: 1
        }
      }));

      // Set this chain as active if no Solana wallet is connected
      if (!solanaWallet.connected) {
        setActiveChain(chainName);
      }
    } else {
      // Clear all EVM wallet connections
      setConnectedWallets(prev => ({
        solana: prev.solana,
        ethereum: null,
        polygon: null,
        arbitrum: null,
        optimism: null,
        base: null
      }));
    }
  }, [evmConnected, evmAddress, solanaWallet.connected]);


  // Connect to a specific wallet type
  const connectWallet = useCallback(async (chainName) => {
    try {
      if (chainName === 'solana') {
        if (!solanaWallet.connected) {
          await solanaWallet.connect();
          toast.success('Solana wallet connected!');
        }
        setActiveChain('solana');
      } else {
        // EVM chains - Web3Modal handles the connection
        // Just switch to the chain if already connected
        if (evmConnected) {
          const chainInfo = chainConfig[chainName];
          if (chainInfo) {
            try {
              await switchNetwork?.({ chainId: chainInfo.id });
              setActiveChain(chainName);
              toast.success(`Switched to ${chainInfo.name}`);
            } catch (error) {
              console.log('Network switch failed:', error);
              toast.error(`Failed to switch to ${chainInfo.name}`);
            }
          }
        } else {
          toast.info('Please connect your Ethereum wallet using the Connect button');
        }
      }
    } catch (error) {
      console.error(`Error with ${chainName}:`, error);
      toast.error(`Failed to connect to ${chainName}: ${error.message}`);
      throw error;
    }
  }, [solanaWallet, evmConnected, switchNetwork]);

  // Disconnect from a specific wallet
  const disconnectWallet = useCallback(async (chainName) => {
    try {
      if (chainName === 'solana') {
        await solanaWallet.disconnect();
        toast.success('Solana wallet disconnected');
      } else {
        // For EVM chains, disconnect completely (affects all EVM chains)
        await evmDisconnect();
        toast.success('EVM wallet disconnected');
      }

      // If we're disconnecting the active chain, switch to another connected chain
      if (activeChain === chainName) {
        const remainingWallets = Object.entries(connectedWallets).filter(
          ([chain, wallet]) => chain !== chainName && wallet?.isConnected
        );
        
        if (remainingWallets.length > 0) {
          setActiveChain(remainingWallets[0][0]);
        } else {
          setActiveChain(null);
        }
      }
    } catch (error) {
      console.error(`Error disconnecting from ${chainName}:`, error);
      toast.error(`Failed to disconnect from ${chainName}`);
      throw error;
    }
  }, [solanaWallet, evmDisconnect, activeChain, connectedWallets]);

  // Switch active chain
  const switchActiveChain = useCallback(async (chainName) => {
    const wallet = connectedWallets[chainName];
    if (!wallet?.isConnected) {
      throw new Error(`${chainName} wallet not connected`);
    }

    if (chainName === 'solana') {
      setActiveChain('solana');
    } else {
      const chainInfo = chainConfig[chainName];
      try {
        await switchNetwork?.({ chainId: chainInfo.id });
      } catch (error) {
        console.log('Network switch failed, but continuing:', error);
      }
      setActiveChain(chainName);
    }
  }, [connectedWallets, switchNetwork]);

  // Sign message with active wallet
  const signMessage = useCallback(async (message) => {
    if (!activeChain) {
      throw new Error('No active wallet selected');
    }

    if (activeChain === 'solana') {
      return await solanaWallet.signMessage(message);
    } else {
      // EVM wallet
      const signature = await evmSignMessage({ message });
      return {
        signature: signature,
        signatureHex: signature,
        signatureBase64: btoa(signature)
      };
    }
  }, [activeChain, solanaWallet, evmSignMessage]);

  // Get active wallet info
  const getActiveWallet = useCallback(() => {
    if (!activeChain) return null;
    
    const walletInfo = connectedWallets[activeChain];
    if (!walletInfo) return null;

    return {
      chain: activeChain,
      address: walletInfo.address,
      connector: walletInfo.connector,
      chainInfo: chainConfig[activeChain],
      isConnected: walletInfo.isConnected
    };
  }, [activeChain, connectedWallets]);

  // Get all connected wallets
  const getAllConnectedWallets = useCallback(() => {
    return Object.entries(connectedWallets)
      .filter(([_, wallet]) => wallet?.isConnected)
      .map(([chainName, wallet]) => ({
        chain: chainName,
        address: wallet.address,
        connector: wallet.connector,
        chainInfo: chainConfig[chainName]
      }));
  }, [connectedWallets]);

  // Check if any wallet is connected
  const isAnyWalletConnected = Object.values(connectedWallets).some(wallet => wallet?.isConnected);

  // Get supported tokens for active chain
  const getActiveChainTokens = useCallback(() => {
    if (!activeChain) return [];
    const chain = chainConfig[activeChain];
    return chain ? chain.tokens : [];
  }, [activeChain]);

  const value = {
    // Active wallet state
    activeChain,
    setActiveChain,
    
    // Connection state
    connectedWallets,
    isAnyWalletConnected,
    
    // Wallet actions
    connectWallet,
    disconnectWallet,
    switchActiveChain,
    signMessage,
    
    // Utility functions
    getActiveWallet,
    getAllConnectedWallets,
    getActiveChainTokens,
    
    // Chain utilities
    chainConfig,
    
    // Legacy compatibility for existing components
    connected: isAnyWalletConnected,
    publicKey: activeChain === 'solana' ? solanaWallet.publicKey : null,
    wallet: getActiveWallet()
  };

  return (
    <MultiWalletContext.Provider value={value}>
      {children}
    </MultiWalletContext.Provider>
  );
};
