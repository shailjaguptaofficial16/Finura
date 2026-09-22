const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Goal = require('../models/Goal');
const Investment = require('../models/Investment');

// Helper to simulate realistic current market prices for investments
const simulateCurrentPrice = (symbol, purchasePrice, assetType) => {
  const cleanSymbol = String(symbol || '').toUpperCase().trim();
  const numPrice = Number(purchasePrice) || 100;
  const charCodeSum = cleanSymbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  let volatilitySpread = 15;
  if (assetType === 'crypto') volatilitySpread = 30;
  if (assetType === 'mutual_fund') volatilitySpread = 8;

  const deltaPercent = ((charCodeSum % (volatilitySpread * 2)) - (volatilitySpread * 0.4)) / 100;
  const multiplier = 1 + deltaPercent;
  const simulated = Number((numPrice * multiplier).toFixed(2));

  return Math.max(simulated, 0.01);
};

// ─────────────────────────────────────────────
// @desc    Get aggregated wealth overview across Transactions, Goals & Investments
// @route   GET /api/wealth/overview
// @access  Private
// ─────────────────────────────────────────────
const getWealthOverview = async (req, res, next) => {
  try {
    const rawUserId = req.user._id || req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(rawUserId);

    // Fetch three data streams in parallel
    const [transactions, goals, investments] = await Promise.all([
      Transaction.find({ user: userObjectId }),
      Goal.find({ user: userObjectId }),
      Investment.find({ user: userObjectId }),
    ]);

    // 1. Compute Cash Balance (Income - Expense)
    let totalIncome = 0;
    let totalExpenses = 0;
    transactions.forEach((t) => {
      if (t.type === 'income') {
        totalIncome += Number(t.amount || 0);
      } else if (t.type === 'expense') {
        totalExpenses += Number(t.amount || 0);
      }
    });
    const cashBalance = Number((totalIncome - totalExpenses).toFixed(2));
    const effectiveCash = Math.max(0, cashBalance);

    // 2. Compute Saved Goals Value
    let savedGoals = 0;
    let targetGoals = 0;
    goals.forEach((g) => {
      savedGoals += Number(g.savedAmount || g.currentAmount || 0);
      targetGoals += Number(g.targetAmount || 0);
    });
    savedGoals = Number(savedGoals.toFixed(2));

    // 3. Compute Investment Value (Holdings valuation)
    let investmentValue = 0;
    let totalInvestedCost = 0;
    investments.forEach((inv) => {
      const price = simulateCurrentPrice(inv.symbol, inv.purchasePrice, inv.assetType);
      const currentVal = Number((inv.quantity * price).toFixed(2));
      const costBasis = Number((inv.quantity * inv.purchasePrice).toFixed(2));
      investmentValue += currentVal;
      totalInvestedCost += costBasis;
    });
    investmentValue = Number(investmentValue.toFixed(2));

    // 4. Calculate Total Net Asset Value (NAV)
    const totalNAV = Number((effectiveCash + savedGoals + investmentValue).toFixed(2));

    // 5. Calculate Asset Allocation Percentages
    let cashPercentage = 0;
    let goalsPercentage = 0;
    let investmentsPercentage = 0;

    if (totalNAV > 0) {
      cashPercentage = Number(((effectiveCash / totalNAV) * 100).toFixed(1));
      goalsPercentage = Number(((savedGoals / totalNAV) * 100).toFixed(1));
      investmentsPercentage = Number(((investmentValue / totalNAV) * 100).toFixed(1));
    }

    const assetAllocation = [
      {
        name: 'Liquid Cash Reserve',
        category: 'Cash',
        value: effectiveCash,
        percentage: cashPercentage,
        color: '#0f766e',
      },
      {
        name: 'Committed Goal Savings',
        category: 'Goals',
        value: savedGoals,
        percentage: goalsPercentage,
        color: '#f59e0b',
      },
      {
        name: 'Investment Portfolio',
        category: 'Investments',
        value: investmentValue,
        percentage: investmentsPercentage,
        color: '#3b82f6',
      },
    ];

    // Wealth growth projection curve
    const baseNav = totalNAV > 0 ? totalNAV : 0;
    const months = ['6M Ago', '5M Ago', '4M Ago', '3M Ago', '2M Ago', '1M Ago', 'Current'];
    const wealthGrowthTrend = months.map((month, idx) => {
      const scale = 0.85 + (idx * 0.025);
      return {
        month,
        value: Number((baseNav * scale).toFixed(0)),
      };
    });

    return res.status(200).json({
      totalNAV,
      netAssetValue: totalNAV,
      cashBalance,
      liquidCash: effectiveCash,
      savedGoals,
      committedSavings: savedGoals,
      investmentValue,
      portfolioValue: investmentValue,
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      assetAllocation,
      wealthGrowthTrend,
      summary: {
        totalIncome,
        totalExpenses,
        activeGoalsCount: goals.length,
        activeHoldingsCount: investments.length,
        totalTransactionsCount: transactions.length,
        totalInvestedCost: Number(totalInvestedCost.toFixed(2)),
        goalTargetTotal: Number(targetGoals.toFixed(2)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Get detailed portfolio breakdown for wealth advisory
// @route   GET /api/wealth/portfolio
// @access  Private
// ─────────────────────────────────────────────
const getPortfolio = async (req, res, next) => {
  try {
    return getWealthOverview(req, res, next);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWealthOverview,
  getPortfolio,
};
