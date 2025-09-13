import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWallet } from './WalletContext';
import { usePhantomMultiChain } from './PhantomMultiChainContext';
import { useWalletConnect } from './WalletConnectContext';
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
  // console.log('🎨 useTheme: context found, isDark:', context.isDark);
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
  const { 
    isConnected: walletConnectConnected, 
    address: walletConnectAddress, 
    getSignMessage: walletConnectSignMessage
  } = useWalletConnect();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [lastAuthAttempt, setLastAuthAttempt] = useState(0);
  const [activeWalletType, setActiveWalletType] = useState(null); // 'phantom' or 'metamask'

  const authenticate = useCallback(async () => {
    // Check cooldown period to prevent rate limiting
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAuthAttempt;
    const cooldownPeriod = 1000; // 1 second
    
    if (timeSinceLastAttempt < cooldownPeriod) {
      console.log('Authentication skipped: cooldown period active');
      return;
    }
    
    setLastAuthAttempt(now);
    
    // Check for wallet connections - prioritize based on active chain
    let activePublicKey, activeSignMessage;
    
    // console.log('🔐 Checking wallet connections...');
    // console.log('window.solana exists:', !!window.solana);
    // console.log('window.solana.isConnected:', window.solana?.isConnected);
    // console.log('window.solana.publicKey:', !!window.solana?.publicKey);
    // console.log('window.ethereum exists:', !!window.ethereum);
    
    // Check wallet connections
    const activeWallet = getActiveWallet();
    const isEVMChain = activeWallet?.address?.startsWith('0x');
    
    // console.log('🔐 Active wallet:', activeWallet);
    // console.log('🔐 WalletConnect connected:', walletConnectConnected);
    // console.log('🔐 WalletConnect address:', walletConnectAddress);
    // console.log('🔐 Is EVM chain:', isEVMChain);
    // console.log('🔐 Active chain address:', activeWallet?.address);
    
    // Also check if we have an EVM address in the publicKey (fallback detection)
    const hasEVMAddress = publicKey && typeof publicKey === 'string' && publicKey.startsWith('0x');
    // console.log('🔐 Has EVM address in publicKey:', hasEVMAddress);
    // console.log('🔐 PublicKey value:', publicKey);
    
    // Priority 1: Direct Solana connection (always prefer Solana)
    if (window.solana && window.solana.isConnected && window.solana.publicKey) {
      console.log('Using direct Solana connection');
      activePublicKey = window.solana.publicKey;
      activeSignMessage = window.solana.signMessage;
      setActiveWalletType('phantom');
    }
    // Priority 2: EVM connection via Phantom (prefer Phantom for EVM too)
    else if ((isEVMChain || hasEVMAddress) && window.ethereum) {
      console.log('Using EVM connection via Phantom for authentication');
      // For EVM, we need to get the address and use personal_sign
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        activePublicKey = accounts[0];
        activeSignMessage = async (message) => {
          // Convert message to hex string for EVM signing
          const messageHex = '0x' + Buffer.from(message).toString('hex');
          return await window.ethereum.request({
            method: 'personal_sign',
            params: [messageHex, accounts[0]]
          });
        };
        setActiveWalletType('phantom');
      }
    }
    // Priority 3: Fall back to PhantomMultiChain context
    else {
      activePublicKey = activeWallet?.publicKey;
      activeSignMessage = activeWallet?.signMessage;
      console.log('Using PhantomMultiChain context');
      setActiveWalletType('phantom');
    }
    
    if (!activePublicKey || !activeSignMessage) {
      console.log('Authentication skipped: missing publicKey or signMessage function');
      console.log('Active public key:', activePublicKey);
      console.log('Active sign message function:', !!activeSignMessage);
      return;
    }

    setLoading(true);
    // console.log('Starting authentication process...');

    try {
      // Validate wallet is properly configured
      // console.log('Validating wallet configuration...');

      // Check if wallet is connected and has a valid address format
      const address = activePublicKey.toString();
      if (!address || (address.length !== 44 && address.length !== 42)) {
        throw new Error('Invalid wallet address format');
      }

      // console.log('Setting up wallet authentication...');

      const message = `Sign this message to authenticate with SolConnect: ${Date.now()}`;
      // console.log('Message to sign:', message);
      // console.log('Message length:', message.length);

      let signature;
      try {
        const messageBytes = new TextEncoder().encode(message);
        // console.log('Message bytes:', messageBytes);
        // console.log('Message bytes length:', messageBytes.length);

        // Try different approaches for Solana signing
        let signPromise;
        if (typeof activeSignMessage === 'function') {
          // Try with Uint8Array first (some wallets prefer this)
          try {
            signPromise = activeSignMessage(messageBytes);
          } catch (e) {
            console.log('Uint8Array failed, trying Buffer...');
            // Fallback to Buffer
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
        // console.log('Raw signature received:', signature);

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

      // console.log('Signature type:', typeof signature);

      // Handle different signature formats
      let signatureArray;
      let encodedSignature;

      if (typeof signature === 'object' && signature.signature) {
        // New format: {signature: Uint8Array, publicKey: string}
        signatureArray = signature.signature;
        // console.log('Using new signature format');

        // Convert raw signature bytes to base58 (backend expects this)
        encodedSignature = bs58.encode(signatureArray);
        // console.log('Converted signature to base58:', encodedSignature);
        // console.log('Signature formats available:', {
        //   hex: !!signature.signatureHex,
        //   base64: !!signature.signatureBase64,
        //   base58: !!encodedSignature
        // });
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

      // console.log('Signature as array:', signatureArray);

      // Validate signature length
      // Solana signatures are 64 bytes (Ed25519), EVM signatures are 65 bytes (64 + recovery ID)
      if (signatureArray.length !== 64 && signatureArray.length !== 65) {
        throw new Error(`Invalid signature length. Expected 64 bytes (Solana) or 65 bytes (EVM), got ${signatureArray.length} bytes.`);
      }

      // We now always encode with bs58 for backend compatibility
      // console.log('Final signature (base58 encoded):', encodedSignature);

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
          // console.log(`Profile fetch attempt ${retryCount + 1}/${maxRetries}`);
          profile = await api.getProfile();
          break; // Success, exit retry loop
        } catch (profileError) {
          console.error(`Profile fetch attempt ${retryCount + 1} failed:`, profileError);

          if (retryCount === maxRetries - 1) {
            // This was the last attempt
            throw profileError;
          }

          // Check if we got rate limited and wait longer
          if (profileError.message?.includes('Too many requests') || profileError.message?.includes('429')) {
            const delay = Math.min(5000 * Math.pow(2, retryCount), 30000); // 10s, 20s, 30s for rate limiting
            console.log(`Rate limited, waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            // Normal exponential backoff
            const delay = Math.min(2000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // console.log('Profile fetch result:', profile);

      // Handle profile not found for EVM addresses
      if (!profile.exists) {
        console.log('No existing profile found for this address');
        
        // Check if this is an EVM address
        const activeWallet = getActiveWallet();
        const isEVMAddress = activeWallet?.address?.startsWith('0x');
        
        if (isEVMAddress) {
          console.log('EVM address has no profile - checking if user has profile with any EVM address');
          
          // For EVM addresses, try to find a profile with any EVM address
          // The backend should have auto-registered this address, so try fetching profile again
          try {
            console.log('Retrying profile fetch for EVM address after auto-registration...');
            const retryProfile = await api.getProfile();
            if (retryProfile.exists) {
              console.log('Found profile after auto-registration:', retryProfile);
              setUser(retryProfile);
              toast.success(`Welcome back, @${retryProfile.username}!`);
              return;
            }
          } catch (retryError) {
            console.log('Retry profile fetch failed:', retryError);
          }
          
          // If still no profile found, this is a new EVM address
          setUser(null);
          return; // Exit early, don't clear auth headers
        } else {
          // This is a Solana address without a profile
          setUser(null);
          setAuthToken('authenticated'); // Set auth token even for new users
          toast.success('Welcome! Please create your profile to get started.');
        }
      } else {
        setUser(profile);
        setAuthToken('authenticated'); // Set auth token to indicate successful authentication
        toast.success(`Welcome back, @${profile.username}!`);
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
        
        // Check if this is an EVM address
        const activeWallet = getActiveWallet();
        const isEVMAddress = activeWallet?.address?.startsWith('0x');
        
        if (isEVMAddress) {
          console.log('EVM address has no profile - this is normal, keeping auth headers');
          setUser(null);
          // Don't clear auth headers for EVM addresses without profiles
        } else {
          setUser(null);
          toast.success('Welcome! Please create your profile to get started.');
        }
      } else if (error?.status === 401) {
        console.error('Authentication unauthorized - possible signature verification failure');
        toast.error('Authentication failed. Please try reconnecting your wallet.');
        api.clearAuthHeaders();
      } else {
        toast.error(errorMessage);
        setUser(null);
        setAuthToken(null);
        api.clearAuthHeaders();
      }
    } finally {
      setLoading(false);
    }
  }, [getActiveWallet, lastAuthAttempt, publicKey, walletConnectConnected, walletConnectAddress]);

  const logout = () => {
    setUser(null);
    setAuthToken(null);
    api.clearAuthHeaders();
    console.log('User logged out');
  };

  useEffect(() => {
    // Check for direct Solana connection
    const directSolanaConnected = window.solana && window.solana.isConnected && window.solana.publicKey;
    
    // Use both old and new context for compatibility, plus direct Solana check
    const isConnected = connected || isAnyChainConnected || directSolanaConnected;
    const activeWallet = getActiveWallet();
    const hasPublicKey = publicKey || activeWallet?.address || directSolanaConnected;
    
    // console.log('🔐 Auth useEffect - connected:', connected, 'isAnyChainConnected:', isAnyChainConnected, 'directSolanaConnected:', directSolanaConnected, 'hasPublicKey:', hasPublicKey);
    
    // Only logout if no connection at all AND no user AND no auth headers
    if (!isConnected && !hasPublicKey && !user && !api.hasAuthHeaders()) {
      console.log('🔐 Logging out - no connection, no user, no auth headers');
      logout();
    }
  }, [connected, isAnyChainConnected, publicKey, getActiveWallet, user, loading, authenticate, lastAuthAttempt]);



  const addEVM = useCallback(async () => {
    if (!user) {
      throw new Error('No user authenticated. Please connect with Solana first.');
    }

    try {
      let evmAddress = null;
      let signMessage = null;

      // Priority 1: Check if WalletConnect is connected
      if (walletConnectConnected && walletConnectAddress) {
        console.log('Using WalletConnect for EVM registration');
        evmAddress = walletConnectAddress;
        signMessage = walletConnectSignMessage();
      } 
      // Priority 2: Use window.ethereum (Phantom EVM or other injected wallets)
      else if (window.ethereum) {
        console.log('Using window.ethereum for EVM registration');
        
        // Connect to EVM wallet
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Try to switch to Ethereum mainnet (optional, don't fail if it doesn't work)
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x1' }]
          });
        } catch (switchError) {
          console.log('Could not switch to Ethereum mainnet:', switchError);
        }

        // Get the EVM address
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
        throw new Error('No EVM wallet available. Please connect WalletConnect or Phantom with EVM support.');
      }

      console.log('EVM address for registration:', evmAddress);

      // Sign a message with the EVM address
      const message = `Add EVM address to NAKAMA profile: ${Date.now()}`;
      
      const signature = await signMessage(Buffer.from(message));
      console.log('Raw signature:', signature);

      // Convert signature to base58 for backend compatibility
      let encodedSignature;
      if (typeof signature === 'string' && signature.startsWith('0x')) {
        // Hex signature (from window.ethereum)
        const hexString = signature.slice(2);
        const signatureArray = new Uint8Array(
          hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
        );
        encodedSignature = bs58.encode(signatureArray);
      } else {
        // WalletConnect or other format
        encodedSignature = signature;
      }

      console.log('Encoded signature:', encodedSignature);

      // Set auth headers for EVM registration
      api.setAuthHeaders({
        'X-Signature': encodedSignature,
        'X-Message': message,
        'X-Public-Key': evmAddress
      });

      // Call the add EVM endpoint with user ID
      console.log('🔍 Calling addEVM with user ID:', user._id);
      console.log('🔍 User object:', user);
      const response = await api.addEVM(user._id);
      
      if (response.success) {
        // Update user state with new EVM address
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
    isAuthenticated: !!user && !!authToken // Simplified: only authenticated if we have both user and token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
