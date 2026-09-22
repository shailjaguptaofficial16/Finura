const mongoose = require('mongoose');

const liabilitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required for liability ownership'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Liability name is required'],
      trim: true,
      maxlength: [120, 'Liability name cannot exceed 120 characters'],
    },
    category: {
      type: String,
      enum: ['Credit Card', 'Personal Loan', 'Home Loan', 'Education Loan', 'Car Loan', 'Other'],
      required: [true, 'Liability category is required'],
    },
    principalAmount: {
      type: Number,
      required: [true, 'Principal amount is required'],
      min: [0, 'Principal amount cannot be negative'],
    },
    outstandingAmount: {
      type: Number,
      required: [true, 'Outstanding amount is required'],
      min: [0, 'Outstanding amount cannot be negative'],
    },
    interestRate: {
      type: Number,
      min: [0, 'Interest rate cannot be negative'],
      default: 0,
    },
    minimumPayment: {
      type: Number,
      min: [0, 'Minimum payment cannot be negative'],
      default: 0,
    },
    dueDate: { type: Date, default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Liability notes cannot exceed 1000 characters'],
      default: '',
    },
  },
  { timestamps: true }
);

liabilitySchema.path('outstandingAmount').validate(function validateOutstandingAmount(value) {
  return value <= this.principalAmount;
}, 'Outstanding amount cannot exceed principal amount');

liabilitySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Liability', liabilitySchema);