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
  const [timeoutId, setTimeoutId] = useState(null);
  const maxRetries = 2;
  const loadingTimeout = 5000; // 5 seconds timeout
  

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
    setImageError(false);
    setIsLoading(true);
    setRetryCount(0);
    
    // Debug: Log the src URL
    console.log(`ProfileImage src for ${username}:`, sanitizedSrc);
    
    // Set a timeout to stop loading if image takes too long
    const timeout = setTimeout(() => {
      console.warn(`Profile image loading timeout for ${username}:`, sanitizedSrc);
      setImageError(true);
      setIsLoading(false);
      if (onError) onError();
    }, loadingTimeout);
    
    setTimeoutId(timeout);
    
    return () => {
      clearTimeout(timeout);
    };
  }, [sanitizedSrc, username, onError, loadingTimeout]);


  const handleImageError = () => {
    console.warn(`Failed to load profile image for ${username}:`, sanitizedSrc);
    
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
      const retrySrc = `${sanitizedSrc}?retry=${Date.now()}`;
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

  // Debug Cloudinary configuration
  console.log('ProfileImage using sanitized URL:', sanitizedSrc);

  return (
    <div className={`${getSizeClasses()} bg-gradient-to-r from-orange-400 to-blue-400 rounded-full flex items-center justify-center overflow-hidden shadow-md relative ${className}`}>
      {isLoading && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-orange-400 to-blue-400">
          <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
        </div>
      )}
      {!isLoading && !imageError && src && (
        <img
          src={sanitizedSrc}
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
