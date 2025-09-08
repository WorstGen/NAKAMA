import React, { createContext, useContext } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
// Removed explicit wallet adapters - using Standard Wallet API auto-detection
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
    console.log('✅ Using Standard Wallet API auto-detection');
    console.log('🌐 Network:', network);
    console.log('📡 RPC endpoint:', endpoint);

    // Debug browser wallet state
    setTimeout(() => {
      console.log('🔍 Browser wallet detection:');
      console.log('- window.solana:', !!window.solana);
      console.log('- Phantom installed:', !!(window.solana?.isPhantom));
      console.log('- Phantom connected:', !!(window.solana?.isConnected));
      console.log('- Phantom publicKey:', window.solana?.publicKey?.toString());
      console.log('- MetaMask installed:', !!window.ethereum);

      // Check if Standard Wallet API is available
      if (typeof window !== 'undefined' && window.navigator?.wallet) {
        console.log('✅ Standard Wallet API available');
      } else {
        console.log('❌ Standard Wallet API not available');
      }
    }, 2000);

    // Return empty array to use Standard Wallet API auto-detection
    return [];
  }, [network, endpoint]);

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
