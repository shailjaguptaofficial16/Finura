const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createMutualFund, getMutualFunds, getMutualFund, updateMutualFund, deleteMutualFund } = require('../controllers/mutualFundController');
const router = express.Router(); router.use(protect); router.route('/').post(createMutualFund).get(getMutualFunds); router.route('/:id').get(getMutualFund).put(updateMutualFund).delete(deleteMutualFund); module.exports = router;