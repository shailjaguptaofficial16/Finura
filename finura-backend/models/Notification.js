const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['LOW_BALANCE', 'BUDGET_LIMIT', 'BUDGET_EXCEEDED', 'GOAL_MILESTONE', 'GOAL_DEADLINE', 'EMI_DUE', 'EMI_OVERDUE', 'CREDIT_SCORE_CHANGE', 'LOAN_PAYMENT', 'INVESTMENT_ALERT', 'SYSTEM'], required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  message: { type: String, required: true, trim: true, maxlength: 1000 },
  relatedEntity: { entityType: { type: String, trim: true, default: null }, entityId: { type: mongoose.Schema.Types.ObjectId, default: null } },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  channel: { type: String, enum: ['in_app', 'email'], default: 'in_app' },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date, default: null },
  scheduledFor: { type: Date, default: null },
  sentAt: { type: Date, default: null },
  status: { type: String, enum: ['pending', 'sent', 'failed', 'cancelled'], default: 'pending' },
  expiresAt: { type: Date, default: null },
  dedupeKey: { type: String, required: true },
  retryCount: { type: Number, min: 0, default: 0 },
}, { timestamps: true });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, dedupeKey: 1 }, { unique: true });
module.exports = mongoose.model('Notification', notificationSchema);
