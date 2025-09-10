import React, { createContext, useContext } from 'react';
import { CloudinaryContext as CloudinaryContextProvider } from 'cloudinary-react';

const CloudinaryContext = createContext();

export const useCloudinary = () => {
  const context = useContext(CloudinaryContext);
  if (!context) {
    throw new Error('useCloudinary must be used within a CloudinaryProvider');
  }
  return context;
};

export const CloudinaryProvider = ({ children }) => {
  const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;

  if (!cloudName) {
    console.warn('Cloudinary cloud name not found in environment variables');
    return <>{children}</>;
  }

  return (
    <CloudinaryContextProvider cloudName={cloudName}>
      <CloudinaryContext.Provider value={{ cloudName }}>
        {children}
      </CloudinaryContext.Provider>
    </CloudinaryContextProvider>
  );
};
