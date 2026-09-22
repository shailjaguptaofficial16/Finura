const mongoose = require('mongoose');
const Goal = require('../models/Goal');
const Account = require('../models/Account');
const GoalContribution = require('../models/GoalContribution');

const serializeGoal = (goal) => {
  const data = goal.toObject ? goal.toObject() : goal;
  const currentAmount = Math.max(Number(data.currentAmount || 0), Number(data.savedAmount || 0));
  const targetAmount = Number(data.targetAmount || 0);
  const targetDateValue = data.targetDate || data.deadline;
  const targetDate = targetDateValue ? new Date(targetDateValue) : null;
  const now = new Date();
  const progressPercentage = targetAmount > 0
    ? Number(Math.min(100, (currentAmount / targetAmount) * 100).toFixed(1))
    : 0;
  const remainingAmount = Number(Math.max(0, targetAmount - currentAmount).toFixed(2));
  const daysRemaining = targetDate && !Number.isNaN(targetDate.getTime())
    ? Math.ceil((targetDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    : null;
  const remainingMonths = daysRemaining !== null ? Math.max(1, Math.ceil(daysRemaining / 30.4375)) : null;
  const requiredMonthlySaving = remainingMonths && remainingAmount > 0
    ? Number((remainingAmount / remainingMonths).toFixed(2))
    : 0;
  const requiredWeeklySaving = daysRemaining !== null && daysRemaining > 0 && remainingAmount > 0
    ? Number((remainingAmount / Math.max(1, Math.ceil(daysRemaining / 7))).toFixed(2))
    : 0;
  const createdDate = data.createdAt ? new Date(data.createdAt) : now;
  const totalGoalDays = targetDate && !Number.isNaN(targetDate.getTime())
    ? Math.max(1, (targetDate.getTime() - createdDate.getTime()) / (24 * 60 * 60 * 1000))
    : null;
  const elapsedGoalDays = totalGoalDays
    ? Math.min(totalGoalDays, Math.max(0, (now.getTime() - createdDate.getTime()) / (24 * 60 * 60 * 1000)))
    : null;
  const expectedPercentage = totalGoalDays ? (elapsedGoalDays / totalGoalDays) * 100 : 0;
  let progressStatus = data.status === 'completed' || currentAmount >= targetAmount
    ? 'completed'
    : daysRemaining !== null && daysRemaining < 0
      ? 'overdue'
      : totalGoalDays && progressPercentage + 0.1 < expectedPercentage
        ? 'behind'
        : 'on-track';

  return {
    ...data,
    currentAmount,
    savedAmount: currentAmount,
    progress: progressPercentage,
    remaining: remainingAmount,
    progressPercentage,
    remainingAmount,
    daysRemaining,
    requiredMonthlySaving,
    requiredWeeklySaving,
    progressStatus,
    isCompleted: progressStatus === 'completed',
  };
};

const VALID_CATEGORIES = [
  'Emergency Fund', 'Retirement', 'Home Purchase', 'Education',
  'Travel', 'Investment', 'Debt Payoff', 'Other',
];

const parseTargetDate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const error = new Error('Target date must be a valid date');
    error.statusCode = 400;
    throw error;
  }
  return parsed;
};

const getGoalAmount = (goal) => Math.max(
  Number(goal.currentAmount || 0),
  Number(goal.savedAmount || 0)
);

const applyCompletionStatus = (goal) => {
  if (getGoalAmount(goal) >= Number(goal.targetAmount)) {
    goal.status = 'completed';
  } else if (goal.status === 'completed') {
    goal.status = 'active';
  }
};

// ─────────────────────────────────────────────
// @desc    Get all goals for the logged-in user
// @route   GET /api/goals
// @access  Private
// ─────────────────────────────────────────────
const getGoals = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const goals = await Goal.find({ user: userId }).sort({ createdAt: -1 });

    // Always return 200 with empty array for new users — never 404
    return res.status(200).json(goals.map(serializeGoal));
  } catch (error) {
    next(error);
  }
};

// @desc    Get one goal owned by the logged-in user
// @route   GET /api/goals/:id
// @access  Private
const getGoal = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid goal ID' });
    }

    const goal = await Goal.findOne({ _id: req.params.id, user: userId });
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found or unauthorized' });
    }

    return res.status(200).json(serializeGoal(goal));
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Create a new goal for the logged-in user
// @route   POST /api/goals
// @access  Private
// ─────────────────────────────────────────────
const setGoal = async (req, res, next) => {
  try {
    const { title, description, targetAmount, currentAmount, deadline, targetDate, category, priority, status } = req.body;
    const userId = req.user._id || req.user.id;

    // title and targetAmount are mandatory; deadline and category are optional
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Goal title is required' });
    }

    const numericTarget = Number(targetAmount);
    if (!Number.isFinite(numericTarget) || numericTarget <= 0) {
      return res.status(400).json({ message: 'Target amount must be greater than 0' });
    }

    if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: 'Invalid goal category' });
    }
    const resolvedCategory = category || 'Other';

    const initialAmount = Number(currentAmount || 0);
    if (initialAmount > numericTarget) {
      return res.status(400).json({ message: 'Current amount cannot exceed target amount' });
    }

    const parsedTargetDate = parseTargetDate(targetDate || deadline);
    const goal = new Goal({
      user: userId,
      title: title.trim(),
      description: description ? String(description).trim() : '',
      targetAmount: numericTarget,
      savedAmount: initialAmount,
      currentAmount: initialAmount,
      deadline: deadline || null,
      targetDate: parsedTargetDate,
      category: resolvedCategory,
      priority: priority || 'medium',
      status: status || 'active',
    });

    applyCompletionStatus(goal);
    await goal.save();

    return res.status(201).json(serializeGoal(goal));
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Update an existing goal owned by the user
// @route   PUT /api/goals/:id
// @access  Private
// ─────────────────────────────────────────────
const updateGoal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid goal ID' });
    }

    const goal = await Goal.findOne({ _id: id, user: userId });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found or unauthorized' });
    }

    const allowedFields = ['title', 'description', 'targetAmount', 'deadline', 'targetDate', 'category', 'priority', 'status'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        goal[field] = req.body[field];
      }
    });

    if (req.body.currentAmount !== undefined) {
      const nextCurrentAmount = Number(req.body.currentAmount);
      if (!Number.isFinite(nextCurrentAmount) || nextCurrentAmount < 0) {
        return res.status(400).json({ message: 'Current amount cannot be negative' });
      }
      goal.currentAmount = nextCurrentAmount;
      goal.savedAmount = nextCurrentAmount;
    }
    if (req.body.category !== undefined && !VALID_CATEGORIES.includes(req.body.category)) {
      return res.status(400).json({ message: 'Invalid goal category' });
    }
    if (req.body.targetDate !== undefined || req.body.deadline !== undefined) {
      goal.targetDate = parseTargetDate(req.body.targetDate ?? req.body.deadline);
    }
    if (goal.targetAmount <= 0 || getGoalAmount(goal) > goal.targetAmount) {
      return res.status(400).json({ message: 'Current amount cannot exceed target amount' });
    }

    applyCompletionStatus(goal);
    await goal.save();
    return res.status(200).json(serializeGoal(goal));
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Atomically add funds to a goal's savedAmount
// @route   PUT /api/goals/:id/add-funds
// @access  Private
// ─────────────────────────────────────────────
const addFunds = async (req, res, next) => {
  try {
    const { id } = req.params;
    const amount = Number(req.body.amount);
    const userId = req.user._id || req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid goal ID' });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    // Fetch the goal first to enforce the cap at targetAmount
    const goal = await Goal.findOne({ _id: id, user: userId });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found or unauthorized' });
    }

    // Calculate the actual increment — never exceed targetAmount
    const currentAmount = Math.max(Number(goal.currentAmount || 0), Number(goal.savedAmount || 0));
    const headroom = goal.targetAmount - currentAmount;
    const increment = Math.min(amount, Math.max(headroom, 0));

    // Use atomic $inc to avoid race conditions
    goal.currentAmount = currentAmount + increment;
    goal.savedAmount = goal.currentAmount;
    applyCompletionStatus(goal);
    await goal.save();
    return res.status(200).json(serializeGoal(goal));
  } catch (error) {
    next(error);
  }
};

// @desc    Contribute money from an owned account into an owned goal
// @route   POST /api/goals/:id/contribute
// @access  Private
const contributeToGoal = async (req, res, next) => {
  let session;
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;
    const amount = Number(req.body.amount);
    const { accountId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid goal ID' });
    }
    if (!accountId || !mongoose.Types.ObjectId.isValid(accountId)) {
      return res.status(400).json({ message: 'Valid accountId is required' });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Contribution amount must be greater than 0' });
    }

    session = await mongoose.startSession();
    session.startTransaction();

    const goal = await Goal.findOne({ _id: id, user: userId }).session(session);
    if (!goal) {
      const error = new Error('Goal not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    const currentAmount = getGoalAmount(goal);
    if (goal.status === 'completed' || currentAmount >= goal.targetAmount) {
      const error = new Error('Completed goals cannot receive contributions');
      error.statusCode = 400;
      throw error;
    }

    const remainingAmount = Number((goal.targetAmount - currentAmount).toFixed(2));
    if (amount > remainingAmount) {
      const error = new Error('Contribution cannot exceed the remaining goal amount');
      error.statusCode = 400;
      throw error;
    }

    const account = await Account.findOne({
      _id: accountId,
      user: userId,
      isActive: true,
    }).session(session);
    if (!account) {
      const error = new Error('Account not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }
    if (account.balance < amount) {
      const error = new Error('Insufficient account balance');
      error.statusCode = 400;
      throw error;
    }

    account.balance = Number((account.balance - amount).toFixed(2));
    goal.currentAmount = Number((currentAmount + amount).toFixed(2));
    goal.savedAmount = goal.currentAmount;
    applyCompletionStatus(goal);

    await account.save({ session });
    await goal.save({ session });
    const [contribution] = await GoalContribution.create([{
      user: userId,
      goal: goal._id,
      account: account._id,
      amount,
    }], { session });
    await session.commitTransaction();

    return res.status(200).json({
      goal: serializeGoal(goal),
      accountBalance: account.balance,
      contributedAmount: amount,
      contributionId: contribution._id,
    });
  } catch (error) {
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

// @desc    Reverse a goal contribution and restore the account balance
// @route   DELETE /api/goals/:id/contributions/:contributionId
// @access  Private
const reverseGoalContribution = async (req, res, next) => {
  let session;
  try {
    const { id, contributionId } = req.params;
    const userId = req.user._id || req.user.id;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(contributionId)) {
      return res.status(400).json({ message: 'Invalid goal or contribution ID' });
    }

    session = await mongoose.startSession();
    session.startTransaction();

    const contribution = await GoalContribution.findOne({
      _id: contributionId,
      goal: id,
      user: userId,
    }).session(session);
    if (!contribution) {
      const error = new Error('Contribution not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    const goal = await Goal.findOne({ _id: id, user: userId }).session(session);
    const account = await Account.findOne({ _id: contribution.account, user: userId, isActive: true }).session(session);
    if (!goal || !account) {
      const error = new Error('Goal or contribution account not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    const currentAmount = getGoalAmount(goal);
    if (currentAmount < contribution.amount) {
      const error = new Error('Contribution cannot be reversed because goal balance is inconsistent');
      error.statusCode = 409;
      throw error;
    }

    account.balance = Number((account.balance + contribution.amount).toFixed(2));
    goal.currentAmount = Number((currentAmount - contribution.amount).toFixed(2));
    goal.savedAmount = goal.currentAmount;
    applyCompletionStatus(goal);
    await account.save({ session });
    await goal.save({ session });
    await contribution.deleteOne({ session });
    await session.commitTransaction();

    return res.status(200).json({
      goal: serializeGoal(goal),
      accountBalance: account.balance,
      reversedAmount: contribution.amount,
    });
  } catch (error) {
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

// ─────────────────────────────────────────────
// @desc    Delete a goal owned by the user
// @route   DELETE /api/goals/:id
// @access  Private
// ─────────────────────────────────────────────
const deleteGoal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid goal ID' });
    }

    const goal = await Goal.findOne({ _id: id, user: userId });

    if (!goal) {
      return res.status(404).json({ message: 'Goal not found or unauthorized' });
    }

    await goal.deleteOne();

    return res.status(200).json({ id, message: 'Goal deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGoals,
  getGoal,
  setGoal,
  updateGoal,
  deleteGoal,
  addFunds,
  contributeToGoal,
  reverseGoalContribution,
};