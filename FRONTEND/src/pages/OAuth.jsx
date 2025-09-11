import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export const OAuth = () => {
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);

  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const scope = searchParams.get('scope');
  const state = searchParams.get('state');

  const handleAuthorize = async () => {
    if (!isAuthenticated) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    if (!user) {
      toast.error('Please create a profile first');
      return;
    }

    setLoading(true);
    try {
      const result = await api.authorizeOAuth({
        clientId,
        redirectUri,
        scope
      });

      // Redirect back to client with authorization code/token
      const params = new URLSearchParams({
        token: result.token,
        state: state || ''
      });
      
      const redirectUrl = `${redirectUri}?${params.toString()}`;
      window.location.href = redirectUrl;
      
    } catch (error) {
      toast.error(error.error || 'Authorization failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = () => {
    const params = new URLSearchParams({
      error: 'access_denied',
      state: state || ''
    });
    
    const redirectUrl = `${redirectUri}?${params.toString()}`;
    window.location.href = redirectUrl;
  };

  if (!clientId || !redirectUri) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <p className="text-white text-lg">Invalid OAuth request</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-6">Authorize Application</h1>
        
        <div className="bg-white/5 rounded-lg p-4 mb-6">
          <p className="text-white/80 mb-2">
            <strong>{clientId}</strong> wants to access your SolConnect profile
          </p>
          
          {scope && (
            <div className="text-left">
              <p className="text-white/60 text-sm mb-2">Requested permissions:</p>
              <ul className="text-white/60 text-sm space-y-1">
                {scope.split(' ').map(permission => (
                  <li key={permission}>• {permission}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {user && (
          <div className="bg-white/5 rounded-lg p-4 mb-6">
            <p className="text-white/80 text-sm mb-2">Signing in as:</p>
            <div className="flex items-center justify-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-white font-medium">@{user.username}</p>
                <p className="text-white/60 text-sm">{user.bio}</p>
              </div>
            </div>
          </div>
        )}

        {!isAuthenticated ? (
          <div>
            <p className="text-white/60 mb-4">
              Please connect your wallet to continue.
            </p>
          </div>
        ) : !user ? (
          <div>
            <p className="text-white/60 mb-4">
              Please create a profile to continue.
            </p>
            <button
              onClick={() => window.location.href = '/profile'}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Set up Profile
            </button>
          </div>
        ) : (
          <div className="flex space-x-4">
            <button
              onClick={handleDeny}
              disabled={loading}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Deny
            </button>
            <button
              onClick={handleAuthorize}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? 'Authorizing...' : 'Authorize'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
