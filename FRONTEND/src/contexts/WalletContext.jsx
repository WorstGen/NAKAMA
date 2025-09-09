import React, { createContext, useContext, useState, useEffect } from 'react';

const WalletContext = createContext({});

export const useWallet = () => useContext(WalletContext);

// Simple, direct Phantom wallet provider - no complex adapters
export const WalletContextProvider = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [publicKey, setPublicKey] = useState(null);

  // Note: We no longer auto-connect on page load
  // Connection will only happen when user explicitly clicks connect button

  // Listen for Phantom connection events
  useEffect(() => {
    if (window.solana?.isPhantom) {

      const handleConnect = (pubKey) => {
        setConnected(true);
        setConnecting(false);
        setPublicKey(pubKey);
      };

      const handleDisconnect = () => {
        setConnected(false);
        setPublicKey(null);
      };

      const handleAccountChange = (pubKey) => {
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
      const result = await window.solana.connect();
      // Event listener will handle state updates
      return result;
    } catch (error) {
      setConnecting(false);
      throw error;
    }
  };

  // Disconnect function
  const disconnect = async () => {
    if (window.solana?.isPhantom) {
      try {
        await window.solana.disconnect();
      } catch (error) {
        throw error;
      }
    }
  };

  // Sign message function for authentication
  const signMessage = async (message) => {
    if (!window.solana?.isPhantom || !connected) {
      throw new Error('Phantom wallet not connected');
    }

    try {
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await window.solana.signMessage(encodedMessage);

      // Handle different signature formats from Phantom
      let signatureBytes;
      if (signature && typeof signature === 'object') {
        if (signature.signature && signature.signature instanceof Uint8Array) {
          signatureBytes = signature.signature;
        } else if (signature instanceof Uint8Array) {
          signatureBytes = signature;
        } else {
          throw new Error('Invalid signature format from Phantom');
        }
      } else if (signature instanceof Uint8Array) {
        signatureBytes = signature;
      } else {
        throw new Error('Invalid signature format from Phantom');
      }

      // Return both raw bytes and hex format (common backend expectation)
      return {
        signature: signatureBytes,
        signatureHex: Array.from(signatureBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join(''),
        signatureBase64: btoa(String.fromCharCode(...signatureBytes))
      };
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  };

  // Sign transaction function for sending transactions
  const signTransaction = async (transaction) => {
    if (!window.solana?.isPhantom || !connected) {
      throw new Error('Phantom wallet not connected');
    }

    return await window.solana.signTransaction(transaction);
  };

  // Sign multiple transactions
  const signAllTransactions = async (transactions) => {
    if (!window.solana?.isPhantom || !connected) {
      throw new Error('Phantom wallet not connected');
    }

    return await window.solana.signAllTransactions(transactions);
  };

  const value = {
    connected,
    connecting,
    publicKey,
    connect,
    disconnect,
    signMessage,
    signTransaction,
    signAllTransactions,
    // Legacy compatibility
    wallet: connected ? { adapter: { name: 'Phantom' } } : null,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
