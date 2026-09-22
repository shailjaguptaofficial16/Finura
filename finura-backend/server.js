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
if (process.env.NODE_ENV === 'production') {
  requiredEnvVars.push('CLIENT_URL');
}
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  console.error(
    `\n❌ FATAL STARTUP ERROR: Missing required environment variable(s): ${missingEnvVars.join(', ')}`
  );
  console.error('Please configure these in your .env file or environment prior to launch.\n');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production') {
  const usesLocalDatabase = /localhost|127\.0\.0\.1/i.test(process.env.MONGO_URI);
  const hasWeakSecret = (process.env.JWT_SECRET || '').length < 32;
  if (usesLocalDatabase || hasWeakSecret) {
    console.error('\nFATAL STARTUP ERROR: Production requires a remote MongoDB URI and a strong JWT_SECRET.\n');
    process.exit(1);
  }
}

// 3. Patch express to catch async errors automatically
require('express-async-errors');

// 4. Connect to MongoDB database
const connectDB = require('./config/db');
connectDB();

// 5. Initialize Express application
const app = express();
app.disable('x-powered-by');

// 6. Import Security Middlewares & Centralized Error Handlers
const {
  globalLimiter,
  authLimiter,
  helmetMiddleware,
  mongoSanitizeMiddleware,
  xssCleanMiddleware,
  corsMiddleware,
  aiLimiter,
  notificationLimiter,
} = require('./middleware/securityMiddleware');

const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { protect } = require('./middleware/authMiddleware');
const { processDueRecurringTransactions } = require('./utils/recurrenceEngine');

// 7. Apply Security Middlewares
app.use(helmetMiddleware);
app.use(corsMiddleware);

// 8. Rate Limiting (environment-aware: skipped in tests, relaxed in development)
app.use(globalLimiter);
app.use('/api/auth', authLimiter);

// 9. Body Parsing Middleware
app.use(express.json({ limit: '2mb', parameterLimit: 1000 }));
app.use(express.urlencoded({ extended: true, limit: '2mb', parameterLimit: 1000 }));

// 10. Data Sanitization against NoSQL injection & XSS
app.use(mongoSanitizeMiddleware);
app.use(xssCleanMiddleware);

// 11. Health Check Endpoints
const healthResponse = (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
  });
};

app.get('/api/health', healthResponse);
app.get('/', healthResponse);

// 12. Application API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/recurring', require('./routes/recurringTransactionRoutes'));
app.use('/api/budgets', require('./routes/budgetRoutes'));
app.use('/api/savings', require('./routes/savingRoutes'));
app.use('/api/emergency-fund', require('./routes/emergencyFundRoutes'));
app.use('/api/forecast', require('./routes/forecastRoutes'));
app.use('/api/retirement', require('./routes/retirementRoutes'));
app.use('/api/planning', require('./routes/planningRoutes'));
app.use('/api/accounts', protect, require('./routes/accountRoutes'));
app.use('/api/goals', require('./routes/goalRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/wealth', require('./routes/wealthRoutes'));
app.use('/api/assets', require('./routes/assetRoutes'));
app.use('/api/liabilities', require('./routes/liabilityRoutes'));
app.use('/api/investments', require('./routes/investmentRoutes'));
app.use('/api/investment-transactions', require('./routes/investmentTransactionRoutes'));
app.use('/api/mutual-funds', require('./routes/mutualFundRoutes'));
app.use('/api/sips', require('./routes/sipRoutes'));
app.use('/api/market', require('./routes/marketRoutes'));
app.use('/api/credit', require('./routes/creditRoutes'));
app.use('/api/notifications', notificationLimiter, require('./routes/notificationRoutes'));
app.use('/api/ai', aiLimiter, require('./routes/aiRoutes'));
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

  // Check due recurring transactions once per minute.
  processDueRecurringTransactions().catch((error) => {
    console.error(`Initial recurring transaction run failed: ${error.message}`);
  });
  setInterval(() => {
    processDueRecurringTransactions().catch((error) => {
      console.error(`Recurring transaction engine failed: ${error.message}`);
    });
  }, 60 * 1000);
}

module.exports = app;
