import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { api } from '../services/api';
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
      // Try the challenge-response method first (preferred by backend)
      try {
        console.log('Attempting challenge-response authentication...');
        const authResult = await api.authenticateWallet(publicKey, signMessage);
        setAuthToken(authResult.token);
        console.log('Challenge-response auth successful');
      } catch (challengeError) {
        console.log('Challenge-response failed, trying fallback method...');
        
        // Fallback to your original method
        const message = `Sign this message to authenticate with SolConnect: ${Date.now()}`;
        const messageBytes = new TextEncoder().encode(message);
        const signature = await signMessage(messageBytes);
        
        // Set auth headers using your current format
        api.setAuthHeaders({
          'X-Signature': Array.from(signature).join(','),
          'X-Message': message,
          'X-Public-Key': publicKey.toString(),
          'Authorization': `Wallet ${publicKey.toString()}`
        });
        
        console.log('Fallback auth headers set');
      }
      
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
