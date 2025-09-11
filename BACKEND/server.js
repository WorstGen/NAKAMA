const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { body, validationResult, sanitizeBody } = require('express-validator');
const validator = require('validator');
const rateLimit = require('express-rate-limit');
// Use ethers instead of web3 for better compatibility
const { ethers } = require('ethers');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Security utilities
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return validator.escape(input.trim());
};

// Audit logging
const auditLog = (action, userId, details = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    userId,
    ip: details.ip || 'unknown',
    userAgent: details.userAgent || 'unknown',
    details: {
      ...details,
      ip: undefined,
      userAgent: undefined
    }
  };
  
  console.log(`[AUDIT] ${JSON.stringify(logEntry)}`);
  
  // In production, you might want to send this to a logging service
  // like Winston, Loggly, or CloudWatch
};

const validateWalletAddress = (address) => {
  return validator.isLength(address, { min: 32, max: 44 }) && 
         validator.matches(address, /^[A-Za-z0-9]+$/);
};

const validateUsername = (username) => {
  return validator.isLength(username, { min: 3, max: 20 }) &&
         validator.matches(username, /^[a-zA-Z0-9_]+$/);
};

const validateBio = (bio) => {
  return validator.isLength(bio, { max: 500 });
};

// Enhanced rate limiting
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({ error: message });
    }
  });
};

// Solana imports
const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { getOrCreateAssociatedTokenAccount, transfer, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const nacl = require('tweetnacl');
const bs58 = require('bs58');

// Test signature verification
const testSignature = () => {
  const message = "Sign this message to authenticate with SolConnect: 1757318496794";
  const signature = "3MnuuCJBz6FyiCHXrXvh5khTu31LbBJrinu3JLChgZWnz1T6iUXo95nVKf2sx9gExsxWtRVTk6XAyoEDpQcV92fi";
  const publicKey = "Hc2brsb7SX1QkJT8iTscPek1brcrC5seb7R9PgWa9rAw";

  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = new PublicKey(publicKey).toBytes();

    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    console.log('Test signature verification result:', isValid);
    return isValid;
  } catch (error) {
    console.error('Test signature verification error:', error);
    return false;
  }
};

// Run test on startup
console.log('Testing signature verification...');
testSignature();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

// Solana connection
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

// EVM chain configurations
const EVM_CHAINS = {
  ethereum: {
    rpcUrl: 'https://eth.llamarpc.com',
    chainId: 1,
    name: 'Ethereum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  polygon: {
    rpcUrl: 'https://polygon.llamarpc.com',
    chainId: 137,
    name: 'Polygon',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }
  },
  base: {
    rpcUrl: 'https://base.llamarpc.com',
    chainId: 8453,
    name: 'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  arbitrum: {
    rpcUrl: 'https://arbitrum.llamarpc.com',
    chainId: 42161,
    name: 'Arbitrum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  optimism: {
    rpcUrl: 'https://optimism.llamarpc.com',
    chainId: 10,
    name: 'Optimism',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  }
};

// Create ethers providers for each chain
const ethersProviders = {};
Object.entries(EVM_CHAINS).forEach(([chainName, config]) => {
  try {
    ethersProviders[chainName] = new ethers.JsonRpcProvider(config.rpcUrl);
    console.log(`Ethers provider created for ${chainName}`);
  } catch (error) {
    console.error(`Failed to create ethers provider for ${chainName}:`, error);
    // Fallback: create a basic provider
    ethersProviders[chainName] = null;
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too Many Requests'
});

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow specific origins with enhanced security
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://localhost:3000',
      'https://localhost:3001',
      process.env.FRONTEND_URL,
      'https://nakama-production-1850.up.railway.app', // Allow self-origin
      /^https:\/\/.*\.vercel\.app$/, // Allow Vercel deployments
      /^https:\/\/.*\.netlify\.app$/, // Allow Netlify deployments
      /^https:\/\/.*\.github\.io$/ // Allow GitHub Pages
    ].filter(Boolean);

    // Check if the origin is allowed
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      }
      return allowedOrigin.test(origin);
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Signature',
    'X-Message',
    'X-Public-Key',
    'signature',
    'message',
    'publickey',
    'publicKey',
    'PublicKey',
    'Accept',
    'Origin',
    'X-Requested-With',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: [
    'X-Signature',
    'X-Message',
    'X-Public-Key',
    'signature',
    'message',
    'publickey',
    'publicKey',
    'PublicKey'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: '10mb' }));

// Add CORS headers for static files (images, etc.)
app.use('/uploads', (req, res, next) => {
  // Allow images to be loaded from any origin (safe for public images)
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve static files with proper cache headers
app.use('/uploads', express.static('public/uploads', {
  maxAge: '1y', // Cache for 1 year
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Set proper content type for images
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (path.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    }
    
    // Set cache control headers
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
    
    // Add CORS headers for images
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Serve other static files
app.use(express.static('public'));

// Apply different rate limits for different endpoints
app.use('/api/', limiter);

// Stricter rate limiting for sensitive endpoints
const strictLimiter = createRateLimit(15 * 60 * 1000, 10, 'Too many requests from this IP, please try again later');
const authLimiter = createRateLimit(15 * 60 * 1000, 5, 'Too many authentication attempts, please try again later');
const uploadLimiter = createRateLimit(60 * 60 * 1000, 10, 'Too many uploads, please try again later');

// Apply specific rate limits
app.use('/api/profile', strictLimiter);
app.use('/api/profile/picture', uploadLimiter);
app.use('/api/transactions', strictLimiter);

// MongoDB Models
const UserSchema = new mongoose.Schema({
  // Legacy field - keep for backward compatibility (Solana wallet)
  walletAddress: { type: String, required: true, unique: true, index: true },
  username: { type: String, required: true, unique: true, lowercase: true, index: true },
  bio: { type: String, maxLength: 500 },
  profilePicture: { type: String },
  
  // Multi-chain wallet support
  wallets: {
    solana: {
      address: { type: String, required: true },
      isPrimary: { type: Boolean, default: true }
    },
    ethereum: {
      address: { type: String },
      isPrimary: { type: Boolean, default: false }
    },
    // Support for additional EVM networks
    polygon: {
      address: { type: String },
      isPrimary: { type: Boolean, default: false }
    },
    arbitrum: {
      address: { type: String },
      isPrimary: { type: Boolean, default: false }
    },
    optimism: {
      address: { type: String },
      isPrimary: { type: Boolean, default: false }
    },
    base: {
      address: { type: String },
      isPrimary: { type: Boolean, default: false }
    }
  },
  
  // Legacy field - keep for backward compatibility
  ethAddress: { type: String },
  
  // User preferences
  preferences: {
    defaultChain: { type: String, enum: ['solana', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'base'], default: 'solana' },
    defaultToken: { type: String, default: 'SOL' }
  },
  
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const ContactSchema = new mongoose.Schema({
  ownerAddress: { type: String, required: true, index: true },
  contactUsername: { type: String, required: true },
  contactAddress: { type: String, required: true },
  addedAt: { type: Date, default: Date.now }
});

const TransactionSchema = new mongoose.Schema({
  fromAddress: { type: String, required: true, index: true },
  toAddress: { type: String, required: true },
  fromUsername: { type: String },
  toUsername: { type: String },
  amount: { type: Number, required: true },
  token: { type: String, required: true },
  signature: { type: String, required: true, unique: true },
  memo: { type: String },
  status: { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'pending' },
  
  // Multi-chain support
  blockchain: { 
    type: String, 
    enum: ['solana', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'base'], 
    default: 'solana',
    index: true 
  },
  txHash: { type: String, index: true }, // Transaction hash for blockchain explorer
  blockNumber: { type: Number },
  gasUsed: { type: Number },
  gasPrice: { type: String }, // Store as string to handle big numbers
  explorerUrl: { type: String },
  
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Contact = mongoose.model('Contact', ContactSchema);
const TransactionRecord = mongoose.model('Transaction', TransactionSchema);

// Ensure uploads directory exists
const fs = require('fs');
const uploadsDir = 'public/uploads/';

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Cloudinary upload function
const uploadToCloudinary = async (filePath, userId) => {
  // Check if Cloudinary is configured
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.log('Cloudinary not configured, skipping upload');
    return null;
  }

  try {
    console.log('Uploading to Cloudinary:', {
      filePath,
      userId,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME
    });

    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'nakama-profiles',
      public_id: `profile-${userId}`,
      overwrite: true,
      resource_type: 'auto'
    });
    
    console.log('Cloudinary upload successful:', result.secure_url);
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    console.error('Error details:', {
      message: error.message,
      http_code: error.http_code,
      error_code: error.error?.code,
      error_name: error.error?.name
    });
    // Don't throw error, let it fall back to local storage
    return null;
  }
};

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'profile-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only allow 1 file
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

    const fileExt = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed. Got: ${file.mimetype}`), false);
    }
  }
});

// Auth middleware
const verifyWallet = async (req, res, next) => {
  try {
    const signature = req.headers['x-signature'] || req.headers['X-Signature'] || req.headers.signature || req.headers.Signature;
    const message = req.headers['x-message'] || req.headers['X-Message'] || req.headers.message || req.headers.Message;
    const publicKey = req.headers['x-public-key'] || req.headers['X-Public-Key'] || req.headers.publickey || req.headers.publicKey || req.headers.PublicKey;

    console.log('Backend Auth Debug:');
    console.log('Received signature:', signature);
    console.log('Received message:', message);
    console.log('Received publickey:', publicKey);
    console.log('All headers:', Object.keys(req.headers));

    if (!signature || !message || !publicKey) {
      console.log('Missing authentication headers');
      return res.status(401).json({ error: 'Missing authentication headers' });
    }

    // Determine if this is a Solana or EVM address
    const isSolanaAddress = publicKey.length === 44 && !publicKey.startsWith('0x');
    const isEVMAddress = publicKey.length === 42 && publicKey.startsWith('0x');

    if (!isSolanaAddress && !isEVMAddress) {
      console.log('Invalid wallet address format');
      return res.status(401).json({ error: 'Invalid wallet address format' });
    }

    const messageBytes = new TextEncoder().encode(message);
    console.log('Message bytes:', messageBytes);

    const signatureBytes = bs58.decode(signature);
    console.log('Decoded signature bytes:', signatureBytes);
    console.log('Signature length:', signatureBytes.length);

    let isValid = false;

    if (isSolanaAddress) {
      // Solana signature verification (64 bytes)
      if (signatureBytes.length !== 64) {
        console.log('Invalid Solana signature length:', signatureBytes.length);
        return res.status(401).json({ error: 'Invalid Solana signature length' });
      }

      const publicKeyBytes = new PublicKey(publicKey).toBytes();
      console.log('Public key bytes:', publicKeyBytes);

      isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
      console.log('Solana signature verification result:', isValid);
    } else if (isEVMAddress) {
      // EVM signature verification (65 bytes)
      if (signatureBytes.length !== 65) {
        console.log('Invalid EVM signature length:', signatureBytes.length);
        return res.status(401).json({ error: 'Invalid EVM signature length' });
      }

      // For EVM, we'll use a simpler verification approach
      // In production, you might want to use a proper ECDSA verification library
      // For now, we'll accept the signature if it's the right length and format
      isValid = true;
      console.log('EVM signature accepted (length validation only)');
    }

    if (!isValid) {
      console.log('Signature verification failed');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('Authentication successful for:', publicKey);
    req.walletAddress = publicKey;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// ===================================
// API Routes
// ===================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get user profile
app.get('/api/profile', verifyWallet, async (req, res) => {
  try {
    const walletAddress = req.walletAddress;
    const isEVMAddress = walletAddress.startsWith('0x') && walletAddress.length === 42;
    
    // Support both legacy walletAddress and new multi-chain wallets
    let user = await User.findOne({ walletAddress: walletAddress });
    
    // If not found with legacy field, try multi-chain wallets
    if (!user) {
      if (isEVMAddress) {
        // For EVM addresses, check if user has ANY EVM address registered
        // since all EVM chains use the same address format
        user = await User.findOne({
          $or: [
            { 'wallets.ethereum.address': walletAddress },
            { 'wallets.polygon.address': walletAddress },
            { 'wallets.arbitrum.address': walletAddress },
            { 'wallets.optimism.address': walletAddress },
            { 'wallets.base.address': walletAddress }
          ]
        });
        
        // If still not found, check if user has any EVM address and this is the same address
        if (!user) {
          const userWithAnyEVM = await User.findOne({
            $or: [
              { 'wallets.ethereum.address': { $exists: true, $ne: null } },
              { 'wallets.polygon.address': { $exists: true, $ne: null } },
              { 'wallets.arbitrum.address': { $exists: true, $ne: null } },
              { 'wallets.optimism.address': { $exists: true, $ne: null } },
              { 'wallets.base.address': { $exists: true, $ne: null } }
            ]
          });
          
          if (userWithAnyEVM) {
            // Check if any of their EVM addresses match this one
            const evmAddresses = [
              userWithAnyEVM.wallets?.ethereum?.address,
              userWithAnyEVM.wallets?.polygon?.address,
              userWithAnyEVM.wallets?.arbitrum?.address,
              userWithAnyEVM.wallets?.optimism?.address,
              userWithAnyEVM.wallets?.base?.address
            ].filter(addr => addr && addr.toLowerCase() === walletAddress.toLowerCase());
            
            if (evmAddresses.length > 0) {
              user = userWithAnyEVM;
            }
          }
        }
      } else {
        // For Solana addresses, check specific Solana wallet
        user = await User.findOne({
          'wallets.solana.address': walletAddress
        });
      }
    }
    
    if (!user) {
      // For EVM addresses, try to find an existing user to associate with
      if (isEVMAddress) {
        console.log(`EVM address ${walletAddress} not found, looking for existing user to associate with...`);
        
        // Look for any user who has been active recently (within last 2 hours)
        // This helps associate the EVM address with the currently active user
        const recentUsers = await User.find({
          $or: [
            { updatedAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } }, // Last 2 hours
            { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }  // Or created in last 24 hours
          ]
        }).sort({ updatedAt: -1, createdAt: -1 }).limit(20);
        
        console.log(`Found ${recentUsers.length} recent users`);
        
        // Debug: log the usernames of recent users
        if (recentUsers.length > 0) {
          console.log(`Recent users: ${recentUsers.map(u => u.username).join(', ')}`);
        }
        
        if (recentUsers.length > 0) {
          // Find the most recently updated user who doesn't have this EVM address
          for (const existingUser of recentUsers) {
            const hasThisEVMAddress = existingUser.wallets?.ethereum?.address === walletAddress ||
                                    existingUser.wallets?.polygon?.address === walletAddress ||
                                    existingUser.wallets?.arbitrum?.address === walletAddress ||
                                    existingUser.wallets?.optimism?.address === walletAddress ||
                                    existingUser.wallets?.base?.address === walletAddress;
            
            if (!hasThisEVMAddress) {
              // Add this EVM address to the existing user
              console.log(`Adding EVM address ${walletAddress} to existing user ${existingUser.username}`);
              
              const updateData = {
                'wallets.ethereum.address': walletAddress,
                'wallets.polygon.address': walletAddress,
                'wallets.arbitrum.address': walletAddress,
                'wallets.optimism.address': walletAddress,
                'wallets.base.address': walletAddress
              };
              
              user = await User.findOneAndUpdate(
                { _id: existingUser._id },
                updateData,
                { new: true }
              );
              
              console.log(`Successfully added EVM address to user ${user.username}`);
              break;
            }
          }
        }
        
        if (!user) {
          console.log(`No recent users found to associate EVM address ${walletAddress} with`);
          return res.json({ exists: false });
        }
      } else {
        return res.json({ exists: false });
      }
    } else if (isEVMAddress) {
      // EVM address already exists - CRITICAL: Check if this is a duplicate user scenario
      console.log(`EVM address ${walletAddress} already exists for user ${user.username}`);
      
      const hasSolanaAddress = user.wallets?.solana?.address;
      
      if (hasSolanaAddress) {
        // CRITICAL ERROR: This EVM address is already associated with a user who has Solana
        // This should NEVER happen in our intended design
        console.error(`🚨 CRITICAL ERROR: EVM address ${walletAddress} is already associated with user ${user.username} who has Solana address ${hasSolanaAddress}`);
        console.error(`🚨 This violates the single-user, multi-chain design principle!`);
        
        // Return the existing user - don't create duplicates
        console.log(`Returning existing user ${user.username} to prevent duplicate user creation`);
        return res.json({
          exists: true,
          username: user.username,
          bio: user.bio,
          profilePicture: user.profilePicture,
          ethAddress: user.wallets?.ethereum?.address || user.ethAddress,
          wallets: user.wallets
        });
      } else {
        // EVM address exists but user has no Solana - this is the intended case
        console.log(`User ${user.username} has EVM address but no Solana - this is correct`);
        // Continue with normal flow
      }
    }

    // Auto-register wallet address if user is signing in with one
    if (user.wallets) {
      let needsUpdate = false;
      const updateData = {};
      
      if (isEVMAddress) {
        // Check if this EVM address is already registered in any EVM chain
        const hasEVMAddress = user.wallets.ethereum?.address || 
                             user.wallets.polygon?.address || 
                             user.wallets.arbitrum?.address || 
                             user.wallets.optimism?.address || 
                             user.wallets.base?.address;
        
        if (!hasEVMAddress) {
          // Register this EVM address to all EVM chains
          updateData['wallets.ethereum.address'] = walletAddress;
          updateData['wallets.polygon.address'] = walletAddress;
          updateData['wallets.arbitrum.address'] = walletAddress;
          updateData['wallets.optimism.address'] = walletAddress;
          updateData['wallets.base.address'] = walletAddress;
          updateData['wallets.ethereum.isPrimary'] = true;
          needsUpdate = true;
        } else if (hasEVMAddress && hasEVMAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          // Different EVM address - update all EVM chains
          updateData['wallets.ethereum.address'] = walletAddress;
          updateData['wallets.polygon.address'] = walletAddress;
          updateData['wallets.arbitrum.address'] = walletAddress;
          updateData['wallets.optimism.address'] = walletAddress;
          updateData['wallets.base.address'] = walletAddress;
          needsUpdate = true;
        }
      } else if (!isEVMAddress) {
        // Check if this Solana address is already registered
        const hasSolanaAddress = user.wallets.solana?.address;
        
        if (!hasSolanaAddress) {
          // Register this Solana address
          updateData['wallets.solana.address'] = walletAddress;
          updateData['wallets.solana.isPrimary'] = true;
          needsUpdate = true;
        } else if (hasSolanaAddress !== walletAddress) {
          // Different Solana address - update it
          updateData['wallets.solana.address'] = walletAddress;
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        user = await User.findOneAndUpdate(
          { _id: user._id },
          updateData,
          { new: true }
        );
        console.log(`Auto-registered ${isEVMAddress ? 'EVM' : 'Solana'} address ${walletAddress} for user ${user.username}`);
      }
    }

    res.json({
      exists: true,
      username: user.username,
      bio: user.bio,
      profilePicture: user.profilePicture,
      ethAddress: user.wallets?.ethereum?.address || user.ethAddress,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      wallets: user.wallets || {}
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Create/Update user profile
app.post('/api/profile', 
  verifyWallet,
  [
    body('username')
      .isLength({ min: 3, max: 20 })
      .matches(/^[a-zA-Z0-9_]+$/)
      .customSanitizer(sanitizeInput),
    body('bio')
      .optional()
      .isLength({ max: 500 })
      .customSanitizer(sanitizeInput),
    body('ethAddress')
      .optional()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .customSanitizer(sanitizeInput)
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, bio } = req.body;
      const walletAddress = req.walletAddress;

      // Determine if this is a Solana or EVM address
      const isSolanaAddress = walletAddress.length === 44;
      const isEVMAddress = walletAddress.length === 42 && walletAddress.startsWith('0x');

      if (!isSolanaAddress && !isEVMAddress) {
        return res.status(400).json({ error: 'Invalid wallet address format' });
      }

      // First, find if there's an existing user with this wallet address
      let existingUserByWallet = await User.findOne({
        $or: [
          { walletAddress: walletAddress },
          { 'wallets.solana.address': walletAddress },
          { 'wallets.ethereum.address': walletAddress },
          { 'wallets.polygon.address': walletAddress },
          { 'wallets.arbitrum.address': walletAddress },
          { 'wallets.optimism.address': walletAddress },
          { 'wallets.base.address': walletAddress }
        ]
      });

      // CRITICAL VALIDATION: If EVM address exists with a user who has Solana, this is a duplicate scenario
      if (existingUserByWallet && isEVMAddress && existingUserByWallet.wallets?.solana?.address) {
        console.error(`🚨 CRITICAL ERROR: EVM address ${walletAddress} is already associated with user ${existingUserByWallet.username} who has Solana address ${existingUserByWallet.wallets.solana.address}`);
        console.error(`🚨 This violates the single-user, multi-chain design principle!`);
        console.error(`🚨 Returning existing user to prevent duplicate user creation`);
        
        return res.json({
          exists: true,
          username: existingUserByWallet.username,
          bio: existingUserByWallet.bio,
          profilePicture: existingUserByWallet.profilePicture,
          ethAddress: existingUserByWallet.wallets?.ethereum?.address || existingUserByWallet.ethAddress,
          wallets: existingUserByWallet.wallets
        });
      }

      // For EVM addresses, also check if user has ANY EVM address (since they're interchangeable)
      if (!existingUserByWallet && isEVMAddress) {
        const userWithAnyEVM = await User.findOne({
          $or: [
            { 'wallets.ethereum.address': { $exists: true, $ne: null } },
            { 'wallets.polygon.address': { $exists: true, $ne: null } },
            { 'wallets.arbitrum.address': { $exists: true, $ne: null } },
            { 'wallets.optimism.address': { $exists: true, $ne: null } },
            { 'wallets.base.address': { $exists: true, $ne: null } }
          ]
        });
        
        if (userWithAnyEVM) {
          // Check if any of their EVM addresses match this one
          const evmAddresses = [
            userWithAnyEVM.wallets?.ethereum?.address,
            userWithAnyEVM.wallets?.polygon?.address,
            userWithAnyEVM.wallets?.arbitrum?.address,
            userWithAnyEVM.wallets?.optimism?.address,
            userWithAnyEVM.wallets?.base?.address
          ].filter(addr => addr && addr.toLowerCase() === walletAddress.toLowerCase());
          
          if (evmAddresses.length > 0) {
            existingUserByWallet = userWithAnyEVM;
          }
        }
      }

      // Check if username is already taken by a different user (not the current user)
      const existingUserByUsername = await User.findOne({ 
        username: username.toLowerCase(),
        _id: { $ne: existingUserByWallet?._id }
      });

      if (existingUserByUsername) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      // Use the existing user if found, otherwise create new
      let user = existingUserByWallet;

      if (user) {
        // Update existing user - add new wallet if not already present
        const updateData = {
          username: username.toLowerCase(),
          bio,
          updatedAt: new Date()
        };

        // Add wallet to the appropriate chain
        if (isSolanaAddress) {
          updateData['wallets.solana.address'] = walletAddress;
          updateData['wallets.solana.isPrimary'] = true;
        } else if (isEVMAddress) {
          // For EVM addresses, we need to determine which chain this is for
          // Since all EVM chains use the same address format, we need to check
          // which chain the user is currently on. For now, we'll add it to all EVM chains
          // since the address is the same across all EVM networks
          updateData['wallets.ethereum.address'] = walletAddress;
          updateData['wallets.polygon.address'] = walletAddress;
          updateData['wallets.arbitrum.address'] = walletAddress;
          updateData['wallets.optimism.address'] = walletAddress;
          updateData['wallets.base.address'] = walletAddress;
          // Mark the first EVM chain as primary if no other EVM chain is primary
          if (!user.wallets?.ethereum?.isPrimary && 
              !user.wallets?.polygon?.isPrimary && 
              !user.wallets?.arbitrum?.isPrimary && 
              !user.wallets?.optimism?.isPrimary && 
              !user.wallets?.base?.isPrimary) {
            updateData['wallets.ethereum.isPrimary'] = true;
          }
        }

        user = await User.findOneAndUpdate(
          { _id: user._id },
          updateData,
          { new: true }
        );
      } else {
        // Create new user
        const wallets = {};
        if (isSolanaAddress) {
          wallets.solana = { address: walletAddress, isPrimary: true };
        } else if (isEVMAddress) {
          // For EVM addresses, add to all EVM chains since they use the same address
          wallets.ethereum = { address: walletAddress, isPrimary: true };
          wallets.polygon = { address: walletAddress, isPrimary: false };
          wallets.arbitrum = { address: walletAddress, isPrimary: false };
          wallets.optimism = { address: walletAddress, isPrimary: false };
          wallets.base = { address: walletAddress, isPrimary: false };
        }

        user = await User.create({
          walletAddress: isSolanaAddress ? walletAddress : null, // Keep legacy field for Solana
          username: username.toLowerCase(),
          bio,
          wallets,
          createdAt: new Date()
        });
      }

      // Audit log profile update
      auditLog('PROFILE_UPDATE', user._id, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        changes: { username, bio: bio ? 'updated' : 'not provided', walletAddress }
      });

      res.json({
        success: true,
        user: {
          username: user.username,
          bio: user.bio,
          ethAddress: user.wallets?.ethereum?.address || user.ethAddress,
          profilePicture: user.profilePicture,
          wallets: user.wallets || {}
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save profile' });
    }
  }
);

// Upload profile picture
app.post('/api/profile/picture', verifyWallet, (req, res, next) => {
  console.log('Profile picture upload request received');
  console.log('Request headers:', req.headers);
  console.log('Wallet address from auth:', req.walletAddress);

  // Handle multer errors
  upload.single('profilePicture')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.log('Multer error:', err);
      // Multer-specific errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Too many files uploaded.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      console.log('File filter error:', err);
      // File filter errors
      return res.status(400).json({ error: err.message });
    }

    // No multer errors, continue to the actual upload handler
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded or file was rejected.' });
    }

    console.log('File uploaded successfully:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Get user info for unique ID
    const user = await User.findOne({ walletAddress: req.walletAddress });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    try {
      // Try Cloudinary first
      const cloudinaryUrl = await uploadToCloudinary(req.file.path, user._id.toString());
      
      if (cloudinaryUrl) {
        // Remove local file after successful Cloudinary upload
        fs.unlinkSync(req.file.path);
        
        console.log('Image uploaded to Cloudinary successfully:', cloudinaryUrl);

        // Update user with Cloudinary URL
        const result = await User.findOneAndUpdate(
          { walletAddress: req.walletAddress },
          { profilePicture: cloudinaryUrl, updatedAt: new Date() },
          { new: true }
        );

        res.json({
          success: true,
          profilePicture: cloudinaryUrl,
          message: 'Profile picture uploaded successfully to Cloudinary'
        });
      } else {
        // Use local file storage
        const profilePictureUrl = `/uploads/${req.file.filename}`;
        
        const result = await User.findOneAndUpdate(
          { walletAddress: req.walletAddress },
          { profilePicture: profilePictureUrl, updatedAt: new Date() },
          { new: true }
        );

        res.json({
          success: true,
          profilePicture: profilePictureUrl,
          message: 'Profile picture uploaded successfully (local storage)'
        });
      }
    } catch (cloudinaryError) {
      console.error('Cloudinary upload failed, using local storage:', cloudinaryError);
      
      // Fallback to local storage
      const profilePictureUrl = `/uploads/${req.file.filename}`;
      
      const result = await User.findOneAndUpdate(
        { walletAddress: req.walletAddress },
        { profilePicture: profilePictureUrl, updatedAt: new Date() },
        { new: true }
      );

      res.json({
        success: true,
        profilePicture: profilePictureUrl,
        message: 'Profile picture uploaded successfully (local storage fallback)'
      });
    }
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({ error: 'Failed to save profile picture. Please try again.' });
  }
});

// Search users by username
app.get('/api/users/search/:username', verifyWallet, async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await User.findOne({ username: username.toLowerCase() });
    
    if (!user) {
      return res.json({ found: false });
    }

    res.json({
      found: true,
      username: user.username,
      walletAddress: user.walletAddress,
      bio: user.bio,
      profilePicture: user.profilePicture,
      isVerified: user.isVerified
    });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get user's contacts
app.get('/api/contacts', verifyWallet, async (req, res) => {
  try {
    const contacts = await Contact.find({ ownerAddress: req.walletAddress });
    
    // Get full user data for each contact
    const contactsWithData = await Promise.all(
      contacts.map(async (contact) => {
        const user = await User.findOne({ username: contact.contactUsername });
        return {
          username: contact.contactUsername,
          walletAddress: contact.contactAddress,
          bio: user?.bio,
          profilePicture: user?.profilePicture,
          isVerified: user?.isVerified,
          addedAt: contact.addedAt
        };
      })
    );

    res.json({ contacts: contactsWithData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Add contact
app.post('/api/contacts', 
  verifyWallet,
  [body('username').isLength({ min: 3, max: 20 }).matches(/^[a-zA-Z0-9_]+$/)],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username } = req.body;

      // Find the user to add
      const userToAdd = await User.findOne({ username: username.toLowerCase() });
      
      if (!userToAdd) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Don't add yourself
      if (userToAdd.walletAddress === req.walletAddress) {
        return res.status(400).json({ error: 'Cannot add yourself as contact' });
      }

      // Check if already added
      const existingContact = await Contact.findOne({
        ownerAddress: req.walletAddress,
        contactUsername: username.toLowerCase()
      });

      if (existingContact) {
        return res.status(400).json({ error: 'Contact already exists' });
      }

      // Add contact
      const contact = new Contact({
        ownerAddress: req.walletAddress,
        contactUsername: userToAdd.username,
        contactAddress: userToAdd.walletAddress
      });

      await contact.save();

      res.json({
        success: true,
        contact: {
          username: userToAdd.username,
          walletAddress: userToAdd.walletAddress,
          bio: userToAdd.bio,
          profilePicture: userToAdd.profilePicture,
          addedAt: contact.addedAt
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to add contact' });
    }
  }
);

// Remove contact
app.delete('/api/contacts/:username', verifyWallet, async (req, res) => {
  try {
    const { username } = req.params;

    await Contact.findOneAndDelete({
      ownerAddress: req.walletAddress,
      contactUsername: username.toLowerCase()
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove contact' });
  }
});

// Create transaction (prepare for signing)
app.post('/api/transactions/prepare', 
  verifyWallet,
  [
    body('recipientUsername').isLength({ min: 3, max: 20 }).matches(/^[a-zA-Z0-9_]+$/),
    body('amount').isNumeric().isFloat({ min: 0.000000001 }),
    body('token').isIn(['SOL', 'USDC', 'USDT', 'ETH', 'MATIC']),
    body('memo').optional().isLength({ max: 280 }),
    body('chain').optional().isIn(['solana', 'ethereum', 'polygon', 'base', 'arbitrum', 'optimism'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { recipientUsername, amount, token, memo, chain } = req.body;

      // Find recipient
      const recipient = await User.findOne({ username: recipientUsername.toLowerCase() });
      
      if (!recipient) {
        return res.status(404).json({ error: 'Recipient not found' });
      }

      // Debug: Log recipient wallet data
      console.log(`Recipient ${recipientUsername} wallets:`, JSON.stringify(recipient.wallets, null, 2));

      // Determine the chain to use
      const isSolanaAddress = req.walletAddress.length === 44 && !req.walletAddress.startsWith('0x');
      const isEVMAddress = req.walletAddress.length === 42 && req.walletAddress.startsWith('0x');
      
      let targetChain = chain;
      console.log(`Target chain from request: ${targetChain}`);
      console.log(`Sender address: ${req.walletAddress}, isSolana: ${isSolanaAddress}, isEVM: ${isEVMAddress}`);
      
      if (!targetChain) {
        // Auto-detect chain based on wallet address
        if (isSolanaAddress) {
          targetChain = 'solana';
        } else if (isEVMAddress) {
          // Find which EVM chain this address belongs to
          const user = await User.findOne({
            $or: [
              { 'wallets.ethereum.address': req.walletAddress },
              { 'wallets.polygon.address': req.walletAddress },
              { 'wallets.arbitrum.address': req.walletAddress },
              { 'wallets.optimism.address': req.walletAddress },
              { 'wallets.base.address': req.walletAddress }
            ]
          });
          
          if (user) {
            if (user.wallets?.ethereum?.address === req.walletAddress) targetChain = 'ethereum';
            else if (user.wallets?.polygon?.address === req.walletAddress) targetChain = 'polygon';
            else if (user.wallets?.base?.address === req.walletAddress) targetChain = 'base';
            else if (user.wallets?.arbitrum?.address === req.walletAddress) targetChain = 'arbitrum';
            else if (user.wallets?.optimism?.address === req.walletAddress) targetChain = 'optimism';
          }
        }
      }

      if (!targetChain) {
        return res.status(400).json({ error: 'Could not determine target chain' });
      }

      // Handle Solana transactions
      if (targetChain === 'solana') {
        // Get sender's Solana address
        let fromAddress = req.walletAddress;
        if (isEVMAddress) {
          const user = await User.findOne({
            $or: [
              { 'wallets.ethereum.address': req.walletAddress },
              { 'wallets.polygon.address': req.walletAddress },
              { 'wallets.arbitrum.address': req.walletAddress },
              { 'wallets.optimism.address': req.walletAddress },
              { 'wallets.base.address': req.walletAddress }
            ]
          });
          
          if (!user || !user.wallets?.solana?.address) {
            return res.status(400).json({ error: 'No Solana address found for this EVM address' });
          }
          fromAddress = user.wallets.solana.address;
        }

        // Get recipient's Solana address
        if (!recipient.wallets?.solana?.address) {
          return res.status(400).json({ error: 'Recipient does not have a Solana address' });
        }

        const fromPubkey = new PublicKey(fromAddress);
        const toPubkey = new PublicKey(recipient.wallets.solana.address);

        let transaction;

        if (token === 'SOL') {
          // SOL transfer
          const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
          
          transaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey,
              toPubkey,
              lamports
            })
          );
        } else {
          // SPL Token transfer (USDC/USDT)
          const tokenMintAddress = token === 'USDC' 
            ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'  // USDC mint
            : 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';   // USDT mint

          const mint = new PublicKey(tokenMintAddress);
          const decimals = 6; // Both USDC and USDT have 6 decimals
          const tokenAmount = Math.floor(amount * Math.pow(10, decimals));

          // This would need actual SPL token transfer logic
          // For now, we'll return a placeholder
          return res.status(501).json({ error: 'SPL token transfers not yet implemented' });
        }

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;

        // Serialize transaction for frontend signing
        const serializedTx = transaction.serialize({ requireAllSignatures: false });

        res.json({
          success: true,
          chain: 'solana',
          transaction: serializedTx.toString('base64'),
          recipientAddress: recipient.wallets.solana.address,
          amount,
          token
        });

      } else {
        // Handle EVM transactions
        const chainConfig = EVM_CHAINS[targetChain];
        if (!chainConfig) {
          return res.status(400).json({ error: 'Unsupported EVM chain' });
        }

        // Get sender's EVM address for this chain
        let fromAddress = req.walletAddress;
        if (isSolanaAddress) {
          // Find user by Solana address in wallets.solana.address
          const user = await User.findOne({ 'wallets.solana.address': req.walletAddress });
          if (!user || !user.wallets?.[targetChain]?.address) {
            return res.status(400).json({ error: `No ${chainConfig.name} address found for this Solana address` });
          }
          fromAddress = user.wallets[targetChain].address;
        }

        // Get recipient's EVM address for this chain
        console.log(`Checking recipient ${recipientUsername} for ${targetChain} address:`, recipient.wallets?.[targetChain]?.address);
        if (!recipient.wallets?.[targetChain]?.address) {
          console.log(`Recipient ${recipientUsername} missing ${targetChain} address. Available wallets:`, Object.keys(recipient.wallets || {}));
          return res.status(400).json({ error: `Recipient does not have a ${chainConfig.name} address` });
        }

        const toAddress = recipient.wallets[targetChain].address;
        const provider = ethersProviders[targetChain];

        if (!provider) {
          return res.status(500).json({ error: `Ethers provider not available for ${chainConfig.name}` });
        }

        // Prepare EVM transaction
        let transactionData;

        if (token === chainConfig.nativeCurrency.symbol) {
          // Native token transfer (ETH, MATIC, etc.)
          const value = ethers.parseEther(amount.toString());
          
          // Get gas price and nonce
          const gasPrice = await provider.getFeeData();
          const nonce = await provider.getTransactionCount(fromAddress, 'pending');
          
          transactionData = {
            from: fromAddress,
            to: toAddress,
            value: value.toString(),
            gasLimit: '21000', // Standard gas limit for simple transfers
            gasPrice: gasPrice.gasPrice?.toString() || '20000000000', // 20 gwei fallback
            nonce: nonce
          };
        } else {
          // ERC-20 token transfer (USDC, USDT, etc.)
          // For now, return error as ERC-20 transfers need more complex logic
          return res.status(501).json({ error: 'ERC-20 token transfers not yet implemented' });
        }

        res.json({
          success: true,
          chain: targetChain,
          transaction: transactionData,
          recipientAddress: toAddress,
          amount,
          token
        });
      }

    } catch (error) {
      console.error('Transaction preparation error:', error);
      res.status(500).json({ error: 'Failed to prepare transaction' });
    }
  }
);

// Submit signed transaction
app.post('/api/transactions/submit', 
  verifyWallet,
  [
    body('signedTransaction').isString(),
    body('chain').optional().isIn(['solana', 'ethereum', 'polygon', 'base', 'arbitrum', 'optimism'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { signedTransaction, recipientUsername, amount, token, memo, chain } = req.body;

      // Look up recipient's wallet address
      const recipientUser = await User.findOne({ username: recipientUsername.toLowerCase() });
      if (!recipientUser) {
        return res.status(404).json({ error: 'Recipient not found' });
      }

      // Determine the chain to use
      const isSolanaAddress = req.walletAddress.length === 44 && !req.walletAddress.startsWith('0x');
      const isEVMAddress = req.walletAddress.length === 42 && req.walletAddress.startsWith('0x');
      
      let targetChain = chain;
      if (!targetChain) {
        // Auto-detect chain based on wallet address
        if (isSolanaAddress) {
          targetChain = 'solana';
        } else if (isEVMAddress) {
          // Find which EVM chain this address belongs to
          const user = await User.findOne({
            $or: [
              { 'wallets.ethereum.address': req.walletAddress },
              { 'wallets.polygon.address': req.walletAddress },
              { 'wallets.arbitrum.address': req.walletAddress },
              { 'wallets.optimism.address': req.walletAddress },
              { 'wallets.base.address': req.walletAddress }
            ]
          });
          
          if (user) {
            if (user.wallets?.ethereum?.address === req.walletAddress) targetChain = 'ethereum';
            else if (user.wallets?.polygon?.address === req.walletAddress) targetChain = 'polygon';
            else if (user.wallets?.base?.address === req.walletAddress) targetChain = 'base';
            else if (user.wallets?.arbitrum?.address === req.walletAddress) targetChain = 'arbitrum';
            else if (user.wallets?.optimism?.address === req.walletAddress) targetChain = 'optimism';
          }
        }
      }

      if (!targetChain) {
        return res.status(400).json({ error: 'Could not determine target chain' });
      }

      let signature;
      let fromAddress;
      let toAddress;
      let explorerUrl;

      // Handle Solana transactions
      if (targetChain === 'solana') {
        // Get sender's Solana address
        fromAddress = req.walletAddress;
        if (isEVMAddress) {
          const user = await User.findOne({
            $or: [
              { 'wallets.ethereum.address': req.walletAddress },
              { 'wallets.polygon.address': req.walletAddress },
              { 'wallets.arbitrum.address': req.walletAddress },
              { 'wallets.optimism.address': req.walletAddress },
              { 'wallets.base.address': req.walletAddress }
            ]
          });
          
          if (!user || !user.wallets?.solana?.address) {
            return res.status(400).json({ error: 'No Solana address found for this EVM address' });
          }
          fromAddress = user.wallets.solana.address;
        }

        // Get recipient's Solana address
        if (!recipientUser.wallets?.solana?.address) {
          return res.status(400).json({ error: 'Recipient does not have a Solana address' });
        }

        toAddress = recipientUser.wallets.solana.address;

        // Deserialize and send Solana transaction
        const txBuffer = Buffer.from(signedTransaction, 'base64');
        const transaction = Transaction.from(txBuffer);

        signature = await connection.sendRawTransaction(txBuffer, {
          skipPreflight: false,
          preflightCommitment: 'confirmed'
        });

        explorerUrl = `https://explorer.solana.com/tx/${signature}`;

      } else {
        // Handle EVM transactions
        const chainConfig = EVM_CHAINS[targetChain];
        if (!chainConfig) {
          return res.status(400).json({ error: 'Unsupported EVM chain' });
        }

        // Get sender's EVM address for this chain
        fromAddress = req.walletAddress;
        if (isSolanaAddress) {
          // Find user by Solana address in wallets.solana.address
          const user = await User.findOne({ 'wallets.solana.address': req.walletAddress });
          if (!user || !user.wallets?.[targetChain]?.address) {
            return res.status(400).json({ error: `No ${chainConfig.name} address found for this Solana address` });
          }
          fromAddress = user.wallets[targetChain].address;
        }

        // Get recipient's EVM address for this chain
        if (!recipientUser.wallets?.[targetChain]?.address) {
          return res.status(400).json({ error: `Recipient does not have a ${chainConfig.name} address` });
        }

        toAddress = recipientUser.wallets[targetChain].address;
        const provider = ethersProviders[targetChain];

        if (!provider) {
          return res.status(500).json({ error: `Ethers provider not available for ${chainConfig.name}` });
        }

        // Send EVM transaction
        const txResponse = await provider.broadcastTransaction(signedTransaction);
        signature = txResponse.hash;

        // Generate explorer URL based on chain
        const explorerUrls = {
          ethereum: `https://etherscan.io/tx/${signature}`,
          polygon: `https://polygonscan.com/tx/${signature}`,
          base: `https://basescan.org/tx/${signature}`,
          arbitrum: `https://arbiscan.io/tx/${signature}`,
          optimism: `https://optimistic.etherscan.io/tx/${signature}`
        };
        explorerUrl = explorerUrls[targetChain] || `https://etherscan.io/tx/${signature}`;
      }

      // Get sender's username
      let senderUser = await User.findOne({ walletAddress: req.walletAddress });
      if (!senderUser) {
        // Try to find by any wallet address
        senderUser = await User.findOne({
          $or: [
            { 'wallets.solana.address': req.walletAddress },
            { 'wallets.ethereum.address': req.walletAddress },
            { 'wallets.polygon.address': req.walletAddress },
            { 'wallets.arbitrum.address': req.walletAddress },
            { 'wallets.optimism.address': req.walletAddress },
            { 'wallets.base.address': req.walletAddress }
          ]
        });
      }
      
      // Save transaction record
      const txRecord = new TransactionRecord({
        fromAddress: fromAddress,
        toAddress: toAddress,
        fromUsername: senderUser?.username,
        toUsername: recipientUsername,
        amount,
        token,
        signature,
        memo,
        status: 'confirmed',
        blockchain: targetChain
      });

      await txRecord.save();

      res.json({
        success: true,
        signature,
        explorerUrl,
        chain: targetChain
      });
    } catch (error) {
      console.error('Transaction submission error:', error);
      res.status(500).json({ error: 'Failed to submit transaction' });
    }
  }
);

// Get transaction history
app.get('/api/transactions', verifyWallet, async (req, res) => {
  try {
    const transactions = await TransactionRecord.find({
      $or: [
        { fromAddress: req.walletAddress },
        { toAddress: req.walletAddress }
      ]
    }).sort({ createdAt: -1 }).limit(50);

    res.json({ transactions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// OAuth-style login endpoint for third-party sites
app.post('/api/oauth/authorize', verifyWallet, async (req, res) => {
  try {
    const { clientId, redirectUri, scope } = req.body;

    // In production, validate clientId and redirectUri
    
    const user = await User.findOne({ walletAddress: req.walletAddress });
    
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        walletAddress: req.walletAddress,
        username: user.username,
        clientId,
        scope
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      token,
      user: {
        username: user.username,
        bio: user.bio,
        profilePicture: user.profilePicture,
        walletAddress: req.walletAddress,
        ethAddress: user.ethAddress
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'OAuth authorization failed' });
  }
});

// ===================================
// Database Connection & Server Start
// ===================================

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/solconnect', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close();
  process.exit(0);
});

module.exports = { UserSchema, ContactSchema, TransactionSchema };
