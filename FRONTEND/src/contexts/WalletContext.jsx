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
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = process.env.REACT_APP_SOLANA_RPC_URL || clusterApiUrl(network);

  const wallets = React.useMemo(() => {
    try {
      // Use the official Phantom wallet adapter
      const phantomAdapter = new PhantomWalletAdapter();

      console.log('✅ Official Phantom adapter created');
      console.log('🔗 Adapter details:', {
        name: phantomAdapter.name,
        readyState: phantomAdapter.readyState,
        url: phantomAdapter.url
      });

      // Check browser state for debugging
      setTimeout(() => {
        console.log('🔍 Browser vs Adapter state:');
        console.log('- Browser connected:', !!(window.solana?.isConnected));
        console.log('- Browser publicKey:', window.solana?.publicKey?.toString());
        console.log('- Adapter readyState:', phantomAdapter.readyState);
      }, 2000);

      return [phantomAdapter];
    } catch (error) {
      console.error('❌ Failed to create Phantom adapter:', error);
      return [];
    }
  }, []); // Remove network and endpoint dependencies since they're not used in the callback

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect={true}
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
