import React, { useState, useEffect } from 'react';


const ProfileImage = ({ 
  src, 
  alt, 
  username, 
  className = '', 
  size = 'md',
  showFallback = true,
  style = {},
  onError = null,
  onLoad = null
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  

  // Sanitize URL to fix double URL issues
  const sanitizeUrl = (url) => {
    if (!url || typeof url !== 'string') return url;
    
    // Fix double URL issue
    if (url.includes('nakama-production-1850.up.railway.apphttps://')) {
      const fixedUrl = url.replace('https://nakama-production-1850.up.railway.apphttps://', 'https://');
      console.warn(`Fixed double URL: ${url} -> ${fixedUrl}`);
      return fixedUrl;
    }
    
    return url;
  };

  const sanitizedSrc = sanitizeUrl(src);

  // Reset error state when src changes
  useEffect(() => {
    if (sanitizedSrc) {
      setImageError(false);
      setIsLoading(true);
      // console.log(`ProfileImage src for ${username}:`, sanitizedSrc);
    }
  }, [sanitizedSrc, username]);


  const handleImageError = () => {
    console.error(`Failed to load profile image for ${username}:`, sanitizedSrc);
    setImageError(true);
    setIsLoading(false);
    if (onError) onError();
  };

  const handleImageLoad = () => {
    // console.log(`✅ Image loaded successfully for ${username}`);
    setImageError(false);
    setIsLoading(false);
    if (onLoad) onLoad();
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

  // Simplified - no complex image settings that might cause issues

  const fallbackInitial = username ? username.charAt(0).toUpperCase() : '?';

  if (!src || imageError) {
    return (
      <div className={`${getSizeClasses()} bg-gradient-to-r from-orange-400 to-blue-400 rounded-lg flex items-center justify-center overflow-hidden shadow-md ${className}`}>
        {showFallback && (
          <span className={`text-white font-semibold ${getTextSize()}`}>
            {fallbackInitial}
          </span>
        )}
      </div>
    );
  }

  // Debug Cloudinary configuration
  // console.log('ProfileImage using sanitized URL:', sanitizedSrc);
  
  // Remove test image - it might be interfering with the actual image

  return (
    <div className={`${getSizeClasses()} bg-gradient-to-r from-orange-400 to-blue-400 rounded-lg flex items-center justify-center overflow-hidden shadow-md relative ${className}`}>
      {isLoading && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-orange-400 to-blue-400">
          <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
        </div>
      )}
      {src && (
        <img
          src={sanitizedSrc}
          alt={alt || `${username}'s profile`}
          className="w-full h-full rounded-lg object-cover transition-opacity duration-200"
          style={style}
          onError={(e) => {
            console.error('❌ IMG TAG ERROR for', username, ':', e);
            handleImageError();
          }}
          onLoad={(e) => {
            // console.log('✅ IMG TAG LOADED for', username, ':', e.target?.currentSrc);
            handleImageLoad();
          }}
        />
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
