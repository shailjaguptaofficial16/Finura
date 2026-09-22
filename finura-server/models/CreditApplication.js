const mongoose = require('mongoose');

const creditApplicationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    facilityType: {
      type: String,
      enum: ['Working Capital Line', 'Home Equity Access', 'Business Credit Facility', 'Other'],
      default: 'Working Capital Line',
      required: true,
    },
    requestedAmount: {
      type: Number,
      required: true,
      min: 100,
    },
    annualIncome: {
      type: Number,
      required: true,
      min: 0,
    },
    applicantName: {
      type: String,
      trim: true,
      default: '',
    },
    applicantEmail: {
      type: String,
      trim: true,
      default: '',
    },
    purpose: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    creditScore: {
      type: Number,
      default: 740,
    },
    amount: {
      type: Number,
    },
    monthlyIncome: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to ensure amount and requestedAmount stay synced cleanly
creditApplicationSchema.pre('save', function (next) {
  if (this.requestedAmount && !this.amount) {
    this.amount = this.requestedAmount;
  } else if (this.amount && !this.requestedAmount) {
    this.requestedAmount = this.amount;
  }

  if (this.annualIncome && !this.monthlyIncome) {
    this.monthlyIncome = Math.round(this.annualIncome / 12);
  } else if (this.monthlyIncome && !this.annualIncome) {
    this.annualIncome = this.monthlyIncome * 12;
  }

  if (!this.purpose && this.facilityType) {
    this.purpose = this.facilityType;
  }
  next();
});

// Indexes
creditApplicationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('CreditApplication', creditApplicationSchema);
