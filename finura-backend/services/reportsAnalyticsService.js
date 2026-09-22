const Account = require('../models/Account');
const Goal = require('../models/Goal');
const EmergencyFund = require('../models/EmergencyFund');
const Retirement = require('../models/Retirement');
const InvestmentTransaction = require('../models/InvestmentTransaction');
const analytics = require('./analyticsService');
const { getPortfolioValuation } = require('./investmentService');

const REPORT_TYPES = ['monthly-summary', 'income-expense', 'cash-flow', 'category-breakdown', 'account-summary', 'planning-summary', 'investment-summary'];
const round = (value) => Number(Number(value || 0).toFixed(2));

const getReportsAnalytics = async ({ userId, filters, reportType = 'monthly-summary' }) => {
  if (!REPORT_TYPES.includes(reportType)) {
    const error = new Error('Invalid reportType');
    error.statusCode = 400;
    error.errorCode = 'INVALID_REPORT_TYPE';
    throw error;
  }
  const [overview, income, expenses, cashFlow, categories, accounts, portfolio, goals, emergencyFund, retirementPlan, investmentTransactions] = await Promise.all([
    analytics.getAnalyticsOverview(userId, filters),
    analytics.getIncomeSummary(userId, filters),
    analytics.getExpenseSummary(userId, filters),
    analytics.getCashFlowSummary(userId, filters),
    analytics.getCategoryBreakdown(userId, filters),
    Account.find({ user: userId, isActive: true }).select('name type balance'),
    getPortfolioValuation(userId),
    Goal.find({ user: userId }).select('title targetAmount currentAmount savedAmount status targetDate deadline'),
    EmergencyFund.findOne({ user: userId }).select('currentAmount monthlyEssentialExpenses targetMonths status'),
    Retirement.findOne({ user: userId }).select('currentAge retirementAge lifeExpectancy currentMonthlyExpenses currentRetirementSavings monthlyContribution'),
    InvestmentTransaction.find({ user: userId, transactionDate: { $gte: filters.startDate, $lte: filters.endDate } }).select('type totalAmount fees transactionDate investment'),
  ]);

  const accountIds = accounts.map((account) => String(account._id));
  const accountRows = accounts.map((account) => ({ id: account._id, name: account.name, type: account.type, currentBalance: round(account.balance) }));
  const incomeRows = income.sources || [];
  const expenseRows = expenses.categories || [];
  const planningRows = goals.map((goal) => ({ title: goal.title, status: goal.status, targetAmount: round(goal.targetAmount), savedAmount: round(Math.max(goal.currentAmount || 0, goal.savedAmount || 0)), progress: goal.targetAmount > 0 ? round((Math.max(goal.currentAmount || 0, goal.savedAmount || 0) / goal.targetAmount) * 100) : 0 }));
  if (emergencyFund) planningRows.push({ type: 'emergency-fund', status: emergencyFund.status, currentAmount: round(emergencyFund.currentAmount), targetAmount: round(emergencyFund.monthlyEssentialExpenses * emergencyFund.targetMonths) });
  if (retirementPlan) planningRows.push({ type: 'retirement', currentRetirementSavings: round(retirementPlan.currentRetirementSavings), monthlyContribution: round(retirementPlan.monthlyContribution), retirementAge: retirementPlan.retirementAge });
  const buyAmount = investmentTransactions.filter((item) => item.type === 'buy').reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
  const sellAmount = investmentTransactions.filter((item) => item.type === 'sell').reduce((sum, item) => sum + Number(item.totalAmount || 0) - Number(item.fees || 0), 0);
  const data = {
    period: { startDate: filters.startDate.toISOString().slice(0, 10), endDate: filters.endDate.toISOString().slice(0, 10) },
    summary: { totalIncome: income.summary.totalIncome, totalExpenses: expenses.summary.totalExpense, totalSavings: round(income.summary.totalIncome - expenses.summary.totalExpense), netCashFlow: cashFlow.summary.netCashFlow },
    income: reportType === 'cash-flow' ? [] : incomeRows,
    expenses: reportType === 'income-expense' || reportType === 'monthly-summary' ? expenseRows : [],
    categories: categories.categories || [],
    accounts: accountRows,
    investments: [{ type: 'activity', buyAmount: round(buyAmount), sellAmount: round(sellAmount), netActivity: round(buyAmount - sellAmount) }, { type: 'portfolio', totalInvested: portfolio.totalInvested, currentValue: portfolio.currentValue, unrealizedProfitLoss: portfolio.unrealizedProfitLoss }],
    planning: planningRows,
    monthly: overview.trends || cashFlow.monthlyTrend || [],
    cashFlow: cashFlow.monthlyTrend || [],
    metadata: { ...income.metadata, reportType, accountIds },
  };
  return data;
};

module.exports = { REPORT_TYPES, getReportsAnalytics };