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

// Your current SVG logo as a string
const nakamaLogoSVG = `<svg width="180" height="48" viewBox="0 0 180 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color: #fb923c; stop-opacity: 1" />
      <stop offset="100%" style="stop-color: #3b82f6; stop-opacity: 1" />
    </linearGradient>
  </defs>
  <rect x="0" y="8" width="180" height="32" rx="16" fill="url(#logoGradient)" />
  <text x="90" y="30" text-anchor="middle" fill="white" font-size="20" font-weight="bold" font-family="Arial, sans-serif" letter-spacing="2px">NAKAMA</text>
  <circle cx="30" cy="24" r="4" fill="white" opacity="0.9"/>
  <circle cx="150" cy="24" r="4" fill="white" opacity="0.9"/>
  <rect x="50" y="20" width="6" height="8" fill="white" opacity="0.8"/>
  <rect x="65" y="18" width="6" height="12" fill="white" opacity="0.8"/>
  <rect x="80" y="22" width="6" height="4" fill="white" opacity="0.8"/>
  <rect x="95" y="20" width="6" height="8" fill="white" opacity="0.8"/>
  <rect x="110" y="16" width="6" height="16" fill="white" opacity="0.8"/>
</svg>`;

async function uploadLogo() {
  try {
    console.log('🚀 Uploading NAKAMA logo to Cloudinary...');
    
    // Upload SVG to Cloudinary
    const result = await cloudinary.uploader.upload(
      `data:image/svg+xml;base64,${Buffer.from(nakamaLogoSVG).toString('base64')}`,
      {
        folder: 'nakama-assets',
        public_id: 'nakama-logo',
        resource_type: 'image',
        format: 'svg',
        overwrite: true,
        transformation: [
          { width: 180, height: 48, crop: 'scale' },
          { quality: 'auto' }
        ]
      }
    );

    console.log('✅ Logo uploaded successfully!');
    console.log('📱 Logo URL:', result.secure_url);
    console.log('🆔 Public ID:', result.public_id);
    
    // Generate different sizes for responsive design
    const sizes = [
      { width: 120, height: 32, name: 'small' },
      { width: 180, height: 48, name: 'medium' },
      { width: 240, height: 64, name: 'large' }
    ];

    console.log('\n📐 Generated responsive sizes:');
    for (const size of sizes) {
      const url = cloudinary.url(result.public_id, {
        width: size.width,
        height: size.height,
        crop: 'scale',
        quality: 'auto',
        format: 'auto'
      });
      console.log(`${size.name}: ${url}`);
    }

    // Generate WebP version for better performance
    const webpUrl = cloudinary.url(result.public_id, {
      width: 180,
      height: 48,
      crop: 'scale',
      quality: 'auto',
      format: 'webp'
    });
    console.log(`\n🌐 WebP version: ${webpUrl}`);

    // Generate PNG fallback
    const pngUrl = cloudinary.url(result.public_id, {
      width: 180,
      height: 48,
      crop: 'scale',
      quality: 'auto',
      format: 'png'
    });
    console.log(`🖼️ PNG fallback: ${pngUrl}`);

    console.log('\n🎉 Logo upload complete! Use these URLs in your frontend.');

  } catch (error) {
    console.error('❌ Error uploading logo:', error);
  }
}

uploadLogo();
