import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import ProfileImage from './ProfileImage';
import Logo from './Logo';

export const Header = () => {
  const location = useLocation();
  const { connected, publicKey, connect, disconnect } = useWallet();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
          <div className="ml-4">
            {connected && user ? (
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
                    {publicKey?.toString().slice(0, 6)}...{publicKey?.toString().slice(-4)}
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
              window.solana?.isPhantom && (
                <button
                  onClick={async () => {
                    try {
                      console.log('🔌 Connecting to Phantom...');
                      await connect();
                      console.log('✅ Connection initiated');
                    } catch (error) {
                      console.error('❌ Connection failed:', error);
                      alert(`Connection failed: ${error.message}`);
                    }
                  }}
                  className="px-4 py-2 rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  style={{
                    backgroundColor: '#f97316',
                    color: '#ffffff'
                  }}
                >
                  Connect
                </button>
              )
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
