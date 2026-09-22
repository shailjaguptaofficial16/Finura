const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required for goal ownership'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Goal description cannot exceed 500 characters'],
    },
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [1, 'Target amount must be at least 1'],
    },
    savedAmount: {
      type: Number,
      default: 0,
      min: [0, 'Saved amount cannot be negative'],
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: [0, 'Current amount cannot be negative'],
    },
    // Optional — open-ended goals have no fixed deadline
    deadline: {
      type: String,
      default: null,
    },
    targetDate: {
      type: Date,
      default: null,
    },
    // Goal category for icon/color mapping and analytics grouping
    category: {
      type: String,
      enum: [
        'Emergency Fund',
        'Retirement',
        'Home Purchase',
        'Education',
        'Travel',
        'Investment',
        'Debt Payoff',
        'Other',
      ],
      default: 'Other',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      lowercase: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused', 'cancelled'],
      default: 'active',
      lowercase: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
goalSchema.index({ user: 1, createdAt: -1 });
goalSchema.index({ user: 1, status: 1, targetDate: 1 });

module.exports = mongoose.model('Goal', goalSchema);