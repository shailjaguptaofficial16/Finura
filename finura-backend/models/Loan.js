const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
  name: { type: String, required: true, trim: true },
  lender: { type: String, required: true, trim: true },
  loanType: { type: String, enum: ['Personal', 'Home', 'Education', 'Vehicle', 'Business', 'Other'], required: true },
  principalAmount: { type: Number, required: true, min: 0.01 },
  outstandingPrincipal: { type: Number, required: true, min: 0 },
  interestRate: { type: Number, required: true, min: 0 },
  tenureMonths: { type: Number, required: true, min: 1 },
  emiAmount: { type: Number, min: 0, default: 0 },
  totalInterest: { type: Number, min: 0, default: 0 },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, default: null },
  nextEMIDueDate: { type: Date, default: null },
  status: { type: String, enum: ['active', 'paid', 'overdue', 'closed'], default: 'active' },
}, { timestamps: true });

loanSchema.pre('validate', function deriveEmi(next) {
  const monthlyRate = Number(this.interestRate) / 12 / 100;
  const months = Number(this.tenureMonths);
  this.emiAmount = monthlyRate === 0 ? this.principalAmount / months : this.principalAmount * monthlyRate * ((1 + monthlyRate) ** months) / (((1 + monthlyRate) ** months) - 1);
  this.totalInterest = Math.max(0, (this.emiAmount * months) - this.principalAmount);
  if (this.outstandingPrincipal === 0) this.status = 'paid';
  return next();
});
loanSchema.path('outstandingPrincipal').validate(function validateOutstanding(value) {
  return value <= this.principalAmount;
}, 'Outstanding principal cannot exceed principal amount');
loanSchema.index({ user: 1, status: 1, nextEMIDueDate: 1 });

module.exports = mongoose.model('Loan', loanSchema);