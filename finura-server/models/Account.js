const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for account ownership'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Account name is required (e.g. HDFC Savings, Cash, Wallet)'],
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: ['Savings', 'Checking', 'Credit Card', 'Wallet', 'Investment', 'Cash'],
        message: 'Account type must be Savings, Checking, Credit Card, Wallet, Investment, or Cash',
      },
      default: 'Savings',
      required: [true, 'Account type is required'],
    },
    balance: {
      type: Number,
      required: [true, 'Account balance is required'],
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },
    accountNumberLast4: {
      type: String,
      default: '',
      trim: true,
    },
    color: {
      type: String,
      default: '#00f2fe',
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly fetch active accounts per user
accountSchema.index({ user: 1, isActive: 1 });
accountSchema.index({ user: 1, name: 1 });

module.exports = mongoose.model('Account', accountSchema);
