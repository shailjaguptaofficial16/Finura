const express = require('express');
const router = express.Router();
const { getWealthOverview, getPortfolio } = require('../controllers/wealthController');
const { protect } = require('../middleware/authMiddleware');

// Protect all wealth routes with JWT authentication
router.use(protect);

router.get('/overview', getWealthOverview);
router.get('/portfolio', getPortfolio);

module.exports = router;
