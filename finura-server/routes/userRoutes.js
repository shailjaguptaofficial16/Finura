const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile, changePassword } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { validateProfileUpdate } = require('../middleware/validate');

router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, validateProfileUpdate, updateUserProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;
