const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Budget = require('../models/Budget');
const { marketIndices, defaultAllocation } = require('../data/seedData');
const { calculateNetWorth } = require('../services/wealthService');

// @desc    Get dashboard stats
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id });

    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
      if (t.type === 'income') {
        income += t.amount;
      } else if (t.type === 'expense') {
        expense += t.amount;
      }
    });

    const balance = income - expense;
    const wealth = await calculateNetWorth(req.user.id);
    const netWorth = wealth.netWorth;
    const growth = balance > 0 ? 14.6 : 3.8; 

    // Portfolio allocation and market indicators from modular data
    const allocation = defaultAllocation;

    res.status(200).json({
      netWorth,
      growth,
      allocation,
      marketIndices,
      availableCredit: 500000,
      usedCredit: 160000
    });
  } catch (error) {
    next(error);
  }
};

const getMoneySummary = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const [accounts, transactions, budgets] = await Promise.all([
      Account.find({ user: userId, isActive: true }).sort({ isDefault: -1, createdAt: 1 }),
      Transaction.find({ user: userId }).sort({ date: -1, createdAt: -1 }),
      Budget.find({ user: userId, status: 'active' }).sort({ startDate: -1 }),
    ]);

    const totalIncome = transactions
      .filter((item) => item.type === 'income')
      .reduce((sum, item) => sum + Math.abs(Number(item.amount) || 0), 0);
    const totalExpenses = transactions
      .filter((item) => item.type === 'expense')
      .reduce((sum, item) => sum + Math.abs(Number(item.amount) || 0), 0);

    const budgetSummary = await Promise.all(budgets.map(async (budget) => {
      const spent = transactions
        .filter((item) => item.type === 'expense' && item.category === budget.category && item.date >= budget.startDate && item.date <= budget.endDate)
        .reduce((sum, item) => sum + Math.abs(Number(item.amount) || 0), 0);
      const usage = budget.amount > 0 ? Number(((spent / budget.amount) * 100).toFixed(1)) : 0;
      return {
        ...budget.toObject(),
        spent: Number(spent.toFixed(2)),
        remaining: Number((budget.amount - spent).toFixed(2)),
        usage,
        budgetStatus: usage > 100 ? 'exceeded' : usage >= 80 ? 'warning' : 'normal',
      };
    }));

    return res.status(200).json({
      totalBalance: Number(accounts.reduce((sum, account) => sum + account.balance, 0).toFixed(2)),
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      savings: Number((totalIncome - totalExpenses).toFixed(2)),
      accounts,
      recentTransactions: transactions.slice(0, 5),
      budgets: budgetSummary,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getMoneySummary,
};
