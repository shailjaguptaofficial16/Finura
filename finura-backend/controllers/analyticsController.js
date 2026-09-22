const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Goal = require('../models/Goal');
const Investment = require('../models/Investment');
const User = require('../models/User');
const GoalContribution = require('../models/GoalContribution');
const { normalizeAnalyticsFilters } = require('../utils/analyticsQuery');
const analyticsService = require('../services/analyticsService');
const { sendSuccess } = require('../middleware/errorMiddleware');
const { getReportsAnalytics, REPORT_TYPES } = require('../services/reportsAnalyticsService');
const { exportAnalytics, FORMATS } = require('../services/exportAnalyticsService');

const roundAmount = (value) => Number(Number(value || 0).toFixed(2));

const calculateCashflow = (transactions) => transactions.reduce(
  (summary, transaction) => {
    const amount = Number(transaction.amount || 0);
    if (transaction.type === 'income') summary.income += amount;
    if (transaction.type === 'expense' || transaction.type === 'investment') summary.expenses += amount;
    return summary;
  },
  { income: 0, expenses: 0 }
);

const getSavingsSummary = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id || req.user.id);
    const now = new Date();
    const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const transactionFilter = {
      user: userId,
      type: { $in: ['income', 'expense', 'investment'] },
    };

    const [transactions, currentMonthTransactions, previousMonthTransactions, goalContributionSummary] = await Promise.all([
      Transaction.find(transactionFilter).select('amount type date'),
      Transaction.find({ ...transactionFilter, date: { $gte: currentMonthStart } }).select('amount type date'),
      Transaction.find({
        ...transactionFilter,
        date: { $gte: previousMonthStart, $lt: currentMonthStart },
      }).select('amount type date'),
      GoalContribution.aggregate([
        { $match: { user: userId } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const totals = calculateCashflow(transactions);
    const currentMonth = calculateCashflow(currentMonthTransactions);
    const previousMonth = calculateCashflow(previousMonthTransactions);
    const totalSavings = totals.income - totals.expenses;
    const monthlySavings = currentMonth.income - currentMonth.expenses;
    const previousMonthSavings = previousMonth.income - previousMonth.expenses;
    const changePercentage = previousMonthSavings === 0
      ? (monthlySavings === 0 ? 0 : 100)
      : ((monthlySavings - previousMonthSavings) / Math.abs(previousMonthSavings)) * 100;

    return res.status(200).json({
      totalSavings: roundAmount(totalSavings),
      totalIncome: roundAmount(totals.income),
      totalExpenses: roundAmount(totals.expenses),
      savingsRate: totals.income > 0 ? roundAmount((totalSavings / totals.income) * 100) : 0,
      monthlySavings: roundAmount(monthlySavings),
      previousMonthSavings: roundAmount(previousMonthSavings),
      changePercentage: roundAmount(changePercentage),
      goalContributions: roundAmount(goalContributionSummary[0]?.total),
    });
  } catch (error) {
    next(error);
  }
};

// Helper to compute health score
const computeScore = (totalIncome, totalExpenses, totalSaved, investmentsCount) => {
  const baseScore = 30;
  let cashflowScore = 0;
  if (totalIncome > totalExpenses && totalIncome > 0) {
    cashflowScore = 25;
  } else if (totalIncome === 0 && totalExpenses === 0) {
    cashflowScore = 10;
  }

  let savingsScore = 0;
  let savingsRate = 0;
  if (totalIncome > 0) {
    savingsRate = (totalSaved / totalIncome) * 100;
    savingsScore = Math.min(25, Math.max(0, Math.round((totalSaved / totalIncome) * 25)));
  } else if (totalSaved > 0) {
    savingsScore = Math.min(25, Math.max(0, Math.round((totalSaved / 1000) * 10)));
  }

  const investmentScore = investmentsCount > 0 ? 20 : 0;
  const score = Math.max(0, Math.min(100, baseScore + cashflowScore + savingsScore + investmentScore));

  let status = 'Needs Attention';
  if (score >= 80) status = 'Excellent';
  else if (score >= 60) status = 'Good';

  return { score, status, savingsRate, cashflowScore, savingsScore, investmentScore };
};

// ─────────────────────────────────────────────
// @desc    Calculate and get user Financial Health Score
// @route   GET /api/analytics/health-score
// @access  Private
// ─────────────────────────────────────────────
const getHealthScore = async (req, res, next) => {
  try {
    const rawUserId = req.user._id || req.user.id;
    const userId = new mongoose.Types.ObjectId(rawUserId);

    const [transactions, goals, investments] = await Promise.all([
      // Exclude transfer-type transactions from financial health calculations
      Transaction.find({ user: userId, type: { $in: ['income', 'expense', 'investment'] } }),
      Goal.find({ user: userId }),
      Investment.find({ user: userId }),
    ]);

    let totalIncome = 0;
    let totalExpenses = 0;
    transactions.forEach((t) => {
      if (t.type === 'income') {
        totalIncome += Number(t.amount || 0);
      } else if (t.type === 'expense' || t.type === 'investment') {
        totalExpenses += Number(t.amount || 0);
      }
    });

    let totalSaved = 0;
    let totalGoalTarget = 0;
    goals.forEach((g) => {
      totalSaved += Number(g.savedAmount || g.currentAmount || 0);
      totalGoalTarget += Number(g.targetAmount || 0);
    });

    let totalPortfolioValue = 0;
    investments.forEach((inv) => {
      const price = Number(inv.purchasePrice || 0);
      totalPortfolioValue += Number((inv.quantity * price) || 0);
    });

    const { score, status, savingsRate, cashflowScore, savingsScore, investmentScore } = computeScore(
      totalIncome,
      totalExpenses,
      totalSaved,
      investments.length
    );

    return res.status(200).json({
      score,
      status,
      details: {
        baseScore: 30,
        cashflowScore,
        savingsScore,
        investmentScore,
      },
      metrics: {
        totalIncome: Number(totalIncome.toFixed(2)),
        totalExpenses: Number(totalExpenses.toFixed(2)),
        netBalance: Number((totalIncome - totalExpenses).toFixed(2)),
        totalSaved: Number(totalSaved.toFixed(2)),
        totalGoalTarget: Number(totalGoalTarget.toFixed(2)),
        totalPortfolioValue: Number(totalPortfolioValue.toFixed(2)),
        savingsRate: Number(savingsRate.toFixed(1)),
        transactionsCount: transactions.length,
        goalsCount: goals.length,
        investmentsCount: investments.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Get aggregated report summary for PDF generation & statements
// @route   GET /api/analytics/report-summary
// @access  Private
// ─────────────────────────────────────────────
const getReportSummary = async (req, res, next) => {
  try {
    const rawUserId = req.user._id || req.user.id;
    const userId = new mongoose.Types.ObjectId(rawUserId);

    const [userDoc, transactions, goals, investments] = await Promise.all([
      User.findById(userId).select('name email createdAt role'),
      // Exclude transfers — they are internal balance movements, not real income/expense
      Transaction.find({ user: userId, type: { $in: ['income', 'expense', 'investment'] } }).sort({ date: -1, createdAt: -1 }),
      Goal.find({ user: userId }).sort({ createdAt: -1 }),
      Investment.find({ user: userId }).sort({ createdAt: -1 }),
    ]);

    const userName = (userDoc?.name || req.user?.name || 'Finura Member').trim();
    const userEmail = (userDoc?.email || req.user?.email || '').trim();

    // Compute Income & Expenses
    let totalIncome = 0;
    let totalExpenses = 0;
    transactions.forEach((t) => {
      if (t.type === 'income') {
        totalIncome += Number(t.amount || 0);
      } else if (t.type === 'expense' || t.type === 'investment') {
        totalExpenses += Number(t.amount || 0);
      }
    });

    const netBalance = Number((totalIncome - totalExpenses).toFixed(2));

    // Compute Saved Goals
    let totalSaved = 0;
    let totalGoalTarget = 0;
    const formattedGoals = goals.map((g) => {
      const saved = Number(g.savedAmount || g.currentAmount || 0);
      const target = Number(g.targetAmount || 1);
      totalSaved += saved;
      totalGoalTarget += target;
      return {
        id: g._id,
        title: g.title,
        category: g.category || 'Other',
        targetAmount: target,
        savedAmount: saved,
        progress: Math.min(100, Math.round((saved / target) * 100)),
        deadline: g.deadline || null,
      };
    });

    // Compute Portfolio Value
    let totalPortfolioValue = 0;
    const formattedInvestments = investments.map((inv) => {
      const cost = Number((inv.quantity * inv.purchasePrice).toFixed(2));
      totalPortfolioValue += cost;
      return {
        id: inv._id,
        symbol: inv.symbol,
        name: inv.name,
        quantity: inv.quantity,
        purchasePrice: inv.purchasePrice,
        assetType: inv.assetType,
        totalValue: cost,
      };
    });

    const netWorth = Number((Math.max(0, netBalance) + totalSaved + totalPortfolioValue).toFixed(2));

    // Compute Health Score
    const { score, status, savingsRate } = computeScore(
      totalIncome,
      totalExpenses,
      totalSaved,
      investments.length
    );

    // Latest 10 Transactions
    const recentTransactions = transactions.slice(0, 10).map((t) => ({
      id: t._id,
      date: t.date || t.createdAt,
      title: t.title || t.description || 'Transaction',
      category: t.category || 'General',
      type: t.type || 'expense',
      amount: Number(t.amount || 0),
    }));

    return res.status(200).json({
      user: {
        name: userName,
        email: userEmail,
      },
      healthScore: {
        score,
        status,
        savingsRate: Number(savingsRate.toFixed(1)),
      },
      metrics: {
        netWorth,
        netBalance,
        totalIncome: Number(totalIncome.toFixed(2)),
        totalExpenses: Number(totalExpenses.toFixed(2)),
        totalSaved: Number(totalSaved.toFixed(2)),
        totalGoalTarget: Number(totalGoalTarget.toFixed(2)),
        totalPortfolioValue: Number(totalPortfolioValue.toFixed(2)),
      },
      goals: formattedGoals,
      investments: formattedInvestments,
      transactions: recentTransactions,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

const runAnalytics = (method) => async (req, res, next) => {
  try {
    const filters = await normalizeAnalyticsFilters(req.user._id || req.user.id, req.query);
    return sendSuccess(res, await analyticsService[method](req.user._id || req.user.id, filters));
  } catch (error) {
    return next(error);
  }
};

const getAnalyticsOverview = runAnalytics('getAnalyticsOverview');
const getIncomeAnalytics = runAnalytics('getIncomeSummary');
const getExpenseAnalytics = runAnalytics('getExpenseSummary');
const getCategoryAnalytics = async (req, res, next) => {
  try {
    const type = req.query.type || null;
    if (type && !['income', 'expense'].includes(type)) {
      const error = new Error('type must be income or expense');
      error.statusCode = 400;
      error.errorCode = 'INVALID_ANALYTICS_TYPE';
      throw error;
    }
    const rawLimit = req.query.limit === undefined ? null : Number(req.query.limit);
    if (rawLimit !== null && (!Number.isInteger(rawLimit) || rawLimit <= 0)) {
      const error = new Error('limit must be a positive integer');
      error.statusCode = 400;
      error.errorCode = 'INVALID_LIMIT';
      throw error;
    }
    const filters = await normalizeAnalyticsFilters(req.user._id || req.user.id, { ...req.query, transactionType: type });
    const result = await analyticsService.getCategoryBreakdown(req.user._id || req.user.id, filters);
    if (rawLimit !== null) result.categories = result.categories.slice(0, rawLimit);
    result.breakdown = result.categories;
    result.summary.categoryCount = result.categories.length;
    result.summary.topCategory = result.categories[0]?.category || null;
    result.summary.lowestCategory = result.categories.at(-1)?.category || null;
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
};
const getCashFlowAnalytics = runAnalytics('getCashFlowSummary');
const getTrendAnalytics = runAnalytics('getTrendAnalytics');
const getBudgetAnalytics = runAnalytics('getBudgetPerformance');
const getInvestmentAnalytics = runAnalytics('getInvestmentAnalytics');

const getReportsAnalyticsController = async (req, res, next) => {
  try {
    const reportType = req.query.reportType || 'monthly-summary';
    if (!REPORT_TYPES.includes(reportType)) { const error = new Error('Invalid reportType'); error.statusCode = 400; error.errorCode = 'INVALID_REPORT_TYPE'; throw error; }
    const userId = req.user._id || req.user.id;
    const filters = await normalizeAnalyticsFilters(userId, req.query);
    return sendSuccess(res, await getReportsAnalytics({ userId, filters, reportType }));
  } catch (error) { return next(error); }
};

const exportAnalyticsReport = async (req, res, next) => {
  try {
    const format = req.query.format;
    if (!FORMATS.includes(format)) { const error = new Error('format must be json, csv, or pdf'); error.statusCode = 400; error.errorCode = 'INVALID_EXPORT_FORMAT'; throw error; }
    const userId = req.user._id || req.user.id;
    const filters = await normalizeAnalyticsFilters(userId, req.query);
    const result = await exportAnalytics({ userId, filters, reportType: req.query.reportType || 'monthly-summary', format });
    res.status(200).setHeader('Content-Type', result.contentType).setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    if (format === 'json') return res.json({ success: true, data: result.content });
    return res.send(result.content);
  } catch (error) { return next(error); }
};

module.exports = {
  getHealthScore,
  getReportSummary,
  getSavingsSummary,
  getAnalyticsOverview,
  getIncomeAnalytics,
  getExpenseAnalytics,
  getCategoryAnalytics,
  getCashFlowAnalytics,
  getTrendAnalytics,
  getBudgetAnalytics,
  getInvestmentAnalytics,
  getReportsAnalyticsController,
  exportAnalyticsReport,
};
