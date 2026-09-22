const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const avatar = user.avatarUrl || user.profilePicture || user.avatar || '';
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      profession: user.profession || '',
      role: user.role,
      avatarUrl: avatar,
      avatar: avatar,
      bio: user.bio || '',
      twoFactorEnabled: user.twoFactorEnabled,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.body.name) user.name = req.body.name;
    if (req.body.phone !== undefined) user.phone = req.body.phone;
    if (req.body.profession !== undefined) user.profession = req.body.profession;
    else if (req.body.occupation !== undefined) user.profession = req.body.occupation;
    if (req.body.avatarUrl !== undefined) user.avatarUrl = req.body.avatarUrl;
    else if (req.body.avatar !== undefined) user.avatarUrl = req.body.avatar;
    if (req.body.bio !== undefined) user.bio = req.body.bio;
    if (req.body.twoFactorEnabled !== undefined) user.twoFactorEnabled = req.body.twoFactorEnabled;

    const updatedUser = await user.save();
    const avatar = updatedUser.avatarUrl || updatedUser.profilePicture || updatedUser.avatar || '';
    res.json({
      _id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone || '',
      profession: updatedUser.profession || '',
      role: updatedUser.role,
      avatarUrl: avatar,
      avatar: avatar,
      bio: updatedUser.bio || '',
      twoFactorEnabled: updatedUser.twoFactorEnabled,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Change password
// @route   PUT /api/user/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Select password field since it has select: false in schema
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid current password' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  changePassword,
};
