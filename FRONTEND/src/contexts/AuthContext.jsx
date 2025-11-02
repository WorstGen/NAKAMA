import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWallet } from './WalletContext';
import { usePhantomMultiChain } from './PhantomMultiChainContext';
import { useWalletConnect } from './WalletConnectContext';
import { api } from '../services/api';
import bs58 from 'bs58';
import toast from 'react-hot-toast';

// Theme Context - Always dark mode
export const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const isDark = true;

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const colors = {
    bg: 'bg-black',
    surface: 'bg-gray-900',
    surfaceHover: 'bg-gray-800',
    text: 'text-white',
    textSecondary: 'text-gray-200',
    textMuted: 'text-gray-400',
    border: 'border-gray-700',
    accent: 'text-orange-400',
    accentBg: 'bg-orange-500',
    accentHover: 'bg-orange-600',
    secondary: 'text-blue-400',
    secondaryBg: 'bg-blue-500',
    secondaryHover: 'bg-blue-600',
    card: 'bg-gray-800 border-gray-700',
    input: 'bg-gray-700 text-white border-gray-600',
    inputBorder: 'border-gray-600',
    container: 'bg-black min-h-screen',
    header: 'bg-black/90 border-gray-800',
    button: 'bg-orange-500 hover:bg-orange-600 text-white',
    buttonSecondary: 'bg-blue-500 hover:bg-blue-600 text-white'
  };

  const theme = {
    isDark,
    colors: {
      dark: colors
    },
    classes: colors
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

// Auth Context
const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const { publicKey, connected } = useWallet();
  const { getActiveWallet, isAnyChainConnected } = usePhantomMultiChain();
  const { 
    isConnected: walletConnectConnected, 
    address: walletConnectAddress, 
    getSignMessage: walletConnectSignMessage
  } = useWalletConnect();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [lastAuthAttempt, setLastAuthAttempt] = useState(0);
  const [activeWalletType, setActiveWalletType] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const authenticate = useCallback(async () => {
    if (isAuthenticating) {
      console.log('⏳ Authentication already in progress, skipping...');
      return;
    }

    const now = Date.now();
    const timeSinceLastAttempt = now - lastAuthAttempt;
    const cooldownPeriod = 2000;
    
    if (timeSinceLastAttempt < cooldownPeriod) {
      console.log('⏳ Authentication skipped: cooldown period active');
      return;
    }
    
    setLastAuthAttempt(now);
    setIsAuthenticating(true);
    
    let activePublicKey, activeSignMessage;
    
    const activeWallet = getActiveWallet();
    const isEVMChain = activeWallet?.address?.startsWith('0x');
    
    if (window.solana && window.solana.isConnected && window.solana.publicKey) {
      console.log('🔐 Using direct Solana connection');
      activePublicKey = window.solana.publicKey;
      activeSignMessage = window.solana.signMessage;
      setActiveWalletType('phantom');
    }
    else if ((isEVMChain || (publicKey && typeof publicKey === 'string' && publicKey.startsWith('0x'))) && window.ethereum) {
      console.log('🔐 Using EVM connection for authentication');
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        activePublicKey = accounts[0];
        activeSignMessage = async (message) => {
          const messageHex = '0x' + Buffer.from(message).toString('hex');
          return await window.ethereum.request({
            method: 'personal_sign',
            params: [messageHex, accounts[0]]
          });
        };
        setActiveWalletType('phantom');
      }
    }
    else {
      activePublicKey = activeWallet?.publicKey;
      activeSignMessage = activeWallet?.signMessage;
      console.log('🔐 Using PhantomMultiChain context');
      setActiveWalletType('phantom');
    }
    
    if (!activePublicKey || !activeSignMessage) {
      console.log('⚠️ Authentication skipped: missing publicKey or signMessage');
      setIsAuthenticating(false);
      return;
    }

    setLoading(true);
    console.log('🔐 Starting authentication process...');

    try {
      const address = activePublicKey.toString();
      if (!address || (address.length !== 44 && address.length !== 42)) {
        throw new Error('Invalid wallet address format');
      }

      const message = `Sign this message to authenticate with SolConnect: ${Date.now()}`;
      let signature;

      try {
        const messageBytes = new TextEncoder().encode(message);
        let signPromise;
        
        if (typeof activeSignMessage === 'function') {
          try {
            signPromise = activeSignMessage(messageBytes);
          } catch (e) {
            console.log('Uint8Array failed, trying Buffer...');
            const messageBuffer = Buffer.from(messageBytes);
            signPromise = activeSignMessage(messageBuffer);
          }
        } else {
          throw new Error('signMessage is not a function');
        }

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Wallet signing timeout')), 30000)
        );

        signature = await Promise.race([signPromise, timeoutPromise]);
      } catch (signError) {
        console.error('❌ Wallet signing failed:', signError);
        if (signError.message?.includes('timeout')) {
          throw new Error('Wallet signing timed out. Please try again.');
        } else if (signError.message?.includes('User rejected')) {
          throw new Error('Signature request was rejected.');
        }
        throw new Error(`Wallet signing failed: ${signError.message}`);
      }

      if (!signature) {
        throw new Error('No signature received from wallet');
      }

      let signatureArray;
      let encodedSignature;

      if (typeof signature === 'object' && signature.signature) {
        signatureArray = signature.signature;
        encodedSignature = bs58.encode(signatureArray);
      } else if (typeof signature === 'string' && signature.startsWith('0x')) {
        const hexString = signature.slice(2);
        signatureArray = new Uint8Array(
          hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
        );
        encodedSignature = bs58.encode(signatureArray);
      } else {
        signatureArray = signature instanceof Uint8Array ? signature : new Uint8Array(signature);
        encodedSignature = bs58.encode(signatureArray);
      }

      if (!(signatureArray instanceof Uint8Array)) {
        throw new Error('Invalid signature format - expected Uint8Array');
      }

      if (signatureArray.length !== 64 && signatureArray.length !== 65) {
        throw new Error(`Invalid signature length: ${signatureArray.length} bytes`);
      }

      api.setAuthHeaders({
        'X-Signature': encodedSignature,
        'X-Message': message,
        'X-Public-Key': activePublicKey.toString()
      });

      let profile;
      const maxRetries = 3;

      for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
        try {
          profile = await api.getProfile();
          break;
        } catch (profileError) {
          console.error(`Profile fetch attempt ${retryCount + 1} failed:`, profileError);
          if (retryCount === maxRetries - 1) {
            throw profileError;
          }
          const delay = Math.min(2000 * Math.pow(2, retryCount), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      if (!profile.exists) {
        console.log('✨ New wallet detected - no existing profile');
        const activeWallet = getActiveWallet();
        const isEVMAddress = activeWallet?.address?.startsWith('0x');
        
        if (isEVMAddress) {
          console.log('📝 EVM address - checking for auto-registration...');
          try {
            const retryProfile = await api.getProfile();
            if (retryProfile.exists) {
              setUser(retryProfile);
              setAuthToken('authenticated');
              toast.success(`Welcome back, @${retryProfile.username}!`);
              return;
            }
          } catch (retryError) {
            console.log('No profile after retry');
          }
        }
        
        setUser(null);
        setAuthToken('authenticated');
        console.log('✅ New wallet authenticated - ready for profile creation');
        toast.success('Welcome! Please create your profile to get started.');
      } else {
        setUser(profile);
        setAuthToken('authenticated');
        console.log('✅ Existing user authenticated:', profile.username);
        toast.success(`Welcome back, @${profile.username}!`);
      }

    } catch (error) {
      console.error('❌ Authentication failed:', error);

      let errorMessage = 'Authentication failed. Please try again.';

      if (error.message?.includes('timeout')) {
        errorMessage = 'Wallet signing timed out. Please try again.';
      } else if (error.message?.includes('rejected')) {
        errorMessage = 'Signature request was rejected.';
      } else if (error.message?.includes('Too many requests')) {
        errorMessage = 'Too many requests. Please wait a moment.';
      }

      if (error?.error === 'Profile not found' || error?.message?.includes('Profile not found')) {
        const activeWallet = getActiveWallet();
        const isEVMAddress = activeWallet?.address?.startsWith('0x');
        
        if (isEVMAddress) {
          setUser(null);
          setAuthToken('authenticated');
        } else {
          setUser(null);
          setAuthToken('authenticated');
          toast.success('Welcome! Please create your profile to get started.');
        }
      } else if (error?.status === 401) {
        toast.error('Authentication failed. Please try reconnecting.');
        api.clearAuthHeaders();
        setAuthToken(null);
      } else {
        toast.error(errorMessage);
        setUser(null);
        setAuthToken(null);
        api.clearAuthHeaders();
      }
    } finally {
      setLoading(false);
      setIsAuthenticating(false);
    }
  }, [getActiveWallet, lastAuthAttempt, publicKey, isAuthenticating]);

  const logout = () => {
    setUser(null);
    setAuthToken(null);
    api.clearAuthHeaders();
    console.log('👋 User logged out');
  };

  useEffect(() => {
    const directSolanaConnected = window.solana && window.solana.isConnected && window.solana.publicKey;
    const isConnected = connected || isAnyChainConnected || directSolanaConnected;
    const activeWallet = getActiveWallet();
    const hasPublicKey = publicKey || activeWallet?.address || directSolanaConnected;
    
    console.log('🔍 Auth Monitor:', {
      isConnected,
      hasPublicKey: !!hasPublicKey,
      hasAuthToken: !!authToken,
      hasUser: !!user,
      isAuthenticating
    });
    
    if (isConnected && hasPublicKey && !authToken && !isAuthenticating) {
      console.log('🚀 Auto-authenticating new wallet connection...');
      authenticate();
    }
    
    if (!isConnected && !hasPublicKey && !user && !api.hasAuthHeaders()) {
      console.log('👋 No connection - logging out');
      logout();
    }
  }, [connected, isAnyChainConnected, publicKey, authToken, user, isAuthenticating, authenticate, getActiveWallet]);

  const addEVM = useCallback(async () => {
    if (!user) {
      throw new Error('No user authenticated. Please connect with Solana first.');
    }

    try {
      let evmAddress = null;
      let signMessage = null;

      if (walletConnectConnected && walletConnectAddress) {
        console.log('Using WalletConnect for EVM registration');
        evmAddress = walletConnectAddress;
        signMessage = walletConnectSignMessage();
      } else if (window.ethereum) {
        console.log('Using window.ethereum for EVM registration');
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x1' }]
          });
        } catch (switchError) {
          console.log('Could not switch to Ethereum mainnet:', switchError);
        }

        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (!accounts || accounts.length === 0) {
          throw new Error('No EVM account connected');
        }

        evmAddress = accounts[0];
        signMessage = async (message) => {
          const messageHex = '0x' + Buffer.from(message).toString('hex');
          return await window.ethereum.request({
            method: 'personal_sign',
            params: [messageHex, evmAddress]
          });
        };
      } else {
        throw new Error('No EVM wallet available.');
      }

      const message = `Add EVM address to NAKAMA profile: ${Date.now()}`;
      const signature = await signMessage(Buffer.from(message));

      let encodedSignature;
      if (typeof signature === 'string' && signature.startsWith('0x')) {
        const hexString = signature.slice(2);
        const signatureArray = new Uint8Array(
          hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
        );
        encodedSignature = bs58.encode(signatureArray);
      } else {
        encodedSignature = signature;
      }

      api.setAuthHeaders({
        'X-Signature': encodedSignature,
        'X-Message': message,
        'X-Public-Key': evmAddress
      });

      const response = await api.addEVM(user._id);
      
      if (response.success) {
        setUser(response.user);
        toast.success('EVM address added successfully!');
        return response.user;
      } else {
        throw new Error(response.error || 'Failed to add EVM address');
      }
    } catch (error) {
      console.error('Add EVM address error:', error);
      toast.error(error.message || 'Failed to add EVM address');
      throw error;
    }
  }, [user, setUser, walletConnectConnected, walletConnectAddress, walletConnectSignMessage]);

  const value = {
    user,
    setUser,
    loading,
    authToken,
    authenticate,
    logout,
    addEVM,
    activeWalletType,
    isAuthenticated: !!authToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
