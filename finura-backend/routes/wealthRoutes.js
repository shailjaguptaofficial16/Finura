const express = require('express');
const router = express.Router();
const { getWealthOverview, getPortfolio, getNetWorth, getAllocation, getUnifiedWealthOverview, createSnapshot, getSnapshots, getGrowth } = require('../controllers/wealthController');
const { protect } = require('../middleware/authMiddleware');

// Protect all wealth routes with JWT authentication
router.use(protect);

router.get('/overview', getUnifiedWealthOverview);
router.get('/legacy-overview', getWealthOverview);
router.get('/portfolio', getPortfolio);
router.get('/net-worth', getNetWorth);
router.get('/allocation', getAllocation);
router.post('/snapshots', createSnapshot);
router.get('/snapshots', getSnapshots);
router.get('/growth', getGrowth);

module.exports = router;
