const express = require('express');
const router = express.Router();

const {
  getGoals,
  getGoal,
  setGoal,
  updateGoal,
  deleteGoal,
  addFunds,
  contributeToGoal,
  reverseGoalContribution,
} = require('../controllers/goalController');

const { protect } = require('../middleware/authMiddleware');

// All Goal routes require valid JWT authentication
router.use(protect);

router.route('/')
  .get(getGoals)
  .post(setGoal);

router.put('/:id/add-funds', addFunds);
router.post('/:id/contribute', contributeToGoal);
router.delete('/:id/contributions/:contributionId', reverseGoalContribution);

router.route('/:id')
  .get(getGoal)
  .put(updateGoal)
  .delete(deleteGoal);

module.exports = router;