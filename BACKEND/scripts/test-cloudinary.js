const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function testCloudinary() {
  console.log('🔧 Testing Cloudinary Configuration...\n');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing');
  console.log('API Key:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing');
  
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.log('\n❌ Missing environment variables! Please check your Railway configuration.');
    return;
  }
  
  try {
    // Test Cloudinary connection
    console.log('\n🔌 Testing Cloudinary connection...');
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection successful:', result);
    
    // Test upload with a simple image
    console.log('\n📤 Testing image upload...');
    
    // Create a simple test image (1x1 pixel PNG)
    const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    const uploadResult = await cloudinary.uploader.upload(testImage, {
      folder: 'nakama-test',
      public_id: 'test-upload',
      overwrite: true
    });
    
    console.log('✅ Test upload successful:', uploadResult.secure_url);
    
    // Test profile picture upload format
    console.log('\n👤 Testing profile picture upload format...');
    const profileResult = await cloudinary.uploader.upload(testImage, {
      folder: 'nakama-profiles',
      public_id: 'test-profile',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ],
      overwrite: true
    });
    
    console.log('✅ Profile picture upload test successful:', profileResult.secure_url);
    
    // Clean up test images
    console.log('\n🧹 Cleaning up test images...');
    await cloudinary.uploader.destroy('nakama-test/test-upload');
    await cloudinary.uploader.destroy('nakama-profiles/test-profile');
    console.log('✅ Test images cleaned up');
    
    console.log('\n🎉 All tests passed! Cloudinary is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Cloudinary test failed:', error);
    console.log('\n🔍 Error details:');
    console.log('Message:', error.message);
    console.log('HTTP Status:', error.http_code);
    console.log('Error Code:', error.error?.code);
    console.log('Error Name:', error.error?.name);
  }
}

testCloudinary();
