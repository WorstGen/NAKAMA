import React, { createContext, useContext } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import {
  WalletModalProvider,
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

require('@solana/wallet-adapter-react-ui/styles.css');

const WalletContext = createContext({});

export const useWallet = () => useContext(WalletContext);

export const WalletContextProvider = ({ children }) => {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = process.env.REACT_APP_SOLANA_RPC_URL || clusterApiUrl(network);

  const wallets = React.useMemo(() => {
    // Use minimal configuration to avoid conflicts - just Solflare
    // Phantom and other wallets will be auto-detected via Standard Wallet API
    const solflare = new SolflareWalletAdapter();

    // Debug wallet detection
    setTimeout(() => {
      console.log('=== Wallet Detection Debug ===');
      console.log('Solflare readyState:', solflare.readyState);
      console.log('Window.solana available:', typeof window !== 'undefined' && !!window.solana);
      console.log('Phantom installed:', typeof window !== 'undefined' && window.solana?.isPhantom);

      // Additional debugging for Phantom state (no auto-connection)
      if (typeof window !== 'undefined' && window.solana) {
        console.log('Phantom version:', window.solana.version);
        console.log('Phantom publicKey:', window.solana.publicKey);
        console.log('Phantom isConnected:', window.solana.isConnected);
        console.log('Phantom wallet detected - user must manually connect');
      }

      // Check for MetaMask and provide guidance
      if (typeof window !== 'undefined') {
        if (window.ethereum) {
          console.log('🦊 MetaMask detected - can work with Solana via Wallet Standard API');
          console.log('💡 If MetaMask appears greyed out, try refreshing or updating MetaMask');
        }
      }
    }, 1000);

    // Return minimal configuration to avoid conflicts
    return [solflare];
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect={false}
        onError={(error) => {
          console.error('Wallet error:', error);
          console.error('Error details:', error.message);
          console.error('Error stack:', error.stack);
        }}
        localStorageKey="solana-wallet"
      >
        <WalletModalProvider>
          <WalletContext.Provider value={{}}>
            {children}
          </WalletContext.Provider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
