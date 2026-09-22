const express = require('express');
const router = express.Router();
const {
  applyCredit,
  getMyApplications,
  getCreditEligibility,
  getCreditOverviewController,
  getCreditDashboardController,
  createCreditCard, getCreditCards, getCreditCard, updateCreditCard, closeCreditCard,
  createLoan, getLoans, getLoan, updateLoan, closeLoan,
  createCreditScore, getLatestCreditScore, getCreditScores, updateCreditScore, deleteCreditScore,
  createApplication, listApplications, getApplication, updateApplication, cancelApplication, updateApplicationStatus,
  createRepayment, listRepayments, payRepayment,
  generateLoanSchedule,
} = require('../controllers/creditController');
const { protect } = require('../middleware/authMiddleware');

// All credit routes are protected with JWT authentication
router.use(protect);

router.post('/apply', applyCredit);
router.get('/my-applications', getMyApplications);
router.get('/eligibility', getCreditEligibility);
router.route('/applications').post(createApplication).get(listApplications);
router.route('/applications/:id').get(getApplication).patch(updateApplication).delete(cancelApplication);
router.patch('/applications/:id/status', updateApplicationStatus);
router.get('/overview', getCreditOverviewController);
router.get('/dashboard', getCreditDashboardController);
router.route('/cards').post(createCreditCard).get(getCreditCards);
router.route('/cards/:id').get(getCreditCard).patch(updateCreditCard).delete(closeCreditCard);
router.patch('/cards/:id/status', updateCreditCard);
router.route('/loans').post(createLoan).get(getLoans);
router.route('/loans/:id').get(getLoan).patch(updateLoan).delete(closeLoan);
router.patch('/loans/:id/status', updateLoan);
router.post('/score', createCreditScore);
router.get('/score/latest', getLatestCreditScore);
router.get('/score/history', getCreditScores);
router.patch('/score/:id', updateCreditScore);
router.delete('/score/:id', deleteCreditScore);
router.post('/repayments', createRepayment);
router.get('/repayments', listRepayments);
router.post('/repayments/:id/pay', payRepayment);
router.post('/loans/:id/amortization', generateLoanSchedule);

module.exports = router;
