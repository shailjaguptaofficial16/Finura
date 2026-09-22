const express = require('express');
const {
  getRecurringTransactions,
  getRecurringNotifications,
  getRecurringTransaction,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  pauseRecurringTransaction,
  resumeRecurringTransaction,
} = require('../controllers/recurringTransactionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getRecurringTransactions)
  .post(createRecurringTransaction);

router.get('/notifications', getRecurringNotifications);

router.post('/:id/pause', pauseRecurringTransaction);
router.post('/:id/resume', resumeRecurringTransaction);

router.route('/:id')
  .get(getRecurringTransaction)
  .put(updateRecurringTransaction)
  .delete(deleteRecurringTransaction);

module.exports = router;
