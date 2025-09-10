import React, { useState, useEffect } from 'react';
import { Image } from 'cloudinary-react';

// Helper function to extract public ID from Cloudinary URL
const extractPublicId = (url) => {
  if (!url) return null;
  
  // Check if it's a Cloudinary URL
  if (url.includes('cloudinary.com')) {
    const parts = url.split('/');
    const folderAndId = parts[parts.length - 2] + '/' + parts[parts.length - 1].split('.')[0];
    return folderAndId;
  }
  
  return null;
};

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
  const [timeoutId, setTimeoutId] = useState(null);
  const maxRetries = 2;
  const loadingTimeout = 5000; // 5 seconds timeout

  // Reset error state when src changes
  useEffect(() => {
    setImageError(false);
    setIsLoading(true);
    setRetryCount(0);
    
    // Debug: Log the src URL
    console.log(`ProfileImage src for ${username}:`, src);
    
    // Set a timeout to stop loading if image takes too long
    const timeout = setTimeout(() => {
      console.warn(`Profile image loading timeout for ${username}:`, src);
      setImageError(true);
      setIsLoading(false);
      if (onError) onError();
    }, loadingTimeout);
    
    setTimeoutId(timeout);
    
    return () => {
      clearTimeout(timeout);
    };
  }, [src, username, onError, loadingTimeout]);


  const handleImageError = () => {
    console.warn(`Failed to load profile image for ${username}:`, src);
    
    // Clear timeout since we're handling the error
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    
    setIsLoading(false);
    
    if (retryCount < maxRetries) {
      // Retry loading the image
      setRetryCount(prev => prev + 1);
      setImageError(false);
      setIsLoading(true);
      
      // Force reload by adding timestamp
      const retrySrc = `${src}?retry=${Date.now()}`;
      const img = new Image();
      
      // Set timeout for retry attempt
      const retryTimeout = setTimeout(() => {
        setImageError(true);
        setIsLoading(false);
        if (onError) onError();
      }, loadingTimeout);
      
      img.onload = () => {
        clearTimeout(retryTimeout);
        setImageError(false);
        setIsLoading(false);
      };
      img.onerror = () => {
        clearTimeout(retryTimeout);
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
    // Clear timeout since image loaded successfully
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
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

  const publicId = extractPublicId(src);
  const isCloudinaryImage = publicId !== null;

  return (
    <div className={`${getSizeClasses()} bg-gradient-to-r from-orange-400 to-blue-400 rounded-full flex items-center justify-center overflow-hidden shadow-md relative ${className}`}>
      {isLoading && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-orange-400 to-blue-400">
          <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
        </div>
      )}
      {!isLoading && !imageError && src && (
        isCloudinaryImage ? (
          <Image
            cloudName={process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}
            publicId={publicId}
            width="400"
            height="400"
            crop="fill"
            gravity="face"
            quality="auto"
            fetchFormat="auto"
            className="w-full h-full rounded-full object-cover transition-opacity duration-200"
            style={{
              ...getImageSettings(),
              ...style
            }}
            onError={handleImageError}
            onLoad={handleImageLoad}
            loading="lazy"
          />
        ) : (
          <img
            src={src}
            alt={alt || `${username}'s profile`}
            className="w-full h-full rounded-full object-cover transition-opacity duration-200"
            style={{
              ...getImageSettings(),
              ...style
            }}
            onError={handleImageError}
            onLoad={handleImageLoad}
            loading="lazy"
          />
        )
      )}
      {(imageError || (!src && !isLoading)) && showFallback && (
        <span className={`text-white font-semibold ${getTextSize()}`}>
          {fallbackInitial}
        </span>
      )}
    </div>
  );
};

export default ProfileImage;
