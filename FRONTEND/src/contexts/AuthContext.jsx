import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import bs58 from 'bs58';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const { publicKey, signMessage, connected } = useWallet();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authToken, setAuthToken] = useState(null);

  const authenticate = async () => {
    if (!publicKey || !signMessage) return;

    setLoading(true);
    try {
      // Create authentication message
      const message = `Sign this message to authenticate with SolConnect: ${Date.now()}`;
      const messageBytes = new TextEncoder().encode(message);

      // Sign message
      const signature = await signMessage(messageBytes);
      const signatureBase58 = bs58.encode(signature);

      // Set auth headers
      api.setAuthHeaders({
        signature: signatureBase58,
        message: message,
        publicKey: publicKey.toString()
      });

      // Fetch user profile
      const profile = await api.getProfile();
      setUser(profile.exists ? profile : null);
      setAuthToken(signatureBase58);

      if (profile.exists) {
        toast.success(`Welcome back, @${profile.username}!`);
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      toast.error('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setAuthToken(null);
    api.clearAuthHeaders();
  };

  useEffect(() => {
    if (connected && publicKey) {
      authenticate();
    } else {
      logout();
    }
  }, [connected, publicKey]);

  const value = {
    user,
    setUser,
    loading,
    authToken,
    authenticate,
    logout,
    isAuthenticated: !!authToken && !!publicKey
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
