const express = require('express');
const router = express.Router();
const {
  addInvestment,
  getInvestments,
  getInvestment,
  updateInvestment,
  deleteInvestment,
  getPortfolio,
  getInvestmentPerformance,
  getInvestmentDashboardOverview,
  buyInvestment,
  sellInvestment,
  getTransactions,
  getTransaction,
} = require('../controllers/investmentController');
const { protect } = require('../middleware/authMiddleware');

// All Investment routes are protected with JWT
router.use(protect);

router.route('/')
  .get(getInvestments)
  .post(addInvestment);

router.get('/portfolio', getPortfolio);
router.get('/performance', getInvestmentPerformance);
router.get('/overview', getInvestmentDashboardOverview);

router.post('/investment-transactions/buy', buyInvestment);
router.post('/investment-transactions/sell', sellInvestment);
router.get('/investment-transactions', getTransactions);
router.get('/investment-transactions/:id', getTransaction);

router.route('/:id')
  .get(getInvestment)
  .put(updateInvestment)
  .delete(deleteInvestment);

module.exports = router;
