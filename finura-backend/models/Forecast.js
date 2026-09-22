const mongoose = require('mongoose');

const forecastSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required for forecast ownership'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Forecast name is required'],
      trim: true,
      maxlength: [100, 'Forecast name cannot exceed 100 characters'],
    },
    forecastPeriod: {
      type: Number,
      default: 12,
      min: [1, 'Forecast period must be at least 1 month'],
      max: [24, 'Forecast period cannot exceed 24 months'],
    },
    assumptions: {
      incomeGrowthRate: {
        type: Number,
        default: 0,
        min: [-100, 'Income growth rate cannot be below -100%'],
      },
      expenseGrowthRate: {
        type: Number,
        default: 0,
        min: [-100, 'Expense growth rate cannot be below -100%'],
      },
      savingsGrowthRate: {
        type: Number,
        default: 0,
        min: [-100, 'Savings growth rate cannot be below -100%'],
      },
    },
    status: {
      type: String,
      enum: ['active', 'paused'],
      default: 'active',
      lowercase: true,
    },
  },
  { timestamps: true }
);

forecastSchema.index({ user: 1, createdAt: -1 });
forecastSchema.index({ user: 1, name: 1 });

module.exports = mongoose.model('Forecast', forecastSchema);
