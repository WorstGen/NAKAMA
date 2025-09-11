import React from 'react';
import ProfileImage from './ProfileImage';

// Define gradient configurations for each chain with enhanced glow colors
const chainGradients = {
  solana: {
    gradient: 'linear-gradient(135deg, #14F195 0%, #00D4AA 30%, #00B4DB 70%, #0EA5E9 100%)',
    glowColor: '#14F195',
    name: 'Solana'
  },
  ethereum: {
    gradient: 'linear-gradient(135deg, #627EEA 0%, #4F46E5 30%, #7C3AED 70%, #A855F7 100%)',
    glowColor: '#627EEA',
    name: 'Ethereum'
  },
  polygon: {
    gradient: 'linear-gradient(135deg, #8247E5 0%, #A855F7 30%, #C084FC 70%, #E879F9 100%)',
    glowColor: '#8247E5',
    name: 'Polygon'
  },
  base: {
    gradient: 'linear-gradient(135deg, #0052FF 0%, #3B82F6 30%, #60A5FA 70%, #93C5FD 100%)',
    glowColor: '#0052FF',
    name: 'Base'
  },
  arbitrum: {
    gradient: 'linear-gradient(135deg, #28A0F0 0%, #0EA5E9 30%, #06B6D4 70%, #0891B2 100%)',
    glowColor: '#28A0F0',
    name: 'Arbitrum'
  },
  optimism: {
    gradient: 'linear-gradient(135deg, #FF0420 0%, #EF4444 30%, #F87171 70%, #FCA5A5 100%)',
    glowColor: '#FF0420',
    name: 'Optimism'
  }
};

const GradientProfileImage = ({ 
  src, 
  username, 
  size = 'sm', 
  className = '', 
  activeChain = 'solana',
  style = {} 
}) => {
  const gradientConfig = chainGradients[activeChain] || chainGradients.solana;
  
  // Size configurations
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const sizeClass = sizeClasses[size] || sizeClasses.sm;

  return (
    <div className={`relative ${sizeClass}`}>
      {/* Multiple glow layers for enhanced effect */}
      <div 
        className="absolute inset-0 rounded-full opacity-60 blur-md -z-20 animate-pulse"
        style={{
          background: gradientConfig.gradient,
          transform: 'scale(1.3)',
          animationDuration: '3s'
        }}
      />
      <div 
        className="absolute inset-0 rounded-full opacity-40 blur-lg -z-30"
        style={{
          background: gradientConfig.gradient,
          transform: 'scale(1.5)'
        }}
      />
      
      {/* Main gradient outline container */}
      <div 
        className={`${sizeClass} rounded-full p-0.5 relative z-10`}
        style={{
          background: gradientConfig.gradient,
          boxShadow: `0 0 30px ${gradientConfig.glowColor}60, 0 0 60px ${gradientConfig.glowColor}30, 0 0 90px ${gradientConfig.glowColor}20`
        }}
      >
        {/* Inner container for the actual profile image */}
        <div className="w-full h-full rounded-full overflow-hidden bg-gray-800">
          <ProfileImage
            src={src}
            username={username}
            size={size}
            className={`w-full h-full object-cover ${className}`}
            style={{
              ...style,
              border: 'none', // Remove any existing border since we have the gradient outline
              boxShadow: 'none' // Remove any existing box shadow
            }}
          />
        </div>
      </div>
      
      {/* Additional outer glow ring */}
      <div 
        className="absolute inset-0 rounded-full opacity-20 blur-xl -z-40"
        style={{
          background: gradientConfig.gradient,
          transform: 'scale(1.8)'
        }}
      />
    </div>
  );
};

export default GradientProfileImage;
