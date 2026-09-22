const express = require('express');
const router = express.Router();
const { getDashboardStats, getMoneySummary } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

router.get('/stats', protect, getDashboardStats);
router.get('/money-summary', protect, getMoneySummary);

module.exports = router;
