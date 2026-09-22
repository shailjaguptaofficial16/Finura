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
    // Optional — open-ended goals have no fixed deadline
    deadline: {
      type: String,
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
  },
  {
    timestamps: true,
  }
);

// Indexes
goalSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Goal', goalSchema);