import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useMultiWallet } from '../contexts/MultiWalletContext';
import { useAuth } from '../contexts/AuthContext';
import ProfileImage from './ProfileImage';
import Logo from './Logo';
import { chainConfig } from '../config/web3Config';

export const Header = () => {
  const location = useLocation();
  const { connected, publicKey, connect, disconnect } = useWallet();
  const { 
    activeChain, 
    connectedWallets, 
    isAnyWalletConnected, 
    connectWallet, 
    disconnectWallet,
    switchActiveChain,
    getAllConnectedWallets,
    getActiveWallet
  } = useMultiWallet();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chainSelectorOpen, setChainSelectorOpen] = useState(false);
  const [portalRoot, setPortalRoot] = useState(null);

  const isActive = (path) => location.pathname === path;

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
          <div className="flex items-center space-x-3">
            {/* Chain Selector */}
            {isAnyWalletConnected && (
              <div className="relative">
                <button
                  onClick={() => setChainSelectorOpen(!chainSelectorOpen)}
                  className="flex items-center space-x-2 backdrop-blur-sm rounded-lg px-3 py-2 border transition-all duration-200 hover:bg-gray-800/50"
                  style={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151'
                  }}
                >
                  {activeChain && (
                    <>
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: chainConfig[activeChain]?.color || '#3b82f6' }}
                      />
                      <span className="text-white text-sm font-medium hidden sm:block">
                        {chainConfig[activeChain]?.symbol || activeChain?.toUpperCase()}
                      </span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>

                {/* Chain Selector Dropdown */}
                {chainSelectorOpen && portalRoot && createPortal(
                  <div
                    className="fixed inset-0"
                    style={{ zIndex: 2147483647 }}
                    onClick={() => setChainSelectorOpen(false)}
                  >
                    <div
                      className="absolute bg-gray-900/98 backdrop-blur-xl border border-gray-700/70 rounded-xl shadow-2xl p-2 min-w-48"
                      style={{
                        right: '100px',
                        top: '70px',
                        zIndex: 2147483648
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-xs text-gray-400 px-3 py-2">Connected Wallets</div>
                      {Object.entries(connectedWallets).map(([chainName, wallet]) => {
                        if (!wallet?.isConnected) return null;
                        const chainInfo = chainConfig[chainName];
                        return (
                          <button
                            key={chainName}
                            onClick={async () => {
                              try {
                                await switchActiveChain(chainName);
                                setChainSelectorOpen(false);
                              } catch (error) {
                                console.error('Failed to switch chain:', error);
                              }
                            }}
                            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                              activeChain === chainName 
                                ? 'bg-blue-500/20 text-blue-400' 
                                : 'hover:bg-gray-800/50 text-gray-200'
                            }`}
                          >
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: chainInfo?.color || '#3b82f6' }}
                            />
                            <div className="flex-1 text-left">
                              <div className="font-medium">{chainInfo?.name}</div>
                              <div className="text-xs text-gray-400">
                                {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                              </div>
                            </div>
                            {activeChain === chainName && (
                              <div className="w-2 h-2 bg-blue-400 rounded-full" />
                            )}
                          </button>
                        );
                      })}
                      
                      <div className="border-t border-gray-700/50 mt-2 pt-2">
                        <div className="text-xs text-gray-400 px-3 py-1">Add Wallet</div>
                        {Object.entries(chainConfig).map(([chainName, chainInfo]) => {
                          if (connectedWallets[chainName]?.isConnected) return null;
                          return (
                            <button
                              key={chainName}
                              onClick={async () => {
                                try {
                                  await connectWallet(chainName);
                                  setChainSelectorOpen(false);
                                } catch (error) {
                                  console.error('Failed to connect wallet:', error);
                                }
                              }}
                              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-800/50 text-gray-300"
                            >
                              <div 
                                className="w-3 h-3 rounded-full opacity-50"
                                style={{ backgroundColor: chainInfo.color }}
                              />
                              <span>Connect {chainInfo.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>,
                  portalRoot
                )}
              </div>
            )}

            {(connected || isAnyWalletConnected) && user ? (
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
                {/* Profile Picture */}
                <ProfileImage
                  src={user?.profilePicture || null}
                  username={user?.username || 'User'}
                  size="sm"
                  className="border-2"
                  style={{ borderColor: '#fb923c' }}
                />

                {/* User Info */}
                <div className="text-sm hidden sm:block">
                  <div className="font-medium text-white truncate max-w-24">
                    @{user?.username || 'User'}
                  </div>
                  <div className="text-xs text-gray-400 truncate max-w-24">
                    {(() => {
                      const activeWallet = getActiveWallet();
                      const address = activeWallet?.address || publicKey?.toString();
                      return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'No wallet';
                    })()}
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
              // Connect button when not connected
              <div className="flex items-center space-x-2">
                {/* Solana Connect */}
                {window.solana?.isPhantom && (
                  <button
                    onClick={async () => {
                      try {
                        console.log('🔌 Connecting to Solana...');
                        await connectWallet('solana');
                        console.log('✅ Solana connection initiated');
                      } catch (error) {
                        console.error('❌ Solana connection failed:', error);
                        alert(`Solana connection failed: ${error.message}`);
                      }
                    }}
                    className="px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    style={{
                      backgroundColor: '#14F195',
                      color: '#000000'
                    }}
                  >
                    <span className="hidden sm:inline">Solana</span>
                    <span className="sm:hidden">SOL</span>
                  </button>
                )}
                
                {/* EVM Connect */}
                <button
                  onClick={async () => {
                    try {
                      console.log('🔌 Connecting to Ethereum...');
                      await connectWallet('ethereum');
                      console.log('✅ Ethereum connection initiated');
                    } catch (error) {
                      console.error('❌ Ethereum connection failed:', error);
                      alert(`Ethereum connection failed: ${error.message}`);
                    }
                  }}
                  className="px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  style={{
                    backgroundColor: '#627EEA',
                    color: '#ffffff'
                  }}
                >
                  <span className="hidden sm:inline">Ethereum</span>
                  <span className="sm:hidden">ETH</span>
                </button>
              </div>
            )}
          </div>

          {/* Universal Navigation Menu - Portal Rendered */}
          {portalRoot && connected && mobileMenuOpen && createPortal(
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

                  {/* Disconnect Button */}
                  <div className="mt-6 pt-3 border-t border-gray-700/50">
                    <button
                      onClick={async () => {
                        try {
                          setMobileMenuOpen(false);
                          console.log('🔌 Disconnecting from Phantom...');
                          await disconnect();
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
