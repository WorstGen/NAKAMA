import React, { useState, useEffect } from 'react';
import { useAuth, useTheme } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import ProfileImage from '../components/ProfileImage';
import { CameraIcon } from '@heroicons/react/24/outline';

export const Profile = () => {
  const { user, setUser, isAuthenticated } = useAuth();
  const { publicKey } = useWallet();
  const { classes } = useTheme();
  const currentColors = classes; // Always dark colors now
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

    // Validate image dimensions and integrity
    try {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      await new Promise((resolve, reject) => {
        img.onload = () => {
          // Check if image is too small or too large
          if (img.width < 50 || img.height < 50) {
            reject(new Error('Image too small. Please upload an image at least 50x50 pixels.'));
            return;
          }
          
          if (img.width > 4000 || img.height > 4000) {
            reject(new Error('Image too large. Please upload an image smaller than 4000x4000 pixels.'));
            return;
          }
          
          // Test if image can be drawn (integrity check)
          try {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, 1, 1);
            if (!imageData.data || imageData.data.length === 0) {
              reject(new Error('Invalid image file. The image appears to be corrupted.'));
              return;
            }
            resolve();
          } catch (drawError) {
            reject(new Error('Invalid image file. The image appears to be corrupted.'));
          }
        };
        
        img.onerror = () => {
          reject(new Error('Invalid image file. Please try a different image.'));
        };
        
        img.src = URL.createObjectURL(file);
      });
      
      // Clean up object URL
      URL.revokeObjectURL(img.src);
    } catch (validationError) {
      toast.error(validationError.message);
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
        <p className="text-white dark:text-white text-lg">Please connect your wallet first.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto transition-all duration-500 text-white">
      <div className={`${currentColors.card} backdrop-blur-md rounded-2xl p-8 shadow-2xl ${currentColors.border} border-2`}>
        <h1 className={`text-3xl font-bold text-white dark:text-white mb-8 text-center drop-shadow-lg`}>
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
            <label className="block text-white dark:text-white font-medium mb-2">
              Username *
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Enter a unique username"
              className="w-full px-4 py-3 bg-gray-700/50 dark:bg-gray-700/50 border-gray-600 dark:border-gray-600 border rounded-lg text-white dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:border-orange-400 transition-colors"
              required
              pattern="[a-zA-Z0-9_]{3,20}"
              title="Username must be 3-20 characters, letters, numbers, and underscores only"
            />
            <p className="text-white dark:text-white/60 text-sm mt-1">
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
            <label className="block text-white dark:text-white font-medium mb-2">
              Ethereum Address (Optional)
            </label>
            <input
              type="text"
              name="ethAddress"
              value={formData.ethAddress}
              onChange={handleInputChange}
              placeholder="0x..."
              className="w-full px-4 py-3 bg-gray-700/50 dark:bg-gray-700/50 border-gray-600 dark:border-gray-600 border rounded-lg text-white dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:border-orange-400 transition-colors"
              pattern="0x[a-fA-F0-9]{40}"
              title="Enter a valid Ethereum address"
            />
          </div>

          {/* Wallet Addresses Display */}
          <div className="space-y-4">
            <h3 className="text-white dark:text-white font-medium">Connected Addresses</h3>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-white dark:text-white/60 text-sm mb-1">Solana Address</p>
              <p className="text-white dark:text-white font-mono text-sm break-all">
                {publicKey?.toString()}
              </p>
            </div>
            {formData.ethAddress && (
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-white dark:text-white/60 text-sm mb-1">Ethereum Address</p>
                <p className="text-white dark:text-white font-mono text-sm break-all">
                  {formData.ethAddress}
                </p>
              </div>
            )}
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
