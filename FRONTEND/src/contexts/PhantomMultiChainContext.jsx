import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWallet } from './WalletContext';
import toast from 'react-hot-toast';

const PhantomMultiChainContext = createContext();

export const usePhantomMultiChain = () => {
  const context = useContext(PhantomMultiChainContext);
  if (!context) {
    throw new Error('usePhantomMultiChain must be used within a PhantomMultiChainProvider');
  }
  return context;
};

// Phantom-supported chains configuration
export const phantomChains = {
  solana: {
    id: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    decimals: 9,
    color: '#14F195',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    blockExplorer: 'https://explorer.solana.com',
    tokens: [
      { symbol: 'SOL', name: 'Solana', decimals: 9, isNative: true },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
      { symbol: 'USDT', name: 'Tether USD', decimals: 6, mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' }
    ]
  },
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    color: '#627EEA',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/demo',
    blockExplorer: 'https://etherscan.io',
    tokens: [
      { symbol: 'ETH', name: 'Ethereum', decimals: 18, isNative: true },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0xA0b86a33E6441e12e1A9fF2df3DC6F7eE2AB1Bc6' },
      { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' }
    ]
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    symbol: 'MATIC',
    decimals: 18,
    color: '#8247E5',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com',
    tokens: [
      { symbol: 'MATIC', name: 'Polygon', decimals: 18, isNative: true },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' },
      { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' }
    ]
  },
  base: {
    id: 'base',
    name: 'Base',
    symbol: 'ETH',
    decimals: 18,
    color: '#0052FF',
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
    tokens: [
      { symbol: 'ETH', name: 'Ethereum', decimals: 18, isNative: true },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' }
    ]
  }
};

export const PhantomMultiChainProvider = ({ children }) => {
  const { connected, publicKey } = useWallet();
  
  const [connectedChains, setConnectedChains] = useState({});
  const [activeChain, setActiveChain] = useState('solana');
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if Phantom is available
  const isPhantomAvailable = useCallback(() => {
    return window.solana && window.solana.isPhantom;
  }, []);

  // Get all connected chains from Phantom
  const getConnectedChains = useCallback(async () => {
    console.log('🔗 getConnectedChains called - isPhantomAvailable:', isPhantomAvailable(), 'connected:', connected);
    
    // Check if Phantom is available and either connected via old context OR has a public key
    const isPhantomConnected = isPhantomAvailable() && (connected || (window.solana && window.solana.isConnected));
    
    if (!isPhantomConnected) {
      console.log('🔗 Returning empty chains - Phantom not available or not connected');
      return {};
    }

    try {
      const chains = {};
      
      // Solana is always available when Phantom is connected
      const solanaPublicKey = publicKey || (window.solana && window.solana.publicKey);
      if (solanaPublicKey) {
        console.log('🔗 Adding Solana chain with publicKey:', solanaPublicKey.toString());
        chains.solana = {
          isConnected: true,
          address: solanaPublicKey.toString(),
          chainId: 'solana',
          chainName: 'Solana'
        };
      }

      // Check for EVM chains supported by Phantom
      if (window.ethereum) {
        try {
          // Get current chain
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          
          if (accounts.length > 0) {
            const chainIdHex = parseInt(chainId, 16);
            let chainName = 'ethereum';
            
            // Map chain ID to our chain names
            switch (chainIdHex) {
              case 1:
                chainName = 'ethereum';
                break;
              case 137:
                chainName = 'polygon';
                break;
              case 8453:
                chainName = 'base';
                break;
              default:
                chainName = 'ethereum';
            }
            
            chains[chainName] = {
              isConnected: true,
              address: accounts[0],
              chainId: chainIdHex,
              chainName: phantomChains[chainName]?.name || 'Unknown'
            };
          }
        } catch (error) {
          console.log('EVM chains not available:', error);
        }
      }

      console.log('🔗 Final chains object:', chains);
      return chains;
    } catch (error) {
      console.error('🔗 Error getting connected chains:', error);
      return {};
    }
  }, [connected, publicKey, isPhantomAvailable]);

  // Connect to all available chains
  const connectAllChains = useCallback(async () => {
    console.log('🔗 connectAllChains called');
    console.log('🔗 isPhantomAvailable:', isPhantomAvailable());
    console.log('🔗 connected:', connected);
    
    if (!isPhantomAvailable()) {
      throw new Error('Phantom wallet not found');
    }

    setIsConnecting(true);
    try {
      // First connect to Solana (Phantom's primary chain)
      if (!connected) {
        console.log('🔗 Connecting to Solana...');
        await window.solana.connect();
        console.log('🔗 Solana connected successfully');
        toast.success('Solana connected!');
      } else {
        console.log('🔗 Solana already connected');
      }

      // Then request EVM access
      if (window.ethereum) {
        try {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          toast.success('EVM chains connected!');
        } catch (error) {
          console.log('EVM connection failed:', error);
          // Continue even if EVM fails
        }
      }

      // Update connected chains
      const chains = await getConnectedChains();
      setConnectedChains(chains);
      
      toast.success(`Connected to ${Object.keys(chains).length} chains!`);
      
    } catch (error) {
      console.error('Connection failed:', error);
      toast.error(`Connection failed: ${error.message}`);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [connected, getConnectedChains, isPhantomAvailable]);

  // Switch to a specific chain
  const switchToChain = useCallback(async (chainName) => {
    console.log('🔄 switchToChain called with:', chainName);
    console.log('🔄 isPhantomAvailable:', isPhantomAvailable());
    
    if (!isPhantomAvailable()) {
      throw new Error('Phantom wallet not found');
    }

    try {
      if (chainName === 'solana') {
        console.log('🔄 Switching to Solana');
        setActiveChain('solana');
        
        // Update connected chains after switching
        const chains = await getConnectedChains();
        setConnectedChains(chains);
        
        toast.success('Switched to Solana');
        return;
      }

      // For EVM chains, request chain switch
      if (window.ethereum && phantomChains[chainName]) {
        const chainConfig = phantomChains[chainName];
        console.log('🔄 EVM chain config:', chainConfig);
        
        // Convert decimal to hex properly
        const chainIdDecimal = chainConfig.id === 'ethereum' ? 1 : 
                              chainConfig.id === 'polygon' ? 137 : 
                              chainConfig.id === 'base' ? 8453 : 1;
        const chainIdHex = `0x${chainIdDecimal.toString(16)}`;
        
        console.log('🔄 Attempting to switch to chain ID:', chainIdHex);

        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainIdHex }],
          });
          console.log('🔄 Chain switch successful');
          setActiveChain(chainName);
          
          // Update connected chains after switching
          const chains = await getConnectedChains();
          setConnectedChains(chains);
          
          toast.success(`Switched to ${chainConfig.name}`);
        } catch (switchError) {
          console.log('🔄 Chain switch failed:', switchError);
          // If chain not added, try to add it
          if (switchError.code === 4902) {
            console.log('🔄 Adding new chain...');
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: chainIdHex,
                chainName: chainConfig.name,
                nativeCurrency: {
                  name: chainConfig.symbol,
                  symbol: chainConfig.symbol,
                  decimals: chainConfig.decimals,
                },
                rpcUrls: [chainConfig.rpcUrl],
                blockExplorerUrls: [chainConfig.blockExplorer],
              }],
            });
            console.log('🔄 Chain added successfully');
            setActiveChain(chainName);
            
            // Update connected chains after adding
            const chains = await getConnectedChains();
            setConnectedChains(chains);
            
            toast.success(`Added and switched to ${chainConfig.name}`);
          } else {
            console.error('🔄 Chain switch error:', switchError);
            throw switchError;
          }
        }
      } else {
        console.log('🔄 No ethereum provider or chain config not found');
      }
    } catch (error) {
      console.error('Chain switch failed:', error);
      toast.error(`Failed to switch to ${chainName}: ${error.message}`);
      throw error;
    }
  }, [getConnectedChains, isPhantomAvailable]);

  // Sign message with active wallet
  const signMessage = useCallback(async (message) => {
    if (!isPhantomAvailable()) {
      throw new Error('Phantom wallet not found');
    }

    try {
      if (activeChain === 'solana') {
        // Solana message signing
        const messageBytes = new TextEncoder().encode(message);
        const { signature } = await window.solana.signMessage(messageBytes);
        const solanaPublicKey = window.solana.publicKey?.toString() || connectedChains.solana?.address;
        return {
          signature: new Uint8Array(signature),
          publicKey: solanaPublicKey
        };
      } else {
        // EVM message signing
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length === 0) {
          throw new Error('No EVM accounts connected');
        }
        
        const signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [message, accounts[0]],
        });
        
        return {
          signature,
          address: accounts[0]
        };
      }
    } catch (error) {
      console.error('Sign message failed:', error);
      throw error;
    }
  }, [activeChain, connectedChains, isPhantomAvailable]);

  // Get active wallet info
  const getActiveWallet = useCallback(() => {
    const chain = connectedChains[activeChain];
    if (!chain) return null;
    
    return {
      publicKey: chain.address, // Use address as publicKey for compatibility
      address: chain.address,
      chainId: chain.chainId,
      chainName: chain.chainName,
      isConnected: chain.isConnected,
      signMessage: signMessage // Include the signMessage function
    };
  }, [activeChain, connectedChains, signMessage]);

  // Get tokens for active chain
  const getActiveChainTokens = useCallback(() => {
    return phantomChains[activeChain]?.tokens || [];
  }, [activeChain]);

  // Update connected chains when wallet connection changes
  useEffect(() => {
    if (connected) {
      getConnectedChains().then(setConnectedChains);
    } else {
      setConnectedChains({});
    }
  }, [connected, getConnectedChains]);

  const value = {
    // State
    connectedChains,
    activeChain,
    isConnecting,
    isPhantomAvailable: isPhantomAvailable(),
    
    // Actions
    connectAllChains,
    switchToChain,
    signMessage,
    
    // Utilities
    getActiveWallet,
    getActiveChainTokens,
    phantomChains,
    
    // Computed
    isAnyChainConnected: Object.values(connectedChains).some(chain => chain.isConnected) || 
                        (isPhantomAvailable() && window.solana && window.solana.isConnected),
    connectedChainCount: Object.keys(connectedChains).length
  };

  return (
    <PhantomMultiChainContext.Provider value={value}>
      {children}
    </PhantomMultiChainContext.Provider>
  );
};
