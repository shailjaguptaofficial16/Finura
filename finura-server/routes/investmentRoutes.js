const express = require('express');
const router = express.Router();
const {
  addInvestment,
  getInvestments,
  deleteInvestment,
} = require('../controllers/investmentController');
const { protect } = require('../middleware/authMiddleware');

// All Investment routes are protected with JWT
router.use(protect);

router.route('/')
  .get(getInvestments)
  .post(addInvestment);

router.route('/:id')
  .delete(deleteInvestment);

module.exports = router;
