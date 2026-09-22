const express = require('express');
const router = express.Router();

const {
  getGoals,
  setGoal,
  updateGoal,
  deleteGoal,
  addFunds,
} = require('../controllers/goalController');

const { protect } = require('../middleware/authMiddleware');

// All Goal routes require valid JWT authentication
router.use(protect);

router.route('/')
  .get(getGoals)
  .post(setGoal);

router.put('/:id/add-funds', addFunds);

router.route('/:id')
  .put(updateGoal)
  .delete(deleteGoal);

module.exports = router;