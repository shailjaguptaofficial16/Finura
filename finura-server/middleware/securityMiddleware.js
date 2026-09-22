/**
 * Finura Security Middleware Configuration
 * Implements Helmet headers, Mongo query sanitization, XSS protection,
 * strict CORS, and environment-aware rate limiting.
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const cors = require('cors');

// 1. Global API Limiter
// Strict 100 requests / 15 min in production; bypassed in test and relaxed in dev
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 10000,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 2. Auth Route Limiter
// Strict 15 attempts / 15 min in production; bypassed in test and relaxed in dev
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 15 : 1000,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 3. Helmet Security Headers with Safe CSP
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://*'],
      connectSrc: [
        "'self'",
        'http://localhost:4000',
        'http://localhost:5000',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
        'https://*',
      ],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// 4. Data Sanitization against NoSQL Query Injection & XSS
const mongoSanitizeMiddleware = mongoSanitize();
const xssCleanMiddleware = xss();

// 5. Strict CORS Policy
const corsMiddleware = cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.CLIENT_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://localhost:4000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
    ].filter(Boolean);

    // Permit if origin matches or if server-to-server / curl / testing requests without origin
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Blocked by strict CORS policy: origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

module.exports = {
  globalLimiter,
  authLimiter,
  helmetMiddleware,
  mongoSanitizeMiddleware,
  xssCleanMiddleware,
  corsMiddleware,
};
