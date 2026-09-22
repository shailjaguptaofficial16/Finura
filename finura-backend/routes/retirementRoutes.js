const express = require('express');
const {
  createRetirementPlan,
  getRetirementPlan,
  updateRetirementPlan,
  deleteRetirementPlan,
} = require('../controllers/retirementController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

router.route('/')
  .post(createRetirementPlan)
  .get(getRetirementPlan)
  .put(updateRetirementPlan)
  .delete(deleteRetirementPlan);

module.exports = router;
