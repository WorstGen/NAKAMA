# Cloudinary Setup for Profile Pictures

## Why Cloudinary?
- **25GB free storage** (plenty for profile pictures)
- **25GB bandwidth/month** (good for moderate traffic)
- **Automatic optimization** (resize, compress, format conversion)
- **Global CDN** (fast worldwide)
- **Easy React integration**

## Setup Steps

### 1. Create Cloudinary Account
1. Go to [cloudinary.com](https://cloudinary.com)
2. Sign up for free account
3. Get your Cloud Name, API Key, and API Secret from dashboard

### 2. Install Dependencies
```bash
cd FRONTEND
npm install cloudinary-react cloudinary-core
```

### 3. Environment Variables
Add to `.env`:
```env
REACT_APP_CLOUDINARY_CLOUD_NAME=your_cloud_name
REACT_APP_CLOUDINARY_API_KEY=your_api_key
REACT_APP_CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Update Backend (server.js)
```javascript
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Replace profile picture upload handler
app.post('/api/profile/picture', verifyWallet, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'nakama-profiles',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    // Delete local file
    fs.unlinkSync(req.file.path);

    // Update user in database
    const user = await User.findOneAndUpdate(
      { walletAddress: req.walletAddress },
      { profilePicture: result.secure_url, updatedAt: new Date() },
      { new: true }
    );

    res.json({
      success: true,
      profilePicture: result.secure_url,
      message: 'Profile picture uploaded successfully'
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});
```

### 5. Update Frontend (ProfileImage.jsx)
```javascript
import { CloudinaryContext, Image, Transformation } from 'cloudinary-react';

// Replace the img tag with:
<Image
  cloudName={process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}
  publicId={extractPublicId(src)} // Extract from URL
  width="400"
  height="400"
  crop="fill"
  gravity="face"
  quality="auto"
  fetchFormat="auto"
  className="w-full h-full rounded-full object-cover"
/>
```

## Benefits

### Performance
- **Automatic optimization** - images served in best format
- **Global CDN** - fast loading worldwide
- **Responsive images** - different sizes for different devices
- **Lazy loading** - built-in optimization

### Reliability
- **99.9% uptime** - highly reliable
- **Automatic backups** - images are safe
- **Version control** - keep multiple versions
- **Transform on demand** - resize without re-uploading

### Cost
- **Free tier** - 25GB storage + 25GB bandwidth
- **Pay as you grow** - only pay for what you use
- **No setup costs** - completely free to start

## Migration Strategy

### Phase 1: Setup Cloudinary
1. Create account and get credentials
2. Install dependencies
3. Update backend upload handler

### Phase 2: Test with New Uploads
1. Test new profile picture uploads
2. Verify images are optimized
3. Check CDN performance

### Phase 3: Migrate Existing Images
1. Create migration script to upload existing images
2. Update database URLs
3. Remove local storage

### Phase 4: Cleanup
1. Remove Sharp dependency (no longer needed)
2. Remove local uploads directory
3. Update frontend to use Cloudinary URLs

## Alternative: AWS S3 + CloudFront

If you prefer AWS:

### Free Tier Limits
- **5GB storage** (enough for ~50,000 profile pictures)
- **20,000 GET requests/month** (good for moderate traffic)
- **2,000 PUT requests/month** (enough for uploads)

### Setup
1. Create AWS account
2. Set up S3 bucket
3. Configure CloudFront distribution
4. Update backend to use AWS SDK

### Cost After Free Tier
- **Storage**: $0.023/GB/month
- **Requests**: $0.0004/1,000 requests
- **Data Transfer**: $0.09/GB

## Recommendation

**Start with Cloudinary** because:
- ✅ Easiest setup
- ✅ More free storage (25GB vs 5GB)
- ✅ Built-in optimization
- ✅ Better free tier for bandwidth
- ✅ No AWS complexity

You can always migrate to AWS later if you outgrow Cloudinary's free tier.
