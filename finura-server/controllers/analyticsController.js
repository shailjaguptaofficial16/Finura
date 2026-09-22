const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Goal = require('../models/Goal');
const Investment = require('../models/Investment');
const User = require('../models/User');

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
      Transaction.find({ user: userId, type: { $in: ['income', 'expense'] } }),
      Goal.find({ user: userId }),
      Investment.find({ user: userId }),
    ]);

    let totalIncome = 0;
    let totalExpenses = 0;
    transactions.forEach((t) => {
      if (t.type === 'income') {
        totalIncome += Number(t.amount || 0);
      } else if (t.type === 'expense') {
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
      Transaction.find({
        user: userId,
        type: { $in: ['income', 'expense'] },
      }).sort({ date: -1, createdAt: -1 }),
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
      } else if (t.type === 'expense') {
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

module.exports = {
  getHealthScore,
  getReportSummary,
};
