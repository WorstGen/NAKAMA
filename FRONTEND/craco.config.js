module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Fix for Node.js compatibility issues
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "crypto": false,
        "stream": false,
        "buffer": false
      };
      return webpackConfig;
    }
  }
};
