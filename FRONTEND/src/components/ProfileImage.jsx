import React, { useState, useEffect } from 'react';

const ProfileImage = ({ 
  src, 
  alt, 
  username, 
  className = '', 
  size = 'md',
  showFallback = true,
  style = {},
  onError = null
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;

  // Reset error state when src changes
  useEffect(() => {
    setImageError(false);
    setIsLoading(true);
    setRetryCount(0);
  }, [src]);

  const handleImageError = () => {
    console.warn(`Failed to load profile image for ${username}:`, src);
    setIsLoading(false);
    
    if (retryCount < maxRetries) {
      // Retry loading the image
      setRetryCount(prev => prev + 1);
      setImageError(false);
      setIsLoading(true);
      
      // Force reload by adding timestamp
      const retrySrc = `${src}?retry=${Date.now()}`;
      const img = new Image();
      img.onload = () => {
        setImageError(false);
        setIsLoading(false);
      };
      img.onerror = () => {
        if (retryCount + 1 >= maxRetries) {
          setImageError(true);
          setIsLoading(false);
          if (onError) onError();
        }
      };
      img.src = retrySrc;
    } else {
      setImageError(true);
      if (onError) onError();
    }
  };

  const handleImageLoad = () => {
    setImageError(false);
    setIsLoading(false);
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'xs': return 'w-6 h-6';
      case 'sm': return 'w-8 h-8';
      case 'md': return 'w-12 h-12';
      case 'lg': return 'w-16 h-16';
      case 'xl': return 'w-24 h-24';
      default: return 'w-12 h-12';
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'xs': return 'text-xs';
      case 'sm': return 'text-sm';
      case 'md': return 'text-base';
      case 'lg': return 'text-lg';
      case 'xl': return 'text-2xl';
      default: return 'text-base';
    }
  };

  const getImageSettings = () => {
    if (username && window.getSavedImageSettings) {
      const settings = window.getSavedImageSettings(username) || { position: { x: 50, y: 50 }, zoom: 100 };
      return {
        objectPosition: `${settings.position.x}% ${settings.position.y}%`,
        transform: `scale(${settings.zoom / 100})`,
        transformOrigin: 'center center'
      };
    }
    return {};
  };

  const fallbackInitial = username ? username.charAt(0).toUpperCase() : '?';

  if (!src || imageError) {
    return (
      <div className={`${getSizeClasses()} bg-gradient-to-r from-orange-400 to-blue-400 rounded-full flex items-center justify-center overflow-hidden shadow-md ${className}`}>
        {showFallback && (
          <span className={`text-white font-semibold ${getTextSize()}`}>
            {fallbackInitial}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`${getSizeClasses()} bg-gradient-to-r from-orange-400 to-blue-400 rounded-full flex items-center justify-center overflow-hidden shadow-md ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
        </div>
      )}
      <img
        src={src}
        alt={alt || `${username}'s profile`}
        className={`w-full h-full rounded-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        style={{
          ...getImageSettings(),
          ...style
        }}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading="lazy"
      />
    </div>
  );
};

export default ProfileImage;
