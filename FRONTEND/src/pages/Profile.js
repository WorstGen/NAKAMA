import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { CameraIcon } from '@heroicons/react/24/outline';

export const Profile = () => {
  const { user, setUser, isAuthenticated } = useAuth();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    bio: user?.bio || '',
    ethAddress: user?.ethAddress || ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await api.updateProfile(formData);
      setUser(result.user);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(error.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profilePicture', file);

    try {
      const result = await api.uploadProfilePicture(formData);
      setUser({ ...user, profilePicture: result.profilePicture });
      toast.success('Profile picture updated!');
    } catch (error) {
      toast.error('Failed to upload profile picture');
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
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
              {user?.profilePicture ? (
                <img
                  src={`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}${user.profilePicture}`}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
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
                accept="image/*"
                onChange={handleProfilePictureUpload}
                className="hidden"
              />
            </label>
          </div>
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
