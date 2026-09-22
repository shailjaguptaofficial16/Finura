const mongoose = require('mongoose');

const emergencyFundSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required for emergency fund ownership'],
      unique: true,
      index: true,
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: [0, 'Emergency fund current amount cannot be negative'],
    },
    monthlyEssentialExpenses: {
      type: Number,
      required: [true, 'Monthly essential expenses are required'],
      min: [0, 'Monthly essential expenses cannot be negative'],
    },
    targetMonths: {
      type: Number,
      required: [true, 'Emergency fund target months are required'],
      min: [1, 'Emergency fund target must be at least 1 month'],
    },
    monthlyContribution: {
      type: Number,
      default: 0,
      min: [0, 'Emergency fund monthly contribution cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'completed', 'paused'],
        message: 'Emergency fund status must be active, completed, or paused',
      },
      default: 'active',
      lowercase: true,
      trim: true,
    },
    targetDate: {
      type: Date,
      default: null,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Emergency fund notes cannot exceed 500 characters'],
    },
  },
  { timestamps: true }
);

emergencyFundSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('EmergencyFund', emergencyFundSchema);
