/**
 * Finura Backend Server Entry Point
 * Phase 1: Foundation, Security & Codebase Cleanup
 */

const express = require('express');
const dotenv = require('dotenv');

// 1. Load environment variables
dotenv.config();

// 2. Immediate Startup Check: Assert required environment variables exist
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  console.error(
    `\n❌ FATAL STARTUP ERROR: Missing required environment variable(s): ${missingEnvVars.join(', ')}`
  );
  console.error('Please configure these in your .env file or environment prior to launch.\n');
  process.exit(1);
}

// 3. Patch express to catch async errors automatically
require('express-async-errors');

// 4. Connect to MongoDB database
const connectDB = require('./config/db');
connectDB();

// 5. Initialize Express application
const app = express();

// 6. Import Security Middlewares & Centralized Error Handlers
const {
  globalLimiter,
  authLimiter,
  helmetMiddleware,
  mongoSanitizeMiddleware,
  xssCleanMiddleware,
  corsMiddleware,
} = require('./middleware/securityMiddleware');

const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { protect } = require('./middleware/authMiddleware');

// 7. Apply Security Middlewares
app.use(helmetMiddleware);
app.use(corsMiddleware);

// 8. Rate Limiting (environment-aware: skipped in tests, relaxed in development)
app.use(globalLimiter);
app.use('/api/auth', authLimiter);

// 9. Body Parsing Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 10. Data Sanitization against NoSQL injection & XSS
app.use(mongoSanitizeMiddleware);
app.use(xssCleanMiddleware);

// 11. Health Check Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Finura Enterprise API is operational',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// 12. Application API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/accounts', protect, require('./routes/accountRoutes'));
app.use('/api/goals', require('./routes/goalRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/wealth', require('./routes/wealthRoutes'));
app.use('/api/investments', require('./routes/investmentRoutes'));
app.use('/api/credit', require('./routes/creditRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// 13. Centralized 404 and Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

// 14. Start Server Listener (omitted during automated tests)
const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(
      `🚀 Finura Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
    );
  });
}

module.exports = app;
