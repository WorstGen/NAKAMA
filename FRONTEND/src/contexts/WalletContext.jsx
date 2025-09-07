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
    const phantom = new PhantomWalletAdapter();
    const solflare = new SolflareWalletAdapter();

    // Force ready state check with detailed logging
    setTimeout(() => {
      console.log('=== WALLET DEBUG INFO ===');
      console.log('Phantom adapter:', phantom);
      console.log('Phantom readyState:', phantom.readyState);
      console.log('Phantom name:', phantom.name);
      console.log('Phantom connected:', phantom.connected);
      console.log('Phantom connecting:', phantom.connecting);
      console.log('Solflare readyState:', solflare.readyState);

      // Check if window.solana is available
      if (typeof window !== 'undefined') {
        console.log('window.solana available:', !!window.solana);
        if (window.solana) {
          console.log('Phantom detected via window.solana:', window.solana.isPhantom);
          console.log('Phantom version:', window.solana.version);
        }
      }
      console.log('========================');
    }, 1000);

    // Add event listeners for debugging
    phantom.addEventListener('readyStateChange', (event) => {
      console.log('Phantom readyState changed:', event.detail);
    });

    phantom.addEventListener('connect', () => {
      console.log('Phantom connected successfully!');
    });

    phantom.addEventListener('disconnect', () => {
      console.log('Phantom disconnected');
    });

    phantom.addEventListener('error', (error) => {
      console.error('Phantom error:', error);
    });

    // Test manual connection after 2 seconds
    setTimeout(async () => {
      if (phantom.readyState === 'Installed' && !phantom.connected && !phantom.connecting) {
        console.log('Attempting manual Phantom connection...');
        try {
          await phantom.connect();
          console.log('Manual connection successful!');
        } catch (error) {
          console.error('Manual connection failed:', error);
        }
      }
    }, 2000);

    return [phantom, solflare];
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
