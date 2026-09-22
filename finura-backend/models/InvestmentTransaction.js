const mongoose = require('mongoose');

const investmentTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    investment: { type: mongoose.Schema.Types.ObjectId, ref: 'Investment', required: true, index: true },
    type: { type: String, enum: ['buy', 'sell'], required: true, lowercase: true },
    quantity: { type: Number, required: true, min: [0.000001, 'Transaction quantity must be greater than 0'] },
    price: { type: Number, required: true, min: [0, 'Transaction price cannot be negative'] },
    totalAmount: { type: Number, required: true, min: 0 },
    fees: { type: Number, default: 0, min: [0, 'Fees cannot be negative'] },
    transactionDate: { type: Date, default: Date.now },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { timestamps: true }
);

investmentTransactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('InvestmentTransaction', investmentTransactionSchema);