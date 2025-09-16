/**
 * NAKAMA Login Widget - Universal Authentication for Third-Party Sites
 * 
 * This widget provides wallet connection and profile creation for any website
 * Usage: <script src="assets/js/nakama-login-widget.js"></script>
 * 
 * Features:
 * - Wallet connection (Solana + EVM chains)
 * - Profile recognition and creation
 * - Seamless header integration
 * - Modal-based profile creation
 */

(function() {
  'use strict';

  // Configuration
  const NAKAMA_API_BASE = 'https://nakama-production-1850.up.railway.app';
  const WIDGET_VERSION = '1.0.0';

  // Widget class
  class NakamaLoginWidget {
    constructor(options = {}) {
      this.options = {
        position: options.position || 'header-right', // 'header-right', 'header-left', 'standalone'
        showLogo: options.showLogo !== false,
        showChainIndicator: options.showChainIndicator !== false,
        adaptiveStyling: options.adaptiveStyling !== false, // Adapt to site's colors
        autoTrigger: options.autoTrigger !== false, // Auto-trigger form submissions
        autoTriggerDelay: options.autoTriggerDelay || 500, // Delay before triggering
        ...options
      };
      
      this.user = null;
      this.connectedWallets = {
        solana: null,
        ethereum: null,
        polygon: null,
        arbitrum: null,
        optimism: null,
        base: null,
        bsc: null
      };
      this.activeChain = 'solana';
      this.isConnecting = false;
      this.modalOpen = false;
      
      this.init();
    }

    init() {
      // Create global NAKAMA object
      window.NAKAMA = {
        loginWidget: this,
        version: WIDGET_VERSION,
        connect: this.connect.bind(this),
        disconnect: this.disconnect.bind(this),
        getUser: () => this.user,
        getWallets: () => this.connectedWallets,
        getActiveChain: () => this.activeChain,
        populateInputs: this.populateInputs.bind(this),
        watchInputs: this.watchInputs.bind(this),
        stopWatching: this.stopWatching.bind(this),
        getWalletByChain: this.getWalletByChain.bind(this)
      };

      console.log(`🚀 NAKAMA Login Widget v${WIDGET_VERSION} loaded`);
      
      // Adapt to host site's styling
      if (this.options.adaptiveStyling) {
        this.adaptToHostStyling();
      }
      
      // Auto-inject if position is specified
      if (this.options.position !== 'standalone') {
        this.injectIntoHeader();
      }
    }

    // Adapt to host site's styling
    adaptToHostStyling() {
      const header = this.findHeader();
      if (!header) return;

      // Detect common styling patterns
      const computedStyle = window.getComputedStyle(header);
      const headerBg = computedStyle.backgroundColor;
      const headerColor = computedStyle.color;
      const headerBorder = computedStyle.borderColor;
      const headerBorderRadius = computedStyle.borderRadius;
      const headerPadding = computedStyle.padding;
      const headerFontFamily = computedStyle.fontFamily;
      const headerFontSize = computedStyle.fontSize;

      // Set CSS custom properties based on detected styles
      const root = document.documentElement;
      
      // Background adaptation
      if (headerBg && headerBg !== 'rgba(0, 0, 0, 0)' && headerBg !== 'transparent') {
        root.style.setProperty('--nakama-profile-bg', headerBg);
        root.style.setProperty('--nakama-profile-bg-hover', this.adjustOpacity(headerBg, 0.1));
      }

      // Text color adaptation
      if (headerColor && headerColor !== 'rgba(0, 0, 0, 0)') {
        root.style.setProperty('--nakama-username-color', headerColor);
        root.style.setProperty('--nakama-text', headerColor);
        root.style.setProperty('--nakama-chain-color', this.adjustOpacity(headerColor, 0.6));
      }

      // Border adaptation
      if (headerBorder && headerBorder !== 'rgba(0, 0, 0, 0)') {
        root.style.setProperty('--nakama-profile-border', `1px solid ${headerBorder}`);
        root.style.setProperty('--nakama-profile-border-hover', `1px solid ${this.adjustOpacity(headerBorder, 0.7)}`);
      }

      // Border radius adaptation
      if (headerBorderRadius && headerBorderRadius !== '0px') {
        root.style.setProperty('--nakama-profile-radius', headerBorderRadius);
        root.style.setProperty('--nakama-radius', headerBorderRadius);
      }

      // Padding adaptation
      if (headerPadding && headerPadding !== '0px') {
        root.style.setProperty('--nakama-profile-padding', headerPadding);
      }

      // Font adaptation
      if (headerFontFamily && headerFontFamily !== 'serif') {
        root.style.setProperty('--nakama-font-family', headerFontFamily);
      }

      if (headerFontSize && headerFontSize !== '16px') {
        root.style.setProperty('--nakama-font-size', headerFontSize);
        root.style.setProperty('--nakama-username-size', headerFontSize);
        root.style.setProperty('--nakama-chain-size', this.adjustFontSize(headerFontSize, 0.8));
      }

      // Detect accent colors from buttons
      const buttons = header.querySelectorAll('button, .btn, .button');
      if (buttons.length > 0) {
        const buttonStyle = window.getComputedStyle(buttons[0]);
        const buttonBg = buttonStyle.backgroundColor;
        const buttonColor = buttonStyle.color;
        
        if (buttonBg && buttonBg !== 'rgba(0, 0, 0, 0)') {
          root.style.setProperty('--nakama-primary', buttonBg);
          root.style.setProperty('--nakama-primary-hover', this.adjustBrightness(buttonBg, 0.1));
        }
        
        if (buttonColor && buttonColor !== 'rgba(0, 0, 0, 0)') {
          root.style.setProperty('--nakama-text', buttonColor);
        }
      }
    }

    // Helper function to adjust opacity
    adjustOpacity(color, factor) {
      if (color.includes('rgba')) {
        const values = color.match(/\d+/g);
        if (values.length >= 3) {
          const alpha = parseFloat(values[3] || 1) * factor;
          return `rgba(${values[0]}, ${values[1]}, ${values[2]}, ${alpha})`;
        }
      }
      return color;
    }

    // Helper function to adjust brightness
    adjustBrightness(color, factor) {
      if (color.includes('rgb')) {
        const values = color.match(/\d+/g);
        if (values.length >= 3) {
          const r = Math.min(255, Math.max(0, parseInt(values[0]) + (255 * factor)));
          const g = Math.min(255, Math.max(0, parseInt(values[1]) + (255 * factor)));
          const b = Math.min(255, Math.max(0, parseInt(values[2]) + (255 * factor)));
          return `rgb(${r}, ${g}, ${b})`;
        }
      }
      return color;
    }

    // Helper function to adjust font size
    adjustFontSize(size, factor) {
      const numericSize = parseFloat(size);
      return `${numericSize * factor}px`;
    }

    // Inject widget into website header
    injectIntoHeader() {
      const header = this.findHeader();
      if (!header) {
        console.warn('NAKAMA Login Widget: Could not find header element');
        return;
      }

      const widgetContainer = this.createWidgetContainer();
      
      if (this.options.position === 'header-right') {
        header.appendChild(widgetContainer);
      } else if (this.options.position === 'header-left') {
        header.insertBefore(widgetContainer, header.firstChild);
      }
    }

    // Find the website's header element
    findHeader() {
      const selectors = [
        '.topbar-wrapper', // Specific to this site
        'header',
        '.header',
        '#header',
        '.navbar',
        '.nav',
        '.navigation',
        '.site-header',
        '.main-header',
        '[role="banner"]'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          return element;
        }
      }

      // If no header found, create one
      const header = document.createElement('header');
      header.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 60px;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 20px;
      `;
      
      document.body.insertBefore(header, document.body.firstChild);
      document.body.style.paddingTop = '60px';
      
      return header;
    }

    // Create the main widget container
    createWidgetContainer() {
      const container = document.createElement('div');
      container.className = 'nakama-login-widget';
      container.innerHTML = this.renderWidget();
      
      // Add event listeners
      this.attachEventListeners(container);
      
      return container;
    }

    // Render the main widget
    renderWidget() {
      if (this.user) {
        return this.renderUserProfile();
      } else {
        return this.renderConnectButton();
      }
    }

    // Render connect button
    renderConnectButton() {
      return `
        <button class="nakama-connect-btn" ${this.isConnecting ? 'disabled' : ''}>
          ${this.isConnecting ? `
            <div class="nakama-spinner"></div>
            Connecting...
          ` : 'Connect Wallet'}
        </button>
      `;
    }

    // Render user profile
    renderUserProfile() {
      const profilePicture = this.user.profilePicture ? 
        `<img src="${this.user.profilePicture}" alt="${this.user.displayName || this.user.username}" class="nakama-avatar" />` :
        this.generateAvatar(this.user.displayName || this.user.username);

      return `
        <div class="nakama-user-profile">
          <button class="nakama-profile-btn" data-action="toggle-menu">
            ${profilePicture}
            <div class="nakama-user-info">
              <div class="nakama-username">@${this.user.displayName || this.user.username}</div>
              <div class="nakama-chain">${this.getChainName(this.activeChain)}</div>
            </div>
            <div class="nakama-hamburger">
              <div class="nakama-hamburger-line"></div>
              <div class="nakama-hamburger-line"></div>
              <div class="nakama-hamburger-line"></div>
            </div>
          </button>
          
          <!-- Dropdown Menu -->
          <div class="nakama-dropdown" style="display: none;">
            <div class="nakama-dropdown-content">
              <div class="nakama-dropdown-section">
                <div class="nakama-section-title">Active Chains</div>
                ${this.renderActiveChains()}
              </div>
              <div class="nakama-dropdown-section">
                <div class="nakama-section-title">Quick Actions</div>
                <button class="nakama-dropdown-btn" data-action="generate-passport">Generate Passport</button>
                <button class="nakama-dropdown-btn" data-action="view-profile">View Profile</button>
                <button class="nakama-dropdown-btn" data-action="disconnect">Disconnect</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Render active chains
    renderActiveChains() {
      const chains = Object.entries(this.connectedWallets)
        .filter(([chain, wallet]) => wallet !== null)
        .map(([chain, wallet]) => {
          const chainName = this.getChainName(chain);
          const isActive = chain === this.activeChain;
          return `
            <div class="nakama-chain-item ${isActive ? 'active' : ''}" data-chain="${chain}">
              <div class="nakama-chain-info">
                <div class="nakama-chain-name">${chainName}</div>
                <div class="nakama-chain-address">${this.truncateAddress(wallet.address)}</div>
              </div>
              ${isActive ? '<div class="nakama-chain-indicator"></div>' : ''}
            </div>
          `;
        }).join('');

      return chains || '<div class="nakama-no-chains">No chains connected</div>';
    }

    // Generate avatar with initials
    generateAvatar(username) {
      const initials = username
        .split('_')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .slice(0, 2);
      
      return `<div class="nakama-avatar nakama-avatar-gradient">${initials}</div>`;
    }

    // Get chain name
    getChainName(chain) {
      const chainNames = {
        solana: 'Solana',
        ethereum: 'Ethereum',
        polygon: 'Polygon',
        arbitrum: 'Arbitrum',
        optimism: 'Optimism',
        base: 'Base',
        bsc: 'BNB Chain'
      };
      return chainNames[chain] || 'Unknown';
    }

    // Truncate address
    truncateAddress(address) {
      if (!address) return '';
      if (address.length <= 12) return address;
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    // Attach event listeners
    attachEventListeners(container) {
      // Connect button
      const connectBtn = container.querySelector('.nakama-connect-btn');
      if (connectBtn) {
        connectBtn.addEventListener('click', () => this.handleConnect());
      }

      // Profile button
      const profileBtn = container.querySelector('.nakama-profile-btn');
      if (profileBtn) {
        profileBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleDropdown();
        });
      }

      // Dropdown buttons
      container.addEventListener('click', (e) => {
        const action = e.target.getAttribute('data-action');
        if (action) {
          this.handleDropdownAction(action, e.target);
        }
      });

      // Chain switching
      container.addEventListener('click', (e) => {
        const chain = e.target.closest('[data-chain]')?.getAttribute('data-chain');
        if (chain) {
          this.switchChain(chain);
        }
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        this.closeDropdown();
      });
    }

    // Handle connect button click
    async handleConnect() {
      if (this.isConnecting) return;
      
      this.isConnecting = true;
      this.updateWidget();

      try {
        // Try to connect Solana first
        if (window.solana && window.solana.isPhantom) {
          await this.connectSolana();
        } else {
          throw new Error('Phantom wallet not found');
        }
      } catch (error) {
        console.error('Connection failed:', error);
        this.showError('Failed to connect wallet. Please install Phantom wallet.');
      } finally {
        this.isConnecting = false;
        this.updateWidget();
      }
    }

    // Connect method for external API
    async connect() {
      return await this.connectSolana();
    }

    // Connect to Solana
    async connectSolana() {
      const response = await window.solana.connect();
      const publicKey = response.publicKey.toString();
      
      this.connectedWallets.solana = {
        address: publicKey,
        publicKey: response.publicKey
      };
      this.activeChain = 'solana';

      // Check if user exists
      const user = await this.checkUserExists(publicKey);
      if (user) {
        this.user = user;
        this.showSuccess('Connected successfully!');
        
        // Dispatch custom event for wallet connection
        window.dispatchEvent(new CustomEvent('nakama-wallet-connected', {
          detail: {
            address: publicKey,
            chain: 'solana',
            user: user
          }
        }));
        
        // Auto-populate wallet inputs for Pond0x Data Hub (disabled to prevent double population)
        // setTimeout(() => {
        //   this.populateInputs({ triggerPassportGeneration: true });
        // }, 500);
      } else {
        // Show profile creation modal
        this.showProfileCreationModal();
      }
    }

    // Check if user exists
    async checkUserExists(walletAddress) {
      try {
        const response = await fetch(`${NAKAMA_API_BASE}/api/public/profile/by-wallet/${walletAddress}`);
        const data = await response.json();
        return data.found ? data : null;
      } catch (error) {
        console.error('Error checking user:', error);
        return null;
      }
    }

    // Show profile creation modal
    showProfileCreationModal() {
      this.modalOpen = true;
      this.createModal();
    }

    // Create profile creation modal
    createModal() {
      const modal = document.createElement('div');
      modal.className = 'nakama-modal-overlay';
      modal.innerHTML = `
        <div class="nakama-modal">
          <div class="nakama-modal-header">
            <h2>Create NAKAMA Profile</h2>
            <button class="nakama-modal-close" data-action="close-modal">&times;</button>
          </div>
          <div class="nakama-modal-body">
            <p>Welcome! Create your NAKAMA profile to get started.</p>
            <form class="nakama-profile-form">
              <div class="nakama-form-group">
                <label>Username</label>
                <input type="text" name="username" placeholder="Enter your username" required>
              </div>
              <div class="nakama-form-group">
                <label>Bio (Optional)</label>
                <textarea name="bio" placeholder="Tell us about yourself" rows="3"></textarea>
              </div>
              <div class="nakama-form-group">
                <label>Connected Wallets</label>
                <div class="nakama-wallet-list">
                  ${this.renderWalletList()}
                </div>
              </div>
              <div class="nakama-form-actions">
                <button type="button" class="nakama-btn nakama-btn-secondary" data-action="close-modal">Cancel</button>
                <button type="submit" class="nakama-btn nakama-btn-primary">Create Profile</button>
              </div>
            </form>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      this.attachModalListeners(modal);
    }

    // Render wallet list in modal
    renderWalletList() {
      return Object.entries(this.connectedWallets)
        .filter(([chain, wallet]) => wallet !== null)
        .map(([chain, wallet]) => `
          <div class="nakama-wallet-item">
            <div class="nakama-wallet-chain">${this.getChainName(chain)}</div>
            <div class="nakama-wallet-address">${this.truncateAddress(wallet.address)}</div>
          </div>
        `).join('');
    }

    // Attach modal event listeners
    attachModalListeners(modal) {
      // Close modal
      modal.addEventListener('click', (e) => {
        if (e.target.classList.contains('nakama-modal-overlay') || 
            e.target.classList.contains('nakama-modal-close') ||
            e.target.getAttribute('data-action') === 'close-modal') {
          this.closeModal();
        }
      });

      // Form submission
      const form = modal.querySelector('.nakama-profile-form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleProfileCreation(form);
      });
    }

    // Handle profile creation
    async handleProfileCreation(form) {
      const formData = new FormData(form);
      const profileData = {
        username: formData.get('username'),
        bio: formData.get('bio') || ''
      };

      try {
        // Create profile via API
        const response = await fetch(`${NAKAMA_API_BASE}/api/profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Public-Key': this.connectedWallets.solana.publicKey.toString(),
            'X-Signature': await this.signMessage(`Create NAKAMA profile: ${Date.now()}`)
          },
          body: JSON.stringify(profileData)
        });

        const result = await response.json();
        
        if (result.success) {
          this.user = result.user;
          this.closeModal();
          this.updateWidget();
          this.showSuccess('Profile created successfully!');
          
          // Dispatch custom event for wallet connection after profile creation
          window.dispatchEvent(new CustomEvent('nakama-wallet-connected', {
            detail: {
              address: this.connectedWallets.solana.address,
              chain: 'solana',
              user: result.user
            }
          }));
          
          // Auto-populate wallet inputs after profile creation
          setTimeout(() => {
            this.populateInputs({ triggerPassportGeneration: true });
          }, 500);
        } else {
          throw new Error(result.error || 'Failed to create profile');
        }
      } catch (error) {
        console.error('Profile creation failed:', error);
        this.showError('Failed to create profile. Please try again.');
      }
    }

    // Sign message
    async signMessage(message) {
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await window.solana.signMessage(encodedMessage);
      return Array.from(signature.signature).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Close modal
    closeModal() {
      const modal = document.querySelector('.nakama-modal-overlay');
      if (modal) {
        modal.remove();
      }
      this.modalOpen = false;
    }

    // Toggle dropdown
    toggleDropdown() {
      const dropdown = document.querySelector('.nakama-dropdown');
      if (dropdown) {
        const isVisible = dropdown.style.display !== 'none';
        dropdown.style.display = isVisible ? 'none' : 'block';
      }
    }

    // Close dropdown
    closeDropdown() {
      const dropdown = document.querySelector('.nakama-dropdown');
      if (dropdown) {
        dropdown.style.display = 'none';
      }
    }

    // Handle dropdown actions
    handleDropdownAction(action, element) {
      switch (action) {
        case 'toggle-menu':
          this.toggleDropdown();
          break;
        case 'generate-passport':
          this.generatePassportFromNAKAMA();
          break;
        case 'view-profile':
          // Open the external profile editing page
          window.open(`${NAKAMA_API_BASE}/profile/edit`, '_blank');
          break;
        case 'disconnect':
          this.disconnect();
          break;
        case 'close-modal':
          this.closeModal();
          break;
      }
      this.closeDropdown();
    }

    // Toggle combined menu (integrate with page's mobile menu)
    toggleCombinedMenu() {
      const mobileDropdown = document.getElementById('mobileDropdown');
      const hamburgerIcon = document.getElementById('hamburger-icon');
      
      if (mobileDropdown && hamburgerIcon) {
        if (mobileDropdown.classList.contains('show')) {
          mobileDropdown.classList.remove('show');
          hamburgerIcon.textContent = '☰';
        } else {
          mobileDropdown.classList.add('show');
          hamburgerIcon.textContent = '✕';
          
          // Add NAKAMA-specific menu items to the mobile menu
          this.addNakamaMenuItems();
        }
      }
    }

    // Add NAKAMA menu items to the existing mobile menu
    addNakamaMenuItems() {
      const mobileMenuItems = document.querySelector('.mobile-menu-items');
      if (!mobileMenuItems) return;

      // Remove existing NAKAMA items to avoid duplicates
      const existingNakamaItems = mobileMenuItems.querySelectorAll('.nakama-menu-item');
      existingNakamaItems.forEach(item => item.remove());

      // Add separator
      const separator = document.createElement('div');
      separator.className = 'nakama-menu-item nakama-menu-separator';
      separator.innerHTML = '<hr style="margin: 1rem 0; border: none; border-top: 1px solid rgba(255,255,255,0.2);">';
      mobileMenuItems.appendChild(separator);

      // Add NAKAMA menu items
      const nakamaItems = [
        { text: 'Generate Passport', action: 'generate-passport' },
        { text: 'View Profile', action: 'view-profile' },
        { text: 'Disconnect', action: 'disconnect' }
      ];

      nakamaItems.forEach(item => {
        const menuItem = document.createElement('a');
        menuItem.className = 'nakama-menu-item';
        menuItem.href = '#';
        menuItem.textContent = item.text;
        menuItem.setAttribute('data-nakama-action', item.action);
        menuItem.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleDropdownAction(item.action);
          // Close the mobile menu
          const mobileDropdown = document.getElementById('mobileDropdown');
          const hamburgerIcon = document.getElementById('hamburger-icon');
          if (mobileDropdown) mobileDropdown.classList.remove('show');
          if (hamburgerIcon) hamburgerIcon.textContent = '☰';
        });
        mobileMenuItems.appendChild(menuItem);
      });
    }

    // Switch chain
    switchChain(chain) {
      this.activeChain = chain;
      this.updateWidget();
    }

    // Disconnect
    disconnect() {
      this.user = null;
      this.connectedWallets = {
        solana: null,
        ethereum: null,
        polygon: null,
        arbitrum: null,
        optimism: null,
        base: null,
        bsc: null
      };
      this.activeChain = 'solana';
      this.updateWidget();
      this.showSuccess('Disconnected successfully!');
    }

    // Update widget display
    updateWidget() {
      const container = document.querySelector('.nakama-login-widget');
      if (container) {
        container.innerHTML = this.renderWidget();
        this.attachEventListeners(container);
      }
    }

    // Show success message
    showSuccess(message) {
      this.showNotification(message, 'success');
    }

    // Show error message
    showError(message) {
      this.showNotification(message, 'error');
    }

    // Show notification
    showNotification(message, type) {
      const notification = document.createElement('div');
      notification.className = `nakama-notification nakama-notification-${type}`;
      notification.textContent = message;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 3000);
    }

    // Get wallet address by chain
    getWalletByChain(chain) {
      const wallet = this.connectedWallets[chain];
      return wallet ? wallet.address : null;
    }

    // Populate wallet address inputs automatically
    populateInputs(options = {}) {
      if (!this.user) {
        console.warn('NAKAMA: No user connected. Cannot populate inputs.');
        return;
      }

      const {
        selectors = {},
        autoDetect = true,
        chainPriority = ['solana', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc'],
        triggerPassportGeneration = true // New option for passport integration
      } = options;

      // Default selectors for common wallet input patterns
      const defaultSelectors = {
        solana: [
          // Pond0x Data Hub specific selectors
          '#wallet-input',
          '#modalWalletInput',
          'input[id="wallet-input"]',
          'input[id="modalWalletInput"]',
          // Generic selectors
          'input[name*="solana"]',
          'input[name*="sol"]',
          'input[placeholder*="solana"]',
          'input[placeholder*="sol"]',
          'input[id*="solana"]',
          'input[id*="sol"]',
          '.solana-address',
          '.sol-address',
          '#solana-wallet',
          '#sol-wallet'
        ],
        ethereum: [
          'input[name*="ethereum"]',
          'input[name*="eth"]',
          'input[placeholder*="ethereum"]',
          'input[placeholder*="eth"]',
          'input[id*="ethereum"]',
          'input[id*="eth"]',
          '.ethereum-address',
          '.eth-address',
          '#ethereum-wallet',
          '#eth-wallet'
        ],
        polygon: [
          'input[name*="polygon"]',
          'input[name*="matic"]',
          'input[placeholder*="polygon"]',
          'input[placeholder*="matic"]',
          'input[id*="polygon"]',
          'input[id*="matic"]',
          '.polygon-address',
          '.matic-address',
          '#polygon-wallet',
          '#matic-wallet'
        ],
        arbitrum: [
          'input[name*="arbitrum"]',
          'input[name*="arb"]',
          'input[placeholder*="arbitrum"]',
          'input[placeholder*="arb"]',
          'input[id*="arbitrum"]',
          'input[id*="arb"]',
          '.arbitrum-address',
          '.arb-address',
          '#arbitrum-wallet',
          '#arb-wallet'
        ],
        optimism: [
          'input[name*="optimism"]',
          'input[name*="op"]',
          'input[placeholder*="optimism"]',
          'input[placeholder*="op"]',
          'input[id*="optimism"]',
          'input[id*="op"]',
          '.optimism-address',
          '.op-address',
          '#optimism-wallet',
          '#op-wallet'
        ],
        base: [
          'input[name*="base"]',
          'input[placeholder*="base"]',
          'input[id*="base"]',
          '.base-address',
          '#base-wallet'
        ],
        bsc: [
          'input[name*="bsc"]',
          'input[name*="bnb"]',
          'input[placeholder*="bsc"]',
          'input[placeholder*="bnb"]',
          'input[id*="bsc"]',
          'input[id*="bnb"]',
          '.bsc-address',
          '.bnb-address',
          '#bsc-wallet',
          '#bnb-wallet'
        ]
      };

      const selectorsToUse = { ...defaultSelectors, ...selectors };
      let populatedCount = 0;

      // Try to populate inputs for each chain
      for (const chain of chainPriority) {
        const wallet = this.connectedWallets[chain];
        if (!wallet) continue;

        const chainSelectors = selectorsToUse[chain] || [];
        
        for (const selector of chainSelectors) {
          const inputs = document.querySelectorAll(selector);
          
          for (const input of inputs) {
            // Skip if input already has a value
            if (input.value && !input.dataset.nakamaOverwrite) continue;
            
            // Skip if input is disabled
            if (input.disabled) continue;
            
            // Set the wallet address
            input.value = wallet.address;
            input.dataset.nakamaPopulated = 'true';
            input.dataset.nakamaChain = chain;
            
            // Add visual indicator
            input.style.borderLeft = '3px solid #10b981';
            input.title = `NAKAMA: ${this.getChainName(chain)} wallet`;
            
            // Trigger change event
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Auto-trigger form submission or button clicks (disabled to prevent double submission)
            // this.autoTriggerActions(input);
            
            // Special handling for Pond0x Data Hub passport generation (disabled to prevent double submission)
            // if (triggerPassportGeneration && (input.id === 'wallet-input' || input.id === 'modalWalletInput')) {
            //   this.triggerPassportGeneration(input);
            // }
            
            populatedCount++;
          }
        }
      }

      if (populatedCount > 0) {
        this.showSuccess(`Populated ${populatedCount} wallet address inputs`);
        console.log(`NAKAMA: Populated ${populatedCount} wallet address inputs`);
      } else {
        console.log('NAKAMA: No wallet address inputs found to populate');
      }

      return populatedCount;
    }

    // Watch for new wallet address inputs and auto-populate them
    watchInputs(options = {}) {
      const {
        interval = 1000,
        maxAttempts = 60,
        ...populateOptions
      } = options;

      let attempts = 0;
      
      const watchInterval = setInterval(() => {
        attempts++;
        
        // Stop watching after max attempts
        if (attempts >= maxAttempts) {
          clearInterval(watchInterval);
          console.log('NAKAMA: Stopped watching for wallet inputs (max attempts reached)');
          return;
        }

        // Check if user is connected
        if (!this.user) {
          return;
        }

        // Try to populate inputs
        const populated = this.populateInputs(populateOptions);
        
        // If we populated some inputs, we can reduce the frequency
        if (populated > 0) {
          // Continue watching but less frequently
          setTimeout(() => {
            clearInterval(watchInterval);
            this.watchInputs({ ...options, interval: interval * 2 });
          }, interval * 5);
        }
      }, interval);

      console.log('NAKAMA: Started watching for wallet address inputs');
      return watchInterval;
    }

    // Stop watching for inputs
    stopWatching(watchInterval) {
      if (watchInterval) {
        clearInterval(watchInterval);
        console.log('NAKAMA: Stopped watching for wallet inputs');
      }
    }

    // Auto-trigger form submissions and button clicks
    autoTriggerActions(input) {
      // Check if auto-triggering is enabled
      if (!this.options.autoTrigger) {
        return;
      }
      
      // Wait a bit for the input to be processed
      setTimeout(() => {
        // Find the form containing this input
        const form = input.closest('form');
        
        if (form) {
          // Look for submit buttons in the form
          const submitButtons = form.querySelectorAll('button[type="submit"], input[type="submit"], .submit-btn, .search-btn, .analyze-btn, .load-btn, .fetch-btn');
          
          if (submitButtons.length > 0) {
            // Click the first submit button
            const submitBtn = submitButtons[0];
            console.log('NAKAMA: Auto-clicking submit button:', submitBtn);
            submitBtn.click();
            return;
          }
          
          // If no submit button found, try to submit the form directly
          console.log('NAKAMA: Auto-submitting form');
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          return;
        }
        
        // If no form found, look for nearby buttons
        const nearbyButtons = this.findNearbyButtons(input);
        if (nearbyButtons.length > 0) {
          const button = nearbyButtons[0];
          console.log('NAKAMA: Auto-clicking nearby button:', button);
          button.click();
        }
        
        // Look for common action buttons on the page
        this.triggerCommonActions(input);
        
      }, this.options.autoTriggerDelay); // Wait for configured delay
    }

    // Find buttons near the input
    findNearbyButtons(input) {
      const container = input.closest('.form-group, .input-group, .wallet-section, .address-section') || input.parentElement;
      const buttons = container.querySelectorAll('button, .btn, .button, [role="button"]');
      
      // Filter for action buttons
      return Array.from(buttons).filter(button => {
        const text = button.textContent.toLowerCase();
        const classes = button.className.toLowerCase();
        const id = button.id.toLowerCase();
        
        return text.includes('submit') || 
               text.includes('search') || 
               text.includes('analyze') || 
               text.includes('load') || 
               text.includes('fetch') || 
               text.includes('get') ||
               text.includes('check') ||
               classes.includes('submit') ||
               classes.includes('search') ||
               classes.includes('analyze') ||
               classes.includes('load') ||
               classes.includes('fetch') ||
               id.includes('submit') ||
               id.includes('search') ||
               id.includes('analyze') ||
               id.includes('load') ||
               id.includes('fetch');
      });
    }

    // Trigger common actions on the page
    triggerCommonActions(input) {
      // Look for common action buttons across the page
      const commonSelectors = [
        'button[data-action="search"]',
        'button[data-action="analyze"]',
        'button[data-action="load"]',
        'button[data-action="fetch"]',
        '.search-wallet-btn',
        '.analyze-wallet-btn',
        '.load-portfolio-btn',
        '.fetch-data-btn',
        '#search-btn',
        '#analyze-btn',
        '#load-btn',
        '#fetch-btn',
        '.wallet-search-btn',
        '.portfolio-btn',
        '.data-btn'
      ];
      
      for (const selector of commonSelectors) {
        const button = document.querySelector(selector);
        if (button && button.offsetParent !== null) { // Check if button is visible
          console.log('NAKAMA: Auto-clicking common action button:', button);
          button.click();
          return;
        }
      }
      
      // Look for buttons with wallet-related text
      const allButtons = document.querySelectorAll('button, .btn, .button, [role="button"]');
      for (const button of allButtons) {
        const text = button.textContent.toLowerCase();
        if ((text.includes('search') || text.includes('analyze') || text.includes('load') || text.includes('fetch')) && 
            (text.includes('wallet') || text.includes('address') || text.includes('portfolio'))) {
          console.log('NAKAMA: Auto-clicking wallet-related button:', button);
          button.click();
          return;
        }
      }
    }

    // Special method for triggering Pond0x Data Hub passport generation
    triggerPassportGeneration(input) {
      console.log('NAKAMA: Triggering Pond0x passport generation for input:', input.id);
      
      // Wait a bit for the input to be processed
      setTimeout(() => {
        try {
          // Check if we're on the main wallet input
          if (input.id === 'wallet-input') {
            // Trigger the dashboard initialization
            if (typeof initDashboard === 'function') {
              console.log('NAKAMA: Calling initDashboard()');
              initDashboard();
            } else {
              console.log('NAKAMA: initDashboard function not found, trying alternative methods');
              // Try to trigger the arrow button click
              const arrowBtn = document.getElementById('arrowBtn');
              if (arrowBtn) {
                console.log('NAKAMA: Clicking arrow button');
                arrowBtn.click();
              }
            }
          }
          
          // Check if we're on the modal wallet input
          if (input.id === 'modalWalletInput') {
            // Enable the generate button and trigger it
            const generateBtn = document.getElementById('generateBtn');
            if (generateBtn && !generateBtn.disabled) {
              console.log('NAKAMA: Clicking generate button in modal');
              generateBtn.click();
            } else {
              // Try to enable the button first
              const saveBtn = document.getElementById('saveWalletBtn');
              if (saveBtn && !saveBtn.disabled) {
                console.log('NAKAMA: Clicking save & generate button');
                saveBtn.click();
              }
            }
          }
          
          // Show success notification
          this.showSuccess('NAKAMA: Auto-generated passport data from connected wallet!');
          
        } catch (error) {
          console.error('NAKAMA: Error triggering passport generation:', error);
        }
      }, 1000); // Wait 1 second for the input to be fully processed
    }

    // Generate passport directly from NAKAMA profile
    generatePassportFromNAKAMA() {
      if (!this.user || !this.connectedWallets.solana) {
        this.showError('No wallet connected. Please connect your wallet first.');
        return;
      }

      const solanaAddress = this.connectedWallets.solana.address;
      console.log('NAKAMA: Generating passport for address:', solanaAddress);

      try {
        // Find the main wallet input and populate it
        const walletInput = document.getElementById('wallet-input');
        if (walletInput) {
          walletInput.value = solanaAddress;
          
          // Trigger wallet type detection
          if (typeof detectWalletType === 'function') {
            detectWalletType();
          }
          
          // Trigger dashboard initialization
          setTimeout(() => {
            if (typeof initDashboard === 'function') {
              console.log('NAKAMA: Calling initDashboard() for passport generation');
              initDashboard();
              this.showSuccess('NAKAMA: Generated passport data from your connected wallet!');
            } else {
              this.showError('NAKAMA: Unable to generate passport. Please try manually.');
            }
          }, 500);
        } else {
          this.showError('NAKAMA: Wallet input not found. Please refresh the page.');
        }
      } catch (error) {
        console.error('NAKAMA: Error generating passport:', error);
        this.showError('NAKAMA: Failed to generate passport. Please try again.');
      }
    }
  }

  // CSS Styles
  const styles = `
    <style>
      .nakama-login-widget {
        font-family: var(--nakama-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
        position: relative;
        z-index: 1000;
      }

      .nakama-connect-btn {
        padding: 8px 16px;
        background: var(--nakama-primary, linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%));
        color: var(--nakama-text, white);
        border: var(--nakama-border, none);
        border-radius: var(--nakama-radius, 8px);
        font-weight: var(--nakama-font-weight, 500);
        font-size: var(--nakama-font-size, 14px);
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: inherit;
      }

      .nakama-connect-btn:hover:not(:disabled) {
        background: var(--nakama-primary-hover, linear-gradient(135deg, #2563eb 0%, #7c3aed 100%));
        transform: translateY(-1px);
        box-shadow: var(--nakama-shadow, 0 4px 12px rgba(59, 130, 246, 0.3));
      }

      .nakama-connect-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .nakama-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        animation: nakama-spin 1s linear infinite;
      }

      @keyframes nakama-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .nakama-user-profile {
        position: relative;
      }

      .nakama-profile-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: var(--nakama-profile-padding, 10px 15px); /* Increased from 8px 12px to 10px 15px (25% taller) */
        background: var(--nakama-profile-bg, rgba(31, 41, 55, 0.8));
        border: var(--nakama-profile-border, 1px solid rgba(55, 65, 81, 0.5));
        border-radius: var(--nakama-profile-radius, 12px);
        cursor: pointer;
        transition: all 0.2s ease;
        backdrop-filter: var(--nakama-backdrop, blur(10px));
        font-family: inherit;
      }

      .nakama-profile-btn:hover {
        background: var(--nakama-profile-bg-hover, rgba(31, 41, 55, 0.9));
        border-color: var(--nakama-profile-border-hover, rgba(55, 65, 81, 0.7));
      }

      .nakama-avatar {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        object-fit: cover;
      }

      .nakama-avatar-gradient {
        background: linear-gradient(135deg, #ff6b35 0%, #4ecdc4 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        font-size: 12px;
      }

      .nakama-user-info {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }

      .nakama-username {
        font-size: var(--nakama-username-size, 12px);
        font-weight: var(--nakama-username-weight, 600);
        color: white !important;
        line-height: 1.2;
      }

      .nakama-chain {
        font-size: var(--nakama-chain-size, 10px);
        color: white !important;
        line-height: 1.2;
      }

      .nakama-login-widget .nakama-chain {
        color: white !important;
      }

      .nakama-hamburger {
        display: none; /* Hide hamburger lines */
      }

      .nakama-hamburger-line {
        display: none; /* Hide hamburger lines */
      }

      /* Light mode support */
      [data-theme="light"] .nakama-login-widget .nakama-username {
        color: #1f2937 !important;
      }

      [data-theme="light"] .nakama-login-widget .nakama-chain {
        color: #6b7280 !important;
      }

      [data-theme="light"] .nakama-login-widget .nakama-hamburger-line {
        background: #1f2937 !important;
      }

      /* Light mode widget background */
      [data-theme="light"] .nakama-profile-btn {
        background: rgba(255, 255, 255, 0.9) !important;
        border: 1px solid rgba(209, 213, 219, 0.5) !important;
      }

      [data-theme="light"] .nakama-profile-btn:hover {
        background: rgba(255, 255, 255, 0.95) !important;
        border-color: rgba(209, 213, 219, 0.7) !important;
      }

      .nakama-dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: 8px;
        width: 320px;
        background: rgba(17, 24, 39, 0.95);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(55, 65, 81, 0.5);
        border-radius: 16px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        overflow: hidden;
      }

      .nakama-dropdown-content {
        padding: 16px;
      }

      .nakama-dropdown-section {
        margin-bottom: 16px;
      }

      .nakama-dropdown-section:last-child {
        margin-bottom: 0;
      }

      .nakama-section-title {
        font-size: 12px;
        font-weight: 600;
        color: #9ca3af;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .nakama-chain-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-bottom: 4px;
      }

      .nakama-chain-item:hover {
        background: rgba(55, 65, 81, 0.3);
      }

      .nakama-chain-item.active {
        background: rgba(59, 130, 246, 0.2);
        border: 1px solid rgba(59, 130, 246, 0.3);
      }

      .nakama-chain-info {
        flex: 1;
      }

      .nakama-chain-name {
        font-size: 14px;
        font-weight: 500;
        color: white;
        line-height: 1.2;
      }

      .nakama-chain-address {
        font-size: 12px;
        color: #9ca3af;
        font-family: 'Monaco', 'Menlo', monospace;
        line-height: 1.2;
      }

      .nakama-chain-indicator {
        width: 8px;
        height: 8px;
        background: #3b82f6;
        border-radius: 50%;
      }

      .nakama-dropdown-btn {
        display: block;
        width: 100%;
        padding: 8px 12px;
        background: transparent;
        border: none;
        color: white;
        text-align: left;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 14px;
        margin-bottom: 4px;
      }

      .nakama-dropdown-btn:hover {
        background: rgba(55, 65, 81, 0.3);
      }

      .nakama-dropdown-btn:last-child {
        margin-bottom: 0;
      }

      .nakama-no-chains {
        padding: 16px;
        text-align: center;
        color: #9ca3af;
        font-size: 14px;
      }

      /* Modal Styles */
      .nakama-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }

      .nakama-modal {
        background: rgba(17, 24, 39, 0.95);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(55, 65, 81, 0.5);
        border-radius: 16px;
        width: 100%;
        max-width: 500px;
        max-height: 90vh;
        overflow-y: auto;
      }

      .nakama-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        border-bottom: 1px solid rgba(55, 65, 81, 0.5);
      }

      .nakama-modal-header h2 {
        margin: 0;
        color: white;
        font-size: 20px;
        font-weight: 600;
      }

      .nakama-modal-close {
        background: none;
        border: none;
        color: #9ca3af;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: all 0.2s ease;
      }

      .nakama-modal-close:hover {
        background: rgba(55, 65, 81, 0.3);
        color: white;
      }

      .nakama-modal-body {
        padding: 24px;
      }

      .nakama-modal-body p {
        color: #9ca3af;
        margin-bottom: 24px;
        line-height: 1.5;
      }

      .nakama-profile-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .nakama-form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .nakama-form-group label {
        color: white;
        font-weight: 500;
        font-size: 14px;
      }

      .nakama-form-group input,
      .nakama-form-group textarea {
        padding: 12px 16px;
        background: rgba(31, 41, 55, 0.8);
        border: 1px solid rgba(55, 65, 81, 0.5);
        border-radius: 8px;
        color: white;
        font-size: 14px;
        transition: all 0.2s ease;
      }

      .nakama-form-group input:focus,
      .nakama-form-group textarea:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .nakama-form-group textarea {
        resize: vertical;
        min-height: 80px;
      }

      .nakama-wallet-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .nakama-wallet-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: rgba(31, 41, 55, 0.5);
        border: 1px solid rgba(55, 65, 81, 0.3);
        border-radius: 8px;
      }

      .nakama-wallet-chain {
        color: white;
        font-weight: 500;
        font-size: 14px;
      }

      .nakama-wallet-address {
        color: #9ca3af;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 12px;
      }

      .nakama-form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 8px;
      }

      .nakama-btn {
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        font-weight: 500;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .nakama-btn-primary {
        background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
        color: white;
      }

      .nakama-btn-primary:hover {
        background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
        transform: translateY(-1px);
      }

      .nakama-btn-secondary {
        background: rgba(55, 65, 81, 0.5);
        color: white;
        border: 1px solid rgba(55, 65, 81, 0.7);
      }

      .nakama-btn-secondary:hover {
        background: rgba(55, 65, 81, 0.7);
      }

      /* Notification Styles */
      .nakama-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10001;
        animation: nakama-slide-in 0.3s ease;
      }

      .nakama-notification-success {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      }

      .nakama-notification-error {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      }

      @keyframes nakama-slide-in {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    </style>
  `;

  // Inject styles
  if (!document.getElementById('nakama-login-widget-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'nakama-login-widget-styles';
    styleElement.innerHTML = styles;
    document.head.appendChild(styleElement);
  }

  // Initialize widget when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new NakamaLoginWidget();
    });
  } else {
    new NakamaLoginWidget();
  }

})();