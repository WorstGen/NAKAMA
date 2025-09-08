import React, { createContext, useContext, useState, useEffect } from 'react';

const WalletContext = createContext({});

export const useWallet = () => useContext(WalletContext);

// Direct Phantom wallet connector - bypasses complex adapter system
export const WalletContextProvider = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [publicKey, setPublicKey] = useState(null);
  const [wallet, setWallet] = useState(null);

  // Check for existing Phantom connection on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      console.log('🔍 Checking for existing Phantom connection...');

      if (window.solana && window.solana.isPhantom) {
        console.log('👻 Phantom detected');

        // Check if already connected at browser level
        if (window.solana.isConnected && window.solana.publicKey) {
          console.log('✅ Phantom already connected at browser level');
          console.log('- PublicKey:', window.solana.publicKey.toString());

          // Update React state to reflect browser connection
          setConnected(true);
          setPublicKey(window.solana.publicKey);
          setWallet({
            adapter: {
              name: 'Phantom',
              url: 'https://phantom.app'
            }
          });

          console.log('🎯 React state updated to match browser connection');
          return;
        }

        console.log('❌ Phantom not connected at browser level - ready for manual connection');
      } else {
        console.log('❌ Phantom not detected');
      }
    };

    // Check immediately and also after a short delay to ensure window is fully loaded
    checkExistingConnection();
    const timer = setTimeout(checkExistingConnection, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Listen for Phantom connection changes
  useEffect(() => {
    if (window.solana && window.solana.isPhantom) {
      const handleConnect = (publicKey) => {
        console.log('🔗 Phantom connected event:', publicKey?.toString());
        setConnected(true);
        setConnecting(false);
        setPublicKey(publicKey);
        setWallet({
          adapter: {
            name: 'Phantom',
            url: 'https://phantom.app'
          }
        });
      };

      const handleDisconnect = () => {
        console.log('🔌 Phantom disconnected event');
        setConnected(false);
        setPublicKey(null);
        setWallet(null);
      };

      const handleAccountChange = (publicKey) => {
        console.log('🔄 Phantom account changed:', publicKey?.toString());
        setPublicKey(publicKey);
      };

      // Add event listeners
      window.solana.on('connect', handleConnect);
      window.solana.on('disconnect', handleDisconnect);
      window.solana.on('accountChanged', handleAccountChange);

      return () => {
        // Cleanup event listeners
        if (window.solana) {
          window.solana.off('connect', handleConnect);
          window.solana.off('disconnect', handleDisconnect);
          window.solana.off('accountChanged', handleAccountChange);
        }
      };
    }
  }, []);

  // Manual connect function
  const connect = async () => {
    if (!window.solana || !window.solana.isPhantom) {
      throw new Error('Phantom wallet not found. Please install Phantom.');
    }

    try {
      setConnecting(true);
      console.log('🔌 Attempting to connect to Phantom...');

      const response = await window.solana.connect();
      console.log('✅ Phantom connect response:', response);

      // The event listener will handle updating the React state
      return response;
    } catch (error) {
      console.error('❌ Phantom connect failed:', error);
      setConnecting(false);
      throw error;
    }
  };

  // Manual disconnect function
  const disconnect = async () => {
    if (window.solana && window.solana.isPhantom) {
      try {
        console.log('🔌 Disconnecting from Phantom...');
        await window.solana.disconnect();
        console.log('✅ Disconnected from Phantom');

        // Update React state
        setConnected(false);
        setPublicKey(null);
        setWallet(null);
      } catch (error) {
        console.error('❌ Phantom disconnect failed:', error);
        throw error;
      }
    }
  };

  // Select wallet function (for compatibility)
  const select = async (walletName) => {
    console.log('🎯 Selecting wallet:', walletName);
    if (walletName === 'Phantom' || walletName.toLowerCase().includes('phantom')) {
      return await connect();
    }
    throw new Error(`Wallet ${walletName} not supported`);
  };

  const value = {
    connected,
    connecting,
    publicKey,
    wallet,
    connect,
    disconnect,
    select,
    wallets: [], // Empty for compatibility
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
