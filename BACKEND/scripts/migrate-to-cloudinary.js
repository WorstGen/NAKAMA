const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// User Schema (same as server.js)
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

const User = mongoose.model('User', UserSchema);

async function migrateToCloudinary() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/solconnect');
    console.log('✅ Connected to MongoDB');

    // Find all users with local profile pictures
    const users = await User.find({
      profilePicture: { $regex: /^\/uploads\// }
    });

    console.log(`📸 Found ${users.length} users with local profile pictures`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        const localPath = path.join('public', user.profilePicture);
        
        // Check if file exists
        if (!fs.existsSync(localPath)) {
          console.log(`⚠️  File not found for ${user.username}: ${localPath}`);
          errorCount++;
          continue;
        }

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(localPath, {
          folder: 'nakama-profiles',
          public_id: `profile-${user._id}`,
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' }
          ],
          overwrite: true
        });

        // Update user with Cloudinary URL
        await User.findByIdAndUpdate(user._id, {
          profilePicture: result.secure_url,
          updatedAt: new Date()
        });

        console.log(`✅ Migrated ${user.username}: ${result.secure_url}`);
        successCount++;

        // Delete local file after successful upload
        fs.unlinkSync(localPath);
        console.log(`🗑️  Deleted local file: ${localPath}`);

      } catch (error) {
        console.error(`❌ Error migrating ${user.username}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully migrated: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📸 Total processed: ${users.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration
migrateToCloudinary();
