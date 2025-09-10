import React from 'react';
import { Image, Transformation } from 'cloudinary-react';

const Logo = ({ 
  size = 'medium', 
  className = '', 
  onClick = null,
  showText = true 
}) => {
  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return { width: 120, height: 32 };
      case 'medium':
        return { width: 180, height: 48 };
      case 'large':
        return { width: 240, height: 64 };
      default:
        return { width: 180, height: 48 };
    }
  };

  const { width, height } = getSizeConfig();
  const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;

  // Inline SVG component for fallback
  const InlineLogo = () => (
    <svg
      width={width}
      height={height}
      viewBox="0 0 180 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#fb923c', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <rect x="0" y="8" width="180" height="32" rx="16" fill="url(#logoGradient)" />
      {showText && (
        <text
          x="90"
          y="30"
          textAnchor="middle"
          fill="white"
          fontSize="20"
          fontWeight="bold"
          fontFamily="Arial, sans-serif"
          letterSpacing="2px"
        >
          NAKAMA
        </text>
      )}
      <circle cx="30" cy="24" r="4" fill="white" opacity="0.9"/>
      <circle cx="150" cy="24" r="4" fill="white" opacity="0.9"/>
      <rect x="50" y="20" width="6" height="8" fill="white" opacity="0.8"/>
      <rect x="65" y="18" width="6" height="12" fill="white" opacity="0.8"/>
      <rect x="80" y="22" width="6" height="4" fill="white" opacity="0.8"/>
      <rect x="95" y="20" width="6" height="8" fill="white" opacity="0.8"/>
      <rect x="110" y="16" width="6" height="16" fill="white" opacity="0.8"/>
    </svg>
  );

  // Fallback to inline SVG if Cloudinary is not configured
  if (!cloudName) {
    console.warn('Cloudinary cloud name not found, using inline SVG logo');
    return <InlineLogo />;
  }

  return (
    <Image
      cloudName={cloudName}
      publicId="nakama-logo_m7m10g"
      width={width}
      height={height}
      crop="scale"
      quality="auto"
      fetchFormat="auto"
      className={className}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onError={() => {
        console.warn('Cloudinary logo failed to load, falling back to inline SVG');
      }}
    >
      <Transformation
        width={width}
        height={height}
        crop="scale"
        quality="auto"
        format="auto"
      />
    </Image>
  );
};

export default Logo;
