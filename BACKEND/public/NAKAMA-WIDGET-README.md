# NAKAMA Widget - Third-Party Integration

A standalone JavaScript widget that allows other websites to integrate NAKAMA profiles and wallet data.

## 🚀 Quick Start

Add this script to your website:

```html
<script src="https://nakama-production-1850.up.railway.app/nakama-widget.js"></script>
```

## 📖 Basic Usage

### Embed a Profile Widget

```javascript
// Embed a user profile
NAKAMA.embed('username', 'container-id', {
  theme: 'dark',    // 'dark' or 'light'
  size: 'medium',  // 'small', 'medium', 'large'
  showBio: true,   // Show user bio
  showWallet: true, // Show wallet addresses
  showVerified: true // Show verification status
});
```

### HTML Container

```html
<div id="nakama-profile"></div>
<script>
  NAKAMA.embed('beripool', 'nakama-profile');
</script>
```

## 🔧 API Reference

### NAKAMA.embed(username, containerId, options)

Embeds a profile widget into a container element.

**Parameters:**
- `username` (string): NAKAMA username to display
- `containerId` (string): ID of the HTML container element
- `options` (object): Widget configuration options

**Options:**
```javascript
{
  theme: 'dark' | 'light',           // Widget theme
  size: 'small' | 'medium' | 'large', // Widget size
  showBio: boolean,                  // Show user bio (default: true)
  showWallet: boolean,               // Show wallet addresses (default: true)
  showVerified: boolean              // Show verification status (default: true)
}
```

### NAKAMA.getProfile(username)

Fetches profile data for a username.

**Parameters:**
- `username` (string): NAKAMA username

**Returns:** Promise resolving to profile object or null

```javascript
const profile = await NAKAMA.getProfile('username');
console.log(profile);
// {
//   found: true,
//   username: 'username',
//   displayName: 'DisplayName',
//   bio: 'User bio...',
//   profilePicture: 'https://...',
//   isVerified: true,
//   wallets: { ... }
// }
```

### NAKAMA.verify(username, walletAddress)

Verifies if a wallet address belongs to a NAKAMA user.

**Parameters:**
- `username` (string): NAKAMA username
- `walletAddress` (string): Wallet address to verify

**Returns:** Promise resolving to boolean

```javascript
const isVerified = await NAKAMA.verify('username', 'wallet-address');
if (isVerified) {
  console.log('Wallet belongs to NAKAMA user!');
}
```

## 🎨 Widget Sizes

### Small (280px)
```javascript
NAKAMA.embed('username', 'container', { size: 'small' });
```

### Medium (320px) - Default
```javascript
NAKAMA.embed('username', 'container', { size: 'medium' });
```

### Large (400px)
```javascript
NAKAMA.embed('username', 'container', { size: 'large' });
```

## 🌓 Themes

### Dark Theme (Default)
```javascript
NAKAMA.embed('username', 'container', { theme: 'dark' });
```

### Light Theme
```javascript
NAKAMA.embed('username', 'container', { theme: 'light' });
```

## 📱 Responsive Design

The widget is fully responsive and adapts to different screen sizes:

- **Mobile**: Automatically adjusts to smaller screens
- **Tablet**: Optimized layout for medium screens
- **Desktop**: Full-featured display with all options

## 🎯 Use Cases

### DeFi Platforms
```javascript
// Verify wallet ownership before allowing transactions
const isVerified = await NAKAMA.verify('username', userWalletAddress);
if (isVerified) {
  // Allow transaction
  processTransaction();
} else {
  // Show warning or require additional verification
  showVerificationWarning();
}
```

### NFT Marketplaces
```javascript
// Display creator profile
NAKAMA.embed('creator-username', 'creator-profile', {
  showVerified: true,
  showWallet: true
});
```

### Gaming Platforms
```javascript
// Show player profile with wallet info
NAKAMA.embed('player-username', 'player-card', {
  showBio: true,
  showWallet: true,
  theme: 'dark'
});
```

### Social Media Integration
```javascript
// Embed profile in posts
NAKAMA.embed('post-author', 'author-profile', {
  size: 'small',
  showBio: false,
  showWallet: false
});
```

## 🔒 Security Features

- **Wallet Verification**: Verify wallet ownership through NAKAMA's database
- **Profile Validation**: Ensure profiles exist and are verified
- **Secure API**: All requests go through NAKAMA's secure API
- **No Sensitive Data**: Widget only displays public profile information

## 🚀 Advanced Integration

### Custom Styling

The widget uses CSS classes that can be customized:

```css
.nakama-widget {
  /* Custom widget styling */
}

.nakama-theme-dark {
  /* Dark theme overrides */
}

.nakama-theme-light {
  /* Light theme overrides */
}
```

### Event Handling

```javascript
// Listen for widget interactions
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('nakama-profile-link')) {
    // Handle profile link clicks
    console.log('User clicked NAKAMA profile link');
  }
});
```

### Error Handling

```javascript
try {
  await NAKAMA.embed('username', 'container');
} catch (error) {
  console.error('NAKAMA Widget Error:', error);
  // Handle error (user not found, network issue, etc.)
}
```

## 📊 Widget Features

### Profile Information
- ✅ Username with display name
- ✅ Profile picture or generated avatar
- ✅ User bio
- ✅ Verification status
- ✅ Registration date

### Wallet Information
- ✅ Solana wallet address
- ✅ EVM wallet addresses (Ethereum, Polygon, etc.)
- ✅ Primary wallet indicator
- ✅ Wallet verification status

### Interactive Elements
- ✅ Clickable profile links
- ✅ Hover effects
- ✅ Responsive design
- ✅ Theme switching

## 🔧 Troubleshooting

### Common Issues

**Widget not loading:**
- Check if the script URL is accessible
- Verify the container element exists
- Check browser console for errors

**Content Security Policy (CSP) errors:**
- If you see "Refused to execute inline script" errors, avoid inline JavaScript
- Use external script files instead of inline `<script>` tags
- The demo page uses external scripts to avoid CSP issues

**Profile not found:**
- Verify the username exists on NAKAMA
- Check for typos in the username
- Ensure the user has a public profile

**Styling issues:**
- Check for CSS conflicts
- Verify theme options are correct
- Ensure container has proper dimensions

### Debug Mode

Enable debug logging:

```javascript
// Check if NAKAMA widget loaded
console.log('NAKAMA Widget Version:', NAKAMA.version);

// Test API connection
NAKAMA.getProfile('test-username')
  .then(profile => console.log('API Working:', profile))
  .catch(error => console.error('API Error:', error));
```

## 📞 Support

For support and questions:
- **Documentation**: [NAKAMA Widget Docs](https://nakama-production-1850.up.railway.app/widget-example.html)
- **API Base**: `https://nakama-production-1850.up.railway.app`
- **Widget Version**: 1.0.0

## 🔄 Updates

The widget automatically updates when you reload the script. No manual updates required.

---

**Made with ❤️ by the NAKAMA team**
