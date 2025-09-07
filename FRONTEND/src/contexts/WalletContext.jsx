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
  StandardWalletAdapter,
} from '@solana/wallet-standard-wallet-adapter-react';
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
    console.log('🔧 Initializing wallet adapters...');

    const solflare = new SolflareWalletAdapter();
    const standardWallet = new StandardWalletAdapter();

    console.log('✅ Solflare adapter:', solflare.name, 'State:', solflare.readyState);
    console.log('✅ Standard Wallet adapter initialized');
    console.log('ℹ️ Phantom will be auto-detected by Standard Wallet API');

    // Check if Phantom is actually available as standard wallet
    console.log('🔍 Checking window.solana:', typeof window !== 'undefined' ? !!window.solana : 'N/A');
    console.log('🔍 Checking window.solana.isPhantom:', typeof window !== 'undefined' ? !!(window.solana && window.solana.isPhantom) : 'N/A');

    // Log all available wallets on window
    if (typeof window !== 'undefined') {
      console.log('🔍 Available wallets on window:', Object.keys(window).filter(key =>
        key.toLowerCase().includes('wallet') ||
        key.toLowerCase().includes('solana') ||
        key.toLowerCase().includes('phantom')
      ));

      // Check for common wallet injection patterns
      const walletChecks = {
        'window.solana': !!window.solana,
        'window.solana.isPhantom': !!(window.solana && window.solana.isPhantom),
        'window.phantom': !!window.phantom,
        'window.solflare': !!window.solflare,
      };
      console.log('🔍 Wallet injection status:', walletChecks);
    }

    return [solflare, standardWallet];
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect={false} // Disable auto-connect to prevent issues
        localStorageKey="solconnect_wallet"
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
