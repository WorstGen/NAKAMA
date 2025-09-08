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
    if (!publicKey || !signMessage) return;
    
    setLoading(true);
    console.log('Starting authentication process...');
    
    try {
      // Use direct signature authentication
      console.log('Setting up wallet authentication...');

      const message = `Sign this message to authenticate with SolConnect: ${Date.now()}`;
      console.log('Message to sign:', message);

      const messageBytes = new TextEncoder().encode(message);
      console.log('Message bytes:', messageBytes);

      const signature = await signMessage(messageBytes);
      console.log('Raw signature:', signature);
      console.log('Signature type:', typeof signature);

      // Convert signature to Uint8Array if it's not already
      const signatureArray = signature instanceof Uint8Array ? signature : new Uint8Array(signature);
      console.log('Signature as array:', signatureArray);

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
      
      // Try to fetch user profile
      const profile = await api.getProfile();
      console.log('Profile fetch result:', profile);
      
      setUser(profile.exists ? profile : null);
      
      if (profile.exists) {
        toast.success(`Welcome back, @${profile.username}!`);
      } else {
        console.log('No existing profile found - user can create one');
      }
      
    } catch (error) {
      console.error('Authentication failed:', error);
      
      // Check if it's a profile-not-found error vs auth error
      if (error?.error === 'Profile not found' || error?.message?.includes('Profile not found')) {
        console.log('Profile not found - this is normal for new users');
        setUser(null); // User can create profile
      } else {
        toast.error('Authentication failed. Please try again.');
        setUser(null);
        setAuthToken(null);
        api.clearAuthHeaders();
      }
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
