// Security Configuration for NAKAMA Backend
module.exports = {
  // Rate Limiting Configuration - Much more lenient for better UX
  rateLimits: {
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 2000, // requests per window (was 100)
      message: 'Too many requests from this IP, please try again later'
    },
    strict: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 500, // requests per window (was 10)
      message: 'Too many requests from this IP, please try again later'
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 50, // requests per window (was 5)
      message: 'Too many authentication attempts, please try again later'
    },
    upload: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 100, // uploads per hour (was 10)
      message: 'Too many uploads, please try again later'
    }
  },

  // Input Validation Rules
  validation: {
    username: {
      minLength: 3,
      maxLength: 20,
      pattern: /^[a-zA-Z0-9_]+$/,
      message: 'Username must be 3-20 characters, letters, numbers, and underscores only'
    },
    bio: {
      maxLength: 500,
      message: 'Bio must be 500 characters or less'
    },
    walletAddress: {
      minLength: 32,
      maxLength: 44,
      pattern: /^[A-Za-z0-9]+$/,
      message: 'Invalid wallet address format'
    },
    ethAddress: {
      pattern: /^0x[a-fA-F0-9]{40}$/,
      message: 'Invalid Ethereum address format'
    }
  },

  // Security Headers
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  },

  // CORS Configuration
  cors: {
    allowedOrigins: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://localhost:3000',
      'https://localhost:3001',
      process.env.FRONTEND_URL,
      'https://nakama-production-1850.up.railway.app',
      /^https:\/\/.*\.vercel\.app$/,
      /^https:\/\/.*\.netlify\.app$/,
      /^https:\/\/.*\.github\.io$/
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-signature', 'x-message', 'x-public-key'],
    maxAge: 86400 // 24 hours
  },

  // Content Security Policy
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },

  // Audit Logging Configuration
  audit: {
    enabled: true,
    logLevel: 'info',
    sensitiveActions: [
      'PROFILE_UPDATE',
      'PROFILE_PICTURE_UPLOAD',
      'TRANSACTION_CREATE',
      'CONTACT_ADD',
      'CONTACT_REMOVE'
    ]
  },

  // Database Security
  database: {
    connectionOptions: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      bufferCommands: false
    }
  }
};
