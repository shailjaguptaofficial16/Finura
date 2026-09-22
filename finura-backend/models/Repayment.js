const mongoose = require('mongoose');

const repaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', required: true, index: true },
  installmentNumber: { type: Number, required: true, min: 1 },
  dueDate: { type: Date, required: true },
  emiAmount: { type: Number, required: true, min: 0 },
  principalAmount: { type: Number, required: true, min: 0 },
  interestAmount: { type: Number, required: true, min: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
  penaltyAmount: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['pending', 'partial', 'paid', 'overdue'], default: 'pending' },
  paidDate: { type: Date, default: null },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
}, { timestamps: true });
repaymentSchema.index({ user: 1, loan: 1, installmentNumber: 1 }, { unique: true });
module.exports = mongoose.model('Repayment', repaymentSchema);
