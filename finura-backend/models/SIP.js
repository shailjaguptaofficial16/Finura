const mongoose = require('mongoose');

const sipSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mutualFund: { type: mongoose.Schema.Types.ObjectId, ref: 'Investment', required: true },
    amount: { type: Number, required: true, min: [0.01, 'SIP amount must be positive'] },
    frequency: { type: String, enum: ['weekly', 'monthly', 'quarterly'], default: 'monthly' },
    startDate: { type: Date, required: true },
    nextDueDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    status: { type: String, enum: ['active', 'paused', 'cancelled'], default: 'active' },
    autoDebit: { type: Boolean, default: false },
  },
  { timestamps: true }
);

sipSchema.index({ user: 1, status: 1, nextDueDate: 1 });

module.exports = mongoose.model('SIP', sipSchema);