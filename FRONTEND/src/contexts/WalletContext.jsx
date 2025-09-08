import React, { createContext, useContext, useState, useEffect } from 'react';

const WalletContext = createContext({});

export const useWallet = () => useContext(WalletContext);

// Simple, direct Phantom wallet provider - no complex adapters
export const WalletContextProvider = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [publicKey, setPublicKey] = useState(null);

  // Check for existing Phantom connection on mount
  useEffect(() => {
    console.log('🔍 Checking for existing Phantom connection...');

    if (window.solana?.isConnected && window.solana?.publicKey) {
      console.log('✅ Found existing Phantom connection:', window.solana.publicKey.toString());
      setConnected(true);
      setPublicKey(window.solana.publicKey);
    } else {
      console.log('❌ No existing Phantom connection found');
    }
  }, []);

  // Listen for Phantom connection events
  useEffect(() => {
    if (window.solana?.isPhantom) {
      console.log('👻 Setting up Phantom event listeners');

      const handleConnect = (pubKey) => {
        console.log('🔗 Phantom connected:', pubKey?.toString());
        setConnected(true);
        setConnecting(false);
        setPublicKey(pubKey);
      };

      const handleDisconnect = () => {
        console.log('🔌 Phantom disconnected');
        setConnected(false);
        setPublicKey(null);
      };

      const handleAccountChange = (pubKey) => {
        console.log('🔄 Phantom account changed:', pubKey?.toString());
        setPublicKey(pubKey);
      };

      // Add event listeners
      window.solana.on('connect', handleConnect);
      window.solana.on('disconnect', handleDisconnect);
      window.solana.on('accountChanged', handleAccountChange);

      return () => {
        // Cleanup event listeners
        window.solana.off('connect', handleConnect);
        window.solana.off('disconnect', handleDisconnect);
        window.solana.off('accountChanged', handleAccountChange);
      };
    }
  }, []);

  // Connect function
  const connect = async () => {
    if (!window.solana?.isPhantom) {
      throw new Error('Phantom wallet not found. Please install Phantom.');
    }

    try {
      setConnecting(true);
      console.log('🔌 Connecting to Phantom...');

      const result = await window.solana.connect();
      console.log('✅ Phantom connect successful');

      // Event listener will handle state updates
      return result;
    } catch (error) {
      console.error('❌ Phantom connect failed:', error);
      setConnecting(false);
      throw error;
    }
  };

  // Disconnect function
  const disconnect = async () => {
    if (window.solana?.isPhantom) {
      try {
        console.log('🔌 Disconnecting from Phantom...');
        await window.solana.disconnect();
        console.log('✅ Disconnected from Phantom');
      } catch (error) {
        console.error('❌ Phantom disconnect failed:', error);
        throw error;
      }
    }
  };

  const value = {
    connected,
    connecting,
    publicKey,
    connect,
    disconnect,
    // Legacy compatibility
    wallet: connected ? { adapter: { name: 'Phantom' } } : null,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
