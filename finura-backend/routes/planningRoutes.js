const express = require('express');
const { getPlanningOverview } = require('../controllers/planningController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);
router.get('/overview', getPlanningOverview);

module.exports = router;
