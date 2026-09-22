const mongoose = require('mongoose');

const retirementSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required for retirement plan ownership'],
      unique: true,
      index: true,
    },
    currentAge: {
      type: Number,
      required: [true, 'Current age is required'],
      min: [1, 'Current age must be greater than 0'],
      max: [100, 'Current age cannot exceed 100'],
    },
    retirementAge: {
      type: Number,
      required: [true, 'Retirement age is required'],
      min: [2, 'Retirement age must be greater than 1'],
      max: [100, 'Retirement age cannot exceed 100'],
    },
    lifeExpectancy: {
      type: Number,
      required: [true, 'Life expectancy is required'],
      min: [3, 'Life expectancy must be greater than 2'],
      max: [120, 'Life expectancy cannot exceed 120'],
    },
    currentMonthlyExpenses: {
      type: Number,
      required: [true, 'Current monthly expenses are required'],
      min: [0.01, 'Current monthly expenses must be greater than 0'],
    },
    currentRetirementSavings: {
      type: Number,
      default: 0,
      min: [0, 'Current retirement savings cannot be negative'],
    },
    monthlyContribution: {
      type: Number,
      default: 0,
      min: [0, 'Monthly contribution cannot be negative'],
    },
    inflationRate: {
      type: Number,
      required: [true, 'Inflation rate is required'],
      min: [0, 'Inflation rate cannot be negative'],
      max: [50, 'Inflation rate cannot exceed 50%'],
    },
    expectedReturn: {
      type: Number,
      required: [true, 'Expected return is required'],
      min: [0, 'Expected return cannot be negative'],
      max: [100, 'Expected return cannot exceed 100%'],
    },
    retirementLifestyle: {
      type: String,
      trim: true,
      default: 'moderate',
      maxlength: [50, 'Retirement lifestyle cannot exceed 50 characters'],
    },
    otherIncome: {
      type: Number,
      default: 0,
      min: [0, 'Other income cannot be negative'],
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Retirement notes cannot exceed 1000 characters'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Retirement', retirementSchema);
