# NAKAMA Login Widget - Universal Authentication

A header-integrated login widget that provides wallet connection and profile creation for any website.

## 🚀 Quick Start

Add this script to your website's header:

```html
<script src="https://nakama-production-1850.up.railway.app/nakama-login-widget.js"></script>
```

## 📖 Basic Integration

### Automatic Header Integration

The widget automatically finds and integrates with your website's header:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Your Website</title>
</head>
<body>
    <header>
        <nav>
            <!-- Your existing navigation -->
        </nav>
        <!-- NAKAMA widget will be injected here -->
    </header>
    
    <!-- Load NAKAMA Login Widget -->
    <script src="https://nakama-production-1850.up.railway.app/nakama-login-widget.js"></script>
</body>
</html>
```

### Manual Configuration

```javascript
// Configure the widget
NAKAMA.loginWidget.options = {
  position: 'header-right',     // 'header-right', 'header-left', 'standalone'
  adaptiveStyling: true,        // Adapt to host site's colors (default: true)
  autoTrigger: true,            // Auto-trigger form submissions (default: true)
  autoTriggerDelay: 500,        // Delay before triggering (default: 500ms)
  showLogo: true,               // Show NAKAMA logo
  showChainIndicator: true      // Show active chain indicator
};
```

## 🔧 API Reference

### NAKAMA.connect()

Connects the user's wallet and checks for existing NAKAMA profile.

```javascript
try {
  await NAKAMA.connect();
  console.log('Connected successfully!');
} catch (error) {
  console.error('Connection failed:', error);
}
```

### NAKAMA.disconnect()

Disconnects all connected wallets and clears user session.

```javascript
NAKAMA.disconnect();
console.log('Disconnected successfully!');
```

### NAKAMA.getUser()

Returns the current user's profile data.

```javascript
const user = NAKAMA.getUser();
if (user) {
  console.log('Username:', user.username);
  console.log('Display Name:', user.displayName);
  console.log('Bio:', user.bio);
  console.log('Profile Picture:', user.profilePicture);
  console.log('Verified:', user.isVerified);
}
```

### NAKAMA.getWallets()

Returns all connected wallet addresses.

```javascript
const wallets = NAKAMA.getWallets();
console.log('Solana:', wallets.solana?.address);
console.log('Ethereum:', wallets.ethereum?.address);
console.log('Polygon:', wallets.polygon?.address);
// ... other chains
```

### NAKAMA.getActiveChain()

Returns the currently active chain.

```javascript
const activeChain = NAKAMA.getActiveChain();
console.log('Active chain:', activeChain); // 'solana', 'ethereum', etc.
```

### NAKAMA.getWalletByChain(chain)

Returns the wallet address for a specific chain.

```javascript
const solanaAddress = NAKAMA.getWalletByChain('solana');
const ethAddress = NAKAMA.getWalletByChain('ethereum');
console.log('Solana:', solanaAddress);
console.log('Ethereum:', ethAddress);
```

### NAKAMA.populateInputs(options)

Automatically populates wallet address inputs on the page.

```javascript
// Basic usage - auto-detect and populate all wallet inputs
NAKAMA.populateInputs();

// Advanced usage with custom selectors
NAKAMA.populateInputs({
  selectors: {
    solana: ['input[name="solana-wallet"]', '#sol-address'],
    ethereum: ['input[name="eth-wallet"]', '#eth-address'],
    polygon: ['input[name="polygon-wallet"]', '#polygon-address']
  },
  chainPriority: ['solana', 'ethereum', 'polygon'],
  autoDetect: true
});
```

### NAKAMA.watchInputs(options)

Watches for new wallet address inputs and auto-populates them (useful for dynamic content).

```javascript
// Start watching for wallet inputs
const watcher = NAKAMA.watchInputs({
  interval: 1000,        // Check every 1 second
  maxAttempts: 60,       // Stop after 60 attempts
  selectors: { ... },    // Custom selectors
  chainPriority: [...]   // Chain priority
});

// Stop watching
NAKAMA.stopWatching(watcher);
```

## 🎨 Widget Appearance

### Connect Button (Not Connected)
- Gradient blue-purple button
- "Connect Wallet" text
- Loading spinner when connecting

### User Profile (Connected)
- User avatar (profile picture or generated initials)
- Username and active chain
- Orange hamburger menu icon
- Dropdown with wallet addresses and actions

### Dropdown Menu
- **Active Chains**: List of connected wallets with addresses
- **Quick Actions**: View Profile, Disconnect
- **Chain Switching**: Click any chain to make it active

## 🔐 Authentication Flow

### 1. Wallet Connection
- User clicks "Connect Wallet"
- Widget connects to Phantom wallet
- Retrieves Solana public key

### 2. Profile Check
- Widget checks if wallet address exists in NAKAMA database
- If found: Loads user profile and shows connected state
- If not found: Shows profile creation modal

### 3. Profile Creation (New Users)
- Modal appears with username and bio fields
- User fills out profile information
- Widget creates NAKAMA profile via API
- User is now connected and recognized

## 🎯 Integration Examples

### Data Site with Wallet Inputs

```javascript
// Auto-populate wallet address inputs for data analysis
NAKAMA.populateInputs({
  selectors: {
    solana: ['#portfolio-solana', 'input[name*="solana"]'],
    ethereum: ['#portfolio-ethereum', 'input[name*="ethereum"]'],
    polygon: ['#portfolio-polygon', 'input[name*="polygon"]']
  },
  chainPriority: ['solana', 'ethereum', 'polygon']
});

// Watch for dynamically loaded forms
const watcher = NAKAMA.watchInputs({
  interval: 500,
  maxAttempts: 120
});
```

### E-commerce Site

```javascript
// Check if user is connected
if (NAKAMA.getUser()) {
  const user = NAKAMA.getUser();
  const wallets = NAKAMA.getWallets();
  
  // Display user info
  document.getElementById('user-name').textContent = user.displayName;
  document.getElementById('user-verified').style.display = user.isVerified ? 'block' : 'none';
  
  // Use Solana wallet for payments
  if (wallets.solana) {
    document.getElementById('payment-address').value = wallets.solana.address;
  }
}
```

### DeFi Platform

```javascript
// Auto-fill wallet addresses in transaction forms
function populateWalletAddresses() {
  const wallets = NAKAMA.getWallets();
  
  // Solana transactions
  if (wallets.solana) {
    document.querySelector('[name="solana-address"]').value = wallets.solana.address;
  }
  
  // Ethereum transactions
  if (wallets.ethereum) {
    document.querySelector('[name="ethereum-address"]').value = wallets.ethereum.address;
  }
  
  // Polygon transactions
  if (wallets.polygon) {
    document.querySelector('[name="polygon-address"]').value = wallets.polygon.address;
  }
}

// Call when form loads
populateWalletAddresses();
```

### NFT Marketplace

```javascript
// Display creator profile
function showCreatorProfile() {
  const user = NAKAMA.getUser();
  if (user) {
    document.getElementById('creator-name').textContent = user.displayName;
    document.getElementById('creator-bio').textContent = user.bio;
    document.getElementById('creator-avatar').src = user.profilePicture || generateAvatar(user.username);
    document.getElementById('verified-badge').style.display = user.isVerified ? 'block' : 'none';
  }
}
```

## 🎨 Adaptive Styling

The widget automatically adapts to your site's styling by detecting:

### What Gets Adapted
- **Colors**: Background, text, borders, and accent colors from your header
- **Typography**: Font family, size, and weight from your site
- **Spacing**: Padding and border radius from your header
- **Effects**: Backdrop blur and shadows to match your design

### Position Options
- `'header-right'`: Inject into right side of header (default)
- `'header-left'`: Inject into left side of header
- `'standalone'`: Don't auto-inject, use manually

### Display Options
- `adaptiveStyling`: Adapt to host site's colors (default: true)
- `autoTrigger`: Auto-trigger form submissions after populating inputs (default: true)
- `autoTriggerDelay`: Delay before triggering actions in milliseconds (default: 500)
- `showLogo`: Show NAKAMA logo (default: true)
- `showChainIndicator`: Show active chain indicator (default: true)

### Manual Override
You can override specific styles using CSS custom properties:

```css
:root {
  --nakama-primary: #your-brand-color;
  --nakama-text: #your-text-color;
  --nakama-profile-bg: rgba(your-bg-color, 0.8);
  --nakama-accent: #your-accent-color;
  --nakama-font-family: 'Your Font';
  --nakama-font-size: 14px;
  --nakama-radius: 8px;
}
```

## 🔍 Auto-Detection Patterns

### Header Detection

The widget automatically detects your website's header using these selectors:

1. `header`
2. `.header`
3. `#header`
4. `.navbar`
5. `.nav`
6. `.navigation`
7. `.site-header`
8. `.main-header`
9. `[role="banner"]`

If no header is found, the widget creates a fixed header at the top of the page.

### Wallet Input Detection

The widget automatically detects wallet address inputs using these patterns:

#### Solana Inputs
- `input[name*="solana"]`, `input[name*="sol"]`
- `input[placeholder*="solana"]`, `input[placeholder*="sol"]`
- `input[id*="solana"]`, `input[id*="sol"]`
- `.solana-address`, `.sol-address`
- `#solana-wallet`, `#sol-wallet`

#### Ethereum Inputs
- `input[name*="ethereum"]`, `input[name*="eth"]`
- `input[placeholder*="ethereum"]`, `input[placeholder*="eth"]`
- `input[id*="ethereum"]`, `input[id*="eth"]`
- `.ethereum-address`, `.eth-address`
- `#ethereum-wallet`, `#eth-wallet`

#### Other Chains
- **Polygon**: `polygon`, `matic`
- **Arbitrum**: `arbitrum`, `arb`
- **Optimism**: `optimism`, `op`
- **Base**: `base`
- **BNB Chain**: `bsc`, `bnb`

### Visual Indicators

When inputs are populated, they receive:
- Green left border (`border-left: 3px solid #10b981`)
- Tooltip showing the chain name
- `data-nakama-populated="true"` attribute
- `data-nakama-chain="chain-name"` attribute

### Auto-Triggering Behavior

After populating wallet inputs, the widget automatically:

1. **Form Submissions**: Looks for submit buttons in forms containing the populated inputs
2. **Nearby Buttons**: Finds action buttons near the populated inputs
3. **Common Actions**: Searches for buttons with "search", "analyze", "load", "fetch" text
4. **Wallet-Related**: Looks for buttons mentioning "wallet", "address", "portfolio"

#### Button Detection Patterns

The widget detects these button patterns:
- `button[type="submit"]`, `input[type="submit"]`
- `.submit-btn`, `.search-btn`, `.analyze-btn`, `.load-btn`, `.fetch-btn`
- `button[data-action="search"]`, `button[data-action="analyze"]`
- `.search-wallet-btn`, `.analyze-wallet-btn`, `.load-portfolio-btn`
- Buttons with text containing "search wallet", "analyze portfolio", etc.

#### Configuration

```javascript
// Disable auto-triggering
NAKAMA.loginWidget.options.autoTrigger = false;

// Adjust trigger delay
NAKAMA.loginWidget.options.autoTriggerDelay = 1000; // 1 second
```

## 📱 Responsive Design

The widget is fully responsive and adapts to different screen sizes:

- **Desktop**: Full-featured display with all options
- **Tablet**: Optimized layout for medium screens
- **Mobile**: Compact design with essential features

## 🔒 Security Features

- **Wallet Verification**: Secure verification through NAKAMA's database
- **Profile Validation**: Ensures profiles exist and are verified
- **Secure API**: All requests go through NAKAMA's secure endpoints
- **No Sensitive Data**: Only displays public profile information

## 🚀 Use Cases

### E-commerce Platforms
- User accounts linked to wallet addresses
- Payment address auto-population
- User verification for premium features

### DeFi Applications
- Auto-fill wallet addresses in transaction forms
- Multi-chain wallet support
- User profile integration

### NFT Marketplaces
- Creator profile display
- Wallet verification for listings
- User reputation system

### Gaming Platforms
- Player profile integration
- Wallet addresses for in-game assets
- Cross-platform identity

### Social Media
- Profile integration in posts
- Wallet verification badges
- Creator monetization

### Portfolio Trackers
- Multi-chain wallet aggregation
- User profile customization
- Social features

## 🔧 Troubleshooting

### Common Issues

**Widget not appearing:**
- Check if the script loaded successfully
- Verify header element exists
- Check browser console for errors

**Wallet connection fails:**
- Ensure Phantom wallet is installed
- Check if wallet is unlocked
- Verify network connection

**Profile not found:**
- User may not have a NAKAMA profile
- Check if wallet address is correct
- Verify API endpoint accessibility

**Styling conflicts:**
- Check for CSS conflicts with your site
- Verify z-index values
- Ensure proper header structure

### Debug Mode

Enable debug logging:

```javascript
// Check if NAKAMA widget loaded
console.log('NAKAMA Widget Version:', NAKAMA.version);

// Test connection
NAKAMA.connect()
  .then(() => console.log('Connection successful'))
  .catch(error => console.error('Connection failed:', error));

// Check user status
const user = NAKAMA.getUser();
console.log('Current user:', user);
```

## 📞 Support

For support and questions:
- **Documentation**: [NAKAMA Login Widget Docs](https://nakama-production-1850.up.railway.app/login-widget-demo.html)
- **API Base**: `https://nakama-production-1850.up.railway.app`
- **Widget Version**: 1.0.0

## 🔄 Updates

The widget automatically updates when you reload the script. No manual updates required.

---

**Made with ❤️ by the NAKAMA team**
