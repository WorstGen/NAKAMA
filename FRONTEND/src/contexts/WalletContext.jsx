import React, { createContext, useContext } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  SolflareWalletAdapter,
  PhantomWalletAdapter,
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
    // Include both Solflare and Phantom explicitly for comprehensive wallet support
    const solflare = new SolflareWalletAdapter();
    const phantom = new PhantomWalletAdapter();

    // Debug wallet detection
    setTimeout(() => {
      console.log('=== Wallet Detection Debug ===');
      console.log('Solflare readyState:', solflare.readyState);
      console.log('Phantom readyState:', phantom.readyState);
      console.log('Window.solana available:', typeof window !== 'undefined' && !!window.solana);
      console.log('Phantom installed:', typeof window !== 'undefined' && window.solana?.isPhantom);
      console.log('Standard wallets will be auto-detected');

      // Additional debugging for Phantom state (no auto-connection)
      if (typeof window !== 'undefined' && window.solana) {
        console.log('Phantom version:', window.solana.version);
        console.log('Phantom publicKey:', window.solana.publicKey);
        console.log('Phantom isConnected:', window.solana.isConnected);
        console.log('Phantom wallet detected - user must manually connect');
      }

      // Check if there are any extension conflicts
      if (typeof window !== 'undefined') {
        const extensions = window.navigator.userAgent.includes('Chrome') ?
          Object.keys(window.chrome?.runtime?.getManifest?.() || {}) : [];

        console.log('Browser extensions detected:', extensions.length > 0 ? 'Yes' : 'No');

        // Check for MetaMask and provide guidance
        if (window.ethereum) {
          console.log('🦊 MetaMask detected - can work with Solana via Wallet Standard API');
          console.log('💡 MetaMask supports both Ethereum and Solana - check if Solana mode is enabled');
          console.log('💡 If MetaMask appears greyed out, try refreshing or updating MetaMask');
          console.log('💡 MetaMask works well with dApps that support multi-chain functionality');
        }

        if (window.solana && window.ethereum) {
          console.log('ℹ️ Multiple wallet types detected (Solana + Ethereum)');
          console.log('💡 This is normal and supported - MetaMask can work alongside Solana wallets');
          console.log('💡 Try MetaMask first for multi-chain support, or use Solana-native wallets');
        }
      }
    }, 1000);

    // Return both adapters for comprehensive wallet support
    return [solflare, phantom];
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
