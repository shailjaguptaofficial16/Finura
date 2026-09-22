const express = require('express');
const router = express.Router();
const { getHealthScore, getReportSummary, getSavingsSummary, getAnalyticsOverview, getIncomeAnalytics, getExpenseAnalytics, getCategoryAnalytics, getCashFlowAnalytics, getTrendAnalytics, getBudgetAnalytics, getInvestmentAnalytics, getReportsAnalyticsController, exportAnalyticsReport } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

// Protected analytics endpoints
router.use(protect);

router.get('/health-score', getHealthScore);
router.get('/report-summary', getReportSummary);
router.get('/overview', getAnalyticsOverview);
router.get('/income', getIncomeAnalytics);
router.get('/expenses', getExpenseAnalytics);
router.get('/categories', getCategoryAnalytics);
router.get('/cash-flow', getCashFlowAnalytics);
router.get('/trends', getTrendAnalytics);
router.get('/budgets', getBudgetAnalytics);
router.get('/investments', getInvestmentAnalytics);
router.get('/reports', getReportsAnalyticsController);
router.get('/export', exportAnalyticsReport);

module.exports = router;
