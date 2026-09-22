const mongoose = require('mongoose');

const creditCardSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
  name: { type: String, required: true, trim: true },
  issuer: { type: String, required: true, trim: true },
  lastFourDigits: { type: String, required: true, match: /^\d{4}$/ },
  creditLimit: { type: Number, required: true, min: 0 },
  outstandingBalance: { type: Number, required: true, min: 0 },
  availableCredit: { type: Number, min: 0, default: 0 },
  billingCycleStart: { type: Number, min: 1, max: 31, default: 1 },
  billingCycleEnd: { type: Number, min: 1, max: 31, default: 30 },
  paymentDueDay: { type: Number, min: 1, max: 31, default: 15 },
  minimumDue: { type: Number, min: 0, default: 0 },
  annualFee: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ['active', 'blocked', 'closed'], default: 'active' },
}, { timestamps: true });

creditCardSchema.path('outstandingBalance').validate(function validateOutstanding(value) {
  return value <= this.creditLimit;
}, 'Outstanding balance cannot exceed credit limit');

creditCardSchema.pre('validate', function deriveAvailable(next) {
  this.availableCredit = Number((this.creditLimit - this.outstandingBalance).toFixed(2));
  return next();
});
creditCardSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('CreditCard', creditCardSchema);