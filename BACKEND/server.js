const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

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

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Signature', 'X-Message', 'X-Public-Key', 'signature', 'message', 'publickey', 'publicKey', 'PublicKey'],
  exposedHeaders: ['X-Signature', 'X-Message', 'X-Public-Key', 'signature', 'message', 'publickey', 'publicKey', 'PublicKey']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Apply rate limiting to all API routes
app.use('/api/', limiter);

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
    const user = await User.findOne({ walletAddress: req.walletAddress });
    
    if (!user) {
      return res.json({ exists: false });
    }

    res.json({
      exists: true,
      username: user.username,
      bio: user.bio,
      profilePicture: user.profilePicture,
      ethAddress: user.ethAddress,
      isVerified: user.isVerified,
      createdAt: user.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Create/Update user profile
app.post('/api/profile', 
  verifyWallet,
  [
    body('username').isLength({ min: 3, max: 20 }).matches(/^[a-zA-Z0-9_]+$/),
    body('bio').optional().isLength({ max: 500 }),
    body('ethAddress').optional().matches(/^0x[a-fA-F0-9]{40}$/)
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, bio, ethAddress } = req.body;

      // Check if username is already taken
      const existingUser = await User.findOne({ 
        username: username.toLowerCase(),
        walletAddress: { $ne: req.walletAddress }
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      const user = await User.findOneAndUpdate(
        { walletAddress: req.walletAddress },
        {
          username: username.toLowerCase(),
          bio,
          ethAddress,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );

      res.json({
        success: true,
        user: {
          username: user.username,
          bio: user.bio,
          ethAddress: user.ethAddress,
          profilePicture: user.profilePicture
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save profile' });
    }
  }
);

// Upload profile picture
app.post('/api/profile/picture', verifyWallet, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const profilePictureUrl = `/uploads/${req.file.filename}`;
    
    await User.findOneAndUpdate(
      { walletAddress: req.walletAddress },
      { profilePicture: profilePictureUrl, updatedAt: new Date() }
    );

    res.json({ success: true, profilePicture: profilePictureUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload profile picture' });
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

      // Deserialize and send transaction
      const txBuffer = Buffer.from(signedTransaction, 'base64');
      const transaction = Transaction.from(txBuffer);

      const signature = await connection.sendRawTransaction(txBuffer, {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });

      // Save transaction record
      const txRecord = new TransactionRecord({
        fromAddress: req.walletAddress,
        toAddress: recipientUsername, // We'd need to look this up
        toUsername: recipientUsername,
        amount,
        token,
        signature,
        memo,
        status: 'pending'
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
