import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAuth } from '../contexts/AuthContext';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

// Wallet Troubleshooting Modal Component
const WalletTroubleshootingModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Wallet Connection Help</h3>

          <div className="space-y-4 text-sm text-gray-600">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">🔧 Common Issues:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Multiple blockchain networks enabled in wallet</li>
                <li>Wallet extension conflicts</li>
                <li>Network connection issues</li>
                <li>Browser cache problems</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">🛠️ Quick Fixes:</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Ensure only Solana network is enabled in your wallet</li>
                <li>Try refreshing the page (F5 or Ctrl+R)</li>
                <li>Disconnect and reconnect your wallet</li>
                <li>Try a different browser or incognito mode</li>
                <li>Check if MetaMask/other Ethereum wallets are disabled</li>
                <li>Clear browser cache and cookies for this site</li>
                <li>Try disabling and re-enabling the wallet extension</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">🎯 For Phantom Users:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Go to Settings → Networks</li>
                <li>Disable Ethereum and Sui networks</li>
                <li>Ensure Solana Mainnet is selected</li>
                <li>Try resetting your wallet account</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">🦊 For MetaMask Users:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>MetaMask can work with Solana via the Wallet Standard API</li>
                <li>Make sure MetaMask is updated to the latest version</li>
                <li>Try switching MetaMask to Solana mode if available</li>
                <li>Check if MetaMask has Solana network support enabled</li>
                <li>If MetaMask appears greyed out, try refreshing the page</li>
                <li>MetaMask works best with dApps that support both Ethereum and Solana</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">⚠️ Multiple Wallet Issues:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Having multiple wallets can sometimes cause conflicts</li>
                <li>Try using only one wallet at a time for testing</li>
                <li>Use incognito mode to test with isolated extensions</li>
                <li>Check browser console for specific wallet compatibility messages</li>
                <li>Different wallets may have different Solana network requirements</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Wallet Connect Button Component
const WalletConnectButton = () => {
  const { connected, publicKey, disconnect, wallet, wallets, connecting } = useWallet();
  const [showTroubleshooting, setShowTroubleshooting] = React.useState(false);
  const [stuckTimer, setStuckTimer] = React.useState(null);

  // Debug wallet state changes
  React.useEffect(() => {
    console.log('WalletConnectButton State:', {
      connected,
      connecting,
      walletName: wallet?.adapter?.name,
      publicKey: publicKey?.toString(),
      walletCount: wallets.length,
      allWallets: wallets.map(w => ({
        name: w.adapter.name,
        readyState: w.adapter.readyState,
        url: w.adapter.url
      }))
    });

    // Detect if connection is stuck
    if (connecting && !connected) {
      if (stuckTimer) {
        clearTimeout(stuckTimer);
      }

      const timer = setTimeout(() => {
        console.log('Wallet connection appears stuck, you may need to refresh or try a different wallet');
        console.log('Available wallets:', wallets.map(w => w.adapter.name));
        console.log('Wallet states:', wallets.map(w => `${w.adapter.name}: ${w.adapter.readyState}`));
      }, 10000); // Reduced to 10 seconds for faster feedback

      setStuckTimer(timer);
    } else {
      if (stuckTimer) {
        clearTimeout(stuckTimer);
        setStuckTimer(null);
      }
    }

    return () => {
      if (stuckTimer) {
        clearTimeout(stuckTimer);
      }
    };
  }, [connected, connecting, wallet, publicKey, wallets, stuckTimer]);

  // Debug the actual wallet adapter state
  React.useEffect(() => {
    console.log('Header - Wallet Adapter State:');
    console.log('Connected:', connected);
    console.log('Connecting:', connecting);
    console.log('PublicKey:', publicKey?.toString());
    console.log('Wallet:', wallet?.adapter?.name);
    console.log('Wallet readyState:', wallet?.adapter?.readyState);
    console.log('Available wallets:', wallets.map(w => ({
      name: w.adapter.name,
      readyState: w.adapter.readyState,
      url: w.adapter.url,
      icon: w.adapter.icon,
      supportedTransactionVersions: w.adapter.supportedTransactionVersions
    })));

    // Check for wallet compatibility issues
    wallets.forEach(walletAdapter => {
      console.log(`Wallet ${walletAdapter.adapter.name}:`, {
        readyState: walletAdapter.adapter.readyState,
        supported: walletAdapter.adapter.supportedTransactionVersions,
        url: walletAdapter.adapter.url
      });

      // Check if wallet is in a problematic state
      if (walletAdapter.adapter.readyState === 'NotDetected') {
        console.warn(`⚠️ ${walletAdapter.adapter.name} wallet not detected in browser`);
      } else if (walletAdapter.adapter.readyState === 'Loadable') {
        console.log(`✅ ${walletAdapter.adapter.name} wallet is loadable`);
      } else if (walletAdapter.adapter.readyState === 'Installed') {
        console.log(`✅ ${walletAdapter.adapter.name} wallet is installed`);

        // Check for MetaMask - can work with Solana but needs proper configuration
        if (walletAdapter.adapter.name.toLowerCase().includes('metamask')) {
          console.log(`ℹ️ ${walletAdapter.adapter.name} detected - MetaMask can work with Solana via Wallet Standard`);
          console.log(`💡 Make sure MetaMask is connected to Solana network, or use its Solana features`);
          console.log(`💡 If issues persist, try switching MetaMask to Solana mode or use a Solana-native wallet`);

          // Check if MetaMask has Solana support
          const supportedVersions = walletAdapter.adapter.supportedTransactionVersions;
          if (supportedVersions?.has('legacy') || supportedVersions?.size > 0) {
            console.log(`✅ ${walletAdapter.adapter.name} has transaction support (versions: ${Array.from(supportedVersions || []).join(', ')})`);
            console.log(`💡 ${walletAdapter.adapter.name} should work with Solana - if greyed out, try refreshing the page`);
          } else {
            console.warn(`⚠️ ${walletAdapter.adapter.name} may need configuration for Solana support`);
            console.log(`💡 Try updating ${walletAdapter.adapter.name} or check if Solana features are enabled`);
          }
        }
      } else if (walletAdapter.adapter.readyState === 'Unsupported') {
        console.warn(`⚠️ ${walletAdapter.adapter.name} wallet is not supported`);
      }
    });
  }, [connected, connecting, publicKey, wallet, wallets]);

  // Auto-connect logic disabled - users must manually connect via button click
  // This prevents automatic connection attempts that can cause issues with
  // multi-network wallets or when users don't want to connect immediately

  if (connected) {
    return (
      <div className="flex items-center space-x-3">
        <div className="hidden sm:flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            publicKey ? 'bg-gradient-to-r from-green-400 to-blue-400' : 'bg-yellow-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              publicKey ? 'bg-white' : 'bg-yellow-600'
            }`}></div>
          </div>
          <div className="text-white">
            <div className="text-xs font-semibold">{wallet?.adapter?.name || 'Wallet'}</div>
            <div className="text-xs opacity-80">
              {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4) || 'Connecting...'}
            </div>
          </div>
        </div>
        <button
          onClick={disconnect}
          className="bg-red-500/20 hover:bg-red-500/40 text-red-200 hover:text-white px-3 py-2 rounded-lg text-sm transition-all duration-200 border border-red-500/30"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end space-y-2">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => {
            console.log('=== Manual Wallet Check ===');
            console.log('Wallets array:', wallets);
            console.log('Wallet details:', wallets.map(w => ({
              name: w.adapter.name,
              readyState: w.adapter.readyState,
              url: w.adapter.url
            })));
            setShowTroubleshooting(true);
          }}
          className="text-white/60 hover:text-white transition-colors p-1"
          title="Wallet Connection Help"
        >
          <QuestionMarkCircleIcon className="w-5 h-5" />
        </button>
        <WalletMultiButton />
      </div>
      {connecting && (
        <div className="text-white/60 text-xs">
          Connecting...
          <div className="mt-1 text-white/40 text-xs">
            If stuck, try refreshing or switching wallets
          </div>
        </div>
      )}

      <WalletTroubleshootingModal
        isOpen={showTroubleshooting}
        onClose={() => setShowTroubleshooting(false)}
      />
    </div>
  );
};

export const Header = () => {
  const location = useLocation();
  const { connected } = useWallet();
  const { user } = useAuth();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-white font-bold text-xl">SolConnect</span>
          </Link>

          {/* Navigation */}
          {connected && user && (
            <nav className="hidden md:flex space-x-6">
              <Link
                to="/dashboard"
                className={`text-white/80 hover:text-white transition-colors ${
                  isActive('/dashboard') ? 'text-white font-semibold' : ''
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/profile"
                className={`text-white/80 hover:text-white transition-colors ${
                  isActive('/profile') ? 'text-white font-semibold' : ''
                }`}
              >
                Profile
              </Link>
              <Link
                to="/contacts"
                className={`text-white/80 hover:text-white transition-colors ${
                  isActive('/contacts') ? 'text-white font-semibold' : ''
                }`}
              >
                Contacts
              </Link>
              <Link
                to="/send"
                className={`text-white/80 hover:text-white transition-colors ${
                  isActive('/send') ? 'text-white font-semibold' : ''
                }`}
              >
                Send
              </Link>
              <Link
                to="/transactions"
                className={`text-white/80 hover:text-white transition-colors ${
                  isActive('/transactions') ? 'text-white font-semibold' : ''
                }`}
              >
                History
              </Link>
            </nav>
          )}

          {/* User info and wallet button */}
          <div className="flex items-center space-x-4">
            {connected && user && (
              <div className="hidden lg:flex items-center space-x-2 text-white">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                  <span className="font-semibold text-sm">
                    {user.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="font-medium">@{user.username}</span>
              </div>
            )}
            {/* Replace the old WalletMultiButton with our enhanced component */}
            <WalletConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
};
