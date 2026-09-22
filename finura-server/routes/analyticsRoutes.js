const express = require('express');
const router = express.Router();
const { getHealthScore, getReportSummary } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

// Protected analytics endpoints
router.use(protect);

router.get('/health-score', getHealthScore);
router.get('/report-summary', getReportSummary);

module.exports = router;
