const express = require('express');
const router = express.Router();
const {
  addTransaction,
  createTransfer,
  getTransactions,
  deleteTransaction,
  updateTransaction,
  getTransactionSummary,
  getMonthlySummary,
  getCategoryBreakdown,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');
const { validateTransaction, validateTransfer, validateUpdateTransaction } = require('../middleware/validate');

// All Transaction routes require JWT protection
router.use(protect);

// Main transaction collection routes
router.route('/')
  .get(getTransactions)
  .post(validateTransaction, addTransaction);

// Transfer route (account-to-account)
router.post('/transfer', validateTransfer, createTransfer);

// Summary & Aggregation routes
router.get('/summary', getTransactionSummary);
router.get('/monthly-summary', getMonthlySummary);
router.get('/category-breakdown', getCategoryBreakdown);

// Single transaction routes
router.route('/:id')
  .put(validateUpdateTransaction, updateTransaction)
  .delete(deleteTransaction);

module.exports = router;
