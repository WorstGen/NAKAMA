import React, { useState, useEffect } from 'react';
import { useAuth, useTheme } from '../contexts/AuthContext';
import { usePhantomMultiChain } from '../contexts/PhantomMultiChainContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import ProfileImage from '../components/ProfileImage';
import { CameraIcon } from '@heroicons/react/24/outline';

export const Profile = () => {
  const { user, setUser, isAuthenticated } = useAuth();
  const { connectedChains, phantomChains, switchToChain, activeChain } = usePhantomMultiChain();
  const { classes } = useTheme();
  const currentColors = classes; // Always dark colors now
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    bio: ''
  });

  const [imageSettings, setImageSettings] = useState({
    position: { x: 50, y: 50 }, // percentage from 0-100
    zoom: 100 // zoom level from 50-200
  });

  // Load user data when component mounts or user changes
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        bio: user.bio || ''
      });
    }
  }, [user]);

  // Load saved image settings from localStorage
  useEffect(() => {
    if (user?.username) {
      const savedSettings = localStorage.getItem(`profileImageSettings_${user.username}`);
      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings);
          setImageSettings(parsedSettings);
        } catch (error) {
          console.error('Error loading saved image settings:', error);
        }
      }
    }
  }, [user?.username]);

  // Save image settings to localStorage whenever they change
  useEffect(() => {
    if (user?.username && imageSettings) {
      localStorage.setItem(`profileImageSettings_${user.username}`, JSON.stringify(imageSettings));
    }
  }, [imageSettings, user?.username]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleZoomChange = (zoom) => {
    setImageSettings({
      ...imageSettings,
      zoom: Math.max(50, Math.min(200, zoom)) // Clamp between 50-200
    });
  };

  const handlePositionChange = (x, y) => {
    setImageSettings({
      ...imageSettings,
      position: {
        x: Math.max(0, Math.min(100, x)), // Clamp between 0-100
        y: Math.max(0, Math.min(100, y))
      }
    });
  };

  const resetImageSettings = () => {
    const defaultSettings = {
      position: { x: 50, y: 50 },
      zoom: 100
    };
    setImageSettings(defaultSettings);
    if (user?.username) {
      localStorage.setItem(`profileImageSettings_${user.username}`, JSON.stringify(defaultSettings));
    }
    toast.success('Image settings reset to default');
  };

  // Utility function to get saved image settings (can be used by other components)
  const getSavedImageSettings = (username) => {
    if (!username) return { position: { x: 50, y: 50 }, zoom: 100 };
    try {
      const saved = localStorage.getItem(`profileImageSettings_${username}`);
      return saved ? JSON.parse(saved) : { position: { x: 50, y: 50 }, zoom: 100 };
    } catch {
      return { position: { x: 50, y: 50 }, zoom: 100 };
    }
  };

  // Export the utility function for use in other components
  window.getSavedImageSettings = getSavedImageSettings;

  // Helper function for image styles
  const getImageStyle = () => {
    const { position, zoom } = imageSettings;
    return {
      objectPosition: `${position.x}% ${position.y}%`,
      transform: `scale(${zoom / 100})`,
      transformOrigin: 'center center',
      transition: 'transform 0.2s ease, object-position 0.2s ease'
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await api.updateProfile(formData);
      setUser(result.user);
      toast.success(user ? 'Profile updated successfully!' : 'Profile created successfully!');

      // Redirect to dashboard after successful profile creation/update
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      toast.error(error.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type - more lenient
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a valid image file.');
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File too large. Please upload images smaller than 5MB.');
      return;
    }

    // Skip complex image validation - just rely on file type and size checks
    // The browser and backend will handle any actual corruption issues

    const formData = new FormData();
    formData.append('profilePicture', file);

    try {
      toast.loading('Uploading profile picture...');
      const result = await api.uploadProfilePicture(formData);
      setUser({ ...user, profilePicture: result.profilePicture });
      toast.dismiss();
      toast.success('Profile picture updated successfully!');
    } catch (error) {
      toast.dismiss();
      const errorMessage = error?.error || error?.message || 'Failed to upload profile picture';
      toast.error(errorMessage);
      console.error('Profile picture upload error:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-white dark:text-white text-lg">Please connect your wallet first.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto transition-all duration-500 text-white">
      <div className={`${currentColors.card} backdrop-blur-md rounded-2xl p-8 shadow-2xl ${currentColors.border} border-2`}>
        <h1 className="text-2xl font-semibold text-white mb-6 text-center">
          {user ? 'Update Profile' : 'Create Profile'}
        </h1>

        {/* Profile Picture */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <ProfileImage
              src={user?.profilePicture || null}
              username={formData.username}
              size="xl"
              className="shadow-xl"
              style={{
                objectFit: 'cover',
                ...getImageStyle()
              }}
            />
            <label className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 rounded-full p-2 cursor-pointer shadow-lg transition-colors">
              <CameraIcon className="w-4 h-4 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={handleProfilePictureUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Compact Image Controls */}
          {user?.profilePicture && (
            <div className="w-full max-w-lg">
              <div className="grid grid-cols-3 gap-4 text-xs">
                {/* Zoom Control */}
                <div>
                  <label className="block text-white/60 mb-1">Zoom {imageSettings.zoom}%</label>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={imageSettings.zoom}
                    onChange={(e) => handleZoomChange(parseInt(e.target.value))}
                    className="w-full h-1 bg-white/20 rounded appearance-none cursor-pointer"
                  />
                </div>

                {/* Horizontal Position */}
                <div>
                  <label className="block text-white/60 mb-1">Horizontal</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={imageSettings.position.x}
                    onChange={(e) => handlePositionChange(parseInt(e.target.value), imageSettings.position.y)}
                    className="w-full h-1 bg-white/20 rounded appearance-none cursor-pointer"
                  />
                </div>

                {/* Vertical Position */}
                <div>
                  <label className="block text-white/60 mb-1">Vertical</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={imageSettings.position.y}
                    onChange={(e) => handlePositionChange(imageSettings.position.x, parseInt(e.target.value))}
                    className="w-full h-1 bg-white/20 rounded appearance-none cursor-pointer"
                  />
                </div>
              </div>
              
              <button
                type="button"
                onClick={resetImageSettings}
                className="mt-2 px-3 py-1 bg-white/10 text-white/60 hover:bg-white/20 rounded text-xs transition-colors"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username */}
          <div>
            <label className="block text-white/90 font-medium mb-2 text-sm">
              Username *
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Enter a unique username"
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
              required
              pattern="[a-zA-Z0-9_]{3,20}"
              title="Username must be 3-20 characters, letters, numbers, and underscores only"
            />
            <p className="text-white/60 text-xs mt-1">
              This will be your permanent username - choose wisely!
            </p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-white dark:text-white font-medium mb-2">
              Bio
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="Tell us about yourself..."
              rows={4}
              className="w-full px-4 py-3 bg-gray-700/50 dark:bg-gray-700/50 border-gray-600 dark:border-gray-600 border rounded-lg text-white dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:border-orange-400 transition-colors resize-none"
              maxLength={500}
            />
          </div>

          {/* Ethereum Address */}
          <div>
          </div>

          {/* Chain Switching */}
          <div className="space-y-4">
            <h3 className="text-white dark:text-white font-medium">Switch Active Chain</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(phantomChains).map(([chainId, chainConfig]) => {
                const isConnected = connectedChains[chainId]?.isConnected;
                const isActive = activeChain === chainId;
                
                return (
                  <button
                    key={chainId}
                    onClick={() => switchToChain(chainId)}
                    disabled={!isConnected}
                    className={`p-3 rounded-lg border transition-all ${
                      isActive 
                        ? 'border-orange-400 bg-orange-400/10' 
                        : isConnected 
                          ? 'border-gray-600 hover:border-orange-400/50 bg-white/5' 
                          : 'border-gray-700 bg-gray-800/50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: chainConfig.color }}
                      ></div>
                      <span className="text-white text-sm font-medium">
                        {chainConfig.name}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {isConnected ? 'Connected' : 'Not Connected'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Wallet Addresses Display */}
          <div className="space-y-4">
            <h3 className="text-white dark:text-white font-medium">Registered Wallet Addresses</h3>
            <div className="space-y-3">
              {/* Solana Address */}
              {connectedChains.solana?.address && (
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: '#9945FF' }}
                    ></div>
                    <p className="text-white dark:text-white/60 text-sm font-medium">
                      Solana (SOL)
                    </p>
                  </div>
                  <p className="text-white dark:text-white font-mono text-sm break-all">
                    {connectedChains.solana.address}
                  </p>
                </div>
              )}

              {/* EVM Address (if any EVM chain is connected) */}
              {(() => {
                const evmChains = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'];
                const connectedEVMChain = evmChains.find(chainId => connectedChains[chainId]?.address);
                
                if (connectedEVMChain) {
                  const chainConfig = phantomChains[connectedEVMChain];
                  return (
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: chainConfig?.color || '#627EEA' }}
                        ></div>
                        <p className="text-white dark:text-white/60 text-sm font-medium">
                          EVM Multi-Chain (ETH, Base, Polygon, etc.)
                        </p>
                      </div>
                      <p className="text-white dark:text-white font-mono text-sm break-all">
                        {connectedChains[connectedEVMChain].address}
                      </p>
                      <p className="text-white/60 text-xs mt-1">
                        This address works across all EVM chains (Ethereum, Base, Polygon, Arbitrum, Optimism)
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white dark:text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : user ? 'Update Profile' : 'Create Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};
