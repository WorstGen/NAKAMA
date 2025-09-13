/**
 * NAKAMA Widget - Standalone Script for Third-Party Websites
 * 
 * This script allows other websites to integrate NAKAMA profiles and wallet data
 * Usage: <script src="https://nakama-production-1850.up.railway.app/nakama-widget.js"></script>
 * 
 * Features:
 * - Display user profiles by username
 * - Show wallet addresses and verification status
 * - Embed profile pictures
 * - Verify wallet ownership
 */

(function() {
  'use strict';

  // Configuration
  const NAKAMA_API_BASE = 'https://nakama-production-1850.up.railway.app';
  const WIDGET_VERSION = '1.0.0';

  // Widget class
  class NakamaWidget {
    constructor(options = {}) {
      this.options = {
        theme: options.theme || 'dark',
        size: options.size || 'medium',
        showBio: options.showBio !== false,
        showWallet: options.showWallet !== false,
        showVerified: options.showVerified !== false,
        ...options
      };
      
      this.cache = new Map();
      this.init();
    }

    init() {
      // Create global NAKAMA object
      window.NAKAMA = {
        widget: this,
        version: WIDGET_VERSION,
        embed: this.embed.bind(this),
        verify: this.verify.bind(this),
        getProfile: this.getProfile.bind(this)
      };

      console.log(`🚀 NAKAMA Widget v${WIDGET_VERSION} loaded`);
    }

    // Main embed function
    async embed(username, containerId, options = {}) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error(`NAKAMA Widget: Container with id "${containerId}" not found`);
        return;
      }

      try {
        const profile = await this.getProfile(username);
        
        if (!profile) {
          container.innerHTML = this.renderError(`User "${username}" not found`);
          return;
        }

        const widgetOptions = { ...this.options, ...options };
        container.innerHTML = this.renderProfile(profile, widgetOptions);
        
        // Add click handler for profile links
        const profileLink = container.querySelector('.nakama-profile-link');
        if (profileLink) {
          profileLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.open(`https://nakama-production-1850.up.railway.app/profile/${username}`, '_blank');
          });
        }

      } catch (error) {
        console.error('NAKAMA Widget Error:', error);
        container.innerHTML = this.renderError('Failed to load profile');
      }
    }

    // Get profile data
    async getProfile(username) {
      if (this.cache.has(username)) {
        return this.cache.get(username);
      }

      try {
        const response = await fetch(`${NAKAMA_API_BASE}/api/public/profile/${username}`);
        
        if (!response.ok) {
          console.error(`NAKAMA Widget: API response not ok: ${response.status} ${response.statusText}`);
          return null;
        }
        
        const data = await response.json();
        
        if (data.found) {
          this.cache.set(username, data);
          return data;
        }
        
        return null;
      } catch (error) {
        console.error('NAKAMA Widget API Error:', error);
        return null;
      }
    }

    // Verify wallet ownership
    async verify(username, walletAddress) {
      try {
        const profile = await this.getProfile(username);
        if (!profile) return false;

        // Check if wallet address matches any of the user's registered wallets
        const wallets = profile.wallets || {};
        const registeredAddresses = [
          profile.walletAddress,
          wallets.solana?.address,
          wallets.ethereum?.address,
          wallets.polygon?.address,
          wallets.arbitrum?.address,
          wallets.optimism?.address,
          wallets.base?.address,
          wallets.bsc?.address
        ].filter(Boolean);

        return registeredAddresses.includes(walletAddress);
      } catch (error) {
        console.error('NAKAMA Widget Verification Error:', error);
        return false;
      }
    }

    // Render profile widget
    renderProfile(profile, options) {
      const { theme, size, showBio, showWallet, showVerified } = options;
      
      const sizeClasses = {
        small: 'nakama-widget-small',
        medium: 'nakama-widget-medium',
        large: 'nakama-widget-large'
      };

      const themeClasses = {
        dark: 'nakama-theme-dark',
        light: 'nakama-theme-light'
      };

      const widgetClass = `nakama-widget ${sizeClasses[size]} ${themeClasses[theme]}`;

      return `
        <div class="${widgetClass}">
          <div class="nakama-widget-header">
            <div class="nakama-profile-picture">
              ${this.renderProfilePicture(profile)}
            </div>
            <div class="nakama-profile-info">
              <div class="nakama-username">
                @${profile.displayName || profile.username}
                ${showVerified && profile.isVerified ? '<span class="nakama-verified">✓</span>' : ''}
              </div>
              ${showBio && profile.bio ? `<div class="nakama-bio">${profile.bio}</div>` : ''}
            </div>
          </div>
          ${showWallet ? this.renderWalletInfo(profile) : ''}
          <div class="nakama-widget-footer">
            <a href="https://nakama-production-1850.up.railway.app/profile/${profile.username}" 
               class="nakama-profile-link" target="_blank">
              View on NAKAMA
            </a>
          </div>
        </div>
      `;
    }

    // Render profile picture
    renderProfilePicture(profile) {
      if (profile.profilePicture) {
        return `<img src="${profile.profilePicture}" alt="${profile.username}" class="nakama-avatar" />`;
      }
      
      // Generate gradient avatar with initials
      const initials = (profile.displayName || profile.username)
        .split('_')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .slice(0, 2);
      
      return `<div class="nakama-avatar nakama-avatar-gradient">${initials}</div>`;
    }

    // Render wallet information
    renderWalletInfo(profile) {
      const wallets = profile.wallets || {};
      const walletList = [];

      if (profile.walletAddress) {
        walletList.push({
          chain: 'Solana',
          address: profile.walletAddress,
          isPrimary: true
        });
      }

      if (wallets.ethereum?.address) {
        walletList.push({
          chain: 'Ethereum',
          address: wallets.ethereum.address,
          isPrimary: wallets.ethereum.isPrimary
        });
      }

      if (wallets.polygon?.address) {
        walletList.push({
          chain: 'Polygon',
          address: wallets.polygon.address,
          isPrimary: wallets.polygon.isPrimary
        });
      }

      if (walletList.length === 0) return '';

      return `
        <div class="nakama-wallet-info">
          <div class="nakama-wallet-title">Registered Wallets</div>
          ${walletList.map(wallet => `
            <div class="nakama-wallet-item">
              <span class="nakama-wallet-chain">${wallet.chain}</span>
              <span class="nakama-wallet-address">${this.truncateAddress(wallet.address)}</span>
              ${wallet.isPrimary ? '<span class="nakama-primary">Primary</span>' : ''}
            </div>
          `).join('')}
        </div>
      `;
    }

    // Render error state
    renderError(message) {
      return `
        <div class="nakama-widget nakama-widget-error">
          <div class="nakama-error-message">${message}</div>
        </div>
      `;
    }

    // Utility function to truncate addresses
    truncateAddress(address) {
      if (!address) return '';
      if (address.length <= 12) return address;
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
  }

  // CSS Styles
  const styles = `
    <style>
      .nakama-widget {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
      }

      .nakama-widget:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      }

      .nakama-widget-small {
        width: 280px;
        font-size: 14px;
      }

      .nakama-widget-medium {
        width: 320px;
        font-size: 16px;
      }

      .nakama-widget-large {
        width: 400px;
        font-size: 18px;
      }

      .nakama-theme-dark {
        background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
        color: #ffffff;
      }

      .nakama-theme-light {
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        color: #333333;
        border: 1px solid #e9ecef;
      }

      .nakama-widget-header {
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .nakama-profile-picture {
        flex-shrink: 0;
      }

      .nakama-avatar {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        object-fit: cover;
      }

      .nakama-avatar-gradient {
        background: linear-gradient(135deg, #ff6b35 0%, #4ecdc4 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        font-size: 18px;
      }

      .nakama-profile-info {
        flex: 1;
        min-width: 0;
      }

      .nakama-username {
        font-weight: 600;
        font-size: 1.1em;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .nakama-verified {
        background: #10b981;
        color: white;
        border-radius: 50%;
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
      }

      .nakama-bio {
        color: #888;
        font-size: 0.9em;
        line-height: 1.4;
        word-wrap: break-word;
      }

      .nakama-wallet-info {
        padding: 0 20px 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        margin-top: 16px;
        padding-top: 16px;
      }

      .nakama-wallet-title {
        font-weight: 600;
        margin-bottom: 12px;
        font-size: 0.9em;
        opacity: 0.8;
      }

      .nakama-wallet-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 0;
        font-size: 0.85em;
      }

      .nakama-wallet-chain {
        font-weight: 500;
        opacity: 0.9;
      }

      .nakama-wallet-address {
        font-family: 'Monaco', 'Menlo', monospace;
        opacity: 0.7;
      }

      .nakama-primary {
        background: #3b82f6;
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.75em;
        font-weight: 500;
      }

      .nakama-widget-footer {
        padding: 16px 20px;
        background: rgba(255, 255, 255, 0.05);
        text-align: center;
      }

      .nakama-profile-link {
        color: #3b82f6;
        text-decoration: none;
        font-weight: 500;
        font-size: 0.9em;
        transition: color 0.2s ease;
      }

      .nakama-profile-link:hover {
        color: #2563eb;
        text-decoration: underline;
      }

      .nakama-widget-error {
        padding: 20px;
        text-align: center;
        background: #fee2e2;
        color: #dc2626;
        border: 1px solid #fecaca;
      }

      .nakama-error-message {
        font-weight: 500;
      }

      /* Light theme adjustments */
      .nakama-theme-light .nakama-bio {
        color: #666;
      }

      .nakama-theme-light .nakama-wallet-info {
        border-top-color: rgba(0, 0, 0, 0.1);
      }

      .nakama-theme-light .nakama-widget-footer {
        background: rgba(0, 0, 0, 0.02);
      }

      .nakama-theme-light .nakama-widget-error {
        background: #fef2f2;
        color: #dc2626;
        border-color: #fecaca;
      }
    </style>
  `;

  // Inject styles
  if (!document.getElementById('nakama-widget-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'nakama-widget-styles';
    styleElement.innerHTML = styles;
    document.head.appendChild(styleElement);
  }

  // Initialize widget
  new NakamaWidget();

})();
