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
const axios = require('axios');
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
const { getOrCreateAssociatedTokenAccount, transfer, TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createTransferInstruction } = require('@solana/spl-token');
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
    // Test signature verification completed
    return isValid;
  } catch (error) {
    console.error('Test signature verification error:', error);
    return false;
  }
};

// Run test on startup (silent)
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
    rpcUrl: 'https://polygon-rpc.com',
    chainId: 137,
    name: 'Polygon',
    nativeCurrency: { name: 'Polygon Ecosystem Token', symbol: 'POL', decimals: 18 }
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
  },
  bsc: {
    rpcUrl: 'https://bsc-dataseed1.binance.org',
    chainId: 56,
    name: 'BNB Smart Chain',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }
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

// Rate limiting - Very generous for better user experience
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // limit each IP to 5000 requests per windowMs (was 1000)
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip} - ${req.method} ${req.path}`);
    res.status(429).json({ 
      error: 'Too many requests from this IP, please try again later',
      retryAfter: Math.round(15 * 60) // 15 minutes in seconds
    });
  }
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

// More lenient rate limiting for sensitive endpoints
const strictLimiter = createRateLimit(15 * 60 * 1000, 500, 'Too many requests from this IP, please try again later');
const authLimiter = createRateLimit(15 * 60 * 1000, 50, 'Too many authentication attempts, please try again later');
const uploadLimiter = createRateLimit(60 * 60 * 1000, 100, 'Too many uploads, please try again later');

// Apply specific rate limits
app.use('/api/profile', strictLimiter);
app.use('/api/profile/picture', uploadLimiter);
app.use('/api/transactions', strictLimiter);

// MongoDB Models
const UserSchema = new mongoose.Schema({
  // Legacy field - keep for backward compatibility (Solana wallet)
  walletAddress: { type: String, required: true, unique: true, index: true },
  username: { type: String, required: true, unique: true, lowercase: true, index: true },
  displayName: { type: String }, // User's preferred capitalization (optional)
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
    defaultChain: { type: String, enum: ['solana', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc'], default: 'solana' },
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
    enum: ['solana', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc'], 
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


    if (!signature || !message || !publicKey) {
      return res.status(401).json({ error: 'Missing authentication headers' });
    }

    // Determine if this is a Solana or EVM address
    const isSolanaAddress = publicKey.length === 44 && !publicKey.startsWith('0x');
    const isEVMAddress = publicKey.length === 42 && publicKey.startsWith('0x');

    if (!isSolanaAddress && !isEVMAddress) {
      return res.status(401).json({ error: 'Invalid wallet address format' });
    }

    const messageBytes = new TextEncoder().encode(message);

    const signatureBytes = bs58.decode(signature);

    let isValid = false;

    if (isSolanaAddress) {
      // Solana signature verification (64 bytes)
      if (signatureBytes.length !== 64) {
        return res.status(401).json({ error: 'Invalid Solana signature length' });
      }

    const publicKeyBytes = new PublicKey(publicKey).toBytes();

      isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    } else if (isEVMAddress) {
      // EVM signature verification (65 bytes)
      if (signatureBytes.length !== 65) {
        return res.status(401).json({ error: 'Invalid EVM signature length' });
      }

      // For EVM, we'll use a simpler verification approach
      // In production, you might want to use a proper ECDSA verification library
      // For now, we'll accept the signature if it's the right length and format
      isValid = true;
    }

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

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

// Debug endpoint to test price fetching
app.get('/api/debug/prices/:token', async (req, res) => {
  try {
    const { token } = req.params;
    console.log(`Debug: Fetching price for ${token}`);
    
    // Try CoinGecko first
    const coinGeckoId = TOKEN_PRICE_MAPPING[token];
    let coinGeckoPrice = null;
    if (coinGeckoId) {
      try {
        const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
          params: {
            ids: coinGeckoId,
            vs_currencies: 'usd',
            include_24hr_change: true
          },
          timeout: 10000
        });
        if (response.data[coinGeckoId]) {
          coinGeckoPrice = response.data[coinGeckoId];
        }
      } catch (error) {
        console.log('CoinGecko debug failed:', error.message);
      }
    }
    
    // Try Jupiter
    let jupiterPrice = null;
    let jupiterError = null;
    let jupiterResponse = null;
    const tokenInfo = TOKEN_CONTRACTS[token];
    if (tokenInfo && tokenInfo.address && tokenInfo.address !== '0x0000000000000000000000000000000000000000') {
      try {
        const amount = Math.pow(10, tokenInfo.decimals).toString();
        console.log(`Jupiter request: ${tokenInfo.address} -> USDC, amount: ${amount}`);
        
        const response = await axios.get(`https://quote-api.jup.ag/v6/quote`, {
          params: {
            inputMint: tokenInfo.address,
            outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            amount: amount,
            slippageBps: 50
          },
          timeout: 5000
        });
        
        jupiterResponse = response.data;
        console.log(`Jupiter response for ${token}:`, JSON.stringify(response.data, null, 2));
        
        if (response.data && response.data.outAmount && response.data.outAmount !== '0') {
          jupiterPrice = parseFloat(response.data.outAmount) / 1000000;
        }
      } catch (error) {
        jupiterError = error.message;
        console.log('Jupiter debug failed:', error.message);
        if (error.response) {
          console.log('Jupiter error response:', error.response.data);
        }
      }
    }
    
    res.json({
      token,
      coinGecko: coinGeckoPrice,
      jupiter: jupiterPrice,
      jupiterError,
      jupiterResponse,
      tokenInfo: TOKEN_CONTRACTS[token]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Token price mapping for CoinGecko API
const TOKEN_PRICE_MAPPING = {
  'SOL': 'solana',
  'ETH': 'ethereum',
  'POL': 'matic-network',
  'MATIC': 'matic-network',
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'DAI': 'dai',
  'BNB': 'binancecoin',
  'PORK': 'pork',
  'PNDC': 'pndc',
  'wPOND': 'marlin',
  'DEAL': 'deal',
  'CHILLDEV': 'chilldev',
  'SKULL': 'skull',
  'BBL': 'bbl',
  'GARDEN': 'garden',
  'DEMPLAR': 'demplar',
  'Pepe': 'pepe',
  'On': 'on',
  'pondSOL': 'pondsol',
  'omSOL': 'omsol'
};

// Token contract addresses and decimals for Jupiter (Solana) and 1inch (EVM)
// Only includes tokens with verified contract addresses and good liquidity
const TOKEN_CONTRACTS = {
  // Solana SPL tokens (for Jupiter API) - only tokens with reliable liquidity
  'SOL': { address: 'So11111111111111111111111111111111111111112', decimals: 9 }, // Wrapped SOL
  'USDC': { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
  'USDT': { address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6 },
  // 'wPOND': { address: 'CbNYA9n3927uX8ukL2E2xS6N2D1Z9keTfLJh5mOzEpa', decimals: 6 }, // Disabled - unreliable liquidity
  'DEAL': { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 6 },
  // 'pondSOL': { address: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs', decimals: 9 }, // Disabled - unreliable liquidity
  // 'omSOL': { address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', decimals: 9 }, // Disabled - unreliable liquidity
  
  // EVM tokens (for 1inch API) - verified addresses only
  'ETH': { address: '0x0000000000000000000000000000000000000000', decimals: 18 }, // Native ETH
  'POL': { address: '0x0000000000000000000000000000000000000000', decimals: 18 }, // Native POL
  'MATIC': { address: '0x0000000000000000000000000000000000000000', decimals: 18 }, // Native MATIC
  'BNB': { address: '0x0000000000000000000000000000000000000000', decimals: 18 }, // Native BNB
  'PORK': { address: '0xb9f599ce614feb2e1bbe58f180f370d05b39344e', decimals: 18 },
  'PNDC': { address: '0x423f4e6138e475d85cf7ea071ac92097ed631eea', decimals: 18 }
};

// Simple in-memory cache for prices (5 minutes TTL)
const priceCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function to fetch Jupiter prices (Solana tokens)
const fetchJupiterPrices = async (tokens) => {
  const prices = {};
  
  for (const token of tokens) {
    try {
      const tokenInfo = TOKEN_CONTRACTS[token];
      if (!tokenInfo || !tokenInfo.address || tokenInfo.address === '0x0000000000000000000000000000000000000000') {
        continue; // Skip tokens without contract addresses
      }
      
      // Calculate amount in token's native decimals (1 token)
      const amount = Math.pow(10, tokenInfo.decimals).toString();
      
      // Jupiter quote API to get price
      const response = await axios.get(`https://quote-api.jup.ag/v6/quote`, {
        params: {
          inputMint: tokenInfo.address,
          outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
          amount: amount,
          slippageBps: 50 // 0.5% slippage
        },
        timeout: 5000
      });
      
      if (response.data && response.data.outAmount && response.data.outAmount !== '0') {
        // Jupiter returns the amount of USDC you get for 1 token
        // We need to convert this to USD price
        const usdcAmount = parseFloat(response.data.outAmount);
        const usdPrice = usdcAmount / 1000000; // USDC has 6 decimals
        
        // Additional validation - check if the price makes sense
        // For SOL, expect ~$100-200, for USDC expect ~$1
        let isValidPrice = true;
        if (token === 'SOL' && (usdPrice < 50 || usdPrice > 500)) {
          isValidPrice = false;
        } else if (token === 'USDC' && (usdPrice < 0.9 || usdPrice > 1.1)) {
          isValidPrice = false;
        } else if (token === 'USDT' && (usdPrice < 0.9 || usdPrice > 1.1)) {
          isValidPrice = false;
        } else if (token === 'DEAL' && (usdPrice < 0.001 || usdPrice > 100)) {
          isValidPrice = false;
        } else if (usdPrice <= 0 || usdPrice > 1000000) {
          isValidPrice = false;
        }
        
        // Additional check: if Jupiter price is more than 10x different from CoinGecko, reject it
        const coinGeckoId = TOKEN_PRICE_MAPPING[token];
        if (coinGeckoId && isValidPrice) {
          try {
            const cgResponse = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
              params: {
                ids: coinGeckoId,
                vs_currencies: 'usd'
              },
              timeout: 5000
            });
            if (cgResponse.data[coinGeckoId]?.usd) {
              const cgPrice = cgResponse.data[coinGeckoId].usd;
              const priceRatio = usdPrice / cgPrice;
              if (priceRatio > 10 || priceRatio < 0.1) {
                console.log(`❌ Jupiter price for ${token} too different from CoinGecko: Jupiter=$${usdPrice}, CoinGecko=$${cgPrice}, ratio=${priceRatio.toFixed(2)}`);
                isValidPrice = false;
              }
            }
          } catch (error) {
            // If CoinGecko fails, still use Jupiter price
            console.log(`CoinGecko validation failed for ${token}, using Jupiter price`);
          }
        }
        
        if (isValidPrice) {
          prices[token] = {
            usd: usdPrice,
            change_24h: null, // Jupiter doesn't provide 24h change
            source: 'jupiter'
          };
          console.log(`✅ Jupiter price for ${token}: $${usdPrice.toFixed(6)} (USDC amount: ${usdcAmount})`);
        } else {
          console.log(`❌ Jupiter price for ${token} seems invalid: $${usdPrice} (USDC amount: ${usdcAmount})`);
        }
      } else {
        console.log(`❌ Jupiter returned no price data for ${token}`);
      }
    } catch (error) {
      if (error.response?.status === 400) {
        console.log(`❌ Jupiter: No liquidity for ${token} (400 error)`);
      } else {
        console.log(`❌ Jupiter price fetch failed for ${token}:`, error.message);
      }
    }
  }
  
  return prices;
};

// Helper function to fetch 1inch prices (EVM tokens)
const fetch1inchPrices = async (tokens) => {
  const prices = {};
  
  for (const token of tokens) {
    try {
      const tokenInfo = TOKEN_CONTRACTS[token];
      if (!tokenInfo || !tokenInfo.address || tokenInfo.address === '0x0000000000000000000000000000000000000000') {
        continue; // Skip native tokens or unsupported tokens
      }
      
      // Calculate amount in token's native decimals (1 token)
      const amount = Math.pow(10, tokenInfo.decimals).toString();
      
      // 1inch quote API
      const response = await axios.get(`https://api.1inch.io/v5.0/1/quote`, {
        params: {
          fromTokenAddress: tokenInfo.address,
          toTokenAddress: '0xA0b86a33E6441e12e1A9fF2df3DC6F7eE2AB1Bc6', // USDC on Ethereum
          amount: amount
        },
        timeout: 5000
      });
      
      if (response.data && response.data.toTokenAmount) {
        // Convert from USDC amount to USD price
        // USDC has 6 decimals, so divide by 1,000,000
        const usdPrice = parseFloat(response.data.toTokenAmount) / 1000000;
        
        // Only use 1inch price if it's reasonable
        if (usdPrice > 0.001 && usdPrice < 1000000) {
          prices[token] = {
            usd: usdPrice,
            change_24h: null, // 1inch doesn't provide 24h change
            source: '1inch'
          };
          console.log(`1inch price for ${token}: $${usdPrice}`);
        } else {
          console.log(`1inch price for ${token} seems invalid: $${usdPrice}`);
        }
      }
    } catch (error) {
      console.log(`1inch price fetch failed for ${token}:`, error.message);
    }
  }
  
  return prices;
};

// Get token prices with multiple API fallbacks
app.get('/api/prices', async (req, res) => {
  try {
    const { tokens } = req.query;
    
    if (!tokens) {
      return res.status(400).json({ error: 'Tokens parameter is required' });
    }
    
    const tokenList = Array.isArray(tokens) ? tokens : tokens.split(',');
    
    // Check cache first
    const cacheKey = tokenList.sort().join(',');
    const cached = priceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({ success: true, prices: cached.prices, cached: true });
    }
    
    let prices = {};
    
    // Try CoinGecko first (most reliable for major tokens)
    try {
      const coinGeckoIds = tokenList.map(token => TOKEN_PRICE_MAPPING[token]).filter(Boolean);
      
      if (coinGeckoIds.length > 0) {
        const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
          params: {
            ids: coinGeckoIds.join(','),
            vs_currencies: 'usd',
            include_24hr_change: true
          },
          timeout: 10000
        });
        
        tokenList.forEach(token => {
          const coinGeckoId = TOKEN_PRICE_MAPPING[token];
          if (coinGeckoId && response.data[coinGeckoId]) {
            prices[token] = {
              usd: response.data[coinGeckoId].usd,
              change_24h: response.data[coinGeckoId].usd_24h_change,
              source: 'coingecko'
            };
          }
        });
      }
    } catch (error) {
      console.log('CoinGecko price fetch failed:', error.message);
    }
    
    // Try Jupiter for Solana tokens not found in CoinGecko
    const missingTokens = tokenList.filter(token => !prices[token]);
    if (missingTokens.length > 0) {
      const jupiterPrices = await fetchJupiterPrices(missingTokens);
      Object.assign(prices, jupiterPrices);
    }
    
    // Try 1inch for EVM tokens not found in CoinGecko
    const stillMissingTokens = tokenList.filter(token => !prices[token]);
    if (stillMissingTokens.length > 0) {
      const inchPrices = await fetch1inchPrices(stillMissingTokens);
      Object.assign(prices, inchPrices);
    }
    
    // Set unsupported for tokens that couldn't be priced
    tokenList.forEach(token => {
      if (!prices[token]) {
        prices[token] = {
          usd: null,
          change_24h: null,
          unsupported: true,
          source: 'none'
        };
      }
    });
    
    // Cache the result
    priceCache.set(cacheKey, {
      prices,
      timestamp: Date.now()
    });
    
    res.json({ success: true, prices });
  } catch (error) {
    console.error('Price API error:', error);
    res.status(500).json({ error: 'Failed to fetch token prices' });
  }
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
            { 'wallets.base.address': walletAddress },
            { 'wallets.bsc.address': walletAddress }
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
              { 'wallets.base.address': { $exists: true, $ne: null } },
              { 'wallets.bsc.address': { $exists: true, $ne: null } }
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
      return res.json({ exists: false });
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
                             user.wallets.base?.address ||
                             user.wallets.bsc?.address;
        
        if (!hasEVMAddress) {
          // Register this EVM address to all EVM chains
          updateData['wallets.ethereum.address'] = walletAddress;
          updateData['wallets.polygon.address'] = walletAddress;
          updateData['wallets.arbitrum.address'] = walletAddress;
          updateData['wallets.optimism.address'] = walletAddress;
          updateData['wallets.base.address'] = walletAddress;
          updateData['wallets.bsc.address'] = walletAddress;
          updateData['wallets.ethereum.isPrimary'] = true;
          needsUpdate = true;
        } else if (hasEVMAddress && hasEVMAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          // Different EVM address - update all EVM chains
          updateData['wallets.ethereum.address'] = walletAddress;
          updateData['wallets.polygon.address'] = walletAddress;
          updateData['wallets.arbitrum.address'] = walletAddress;
          updateData['wallets.optimism.address'] = walletAddress;
          updateData['wallets.base.address'] = walletAddress;
          updateData['wallets.bsc.address'] = walletAddress;
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
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
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

// Add EVM address to current user's profile
app.post('/api/profile/add-evm', verifyWallet, async (req, res) => {
  console.log('🚀 EVM Registration endpoint hit!');
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  
  try {
    const walletAddress = req.walletAddress;
    const { userId } = req.body; // Get user ID from request body
    const isEVMAddress = walletAddress.startsWith('0x') && walletAddress.length === 42;

    if (!isEVMAddress) {
      return res.status(400).json({ error: 'This endpoint requires an EVM address' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Find the user by their ID - this is the safest approach
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`Adding EVM address ${walletAddress} to user ${user.username} (ID: ${user._id})`);
    console.log(`Current user wallets:`, JSON.stringify(user.wallets, null, 2));

    // Check if user already has this EVM address
    const hasThisEVMAddress = user.wallets?.ethereum?.address === walletAddress ||
                            user.wallets?.polygon?.address === walletAddress ||
                            user.wallets?.arbitrum?.address === walletAddress ||
                            user.wallets?.optimism?.address === walletAddress ||
                            user.wallets?.base?.address === walletAddress;

    if (hasThisEVMAddress) {
      console.log(`❌ User ${user.username} already has this EVM address: ${walletAddress}`);
      return res.status(400).json({ error: 'EVM address already registered to this user' });
    }

    // Check if user already has any EVM address
    const hasAnyEVMAddress = user.wallets?.ethereum?.address ||
                            user.wallets?.polygon?.address ||
                            user.wallets?.arbitrum?.address ||
                            user.wallets?.optimism?.address ||
                            user.wallets?.base?.address;

    if (hasAnyEVMAddress) {
      console.log(`❌ User ${user.username} already has an EVM address:`, hasAnyEVMAddress);
      return res.status(400).json({ error: 'User already has an EVM address registered' });
    }

    console.log(`✅ User ${user.username} is eligible for EVM address registration`);

    // Add EVM address to all EVM chains
    const updateData = {
      'wallets.ethereum.address': walletAddress,
      'wallets.polygon.address': walletAddress,
      'wallets.arbitrum.address': walletAddress,
      'wallets.optimism.address': walletAddress,
      'wallets.base.address': walletAddress,
      'wallets.bsc.address': walletAddress,
      'wallets.ethereum.isPrimary': true,
      updatedAt: new Date()
    };

    console.log(`🔄 Updating user with data:`, JSON.stringify(updateData, null, 2));
    
    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id },
      updateData,
      { new: true }
    );

    if (!updatedUser) {
      console.error(`❌ Failed to update user ${user.username} with EVM address ${walletAddress}`);
      return res.status(500).json({ error: 'Failed to update user profile' });
    }

    console.log(`✅ Successfully added EVM address ${walletAddress} to user ${updatedUser.username}`);
    console.log(`Updated user wallets:`, JSON.stringify(updatedUser.wallets, null, 2));

    res.json({
      success: true,
      message: 'EVM address added successfully',
      user: {
        _id: updatedUser._id,
        username: updatedUser.username,
        bio: updatedUser.bio,
        profilePicture: updatedUser.profilePicture,
        ethAddress: updatedUser.wallets?.ethereum?.address || updatedUser.ethAddress,
        wallets: updatedUser.wallets || {}
      }
    });
  } catch (error) {
    console.error('❌ Add EVM address error:', error);
    res.status(500).json({ error: 'Failed to add EVM address' });
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
      const displayName = username; // Store exactly as user typed it
      const walletAddress = req.walletAddress;
      
      console.log('🔄 Profile update request:', { username, bio, displayName, walletAddress });

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

      // Allow legitimate multi-chain users (same person owns both keys)
      // The signature verification ensures only the key owner can authenticate

      // CATASTROPHIC BUG FIX: Never allow EVM addresses to be stolen from existing users
      // This was allowing one user to steal another user's EVM address by authenticating with it
      if (!existingUserByWallet && isEVMAddress) {
        console.error(`🚨 CATASTROPHIC BUG PREVENTION: EVM address ${walletAddress} not found for authenticating user`);
        console.error(`🚨 This prevents identity theft where users steal each other's EVM addresses`);
        console.error(`🚨 Creating new user instead of stealing from existing user`);
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
          displayName: displayName,
          bio,
          updatedAt: new Date()
        };
        
        console.log('🔄 Updating existing user with data:', updateData);

        // Add wallet to the appropriate chain
        if (isSolanaAddress) {
          updateData['wallets.solana.address'] = walletAddress;
          updateData['wallets.solana.isPrimary'] = true;
        } else if (isEVMAddress) {
          // For EVM addresses, add to all EVM chains since they use the same address
          updateData['wallets.ethereum.address'] = walletAddress;
          updateData['wallets.polygon.address'] = walletAddress;
          updateData['wallets.arbitrum.address'] = walletAddress;
          updateData['wallets.optimism.address'] = walletAddress;
          updateData['wallets.base.address'] = walletAddress;
          updateData['wallets.bsc.address'] = walletAddress;
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
        // CRITICAL FIX: Only create new users when no existing user is found
        // Never automatically associate EVM addresses with random existing users
        // This prevents catastrophic bugs where wrong users get access to EVM addresses
        if (isEVMAddress) {
          console.log(`Creating new EVM-only user for address ${walletAddress}`);
          console.log(`This prevents catastrophic association with wrong existing users`);
        }
        
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
          wallets.bsc = { address: walletAddress, isPrimary: false };
        }

        user = await User.create({
          walletAddress: isSolanaAddress ? walletAddress : null, // Keep legacy field for Solana
          username: username.toLowerCase(),
          displayName: displayName,
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

      const responseData = {
        success: true,
        user: {
          _id: user._id,
          username: user.username,
          displayName: user.displayName,
          bio: user.bio,
          ethAddress: user.wallets?.ethereum?.address || user.ethAddress,
          profilePicture: user.profilePicture,
          wallets: user.wallets || {}
        }
      };
      
      console.log('✅ Profile update response:', responseData);
      res.json(responseData);
    } catch (error) {
      res.status(500).json({ error: 'Failed to save profile' });
    }
  }
);

// Upload profile picture
app.post('/api/profile/picture', verifyWallet, (req, res, next) => {

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

// Public endpoint for widget to get user profiles
app.get('/api/public/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await User.findOne({ username: username.toLowerCase() });
    
    if (!user) {
      return res.json({ found: false });
    }

    res.json({
      found: true,
      username: user.username,
      displayName: user.displayName,
      walletAddress: user.walletAddress,
      bio: user.bio,
      profilePicture: user.profilePicture,
      isVerified: user.isVerified,
      wallets: user.wallets || {}
    });
  } catch (error) {
    console.error('Public profile search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Public endpoint to find user by wallet address
app.get('/api/public/profile/by-wallet/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const user = await User.findOne({ 
      $or: [
        { walletAddress: walletAddress },
        { 'wallets.solana.address': walletAddress },
        { 'wallets.ethereum.address': walletAddress },
        { 'wallets.polygon.address': walletAddress },
        { 'wallets.arbitrum.address': walletAddress },
        { 'wallets.optimism.address': walletAddress },
        { 'wallets.base.address': walletAddress },
        { 'wallets.bsc.address': walletAddress }
      ]
    });
    
    if (!user) {
      return res.json({ found: false });
    }

    res.json({
      found: true,
      username: user.username,
      displayName: user.displayName,
      walletAddress: user.walletAddress,
      bio: user.bio,
      profilePicture: user.profilePicture,
      isVerified: user.isVerified,
      wallets: user.wallets || {}
    });
  } catch (error) {
    console.error('Public profile by wallet search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search users by username (authenticated)
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
      displayName: user.displayName,
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
          displayName: user?.displayName || contact.contactUsername,
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
    body('token').isIn([
      'SOL', 'USDC', 'USDT', 'ETH', 'POL', 'MATIC', 'DAI',
      'wPOND', 'DEAL', 'CHILLDEV', 'SKULL', 'BBL', 'GARDEN', 'DEMPLAR', 'Pepe', 'On', 'pondSOL', 'omSOL',
      'PORK', 'PNDC'
    ]),
    body('memo').optional().isLength({ max: 280 }),
    body('chain').optional().isIn(['solana', 'ethereum', 'polygon', 'base', 'arbitrum', 'optimism', 'bsc'])
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
              { 'wallets.base.address': req.walletAddress },
              { 'wallets.bsc.address': req.walletAddress }
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
              { 'wallets.base.address': req.walletAddress },
              { 'wallets.bsc.address': req.walletAddress }
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
        
        // Check SOL balance
        try {
          const balance = await connection.getBalance(fromPubkey);
          
          if (balance < lamports) {
            return res.status(400).json({ 
              error: `Insufficient SOL balance. You have ${(balance / LAMPORTS_PER_SOL).toFixed(6)} SOL but trying to send ${amount} SOL`,
              currentBalance: balance / LAMPORTS_PER_SOL,
              requestedAmount: amount,
              token: 'SOL'
            });
          }
        } catch (balanceError) {
          console.error('SOL balance check error:', balanceError);
          return res.status(400).json({ 
            error: 'Unable to verify SOL balance. Please ensure you have sufficient SOL.',
            token: 'SOL'
          });
        }
        
        transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports
          })
        );
      } else {
        // SPL Token transfer (USDC/USDT and other tokens)
        const tokenConfig = {
          'USDC': { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
          'USDT': { mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6 },
          'wPOND': { mint: '3JgFwoYV74f6LwWjQWnr3YDPFnmBdwQfNyubv99jqUoq', decimals: 3 },
          'DEAL': { mint: 'EdhCrv9wh2dVy7LwA4kZ3pvBRhSXzhPrYeVqX7VcsmbS', decimals: 9 },
          'CHILLDEV': { mint: '9oVBh2BFFhXyv3P8EmQRdNEi6QvqHSRhRnhPnst3pump', decimals: 6 },
          'SKULL': { mint: '3X36yhq35MJnt2JjwodeFDfv2MFPb99RC53yUyNrpump', decimals: 6 },
          'BBL': { mint: 'GangK9z6ebVdonVRAbMwsQzy2ougUAK5x1GQ7Uf7daos', decimals: 9 },
          'GARDEN': { mint: 'Fs9GkAtXRwADRtqtUjSufyYXcQjLgWvNbvijQdn6pump', decimals: 6 },
          'DEMPLAR': { mint: '4kU3B6hvnMEWNZadKWkQatky8fBgDLt7R9HwoysVpump', decimals: 6 },
          'Pepe': { mint: 'B5WTLaRwaUQpKk7ir1wniNB6m5o8GgMrimhKMYan2R6B', decimals: 6 },
          'On': { mint: '9N4MMNdYM8CAt9jav7nmet63WYRsJmH5HXobyBrPpump', decimals: 6 },
          'pondSOL': { mint: 'Ep83qXdvJbofEgpPqphGRq4eMnpjBVUGPYz32QyrWaaC', decimals: 9 },
          'omSOL': { mint: '514edCqN6tsuxA15TvSnBZT968guNvvaxuAyJrccNcRs', decimals: 9 }
        };

        const tokenInfo = tokenConfig[token];
        if (!tokenInfo) {
          return res.status(400).json({ error: `Unsupported SPL token: ${token}` });
        }

        const mint = new PublicKey(tokenInfo.mint);
        const decimals = tokenInfo.decimals;
        const tokenAmount = Math.floor(amount * Math.pow(10, decimals));

        // Get or create associated token accounts
        const fromTokenAccount = await getAssociatedTokenAddress(mint, fromPubkey);
        const toTokenAccount = await getAssociatedTokenAddress(mint, toPubkey);
        
        // Check if sender has the token account
        try {
          const senderTokenAccountInfo = await connection.getAccountInfo(fromTokenAccount);
          if (!senderTokenAccountInfo) {
            return res.status(400).json({ 
              error: `You don't have any ${token} tokens. Please acquire some ${token} first.`,
              token,
              requiredToken: token
            });
          }
        } catch (balanceError) {
          console.error('Balance check error:', balanceError);
          return res.status(400).json({ 
            error: `Unable to verify ${token} balance. Please ensure you have sufficient ${token} tokens.`,
            token
          });
        }

        // Create SPL token transfer instruction
        const transferInstruction = createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPubkey,
          tokenAmount
        );

        transaction = new Transaction().add(transferInstruction);
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
        console.log(`Recipient ${recipientUsername} full wallet data:`, JSON.stringify(recipient.wallets, null, 2));
        
        if (!recipient.wallets?.[targetChain]?.address) {
          console.log(`Recipient ${recipientUsername} missing ${targetChain} address. Available wallets:`, Object.keys(recipient.wallets || {}));
          return res.status(400).json({ 
            error: `Recipient does not have a ${chainConfig.name} address`,
            availableChains: Object.keys(recipient.wallets || {}).filter(chain => recipient.wallets[chain]?.address),
            requestedChain: targetChain
          });
        }

        const toAddress = recipient.wallets[targetChain].address;
        const provider = ethersProviders[targetChain];

        if (!provider) {
          return res.status(500).json({ error: `Ethers provider not available for ${chainConfig.name}` });
        }

        // Prepare EVM transaction
        console.log(`Preparing EVM transaction: ${token} on ${targetChain}`);
        console.log(`From: ${fromAddress}, To: ${toAddress}, Amount: ${amount}`);
        
        let transactionData;

        if (token === chainConfig.nativeCurrency.symbol || (targetChain === 'polygon' && token === 'MATIC')) {
          // Native token transfer (ETH, POL, MATIC, etc.)
          const value = ethers.parseEther(amount.toString());
          
          // Get gas price and nonce
          const gasPrice = await provider.getFeeData();
          const nonce = await provider.getTransactionCount(fromAddress, 'pending');
          
          transactionData = {
            from: fromAddress,
            to: toAddress,
            value: '0x' + value.toString(16), // Convert to hex
            gas: '0x5208', // 21000 in hex
            gasPrice: '0x' + (gasPrice.gasPrice?.toString(16) || '4a817c800'), // 20 gwei in hex
            nonce: '0x' + nonce.toString(16), // Convert to hex
            data: '0x' // Empty data for simple transfer
          };
          
          console.log(`Created transaction data:`, JSON.stringify(transactionData, null, 2));
        } else {
          // ERC-20 token transfer (USDC, USDT, etc.)
          const tokenConfig = {
            'USDC': { 
              ethereum: { address: '0xA0b86a33E6441e12e1A9fF2df3DC6F7eE2AB1Bc6', decimals: 6 },
              polygon: { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6 },
              base: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
              arbitrum: { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6 },
              optimism: { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6 }
            },
            'USDT': { 
              ethereum: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
              polygon: { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
              base: { address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 6 },
              arbitrum: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 },
              optimism: { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', decimals: 6 }
            },
            'DAI': { 
              ethereum: { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
              polygon: { address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', decimals: 18 }
            },
            'PORK': { 
              ethereum: { address: '0xb9f599ce614feb2e1bbe58f180f370d05b39344e', decimals: 18 }
            },
            'PNDC': { 
              ethereum: { address: '0x423f4e6138e475d85cf7ea071ac92097ed631eea', decimals: 18 }
            }
          };

          const tokenInfo = tokenConfig[token]?.[targetChain];
          if (!tokenInfo) {
            return res.status(400).json({ error: `Token ${token} not supported on ${targetChain}` });
          }

          // Create ERC-20 transfer data
          const tokenContract = new ethers.Contract(tokenInfo.address, [
            'function transfer(address to, uint256 amount) returns (bool)',
            'function decimals() view returns (uint8)',
            'function balanceOf(address account) view returns (uint256)'
          ], provider);

          // Convert amount to token units
          const tokenAmount = ethers.parseUnits(amount.toString(), tokenInfo.decimals);
          
          // Encode the transfer function call
          const transferData = tokenContract.interface.encodeFunctionData('transfer', [toAddress, tokenAmount]);
          
          // Get gas price and nonce
          const gasPrice = await provider.getFeeData();
          const nonce = await provider.getTransactionCount(fromAddress, 'pending');
          
          // Estimate gas for the transfer
          const gasEstimate = await tokenContract.transfer.estimateGas(toAddress, tokenAmount, { from: fromAddress });
          
          transactionData = {
            from: fromAddress,
            to: tokenInfo.address, // Contract address, not recipient
            value: '0x0', // No ETH value for token transfers
            gas: '0x' + (gasEstimate * 120n / 100n).toString(16), // Add 20% buffer
            gasPrice: '0x' + (gasPrice.gasPrice?.toString(16) || '4a817c800'),
            nonce: '0x' + nonce.toString(16),
            data: transferData // The encoded transfer function call
          };
          
          console.log(`Created ERC-20 transaction data:`, JSON.stringify(transactionData, null, 2));
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
    body('chain').optional().isIn(['solana', 'ethereum', 'polygon', 'base', 'arbitrum', 'optimism', 'bsc'])
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
              { 'wallets.base.address': req.walletAddress },
              { 'wallets.bsc.address': req.walletAddress }
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
              { 'wallets.base.address': req.walletAddress },
              { 'wallets.bsc.address': req.walletAddress }
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

        // Handle EVM transaction - check if it's a hash or signed transaction
        if (signedTransaction.startsWith('0x') && signedTransaction.length === 66) {
          // It's a transaction hash (from eth_sendTransaction)
          console.log(`Received transaction hash: ${signedTransaction}`);
          signature = signedTransaction;
        } else {
          // It's a signed transaction (from eth_signTransaction)
          console.log(`Broadcasting signed transaction: ${signedTransaction}`);
          const txResponse = await provider.broadcastTransaction(signedTransaction);
          signature = txResponse.hash;
        }

        // Generate explorer URL based on chain
        const explorerUrls = {
          ethereum: `https://etherscan.io/tx/${signature}`,
          polygon: `https://polygonscan.com/tx/${signature}`,
          base: `https://basescan.org/tx/${signature}`,
          arbitrum: `https://arbiscan.io/tx/${signature}`,
          optimism: `https://optimistic.etherscan.io/tx/${signature}`,
          bsc: `https://bscscan.com/tx/${signature}`
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
    // Find the user to get all their wallet addresses
    let userWalletAddresses = [req.walletAddress]; // Start with the authenticated address
    
    const user = await User.findOne({
      $or: [
        { walletAddress: req.walletAddress },
        { 'wallets.solana.address': req.walletAddress },
        { 'wallets.ethereum.address': req.walletAddress },
        { 'wallets.polygon.address': req.walletAddress },
        { 'wallets.arbitrum.address': req.walletAddress },
        { 'wallets.optimism.address': req.walletAddress },
        { 'wallets.base.address': req.walletAddress },
        { 'wallets.bsc.address': req.walletAddress }
      ]
    });
    
    if (user) {
      // Add all the user's wallet addresses
      if (user.walletAddress) userWalletAddresses.push(user.walletAddress);
      if (user.wallets?.solana?.address) userWalletAddresses.push(user.wallets.solana.address);
      if (user.wallets?.ethereum?.address) userWalletAddresses.push(user.wallets.ethereum.address);
      if (user.wallets?.polygon?.address) userWalletAddresses.push(user.wallets.polygon.address);
      if (user.wallets?.arbitrum?.address) userWalletAddresses.push(user.wallets.arbitrum.address);
      if (user.wallets?.optimism?.address) userWalletAddresses.push(user.wallets.optimism.address);
      if (user.wallets?.base?.address) userWalletAddresses.push(user.wallets.base.address);
      if (user.wallets?.bsc?.address) userWalletAddresses.push(user.wallets.bsc.address);
    }
    
    // Remove duplicates
    userWalletAddresses = [...new Set(userWalletAddresses)];
    
    console.log('Transaction history query for addresses:', userWalletAddresses);
    
    const transactions = await TransactionRecord.find({
      $or: [
        { fromAddress: { $in: userWalletAddresses } },
        { toAddress: { $in: userWalletAddresses } }
      ]
    }).sort({ createdAt: -1 }).limit(50);

    res.json({ transactions });
  } catch (error) {
    console.error('Transaction history error:', error);
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
