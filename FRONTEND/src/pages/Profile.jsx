import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { CameraIcon } from '@heroicons/react/24/outline';

export const Profile = () => {
  const { user, setUser, isAuthenticated } = useAuth();
  const { publicKey } = useWallet();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    ethAddress: ''
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
        bio: user.bio || '',
        ethAddress: user.ethAddress || ''
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

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPEG, PNG, GIF, or WebP images only.');
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File too large. Please upload images smaller than 5MB.');
      return;
    }

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
        <p className="text-white text-lg">Please connect your wallet first.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          {user ? 'Update Profile' : 'Create Profile'}
        </h1>

        {/* Profile Picture */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="w-24 h-24 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center overflow-hidden">
              {user?.profilePicture ? (
                <img
                  src={`https://nakama-production-1850.up.railway.app${user.profilePicture}`}
                  alt="Profile"
                  className="w-full h-full rounded-full"
                  style={{
                    objectFit: 'cover',
                    ...getImageStyle()
                  }}
                />
              ) : (
                <span className="text-white font-bold text-2xl">
                  {formData.username.charAt(0).toUpperCase() || '?'}
                </span>
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 cursor-pointer shadow-lg">
              <CameraIcon className="w-4 h-4 text-gray-600" />
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleProfilePictureUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Image Customization Controls */}
          {user?.profilePicture && (
            <div className="w-full max-w-md space-y-6">
              {/* Zoom Control */}
              <div>
                <label className="block text-white font-medium mb-3 text-sm">
                  Zoom: {imageSettings.zoom}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="200"
                  value={imageSettings.zoom}
                  onChange={(e) => handleZoomChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${(imageSettings.zoom - 50) / 1.5}%, rgba(255,255,255,0.2) ${(imageSettings.zoom - 50) / 1.5}%, rgba(255,255,255,0.2) 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-white/60 mt-1">
                  <span>50%</span>
                  <span>100%</span>
                  <span>200%</span>
                </div>
              </div>

              {/* Position Control */}
              <div>
                <label className="block text-white font-medium mb-3 text-sm">
                  Position
                </label>
                <div className="relative w-32 h-32 mx-auto bg-white/10 rounded-lg overflow-hidden">
                  {/* Position Indicator Grid */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                    {Array.from({ length: 9 }).map((_, index) => {
                      const row = Math.floor(index / 3);
                      const col = index % 3;
                      const x = (col * 33.33) + 16.665;
                      const y = (row * 33.33) + 16.665;

                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handlePositionChange(x, y)}
                          className="w-full h-full flex items-center justify-center hover:bg-white/20 transition-colors"
                        >
                          {(Math.abs(imageSettings.position.x - x) < 20 && Math.abs(imageSettings.position.y - y) < 20) && (
                            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Current Position Indicator */}
                  <div
                    className="absolute w-3 h-3 bg-purple-600 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
                    style={{
                      left: `${imageSettings.position.x}%`,
                      top: `${imageSettings.position.y}%`
                    }}
                  />
                </div>

                {/* Manual Position Controls */}
                <div className="flex justify-center gap-4 mt-3">
                  <div className="flex flex-col items-center">
                    <label className="text-xs text-white/60 mb-1">X</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={imageSettings.position.x}
                      onChange={(e) => handlePositionChange(parseInt(e.target.value), imageSettings.position.y)}
                      className="w-16 h-1 bg-white/20 rounded appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${imageSettings.position.x}%, rgba(255,255,255,0.2) ${imageSettings.position.x}%, rgba(255,255,255,0.2) 100%)`
                      }}
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <label className="text-xs text-white/60 mb-1">Y</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={imageSettings.position.y}
                      onChange={(e) => handlePositionChange(imageSettings.position.x, parseInt(e.target.value))}
                      className="w-16 h-1 bg-white/20 rounded appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${imageSettings.position.y}%, rgba(255,255,255,0.2) ${imageSettings.position.y}%, rgba(255,255,255,0.2) 100%)`
                      }}
                    />
                  </div>
                </div>

                {/* Reset Button */}
                <div className="flex justify-center mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={resetImageSettings}
                    className="px-4 py-2 bg-white/10 text-white/80 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
                    title="Reset to default settings"
                  >
                    🔄 Reset to Default
                  </button>
                  <p className="text-white/50 text-xs text-center">
                    💾 Settings saved automatically
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username */}
          <div>
            <label className="block text-white font-medium mb-2">
              Username *
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Enter a unique username"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-400"
              required
              pattern="[a-zA-Z0-9_]{3,20}"
              title="Username must be 3-20 characters, letters, numbers, and underscores only"
            />
            <p className="text-white/60 text-sm mt-1">
              This will be your permanent username - choose wisely!
            </p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-white font-medium mb-2">
              Bio
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="Tell us about yourself..."
              rows={4}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-400 resize-none"
              maxLength={500}
            />
          </div>

          {/* Ethereum Address */}
          <div>
            <label className="block text-white font-medium mb-2">
              Ethereum Address (Optional)
            </label>
            <input
              type="text"
              name="ethAddress"
              value={formData.ethAddress}
              onChange={handleInputChange}
              placeholder="0x..."
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-400"
              pattern="0x[a-fA-F0-9]{40}"
              title="Enter a valid Ethereum address"
            />
          </div>

          {/* Wallet Addresses Display */}
          <div className="space-y-4">
            <h3 className="text-white font-medium">Connected Addresses</h3>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-white/60 text-sm mb-1">Solana Address</p>
              <p className="text-white font-mono text-sm break-all">
                {publicKey?.toString()}
              </p>
            </div>
            {formData.ethAddress && (
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-white/60 text-sm mb-1">Ethereum Address</p>
                <p className="text-white font-mono text-sm break-all">
                  {formData.ethAddress}
                </p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : user ? 'Update Profile' : 'Create Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};
