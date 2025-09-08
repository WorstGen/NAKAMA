import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWallet } from './WalletContext';
import { api } from '../services/api';
import bs58 from 'bs58';
import toast from 'react-hot-toast';

// Theme Toggle Component
export const ThemeToggle = () => {
  const { isDark, toggleTheme, colors } = useTheme();
  const currentColors = isDark ? colors.dark : colors.light;

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg transition-all duration-200 ${currentColors.surface} ${currentColors.surfaceHover} ${currentColors.border} border`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        // Sun icon for light mode
        <svg className={`w-5 h-5 ${currentColors.accent}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        // Moon icon for dark mode
        <svg className={`w-5 h-5 ${currentColors.secondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
};

// Theme Context
export const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage or default to dark mode
    const saved = localStorage.getItem('nakama-theme');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('nakama-theme', JSON.stringify(isDark));
    // Apply theme to document
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const theme = {
    isDark,
    toggleTheme,
    colors: {
      // Ultra Dark mode colors
      dark: {
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
        card: 'bg-gray-800/80',
        input: 'bg-gray-700/50',
        inputBorder: 'border-gray-600'
      },
      // Light mode colors
      light: {
        bg: 'bg-gray-50',
        surface: 'bg-white',
        surfaceHover: 'bg-gray-100',
        text: 'text-gray-900',
        textSecondary: 'text-gray-600',
        textMuted: 'text-gray-400',
        border: 'border-gray-200',
        accent: 'text-orange-500',
        accentBg: 'bg-orange-500',
        accentHover: 'bg-orange-600',
        secondary: 'text-blue-500',
        secondaryBg: 'bg-blue-500',
        secondaryHover: 'bg-blue-600',
        card: 'bg-white',
        input: 'bg-gray-50',
        inputBorder: 'border-gray-300'
      }
    }
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
  const { publicKey, signMessage, connected } = useWallet();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authToken, setAuthToken] = useState(null);

  const authenticate = useCallback(async () => {
    if (!publicKey || !signMessage) {
      console.log('Authentication skipped: missing publicKey or signMessage function');
      return;
    }

    setLoading(true);
    console.log('Starting authentication process...');

    try {
      // Validate wallet is properly configured for Solana
      console.log('Validating wallet configuration...');

      // Check if wallet is connected and has the expected properties
      if (!publicKey.toString() || publicKey.toString().length !== 44) {
        throw new Error('Invalid Solana public key format');
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
        const signPromise = signMessage(message); // Pass string, not bytes
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

      // Handle new signature format from updated signMessage function
      let signatureArray;
      let encodedSignature;

      if (typeof signature === 'object' && signature.signature) {
        // New format: {signature: Uint8Array, signatureHex: string, signatureBase64: string}
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

      // Validate signature length (Ed25519 signatures are 64 bytes)
      if (signatureArray.length !== 64) {
        throw new Error(`Invalid signature length. Expected 64 bytes for Ed25519 signature, got ${signatureArray.length} bytes.`);
      }

      // We now always encode with bs58 for backend compatibility
      console.log('Final signature (base58 encoded):', encodedSignature);

      console.log('Public key:', publicKey.toString());

      // Set auth headers to match backend expectations
      api.setAuthHeaders({
        'X-Signature': encodedSignature,
        'X-Message': message,
        'X-Public-Key': publicKey.toString()
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

          // Wait before retry (use retryCount + 1 to avoid 0ms delay)
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
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
  }, [publicKey, signMessage]);

  const logout = () => {
    setUser(null);
    setAuthToken(null);
    api.clearAuthHeaders();
    console.log('User logged out');
  };

  useEffect(() => {
    if (connected && publicKey && !user && !loading && !api.hasAuthHeaders()) {
      authenticate();
    } else if (!connected || !publicKey) {
      logout();
    }
  }, [connected, publicKey, authenticate, user, loading]);

  // Try to restore authentication on page load if wallet is connected
  useEffect(() => {
    const restoreAuth = async () => {
      // Only attempt restoration if we haven't tried authentication before
      // and user is connected but has no authentication state
      const hasAuthHeaders = api.hasAuthHeaders();
      if (connected && publicKey && !user && !loading && !hasAuthHeaders) {
        console.log('Attempting to restore authentication...');
        try {
          await authenticate();
        } catch (error) {
          console.log('Failed to restore authentication:', error);
        }
      }
    };

    // Small delay to ensure wallet state is fully initialized
    const timeoutId = setTimeout(restoreAuth, 500);
    return () => clearTimeout(timeoutId);
  }, [connected, publicKey, user, loading, authenticate]);

  const value = {
    user,
    setUser,
    loading,
    authToken,
    authenticate,
    logout,
    isAuthenticated: !!authToken || (!!publicKey && !loading) // Consider authenticated if we have publicKey
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
