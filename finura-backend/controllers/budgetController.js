const mongoose = require('mongoose');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

const getUserId = (req) => req.user._id || req.user.id;
const ALLOWED_CATEGORIES = ['Food', 'Shopping', 'Housing', 'Transport', 'Entertainment', 'Bills', 'Healthcare', 'Education', 'Travel', 'Other'];
const ALLOWED_PERIODS = ['weekly', 'monthly', 'yearly'];

const parseDate = (value, field) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${field} must be a valid date`);
    error.statusCode = 400;
    throw error;
  }
  return date;
};

const getBudgetStatus = (usage) => {
  if (usage > 100) return 'exceeded';
  if (usage >= 80) return 'warning';
  return 'normal';
};

const ensureNoOverlappingBudget = async ({ user, category, startDate, endDate, excludeId = null }) => {
  const query = {
    user,
    category,
    status: 'active',
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  };
  if (excludeId) query._id = { $ne: excludeId };
  if (await Budget.exists(query)) {
    const error = new Error('An active budget already overlaps this category and date range');
    error.statusCode = 409;
    throw error;
  }
};

const withSpending = async (budget) => {
  const spentResult = await Transaction.aggregate([
    {
      $match: {
        user: budget.user,
        type: 'expense',
        category: budget.category,
        date: { $gte: budget.startDate, $lte: budget.endDate },
      },
    },
    { $group: { _id: null, spent: { $sum: '$amount' } } },
  ]);

  const spent = Number((spentResult[0]?.spent || 0).toFixed(2));
  const usage = budget.amount > 0 ? Number(((spent / budget.amount) * 100).toFixed(1)) : 0;
  const remaining = Number((budget.amount - spent).toFixed(2));

  return {
    ...budget.toObject(),
    spent,
    remaining,
    usage,
    budgetStatus: getBudgetStatus(usage),
    isExceeded: spent > budget.amount,
  };
};

const getBudgets = async (req, res, next) => {
  try {
    const budgets = await Budget.find({ user: getUserId(req) }).sort({ startDate: -1, createdAt: -1 });
    return res.status(200).json(await Promise.all(budgets.map(withSpending)));
  } catch (error) {
    next(error);
  }
};

const getBudget = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid budget ID' });
    }
    const budget = await Budget.findOne({ _id: req.params.id, user: getUserId(req) });
    if (!budget) return res.status(404).json({ message: 'Budget not found or unauthorized' });
    return res.status(200).json(await withSpending(budget));
  } catch (error) {
    next(error);
  }
};

const validateBudgetInput = ({ category, amount, period, startDate, endDate }) => {
  if (!ALLOWED_CATEGORIES.includes(category)) return 'Invalid budget category';
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) return 'Budget amount must be greater than 0';
  if (period && !ALLOWED_PERIODS.includes(String(period).toLowerCase())) return 'Invalid budget period';
  if (!startDate || !endDate) return 'startDate and endDate are required';
  return null;
};

const createBudget = async (req, res, next) => {
  try {
    const { category, amount, period = 'monthly', startDate, endDate, status = 'active' } = req.body;
    const validationError = validateBudgetInput({ category, amount, period, startDate, endDate });
    if (validationError) return res.status(400).json({ message: validationError });
    const parsedStart = parseDate(startDate, 'startDate');
    const parsedEnd = parseDate(endDate, 'endDate');
    if (parsedEnd < parsedStart) return res.status(400).json({ message: 'endDate cannot be before startDate' });
    await ensureNoOverlappingBudget({ user: getUserId(req), category, startDate: parsedStart, endDate: parsedEnd });

    const budget = await Budget.create({
      user: getUserId(req),
      category,
      amount: Number(amount),
      period: String(period).toLowerCase(),
      startDate: parsedStart,
      endDate: parsedEnd,
      status,
    });
    return res.status(201).json(await withSpending(budget));
  } catch (error) {
    next(error);
  }
};

const updateBudget = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid budget ID' });
    const budget = await Budget.findOne({ _id: req.params.id, user: getUserId(req) });
    if (!budget) return res.status(404).json({ message: 'Budget not found or unauthorized' });

    const nextValues = {
      category: req.body.category ?? budget.category,
      amount: req.body.amount ?? budget.amount,
      period: req.body.period ?? budget.period,
      startDate: req.body.startDate ?? budget.startDate,
      endDate: req.body.endDate ?? budget.endDate,
      status: req.body.status ?? budget.status,
    };
    const validationError = validateBudgetInput(nextValues);
    if (validationError) return res.status(400).json({ message: validationError });
    const parsedStart = parseDate(nextValues.startDate, 'startDate');
    const parsedEnd = parseDate(nextValues.endDate, 'endDate');
    if (parsedEnd < parsedStart) return res.status(400).json({ message: 'endDate cannot be before startDate' });
    if (nextValues.status === 'active') {
      await ensureNoOverlappingBudget({ user: getUserId(req), category: nextValues.category, startDate: parsedStart, endDate: parsedEnd, excludeId: budget._id });
    }

    Object.assign(budget, {
      ...nextValues,
      amount: Number(nextValues.amount),
      period: String(nextValues.period).toLowerCase(),
      startDate: parsedStart,
      endDate: parsedEnd,
    });
    await budget.save();
    return res.status(200).json(await withSpending(budget));
  } catch (error) {
    next(error);
  }
};

const deleteBudget = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid budget ID' });
    const budget = await Budget.findOne({ _id: req.params.id, user: getUserId(req) });
    if (!budget) return res.status(404).json({ message: 'Budget not found or unauthorized' });
    await budget.deleteOne();
    return res.status(200).json({ id: req.params.id, message: 'Budget deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getBudgets, getBudget, createBudget, updateBudget, deleteBudget };
