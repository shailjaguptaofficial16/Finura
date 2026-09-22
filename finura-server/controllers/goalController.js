const mongoose = require('mongoose');
const Goal = require('../models/Goal');

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
    return res.status(200).json(goals);
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
    const { title, targetAmount, deadline, category } = req.body;
    const userId = req.user._id || req.user.id;

    // title and targetAmount are mandatory; deadline and category are optional
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Goal title is required' });
    }

    const numericTarget = Number(targetAmount);
    if (!Number.isFinite(numericTarget) || numericTarget <= 0) {
      return res.status(400).json({ message: 'Target amount must be greater than 0' });
    }

    // Validate category only when explicitly provided
    const validCategories = [
      'Emergency Fund', 'Retirement', 'Home Purchase', 'Education',
      'Travel', 'Investment', 'Debt Payoff', 'Other',
    ];
    const resolvedCategory = validCategories.includes(category) ? category : 'Other';

    const goal = await Goal.create({
      user: userId,
      title: title.trim(),
      targetAmount: numericTarget,
      savedAmount: 0,
      deadline: deadline || null,
      category: resolvedCategory,
    });

    return res.status(201).json(goal);
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

    const allowedFields = ['title', 'targetAmount', 'deadline', 'category'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        goal[field] = req.body[field];
      }
    });

    if (goal.targetAmount <= 0) {
      return res.status(400).json({ message: 'Target amount must be greater than 0' });
    }

    await goal.save();
    return res.status(200).json(goal);
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
    const headroom = goal.targetAmount - goal.savedAmount;
    const increment = Math.min(amount, Math.max(headroom, 0));

    // Use atomic $inc to avoid race conditions
    const updatedGoal = await Goal.findByIdAndUpdate(
      id,
      { $inc: { savedAmount: increment } },
      { new: true, runValidators: true }
    );

    return res.status(200).json(updatedGoal);
  } catch (error) {
    next(error);
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
  setGoal,
  updateGoal,
  deleteGoal,
  addFunds,
};