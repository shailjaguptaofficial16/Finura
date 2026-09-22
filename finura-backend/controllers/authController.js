const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const { OAuth2Client } = require('google-auth-library');

// Helper to generate JWT Token
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is missing');
  }
  return jwt.sign(
    { userId: id, id: id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res) => {
  try {
    const { name, fullName, email, password, role } = req.body;
    const userName = name || fullName;

    // Validate required fields
    if (!userName || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    // Create user (password is hashed automatically by pre-save hook in User model)
    const user = await User.create({
      name: userName.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role && ['user', 'admin'].includes(role) ? role : 'user',
    });

    // Generate JWT token
    const token = generateToken(user._id);

    return res.status(201).json({
      message: 'Account created successfully!',
      token,
      name: user.name,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || '',
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });
  } catch (error) {
    console.error('Signup Error:', error);
    return res.status(500).json({ message: 'Server error during signup' });
  }
};

// @desc    Authenticate user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find user by lowercase email
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password match using model helper
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    return res.status(200).json({
      message: 'Login successful!',
      token,
      name: user.name,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || '',
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile (and GET /api/auth/me)
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      profilePicture: user.profilePicture,
      bio: user.bio,
      baseCurrency: user.baseCurrency,
      riskProfile: user.riskProfile,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    return res.status(500).json({ message: 'Server error retrieving profile' });
  }
};

// @desc    Google OAuth Login / Sign up
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
  try {
    const { accessToken, profile } = req.body;
    if (!accessToken || !profile?.email) {
      return res.status(400).json({ message: 'Invalid Google profile' });
    }

    const client = new OAuth2Client();
    const tokenInfo = await client.getTokenInfo(accessToken);
    if (tokenInfo.email !== profile.email || tokenInfo.email_verified === false) {
      return res.status(401).json({ message: 'Google account could not be verified' });
    }

    let user = await User.findOne({ email: profile.email.toLowerCase().trim() });
    if (!user) {
      user = await User.create({
        name: profile.name || profile.email.split('@')[0],
        email: profile.email.toLowerCase().trim(),
        password: crypto.randomBytes(32).toString('hex'),
        avatar: profile.picture || '',
      });
    } else if (profile.picture && user.avatar !== profile.picture) {
      user.avatar = profile.picture;
      await user.save();
    }

    const token = generateToken(user._id);
    return res.status(200).json({
      token,
      name: user.name,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    return res.status(401).json({ message: 'Google sign-in failed' });
  }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email ? email.toLowerCase().trim() : '' });

    if (!user) {
      return res.status(404).json({ message: 'There is no user with that email' });
    }

    // Get reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Set token and expiration (1 hour)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;

    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    const message = `
      <h1>You have requested a password reset</h1>
      <p>Please click on the following link, or paste this into your browser to complete the process:</p>
      <a href="${resetUrl}" clicktracking="off">${resetUrl}</a>
      <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
    `;

    const hasMailCredentials = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

    try {
      if (hasMailCredentials) {
        await sendEmail({
          email: user.email,
          subject: 'Finura Password Reset',
          message,
        });

        return res.status(200).json({ success: true, message: 'Email sent' });
      }

      return res.status(200).json({
        success: true,
        message: 'Password reset link generated successfully',
        resetToken,
        resetUrl,
      });
    } catch (err) {
      console.error('Email Send Error:', err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(200).json({
        success: true,
        message: 'Password reset link generated successfully',
        resetToken,
        resetUrl,
      });
    }
  } catch (error) {
    console.error('Forgot Password Error:', error);
    return res.status(500).json({ message: 'Server error processing password reset request' });
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = req.params.token;

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select('+resetPasswordToken');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Set new password (pre-save hook will hash it)
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    return res.status(500).json({ message: 'Server error resetting password' });
  }
};

module.exports = {
  signup,
  registerUser: signup,
  login,
  loginUser: login,
  getProfile,
  getMe: getProfile,
  googleLogin,
  forgotPassword,
  resetPassword,
};
