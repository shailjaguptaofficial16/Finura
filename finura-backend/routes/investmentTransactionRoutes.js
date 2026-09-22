const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { buyInvestment, sellInvestment, getTransactions, getTransaction } = require('../controllers/investmentController');

const router = express.Router();
router.use(protect);
router.post('/buy', buyInvestment);
router.post('/sell', sellInvestment);
router.get('/', getTransactions);
router.get('/:id', getTransaction);

module.exports = router;