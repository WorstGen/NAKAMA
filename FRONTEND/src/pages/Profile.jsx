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
    position: 'center', // center, top, bottom, left, right, top-left, top-right, bottom-left, bottom-right
    shape: 'circle' // circle, hexagon, octagon
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

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleShapeChange = (shape) => {
    setImageSettings({
      ...imageSettings,
      shape
    });
  };

  const handlePositionChange = (position) => {
    setImageSettings({
      ...imageSettings,
      position
    });
  };

  // Helper functions for CSS classes
  const getShapeClass = (shape) => {
    switch (shape) {
      case 'hexagon':
        return '[clip-path:polygon(50%_0%,_93.3%_25%,_93.3%_75%,_50%_100%,_6.7%_75%,_6.7%_25%)]';
      case 'octagon':
        return '[clip-path:polygon(30%_0%,_70%_0%,_100%_30%,_100%_70%,_70%_100%,_30%_100%,_0%_70%,_0%_30%)]';
      default:
        return 'rounded-full';
    }
  };

  const getPositionClass = (position) => {
    const positionMap = {
      'center': 'object-center',
      'top': 'object-top',
      'bottom': 'object-bottom',
      'left': 'object-left',
      'right': 'object-right',
      'top-left': 'object-top object-left',
      'top-right': 'object-top object-right',
      'bottom-left': 'object-bottom object-left',
      'bottom-right': 'object-bottom object-right'
    };
    return positionMap[position] || 'object-center';
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
            <div className={`w-24 h-24 bg-gradient-to-r from-purple-400 to-blue-400 flex items-center justify-center overflow-hidden ${getShapeClass(imageSettings.shape)}`}>
              {user?.profilePicture ? (
                <img
                  src={`https://nakama-production-1850.up.railway.app${user.profilePicture}`}
                  alt="Profile"
                  className={`w-full h-full ${getPositionClass(imageSettings.position)}`}
                  style={{
                    objectFit: 'cover',
                    width: '100%',
                    height: '100%'
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
            <div className="w-full max-w-md space-y-4">
              {/* Shape Selection */}
              <div>
                <label className="block text-white font-medium mb-2 text-sm">
                  Shape
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'circle', label: '○', title: 'Circle' },
                    { value: 'hexagon', label: '⬡', title: 'Hexagon' },
                    { value: 'octagon', label: '⬟', title: 'Octagon' }
                  ].map((shape) => (
                    <button
                      key={shape.value}
                      type="button"
                      onClick={() => handleShapeChange(shape.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        imageSettings.shape === shape.value
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                      title={shape.title}
                    >
                      {shape.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Position Selection */}
              <div>
                <label className="block text-white font-medium mb-2 text-sm">
                  Image Position
                </label>
                <div className="grid grid-cols-3 gap-1 max-w-32 mx-auto">
                  {[
                    { value: 'top-left', label: '↖' },
                    { value: 'top', label: '↑' },
                    { value: 'top-right', label: '↗' },
                    { value: 'left', label: '←' },
                    { value: 'center', label: '●' },
                    { value: 'right', label: '→' },
                    { value: 'bottom-left', label: '↙' },
                    { value: 'bottom', label: '↓' },
                    { value: 'bottom-right', label: '↘' }
                  ].map((pos) => (
                    <button
                      key={pos.value}
                      type="button"
                      onClick={() => handlePositionChange(pos.value)}
                      className={`w-8 h-8 rounded text-xs font-bold transition-colors ${
                        imageSettings.position === pos.value
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                      title={pos.value.replace('-', ' ')}
                    >
                      {pos.label}
                    </button>
                  ))}
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
