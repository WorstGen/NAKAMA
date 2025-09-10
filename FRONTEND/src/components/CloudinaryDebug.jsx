import React from 'react';

const CloudinaryDebug = () => {
  const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.REACT_APP_CLOUDINARY_API_KEY;
  const apiSecret = process.env.REACT_APP_CLOUDINARY_API_SECRET;

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <h4>🔧 Cloudinary Debug</h4>
      <div>Cloud Name: {cloudName ? '✅ Set' : '❌ Missing'}</div>
      <div>API Key: {apiKey ? '✅ Set' : '❌ Missing'}</div>
      <div>API Secret: {apiSecret ? '✅ Set' : '❌ Missing'}</div>
      <div>Status: {cloudName && apiKey && apiSecret ? '✅ Ready' : '❌ Not Ready'}</div>
      {cloudName && (
        <div style={{ marginTop: '5px', fontSize: '10px' }}>
          <div>Cloud Name: {cloudName}</div>
        </div>
      )}
    </div>
  );
};

export default CloudinaryDebug;
