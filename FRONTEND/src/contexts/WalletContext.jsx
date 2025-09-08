import React, { createContext, useContext } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  SolletWalletAdapter,
  TorusWalletAdapter,
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
    try {
      // Configure multiple Solana wallets with proper error handling
      const walletConfigs = [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
        new SolletWalletAdapter({ network }),
        new TorusWalletAdapter(),
      ];

      console.log('✅ Wallet adapters configured successfully');
      console.log('🔗 Available wallets:', walletConfigs.map(w => ({
        name: w.name,
        readyState: w.readyState
      })));
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
      }, 2000);

      return walletConfigs;
    } catch (error) {
      console.error('❌ Error configuring wallets:', error);
      console.error('Error details:', error.message);
      return [];
    }
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
