const express = require('express');
const {
  createEmergencyFund,
  getEmergencyFund,
  updateEmergencyFund,
  deleteEmergencyFund,
  contributeToEmergencyFund,
  withdrawFromEmergencyFund,
} = require('../controllers/emergencyFundController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

router.post('/contribute', contributeToEmergencyFund);
router.post('/withdraw', withdrawFromEmergencyFund);

router.route('/')
  .get(getEmergencyFund)
  .post(createEmergencyFund)
  .put(updateEmergencyFund)
  .delete(deleteEmergencyFund);

module.exports = router;
