const express = require('express');
const router = express.Router();
const {
  applyCredit,
  getMyApplications,
  getCreditEligibility,
} = require('../controllers/creditController');
const { protect } = require('../middleware/authMiddleware');

// All credit routes are protected with JWT authentication
router.use(protect);

router.post('/apply', applyCredit);
router.get('/my-applications', getMyApplications);
router.get('/eligibility', getCreditEligibility);

module.exports = router;
