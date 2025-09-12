import React, { useState, useEffect } from 'react';
import { useAuth, useTheme } from '../contexts/AuthContext';
import { useWalletConnect } from '../contexts/WalletConnectContext';
import { usePhantomMultiChain } from '../contexts/PhantomMultiChainContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import ProfileImage from '../components/ProfileImage';
import { CameraIcon, PlusIcon } from '@heroicons/react/24/outline';

export const Profile = () => {
  const { user, setUser, isAuthenticated, addEVM } = useAuth();
  const {
    isConnected: walletConnectConnected,
    address: walletConnectAddress,
    connect: connectWalletConnect
  } = useWalletConnect();
  const { connectedChains } = usePhantomMultiChain();
  const { classes } = useTheme();
  const currentColors = classes; // Always dark colors now
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [registeringEVM, setRegisteringEVM] = useState(false);
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
    } else if (isAuthenticated) {
      // New user creating profile for the first time
      setFormData({
        username: '',
        bio: ''
      });
    }
  }, [user, isAuthenticated]);

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
    } else if (isAuthenticated && !user) {
      // New user - use default settings
      setImageSettings({
        position: { x: 50, y: 50 },
        zoom: 100
      });
    }
  }, [user?.username, isAuthenticated, user]);

  // Save image settings to localStorage whenever they change
  useEffect(() => {
    if (user?.username && imageSettings) {
      localStorage.setItem(`profileImageSettings_${user.username}`, JSON.stringify(imageSettings));
    } else if (isAuthenticated && !user && imageSettings) {
      // Temporary storage for new users before they have a username
      localStorage.setItem('profileImageSettings_temp', JSON.stringify(imageSettings));
    }
  }, [imageSettings, user?.username, isAuthenticated, user]);

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
    } else if (isAuthenticated && !user) {
      // Temporary storage for new users
      localStorage.setItem('profileImageSettings_temp', JSON.stringify(defaultSettings));
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

      // Transfer temporary image settings to permanent storage
      if (!user && result.user?.username) {
        const tempSettings = localStorage.getItem('profileImageSettings_temp');
        if (tempSettings) {
          localStorage.setItem(`profileImageSettings_${result.user.username}`, tempSettings);
          localStorage.removeItem('profileImageSettings_temp');
        }
      }

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

  const handleRegisterEVM = async () => {
    setRegisteringEVM(true);
    
    try {
      // Check if user already has an EVM address
      const hasEVMAddress = user?.wallets?.ethereum?.address || 
                           user?.wallets?.polygon?.address || 
                           user?.wallets?.base?.address || 
                           user?.wallets?.arbitrum?.address || 
                           user?.wallets?.optimism?.address;
      
      // Check if user already has an EVM address
      if (hasEVMAddress) {
        throw new Error('You already have an EVM address registered. No need to add another one.');
      }
      
      // Only auto-connect WalletConnect if user has no EVM address
      if (!hasEVMAddress && !walletConnectConnected) {
        // Check if WalletConnect is available before attempting connection
        if (!window.ethereum) {
          throw new Error('No wallet detected. Please install a compatible wallet to add an EVM address.');
        }
        
        toast.loading('Connecting to wallet...');
        
        // Try connecting with a retry mechanism
        let connected = false;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (!connected && attempts < maxAttempts) {
          attempts++;
          console.log(`WalletConnect connection attempt ${attempts}/${maxAttempts}`);
          
          try {
            connected = await connectWalletConnect();
            if (connected) {
              console.log('WalletConnect connected successfully on attempt', attempts);
              break;
            }
          } catch (error) {
            console.log(`WalletConnect connection attempt ${attempts} failed:`, error);
            if (attempts < maxAttempts) {
              // Wait a bit before retrying
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        
        if (!connected) {
          throw new Error('Failed to connect to wallet after multiple attempts. Please make sure your wallet is unlocked and try again.');
        }
      }
      
      toast.loading('Adding EVM address to your profile...');
      
      // Use the new addEVM function from AuthContext
      // For new users, user._id might not be available yet, so we need to check
      if (!user?._id) {
        console.log('User ID not available yet, refreshing user data...');
        // The user object should be updated after profile creation
        // Let's try to get the user data again
        const currentUser = await api.getProfile();
        if (currentUser.exists && currentUser._id) {
          await addEVM(currentUser._id);
          return;
        } else {
          throw new Error('Unable to get user ID for EVM registration');
        }
      }

      await addEVM(user._id);
      
      console.log('EVM address successfully added!');
      toast.success('EVM address added successfully!');
      
    } catch (error) {
      console.error('EVM registration error:', error);
      toast.error(error.message || 'Failed to add EVM address');
    } finally {
      setRegisteringEVM(false);
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


          {/* Wallet Addresses Display */}
          <div className="space-y-4">
            <h3 className="text-white dark:text-white font-medium">
              {user ? 'Registered Wallet Addresses' : 'Current Wallet Connection'}
            </h3>
            <div className="space-y-3">
              {/* Show current connected wallets */}
              {(() => {
                const walletsToShow = [];

                // Add Solana from connectedChains if available
                if (connectedChains.solana?.address) {
                  walletsToShow.push({
                    address: connectedChains.solana.address,
                    name: 'Solana (SOL)',
                    color: '#9945FF',
                    type: 'solana'
                  });
                }

                // Add WalletConnect if connected
                if (walletConnectConnected && walletConnectAddress) {
                  walletsToShow.push({
                    address: walletConnectAddress,
                    name: 'WalletConnect',
                    color: '#3b99fc',
                    type: 'walletconnect'
                  });
                }

                // Add other EVM chains from connectedChains
                Object.entries(connectedChains).forEach(([chainId, chain]) => {
                  if (chainId !== 'solana' && chain.address) {
                    walletsToShow.push({
                      address: chain.address,
                      name: `${chain.chainName || chainId} (${chainId.toUpperCase()})`,
                      color: '#627EEA',
                      type: 'evm'
                    });
                  }
                });

                return walletsToShow.map((wallet, index) => (
                  <div key={`${wallet.type}-${index}`} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: wallet.color }}
                      ></div>
                      <p className="text-white dark:text-white/60 text-sm font-medium">
                        {wallet.name}
                      </p>
                    </div>
                    <p className="text-white dark:text-white font-mono text-sm break-all">
                      {wallet.address}
                    </p>
                  </div>
                ));
              })()}

              {/* Show registered Solana address if user exists */}
              {user?.wallets?.solana?.address && (
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
                    {user.wallets.solana.address}
                  </p>
                </div>
              )}

              {/* Show registered EVM address if user exists and has one */}
              {user && (() => {
                const evmAddress = user?.wallets?.ethereum?.address ||
                                 user?.wallets?.polygon?.address ||
                                 user?.wallets?.arbitrum?.address ||
                                 user?.wallets?.optimism?.address ||
                                 user?.wallets?.base?.address;

                if (evmAddress) {
                  return (
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: '#627EEA' }}
                        ></div>
                        <p className="text-white dark:text-white/60 text-sm font-medium">
                          EVM Multi-Chain (ETH, Base, Polygon, etc.)
                        </p>
                      </div>
                      <p className="text-white dark:text-white font-mono text-sm break-all">
                        {evmAddress}
                      </p>
                      <p className="text-white/60 text-xs mt-1">
                        This address works across all EVM chains (Ethereum, Base, Polygon, Arbitrum, Optimism) - they are interchangeable
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              {/* EVM Registration Button (show only if no EVM address is registered) */}
              {(() => {
                const userHasEVMAddress = user?.wallets?.ethereum?.address || 
                                       user?.wallets?.polygon?.address || 
                                       user?.wallets?.arbitrum?.address || 
                                       user?.wallets?.optimism?.address || 
                                       user?.wallets?.base?.address;
                
                // Show button if user doesn't have EVM address registered in their profile
                if (!userHasEVMAddress) {
                  return (
                    <div className="bg-white/5 rounded-lg p-4 border-2 border-dashed border-white/20">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                          <p className="text-white/60 text-sm font-medium">
                            EVM Multi-Chain Support
                          </p>
                        </div>
                        <p className="text-white/60 text-xs mb-3">
                          Register your EVM wallet to receive ETH, MATIC, and other EVM tokens
                        </p>
                        <button
                          onClick={handleRegisterEVM}
                          disabled={registeringEVM}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <PlusIcon className="w-4 h-4" />
                          {registeringEVM ? 'Adding EVM Address...' : 'Add EVM Address'}
                        </button>
                        <p className="text-white/40 text-xs mt-2">
                          This will add your EVM address to your existing profile
                        </p>
                      </div>
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
