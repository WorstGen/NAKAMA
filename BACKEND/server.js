const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { RateLimiterMemory } = require('rate-limiter-flexible');
require('dotenv').config();

// Solana imports
const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { getOrCreateAssociatedTokenAccount, transfer, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const nacl = require('tweetnacl');
const bs58 = require('bs58');

const app = express();
const PORT = process.env.PORT || 3001;

// Solana connection
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

// Rate limiting
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Rate limiting middleware
app.use(async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    res.status(429).send('Too Many Requests');
  }
});

// MongoDB Models
const UserSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, unique: true, index: true },
  username: { type: String, required: true, unique: true, lowercase: true, index: true },
  bio: { type: String, maxLength: 500 },
  profilePicture: { type: String },
  ethAddress: { type: String },
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
  toUsername: { type: String },
  amount: { type: Number, required: true },
  token: { type: String, required: true },
  signature: { type: String, required: true, unique: true },
  memo: { type: String },
  status: { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Contact = mongoose.model('Contact', ContactSchema);
const TransactionRecord = mongoose.model('Transaction', TransactionSchema);

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images allowed.'));
    }
  }
});

// Auth middleware
const verifyWallet = async (req, res, next) => {
  try {
    const { signature, message, publicKey } = req.headers;
    
    if (!signature || !message || !publicKey) {
      return res.status(401).json({ error: 'Missing authentication headers' });
    }

    // Verify signature
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = new PublicKey(publicKey).toBytes();
    
    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    req.walletAddress = publicKey;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};
