const mongoose = require('mongoose');

const recurringTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required for recurring transaction ownership'],
      index: true,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Account is required for recurring transaction'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Recurring transaction title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Recurring transaction amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    type: {
      type: String,
      enum: {
        values: ['income', 'expense', 'investment'],
        message: 'Recurring transaction type must be income, expense, or investment',
      },
      required: [true, 'Recurring transaction type is required'],
      lowercase: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Recurring transaction category is required'],
      trim: true,
    },
    frequency: {
      type: String,
      enum: {
        values: ['daily', 'weekly', 'monthly', 'yearly'],
        message: 'Frequency must be daily, weekly, monthly, or yearly',
      },
      required: [true, 'Recurring transaction frequency is required'],
      lowercase: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Recurring transaction start date is required'],
    },
    nextRunDate: {
      type: Date,
      required: [true, 'Next run date is required'],
      index: true,
    },
    endDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'paused', 'completed', 'cancelled'],
        message: 'Status must be active, paused, completed, or cancelled',
      },
      default: 'active',
      lowercase: true,
      trim: true,
      index: true,
    },
    lastRunDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

recurringTransactionSchema.index({ user: 1, status: 1, nextRunDate: 1 });
recurringTransactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('RecurringTransaction', recurringTransactionSchema);
