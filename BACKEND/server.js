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

    // Verify signature
    const messageBytes = new TextEncoder().encode(message);
    console.log('Message bytes:', messageBytes);

    const signatureBytes = bs58.decode(signature);
    console.log('Decoded signature bytes:', signatureBytes);

    const publicKeyBytes = new PublicKey(publicKey).toBytes();
    console.log('Public key bytes:', publicKeyBytes);

    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    console.log('Signature verification result:', isValid);

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
    // Support both legacy walletAddress and new multi-chain wallets
    let user = await User.findOne({ walletAddress: req.walletAddress });
    
    // If not found with legacy field, try multi-chain wallets
    if (!user) {
      user = await User.findOne({
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
    
    if (!user) {
      return res.json({ exists: false });
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
          // Determine which EVM chain this address belongs to
          // For now, we'll assume it's Ethereum, but this could be enhanced
          updateData['wallets.ethereum.address'] = walletAddress;
          updateData['wallets.ethereum.isPrimary'] = false;
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
          wallets.ethereum = { address: walletAddress, isPrimary: true };
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
    body('token').isIn(['SOL', 'USDC', 'USDT']),
    body('memo').optional().isLength({ max: 280 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { recipientUsername, amount, token, memo } = req.body;

      // Find recipient
      const recipient = await User.findOne({ username: recipientUsername.toLowerCase() });
      
      if (!recipient) {
        return res.status(404).json({ error: 'Recipient not found' });
      }

      const fromPubkey = new PublicKey(req.walletAddress);
      const toPubkey = new PublicKey(recipient.walletAddress);

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
        transaction: serializedTx.toString('base64'),
        recipientAddress: recipient.walletAddress,
        amount,
        token
      });
    } catch (error) {
      console.error('Transaction preparation error:', error);
      res.status(500).json({ error: 'Failed to prepare transaction' });
    }
  }
);

// Submit signed transaction
app.post('/api/transactions/submit', 
  verifyWallet,
  [body('signedTransaction').isString()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { signedTransaction, recipientUsername, amount, token, memo } = req.body;

      // Look up recipient's wallet address
      const recipientUser = await User.findOne({ username: recipientUsername.toLowerCase() });
      if (!recipientUser) {
        return res.status(404).json({ error: 'Recipient not found' });
      }

      // Deserialize and send transaction
      const txBuffer = Buffer.from(signedTransaction, 'base64');
      const transaction = Transaction.from(txBuffer);

      const signature = await connection.sendRawTransaction(txBuffer, {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });

      // Get sender's username
      const senderUser = await User.findOne({ walletAddress: req.walletAddress });
      
      // Save transaction record with correct addresses
      const txRecord = new TransactionRecord({
        fromAddress: req.walletAddress,
        toAddress: recipientUser.walletAddress, // ✅ Actual wallet address
        fromUsername: senderUser?.username,     // ✅ Sender's username for display
        toUsername: recipientUsername,          // ✅ Recipient's username for display
        amount,
        token,
        signature,
        memo,
        status: 'confirmed' // Changed to confirmed since transaction was successful
      });

      await txRecord.save();

      res.json({
        success: true,
        signature,
        explorerUrl: `https://explorer.solana.com/tx/${signature}`
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
