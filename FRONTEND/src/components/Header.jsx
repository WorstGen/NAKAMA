import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { usePhantomMultiChain } from '../contexts/PhantomMultiChainContext';
import { useMetaMask } from '../contexts/MetaMaskContext';
import { useAuth } from '../contexts/AuthContext';
import GradientProfileImage from './GradientProfileImage';
import Logo from './Logo';
import toast from 'react-hot-toast';

export const Header = () => {
  const location = useLocation();
  const { 
    disconnectAllChains,
    activeChain,
    connectedChains,
    phantomChains,
    switchToChain
  } = usePhantomMultiChain();
  const { connect: connectMetaMask, isConnecting: metaMaskConnecting } = useMetaMask();
  const { user, authenticate } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [portalRoot, setPortalRoot] = useState(null);

  const isActive = (path) => location.pathname === path;

  const handleConnectWallet = () => {
    setShowWalletSelector(true);
  };

  const handleConnectPhantom = async () => {
    try {
      setConnecting(true);
      setShowWalletSelector(false);
      
      if (window.solana && window.solana.isPhantom) {
        const response = await window.solana.connect();
        console.log('Connected to Solana:', response.publicKey.toString());
        toast.success('Connected to Solana!');
        
        // Trigger authentication
        try {
          await authenticate();
          toast.success('Authentication successful!');
        } catch (authError) {
          console.error('Authentication failed:', authError);
          toast.error('Authentication failed. Please try again.');
        }
      } else {
        throw new Error('Phantom wallet not found');
      }
    } catch (error) {
      console.error('Connection failed:', error);
      toast.error(`Failed to connect: ${error.message}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleConnectMetaMask = async () => {
    try {
      setConnecting(true);
      setShowWalletSelector(false);
      
      const success = await connectMetaMask();
      if (success) {
        toast.success('MetaMask connected successfully!');
      }
    } catch (error) {
      console.error('MetaMask connection error:', error);
      toast.error(`Failed to connect MetaMask: ${error.message}`);
    } finally {
      setConnecting(false);
    }
  };

  // Create portal root on mount
  useEffect(() => {
    let portalDiv = document.getElementById('dropdown-portal');
    if (!portalDiv) {
      portalDiv = document.createElement('div');
      portalDiv.id = 'dropdown-portal';
      portalDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        z-index: 2147483647;
        pointer-events: none;
      `;
      document.body.appendChild(portalDiv);
    }
    setPortalRoot(portalDiv);

    return () => {
      if (portalDiv && portalDiv.parentNode) {
        portalDiv.parentNode.removeChild(portalDiv);
      }
    };
  }, []);


  const headerStyle = {
    backgroundColor: '#000000',
    borderBottom: '1px solid #374151',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease'
  };

  return (
    <header style={headerStyle}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <Logo 
              size="medium" 
              className="h-12 w-auto"
              style={{ maxWidth: '180px', minWidth: '120px' }}
            />
          </Link>

          {/* Profile/Connect Button */}
          <div className="flex items-center space-x-2">
            {user ? (
              // User profile button when connected
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex items-center space-x-3 backdrop-blur-sm rounded-lg px-3 py-2 border transition-all duration-200 hover:bg-gray-800/50"
                style={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151'
                }}
                aria-label="Toggle navigation menu"
              >
                {/* Profile Picture with Gradient Chain Outline */}
                <GradientProfileImage
                  src={user?.profilePicture || null}
                  username={user?.username || 'User'}
                  size="sm"
                  activeChain={activeChain}
                />

                {/* User Info */}
                <div className="text-sm hidden sm:block">
                  <div className="font-medium text-white truncate max-w-24">
                    @{user?.username || 'User'}
                  </div>
                  <div className="text-xs text-gray-400 truncate max-w-24">
                    {activeChain ? phantomChains[activeChain]?.name || 'Unknown' : 'Solana'}
                  </div>
                </div>

                {/* Hamburger Icon */}
                <div className="flex flex-col space-y-0.5">
                  <div className="w-4 h-0.5 bg-orange-400 rounded-full"></div>
                  <div className="w-4 h-0.5 bg-orange-400 rounded-full"></div>
                  <div className="w-4 h-0.5 bg-orange-400 rounded-full"></div>
                </div>
              </button>
            ) : (
              // Compact Connect Button
              <button
                onClick={handleConnectWallet}
                disabled={connecting}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {connecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Connecting...
                  </>
                ) : (
                  'Connect Wallet'
                )}
              </button>
            )}
          </div>

          {/* Wallet Selector Modal */}
          {showWalletSelector && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-[9999]" style={{ paddingTop: '100px', paddingBottom: '50px' }}>
              <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 max-h-[70vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-white">Choose Wallet</h3>
                  <button
                    onClick={() => setShowWalletSelector(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-3">
                  {/* Phantom Wallet Option */}
                  <button
                    onClick={handleConnectPhantom}
                    disabled={connecting}
                    className="w-full flex items-center justify-center space-x-3 p-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded-lg transition-colors"
                  >
                    {connecting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                          <span className="text-purple-600 font-bold text-sm">P</span>
                        </div>
                        <span className="font-medium">Connect with Phantom</span>
                      </>
                    )}
                  </button>

                  {/* MetaMask Wallet Option */}
                  <button
                    onClick={handleConnectMetaMask}
                    disabled={connecting || metaMaskConnecting}
                    className="w-full flex items-center justify-center space-x-3 p-4 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 text-white rounded-lg transition-colors"
                  >
                    {metaMaskConnecting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                          <span className="text-orange-600 font-bold text-sm">M</span>
                        </div>
                        <span className="font-medium">Connect with MetaMask</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Universal Navigation Menu - Portal Rendered */}
          {portalRoot && user && mobileMenuOpen && createPortal(
            <div
              className="fixed inset-0"
              style={{
                zIndex: 2147483647,
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none'
              }}
            >
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  zIndex: 2147483647,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  pointerEvents: 'auto'
                }}
              />

              {/* Navigation Menu Panel */}
              <div
                className="absolute w-80 bg-gray-900/98 backdrop-blur-xl border border-gray-700/70 rounded-2xl shadow-2xl"
                style={{
                  zIndex: 2147483648,
                  position: 'absolute',
                  right: '16px',
                  top: '80px',
                  pointerEvents: 'auto',
                  isolation: 'isolate',
                  transform: 'translateZ(0)',
                  willChange: 'transform'
                }}
              >
                {/* Navigation Links */}
                <nav className="p-3">
                  <div className="space-y-1">
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive('/dashboard')
                          ? 'bg-orange-500 text-white shadow-lg'
                          : 'text-gray-200 hover:bg-gray-800/70 hover:text-white'
                      }`}
                    >
                      📊 Dashboard
                    </Link>
                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive('/profile')
                          ? 'bg-orange-500 text-white shadow-lg'
                          : 'text-gray-200 hover:bg-gray-800/70 hover:text-white'
                      }`}
                    >
                      👤 Profile
                    </Link>
                    <Link
                      to="/contacts"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive('/contacts')
                          ? 'bg-orange-500 text-white shadow-lg'
                          : 'text-gray-200 hover:bg-gray-800/70 hover:text-white'
                      }`}
                    >
                      📞 Contacts
                    </Link>
                    <Link
                      to="/send"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive('/send')
                          ? 'bg-orange-500 text-white shadow-lg'
                          : 'text-gray-200 hover:bg-gray-800/70 hover:text-white'
                      }`}
                    >
                      💸 Send
                    </Link>
                    <Link
                      to="/transactions"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive('/transactions')
                          ? 'bg-orange-500 text-white shadow-lg'
                          : 'text-gray-200 hover:bg-gray-800/70 hover:text-white'
                      }`}
                    >
                      📋 History
                    </Link>
                  </div>

                  {/* Chain Selection */}
                  <div className="mt-6 pt-3 border-t border-gray-700/50">
                    <div className="px-4 py-2">
                      <div className="text-xs font-medium text-gray-400 mb-3">Active Chain</div>
                      <div className="space-y-2">
                        {Object.entries(connectedChains).length > 0 ? Object.entries(connectedChains).map(([chainId, chain]) => {
                          const chainConfig = phantomChains[chainId];
                          const isActive = activeChain === chainId;
                          
                          return (
                            <button
                              key={chainId}
                              onClick={() => {
                                switchToChain(chainId);
                                setMobileMenuOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                                isActive ? 'bg-gray-800/70' : 'hover:bg-gray-800/50'
                              }`}
                            >
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: chainConfig?.color || '#666' }}
                              ></div>
                              <div className="flex-1 text-left">
                                <div className="text-sm font-medium text-white">
                                  {chainConfig?.name || 'Unknown'}
                                </div>
                                <div className="text-xs text-gray-400 font-mono">
                                  {chain.address?.slice(0, 6)}...{chain.address?.slice(-4)}
                                </div>
                              </div>
                              {isActive && (
                                <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                              )}
                            </button>
                          );
                        }) : (
                          <div className="text-sm text-gray-500 px-3 py-2">
                            No chains connected
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Disconnect Button */}
                  <div className="mt-6 pt-3 border-t border-gray-700/50">
                    <button
                      onClick={async () => {
                        try {
                          setMobileMenuOpen(false);
                          console.log('🔌 Disconnecting from all chains...');
                          await disconnectAllChains();
                          console.log('✅ Disconnection completed');
                        } catch (error) {
                          console.error('❌ Disconnection failed:', error);
                          alert(`Disconnection failed: ${error.message}`);
                        }
                      }}
                      className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg text-sm"
                    >
                      🚪 Disconnect Wallet
                    </button>
                  </div>
                </nav>
              </div>
            </div>,
            portalRoot
          )}


        </div>
      </div>
    </header>
  );
};
