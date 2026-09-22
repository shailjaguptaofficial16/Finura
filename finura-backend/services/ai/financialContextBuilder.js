const analytics = require('../analyticsService');
const { getCreditOverview } = require('../creditService');
const { calculateNetWorth } = require('../wealthService');
const { buildPlanningOverview } = require('../planningService');

const buildFinancialContext = async (userId) => {
  const safeFilters = { startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate: new Date(), accountId: null, category: null, transactionType: null, currency: 'INR' };
  const [overview, expenses, trends, credit, wealth, planning] = await Promise.all([
    analytics.getAnalyticsOverview(userId, safeFilters),
    analytics.getExpenseSummary(userId, safeFilters),
    analytics.getTrendAnalytics(userId, safeFilters),
    getCreditOverview(userId),
    calculateNetWorth(userId),
    buildPlanningOverview(userId),
  ]);
  return {
    currency: 'INR',
    summary: overview.summary,
    income: overview.summary.totalIncome,
    expenses: { total: expenses.summary.totalExpense, categories: (expenses.categories || []).slice(0, 5) },
    trends: trends.monthly.slice(-6),
    credit: { utilization: credit.creditUtilization, outstanding: credit.totalOutstanding, score: credit.latestCreditScore?.score || null },
    wealth: { netWorth: wealth.netWorth, totalAssets: wealth.totalAssets, totalLiabilities: wealth.totalLiabilities },
    planning: { health: planning.overallPlanningHealth, recommendations: (planning.recommendations || []).slice(0, 5) },
  };
};
module.exports = { buildFinancialContext };
