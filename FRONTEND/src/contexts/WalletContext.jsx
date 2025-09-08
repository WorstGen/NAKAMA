import React, { createContext, useContext } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
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
    console.log('🔄 Using Standard Wallet API auto-detection for React state sync');

    // Debug Standard Wallet API state
    setTimeout(() => {
      // Check browser wallet state for React sync
      if (window.solana?.isConnected) {
        console.log('✅ Browser Phantom is connected:', window.solana.publicKey?.toString());
        console.log('🎯 React should sync with this browser connection');
      } else {
        console.log('❌ Browser Phantom not connected');
      }

      // Check if Standard Wallet API is available
      if (typeof window !== 'undefined' && window.navigator?.wallet) {
        console.log('✅ Standard Wallet API available for auto-detection');
      } else {
        console.log('❌ Standard Wallet API not available');
      }
    }, 2000);

    // Empty array - let Standard Wallet API handle everything
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
