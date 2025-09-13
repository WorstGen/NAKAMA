# 🔒 NAKAMA Security Guide

## 🚨 Current Security Issues & Solutions

### **1. Backend URL Exposure**

**❌ Problem:** Your Railway backend URL `nakama-production-1850.up.railway.app` is hardcoded in multiple places.

**✅ Solutions:**

#### **Option A: Environment Variables (Recommended)**
```bash
# In your Railway dashboard, set:
REACT_APP_API_URL=https://nakama-production-1850.up.railway.app
```

#### **Option B: Use a Custom Domain**
1. Buy a domain (e.g., `api.nakama.com`)
2. Set up Railway custom domain
3. Update all references to use your domain

#### **Option C: Use a Proxy/CDN**
- Cloudflare Workers
- Vercel Edge Functions
- AWS CloudFront

### **2. Console Logging Security**

**✅ Fixed:** Updated frontend to only log in development mode.

**Still Need to Fix:**
- Backend authentication logs
- Widget files with hardcoded URLs
- Documentation files

### **3. Widget Security**

**❌ Problem:** Public widget files expose your backend URL.

**✅ Solutions:**

#### **Option A: Use Environment Variables in Widget**
```javascript
// In nakama-login-widget.js
const NAKAMA_API_BASE = window.NAKAMA_CONFIG?.apiUrl || 'https://nakama-production-1850.up.railway.app';
```

#### **Option B: Use a Proxy Endpoint**
```javascript
// Create a proxy endpoint that doesn't expose your real backend
const NAKAMA_API_BASE = 'https://api.nakama.com';
```

### **4. Backend Logging Security**

**❌ Problem:** Backend logs sensitive authentication data.

**✅ Solutions:**

#### **Remove Sensitive Logs:**
```javascript
// In server.js, remove or conditionally log:
console.log('Backend Auth Debug:');
console.log('Received signature:', signature);
console.log('Received message:', message);
```

#### **Use Proper Logging Levels:**
```javascript
// Use a proper logging library like winston
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});
```

## 🛡️ Recommended Security Measures

### **1. Environment Variables**
```bash
# Frontend (.env.local)
REACT_APP_API_URL=https://your-secure-domain.com

# Backend (.env)
NODE_ENV=production
LOG_LEVEL=warn
```

### **2. Rate Limiting**
```javascript
// Already implemented but consider stricter limits for production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
```

### **3. CORS Configuration**
```javascript
// Only allow your frontend domains
const corsOptions = {
  origin: [
    'https://your-frontend-domain.com',
    'https://your-widget-domain.com'
  ],
  credentials: true
};
```

### **4. Input Validation**
```javascript
// Validate all inputs
const { body, validationResult } = require('express-validator');

app.post('/api/profile', [
  body('username').isLength({ min: 3, max: 20 }).trim().escape(),
  body('bio').optional().isLength({ max: 500 }).trim().escape()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Process request
});
```

### **5. Database Security**
```javascript
// Use MongoDB connection with SSL
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: true,
  sslValidate: true
});
```

## 🚀 Implementation Priority

### **High Priority (Do Now):**
1. ✅ Set up environment variables
2. ✅ Remove sensitive console logs
3. 🔄 Update widget files to use configurable URLs
4. 🔄 Set up custom domain

### **Medium Priority:**
1. Implement proper logging library
2. Add input validation middleware
3. Set up monitoring/alerting

### **Low Priority:**
1. Add API key authentication for widgets
2. Implement request signing
3. Add DDoS protection

## 📋 Checklist

- [ ] Set `REACT_APP_API_URL` environment variable
- [ ] Update all widget files to use configurable URLs
- [ ] Remove hardcoded URLs from documentation
- [ ] Set up custom domain
- [ ] Remove sensitive backend logs
- [ ] Implement proper logging levels
- [ ] Test all functionality with new configuration

## 🔍 Monitoring

### **What to Monitor:**
- Failed authentication attempts
- Unusual request patterns
- High error rates
- Resource usage spikes

### **Tools:**
- Railway built-in monitoring
- Sentry for error tracking
- LogRocket for user sessions
- Cloudflare for DDoS protection

## 📞 Support

If you need help implementing any of these security measures, I can assist with:
- Setting up environment variables
- Configuring custom domains
- Implementing proper logging
- Adding input validation
- Setting up monitoring
