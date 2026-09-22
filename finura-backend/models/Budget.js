const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required for budget ownership'],
      index: true,
    },
    category: {
      type: String,
      enum: ['Food', 'Shopping', 'Housing', 'Transport', 'Entertainment', 'Bills', 'Healthcare', 'Education', 'Travel', 'Other'],
      required: [true, 'Budget category is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Budget amount is required'],
      min: [0.01, 'Budget amount must be greater than 0'],
    },
    period: {
      type: String,
      enum: ['weekly', 'monthly', 'yearly'],
      default: 'monthly',
      lowercase: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Budget start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'Budget end date is required'],
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'cancelled'],
      default: 'active',
      lowercase: true,
      trim: true,
      index: true,
    },
  },
  { timestamps: true }
);

budgetSchema.index({ user: 1, startDate: 1, endDate: 1 });
budgetSchema.index({ user: 1, category: 1, status: 1 });

module.exports = mongoose.model('Budget', budgetSchema);
