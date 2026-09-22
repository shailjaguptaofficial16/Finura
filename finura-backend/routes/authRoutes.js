const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  getProfile,
  googleLogin,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validateRegister, validateLogin } = require('../middleware/validate');

// Public Authentication Routes with Validation
router.post('/signup', validateRegister, signup);
router.post('/register', validateRegister, signup);
router.post('/login', validateLogin, login);
router.post('/google', googleLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Protected Authentication Routes
router.get('/profile', protect, getProfile);
router.get('/me', protect, getProfile);

module.exports = router;