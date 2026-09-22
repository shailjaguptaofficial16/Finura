const express = require('express');
const router = express.Router();
const {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} = require('../controllers/accountController');
const { protect } = require('../middleware/authMiddleware');

// Ensure all Account routes require authentication
router.use(protect);

router.route('/')
  .get(getAccounts)
  .post(createAccount);

router.route('/:id')
  .put(updateAccount)
  .delete(deleteAccount);

module.exports = router;
