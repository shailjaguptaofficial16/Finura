const Transaction = require('../models/Transaction');
const { marketIndices, defaultAllocation } = require('../data/seedData');

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
    // Mocking net worth based on balance and some arbitrary logic for demo
    const netWorth = balance > 0 ? balance + 1020000 : 1020000; 
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

module.exports = {
  getDashboardStats,
};
