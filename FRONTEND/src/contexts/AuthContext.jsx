import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { api } from '../services/api';
import bs58 from 'bs58';
import toast from 'react-hot-toast';

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

      let signature;
      try {
        const messageBytes = new TextEncoder().encode(message);
        console.log('Message bytes:', messageBytes);

        // Add timeout for signing operation
        const signPromise = signMessage(messageBytes);
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

      // Convert signature to Uint8Array if it's not already
      const signatureArray = signature instanceof Uint8Array ? signature : new Uint8Array(signature);
      console.log('Signature as array:', signatureArray);

      // Validate signature length (Ed25519 signatures are 64 bytes)
      if (signatureArray.length !== 64) {
        throw new Error('Invalid signature length. Expected 64 bytes for Ed25519 signature.');
      }

      const encodedSignature = bs58.encode(signatureArray);
      console.log('Encoded signature:', encodedSignature);
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
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          console.log(`Profile fetch attempt ${retryCount + 1}/${maxRetries}`);
          profile = await api.getProfile();
          break; // Success, exit retry loop
        } catch (profileError) {
          console.error(`Profile fetch attempt ${retryCount + 1} failed:`, profileError);
          retryCount++;

          if (retryCount >= maxRetries) {
            throw profileError;
          }

          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      console.log('Profile fetch result:', profile);

      setUser(profile.exists ? profile : null);

      if (profile.exists) {
        toast.success(`Welcome back, @${profile.username}!`);
      } else {
        console.log('No existing profile found - user can create one');
        toast.info('Welcome! Please create your profile to get started.');
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
        toast.info('Welcome! Please create your profile to get started.');
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
    if (connected && publicKey) {
      authenticate();
    } else {
      logout();
    }
  }, [connected, publicKey, authenticate]);

  // Try to restore authentication on page load if wallet is connected
  useEffect(() => {
    const restoreAuth = async () => {
      if (connected && publicKey && !user && !loading) {
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
