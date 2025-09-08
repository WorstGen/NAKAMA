import React, { createContext, useContext } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
} from '@solana/wallet-adapter-phantom';
import {
  WalletModalProvider,
} from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

require('@solana/wallet-adapter-react-ui/styles.css');

const WalletContext = createContext({});

export const useWallet = () => useContext(WalletContext);

export const WalletContextProvider = ({ children }) => {
  const endpoint = process.env.REACT_APP_SOLANA_RPC_URL || clusterApiUrl(WalletAdapterNetwork.Mainnet);

  const wallets = React.useMemo(() => {
    console.log('🔄 Checking wallet environment...');

    // Check if Standard Wallet API is available
    const hasStandardWalletAPI = typeof window !== 'undefined' && !!window.navigator?.wallet;
    const hasPhantom = typeof window !== 'undefined' && !!window.solana?.isPhantom;
    const phantomConnected = typeof window !== 'undefined' && !!window.solana?.isConnected;

    console.log('🔍 Environment check:');
    console.log('- Standard Wallet API:', hasStandardWalletAPI ? '✅' : '❌');
    console.log('- Phantom available:', hasPhantom ? '✅' : '❌');
    console.log('- Phantom connected:', phantomConnected ? '✅' : '❌');

    if (phantomConnected) {
      console.log('✅ Browser Phantom is connected:', window.solana.publicKey?.toString());
    }

    // If Standard Wallet API is available, use it
    if (hasStandardWalletAPI) {
      console.log('🎯 Using Standard Wallet API (preferred)');
      return [];
    }

    // Fallback: use explicit adapter if Standard Wallet API isn't available
    if (hasPhantom) {
      console.log('🔄 Standard Wallet API not available, using explicit Phantom adapter');
      const phantomAdapter = new PhantomWalletAdapter();
      console.log('🔗 Phantom adapter created:', phantomAdapter.readyState);
      return [phantomAdapter];
    }

    // Last resort: empty array
    console.log('❌ No wallet support detected');
    return [];
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect={true}
        onError={(error) => {
          console.error('Wallet error:', error);
          console.error('Error details:', error.message);
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
