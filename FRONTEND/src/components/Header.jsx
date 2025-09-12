import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { usePhantomMultiChain } from '../contexts/PhantomMultiChainContext';
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
  const { user, authenticate } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [portalRoot, setPortalRoot] = useState(null);

  const isActive = (path) => location.pathname === path;

  const handleConnectWallet = async () => {
    try {
      setConnecting(true);
      
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
                <div className="flex flex-col items-center">
                  <div className="text-xs font-bold text-white text-center leading-tight">
                    @{user?.username || 'User'}
                  </div>
                  <div className="text-xs text-gray-400 text-center">
                    {activeChain ? phantomChains[activeChain]?.name || 'Solana' : 'Solana'}
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

                  {/* Quick Disconnect - Always Accessible */}
                  <div className="mt-4 pt-3 border-t border-gray-700/50">
                    <button
                      onClick={async () => {
                        try {
                          setMobileMenuOpen(false);
                          console.log('🔌 Disconnecting from all wallets...');

                          // Disconnect from Phantom (Solana + EVM)
                          await disconnectAllChains();


                          console.log('✅ All wallets disconnected');
                        } catch (error) {
                          console.error('❌ Disconnection failed:', error);
                          alert(`Disconnection failed: ${error.message}`);
                        }
                      }}
                      className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg text-sm"
                    >
                      🚪 Disconnect Wallet
                    </button>
                  </div>

                  {/* Chain Selection - Compact Horizontal */}
                  <div className="mt-4 pt-3 border-t border-gray-700/50">
                    <div className="px-4 py-2">
                      <div className="text-xs font-medium text-gray-400 mb-2">Active Chains</div>
                      <div className="overflow-x-auto">
                        <div className="flex gap-2 pb-1">
{(() => {
                          const allChains = [];

                          // Always show Solana if user is authenticated (since they connected with Solana)
                          if (user) {
                            allChains.push({
                              id: 'solana',
                              name: 'SOL',
                              fullName: 'Solana',
                              color: '#14F195',
                              address: user.wallets?.solana?.address || 'Connected',
                              isActive: activeChain === 'solana' || !activeChain
                            });
                          }


                          // Add other connected chains from PhantomMultiChain
                          Object.entries(connectedChains).forEach(([chainId, chain]) => {
                            if (chainId !== 'solana') { // Don't duplicate Solana
                              const chainConfig = phantomChains[chainId];
                              allChains.push({
                                id: chainId,
                                name: chainConfig?.name === 'Polygon' ? 'POL' :
                                      chainConfig?.name === 'Ethereum' ? 'ETH' :
                                      chainConfig?.name === 'Base' ? 'BASE' :
                                      chainConfig?.name === 'Arbitrum' ? 'ARB' :
                                      chainConfig?.name === 'Optimism' ? 'OP' :
                                      chainConfig?.name === 'BNB Smart Chain' ? 'BSC' :
                                      chainId.toUpperCase(),
                                fullName: chainConfig?.name || chainId,
                                color: chainConfig?.color || '#666',
                                address: chain.address,
                                isActive: activeChain === chainId
                              });
                            }
                          });

                          return allChains.length > 0 ? allChains.map((chain) => (
                            <button
                              key={chain.id}
                              onClick={() => {
                                switchToChain(chain.id);
                                setMobileMenuOpen(false);
                              }}
                              className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all min-w-0 ${
                                chain.isActive
                                  ? 'bg-orange-500/20 border border-orange-500/50'
                                  : 'bg-gray-800/50 hover:bg-gray-700/50'
                              }`}
                              title={`${chain.fullName}: ${chain.address}`}
                            >
                              <div className="flex items-center gap-1">
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: chain.color }}
                                ></div>
                                <span className="text-xs font-medium text-white whitespace-nowrap">
                                  {chain.name}
                                </span>
                              </div>
                              {chain.isActive && (
                                <div className="w-1 h-1 bg-orange-400 rounded-full"></div>
                              )}
                            </button>
                          )) : (
                            <div className="text-sm text-gray-500 px-3 py-2">
                              No chains connected
                            </div>
                          );
                        })()}
                        </div>
                      </div>
                    </div>
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
