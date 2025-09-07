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
    const solflare = new SolflareWalletAdapter();

    // Force ready state check - Phantom handled by Standard Wallet API
    setTimeout(() => {
      console.log('Solflare readyState:', solflare.readyState);
      console.log('Phantom handled by Standard Wallet API');

      // Check if window.solana is available
      if (typeof window !== 'undefined') {
        console.log('window.solana available:', !!window.solana);
        if (window.solana) {
          console.log('Phantom detected:', window.solana.isPhantom);
        }
      }
    }, 1000);

    return [solflare];
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect={false}
        onError={(error) => console.error('Wallet error:', error)}
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
