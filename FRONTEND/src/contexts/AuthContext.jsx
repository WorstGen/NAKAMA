import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWallet } from './WalletContext';
import { usePhantomMultiChain } from './PhantomMultiChainContext';
import { api } from '../services/api';
import bs58 from 'bs58';
import toast from 'react-hot-toast';

// Theme is now dark-only - no toggle needed

// Theme Context
export const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    console.error('🎨 useTheme: ThemeContext not found! Make sure ThemeProvider is wrapping the component.');
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  console.log('🎨 useTheme: context found, isDark:', context.isDark);
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Always dark mode - ultra dark theme as requested
  const isDark = true;

  useEffect(() => {
    // Always apply dark theme to document
    document.documentElement.classList.add('dark');
  }, []);

  // Ultra dark theme colors - optimized for readability and professional look
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
      dark: colors // Legacy structure for backward compatibility
    },
    classes: colors // Direct access to classes
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const { publicKey, connected } = useWallet();
  const { getActiveWallet, isAnyChainConnected } = usePhantomMultiChain();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [lastAuthAttempt, setLastAuthAttempt] = useState(0);

  const authenticate = useCallback(async () => {
    // Check cooldown period to prevent rate limiting (reduced to 1 second)
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAuthAttempt;
    const cooldownPeriod = 1000; // 1 second
    
    if (timeSinceLastAttempt < cooldownPeriod) {
      console.log('Authentication skipped: cooldown period active');
      return;
    }
    
    setLastAuthAttempt(now);
    
    // Get the active wallet from PhantomMultiChain context
    const activeWallet = getActiveWallet();
    const activePublicKey = activeWallet?.publicKey;
    const activeSignMessage = activeWallet?.signMessage;
    
    if (!activePublicKey || !activeSignMessage) {
      console.log('Authentication skipped: missing publicKey or signMessage function');
      console.log('Active wallet:', activeWallet);
      console.log('Active public key:', activePublicKey);
      console.log('Active sign message function:', !!activeSignMessage);
      return;
    }

    setLoading(true);
    console.log('Starting authentication process...');

    try {
      // Validate wallet is properly configured
      console.log('Validating wallet configuration...');

      // Check if wallet is connected and has a valid address format
      const address = activePublicKey.toString();
      if (!address || (address.length !== 44 && address.length !== 42)) {
        throw new Error('Invalid wallet address format');
      }

      console.log('Setting up wallet authentication...');

      const message = `Sign this message to authenticate with SolConnect: ${Date.now()}`;
      console.log('Message to sign:', message);
      console.log('Message length:', message.length);

      let signature;
      try {
        const messageBytes = new TextEncoder().encode(message);
        console.log('Message bytes:', messageBytes);
        console.log('Message bytes length:', messageBytes.length);

        // Add timeout for signing operation
        const signPromise = activeSignMessage(message); // Pass string, not bytes
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Wallet signing timeout')), 30000)
        );

        signature = await Promise.race([signPromise, timeoutPromise]);
        console.log('Raw signature received:', signature);

      } catch (signError) {
        console.error('Wallet signing failed:', signError);

        // Provide specific error messages based on the failure type
        if (signError.message?.includes('timeout')) {
          throw new Error('Wallet signing timed out. Please try again.');
        } else if (signError.message?.includes('User rejected')) {
          throw new Error('Signature request was rejected. Please approve the signature.');
        } else if (signError.message?.includes('network') || signError.message?.includes('RPC')) {
          throw new Error('Wallet network error. Please check your wallet connection and try again.');
        } else {
          throw new Error(`Wallet signing failed: ${signError.message}`);
        }
      }

      // Validate signature
      if (!signature) {
        throw new Error('No signature received from wallet');
      }

      console.log('Signature type:', typeof signature);

      // Handle different signature formats
      let signatureArray;
      let encodedSignature;

      if (typeof signature === 'object' && signature.signature) {
        // New format: {signature: Uint8Array, publicKey: string}
        signatureArray = signature.signature;
        console.log('Using new signature format');

        // Convert raw signature bytes to base58 (backend expects this)
        encodedSignature = bs58.encode(signatureArray);
        console.log('Converted signature to base58:', encodedSignature);
        console.log('Signature formats available:', {
          hex: !!signature.signatureHex,
          base64: !!signature.signatureBase64,
          base58: !!encodedSignature
        });
      } else if (typeof signature === 'string' && signature.startsWith('0x')) {
        // EVM hex signature format
        console.log('Using EVM hex signature format');
        const hexString = signature.slice(2); // Remove '0x' prefix
        signatureArray = new Uint8Array(
          hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
        );
        encodedSignature = bs58.encode(signatureArray);
        console.log('Converted EVM hex signature to base58:', encodedSignature);
      } else {
        // Legacy format: direct Uint8Array
        signatureArray = signature instanceof Uint8Array ? signature : new Uint8Array(signature);
        // Convert to base58
        encodedSignature = bs58.encode(signatureArray);
        console.log('Converted legacy signature to base58:', encodedSignature);
      }

      // Validate signature array
      if (!(signatureArray instanceof Uint8Array)) {
        console.error('Signature is not Uint8Array:', signatureArray);
        throw new Error('Invalid signature format - expected Uint8Array');
      }

      console.log('Signature as array:', signatureArray);

      // Validate signature length
      // Solana signatures are 64 bytes (Ed25519), EVM signatures are 65 bytes (64 + recovery ID)
      if (signatureArray.length !== 64 && signatureArray.length !== 65) {
        throw new Error(`Invalid signature length. Expected 64 bytes (Solana) or 65 bytes (EVM), got ${signatureArray.length} bytes.`);
      }

      // We now always encode with bs58 for backend compatibility
      console.log('Final signature (base58 encoded):', encodedSignature);

      console.log('Public key:', activePublicKey.toString());

      // Set auth headers to match backend expectations
      api.setAuthHeaders({
        'X-Signature': encodedSignature,
        'X-Message': message,
        'X-Public-Key': activePublicKey.toString()
      });

      console.log('Auth headers set successfully');

      // Try to fetch user profile with retry logic
      let profile;
      const maxRetries = 3;

      for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
        try {
          console.log(`Profile fetch attempt ${retryCount + 1}/${maxRetries}`);
          profile = await api.getProfile();
          break; // Success, exit retry loop
        } catch (profileError) {
          console.error(`Profile fetch attempt ${retryCount + 1} failed:`, profileError);

          if (retryCount === maxRetries - 1) {
            // This was the last attempt
            throw profileError;
          }

          // Wait before retry with exponential backoff to avoid rate limiting
          const delay = Math.min(2000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      console.log('Profile fetch result:', profile);

      setUser(profile.exists ? profile : null);

      if (profile.exists) {
        toast.success(`Welcome back, @${profile.username}!`);
      } else {
        console.log('No existing profile found - user can create one');
        toast.success('Welcome! Please create your profile to get started.');
      }

    } catch (error) {
      console.error('Authentication failed:', error);

      // Provide user-friendly error messages
      let errorMessage = 'Authentication failed. Please try again.';

      if (error.message?.includes('timeout')) {
        errorMessage = 'Wallet signing timed out. Please try again.';
      } else if (error.message?.includes('rejected')) {
        errorMessage = 'Signature request was rejected. Please approve the signature.';
      } else if (error.message?.includes('network') || error.message?.includes('RPC')) {
        errorMessage = 'Network error. Please check your wallet connection and try again.';
      } else if (error.message?.includes('Invalid signature length')) {
        errorMessage = 'Wallet returned invalid signature. Please try reconnecting your wallet.';
      } else if (error.message?.includes('Invalid Solana public key')) {
        errorMessage = 'Invalid wallet address. Please ensure you have a valid Solana wallet connected.';
      } else if (error.message?.includes('Too many requests')) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      }

      // Check if it's a profile-not-found error vs auth error
      if (error?.error === 'Profile not found' || error?.message?.includes('Profile not found')) {
        console.log('Profile not found - this is normal for new users');
        setUser(null);
        toast.success('Welcome! Please create your profile to get started.');
      } else if (error?.status === 401) {
        console.error('Authentication unauthorized - possible signature verification failure');
        toast.error('Authentication failed. Please try reconnecting your wallet.');
        api.clearAuthHeaders();
      } else {
        toast.error(errorMessage);
      }

      setUser(null);
      setAuthToken(null);
      api.clearAuthHeaders();
    } finally {
      setLoading(false);
    }
  }, [getActiveWallet, lastAuthAttempt]);

  const logout = () => {
    setUser(null);
    setAuthToken(null);
    api.clearAuthHeaders();
    console.log('User logged out');
  };

  useEffect(() => {
    // Use both old and new context for compatibility
    const isConnected = connected || isAnyChainConnected;
    const activeWallet = getActiveWallet();
    const hasPublicKey = publicKey || activeWallet?.address;
    
    console.log('🔐 Auth useEffect - connected:', connected, 'isAnyChainConnected:', isAnyChainConnected, 'hasPublicKey:', hasPublicKey);
    
    if (isConnected && hasPublicKey && !user && !loading && !api.hasAuthHeaders()) {
      console.log('🔐 Triggering authentication...');
      authenticate();
    } else if (!isConnected || !hasPublicKey) {
      console.log('🔐 Logging out - no connection or public key');
      logout();
    }
  }, [connected, isAnyChainConnected, publicKey, getActiveWallet, user, loading, authenticate]);

  // Try to restore authentication on page load if wallet is connected
  useEffect(() => {
    const restoreAuth = async () => {
      // Only attempt restoration if we haven't tried authentication before
      // and user is connected but has no authentication state
      const hasAuthHeaders = api.hasAuthHeaders();
      const isConnected = connected || isAnyChainConnected;
      const activeWallet = getActiveWallet();
      const hasPublicKey = publicKey || activeWallet?.address;
      
      if (isConnected && hasPublicKey && !user && !loading && !hasAuthHeaders) {
        console.log('🔐 Attempting to restore authentication...');
        try {
          await authenticate();
        } catch (error) {
          console.log('🔐 Failed to restore authentication:', error);
        }
      }
    };

    // Small delay to ensure wallet state is fully initialized
    const timeoutId = setTimeout(restoreAuth, 500);
    return () => clearTimeout(timeoutId);
  }, [connected, isAnyChainConnected, publicKey, getActiveWallet, user, loading, authenticate]);

  const value = {
    user,
    setUser,
    loading,
    authToken,
    authenticate,
    logout,
    isAuthenticated: !!authToken || (!!user && !loading) // Consider authenticated if we have user profile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
