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
      applicationType: { type: String, enum: ['Loan', 'Credit Card', 'Credit Limit Increase', 'Other'], default: 'Other' },
      lender: { type: String, trim: true, default: '' },
      productName: { type: String, trim: true, default: '' },
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
    applicationDate: { type: Date, default: Date.now },
      expectedDecisionDate: { type: Date, default: null },
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
        enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'Pending', 'Approved', 'Rejected'],
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
      rejectionReason: { type: String, trim: true, default: '' },
      approvedAmount: { type: Number, min: 0, default: null },
      linkedLoan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', default: null },
      linkedCreditCard: { type: mongoose.Schema.Types.ObjectId, ref: 'CreditCard', default: null },
      notes: { type: String, trim: true, maxlength: 2000, default: '' },
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
  if (this.applicationDate && this.applicationDate > new Date()) return next(new mongoose.Error.ValidationError(new Error('Application date cannot be in the future')));
  if (this.expectedDecisionDate && this.applicationDate && this.expectedDecisionDate < this.applicationDate) return next(new mongoose.Error.ValidationError(new Error('Expected decision date cannot precede application date')));
  if (this.status === 'rejected' && !this.rejectionReason) return next(new mongoose.Error.ValidationError(new Error('Rejection reason is required')));
  next();
});

// Indexes
creditApplicationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('CreditApplication', creditApplicationSchema);
