const mongoose = require('mongoose');
require('dotenv').config();

async function initDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/solconnect');
    
    // Create schemas (since we can't import from server.js due to circular dependency)
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

    // Create models
    const User = mongoose.model('User', UserSchema);
    const Contact = mongoose.model('Contact', ContactSchema);
    const Transaction = mongoose.model('Transaction', TransactionSchema);
    
    // Create indexes
    await User.createIndexes();
    await Contact.createIndexes();
    await Transaction.createIndexes();
    
    console.log('Database initialized successfully');
    console.log('Created indexes for User, Contact, and Transaction collections');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  initDatabase();
}
