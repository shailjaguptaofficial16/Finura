const Notification = require('../models/Notification');
const User = require('../models/User');
const preferenceKey = { BUDGET_LIMIT: 'budget', BUDGET_EXCEEDED: 'budget', GOAL_MILESTONE: 'goals', GOAL_DEADLINE: 'goals', LOW_BALANCE: 'lowBalance', EMI_DUE: 'emi', EMI_OVERDUE: 'emi', CREDIT_SCORE_CHANGE: 'creditScore', LOAN_PAYMENT: 'emi', INVESTMENT_ALERT: 'investments', SYSTEM: 'security' };

const isExpired = (notification) => notification.expiresAt && notification.expiresAt <= new Date();
const createNotification = async (data) => {
  const payload = { priority: 'medium', channel: 'in_app', status: 'pending', ...data };
  const user = await User.findById(payload.user).select('notificationPreferences');
  const category = preferenceKey[payload.type];
  const preferences = user?.notificationPreferences;
  if (category && category !== 'security' && preferences?.types?.[category] === false) return null;
  if (payload.channel === 'in_app' && preferences?.inApp?.enabled === false && category !== 'security') return null;
  if (!payload.dedupeKey) payload.dedupeKey = `${payload.user}:${payload.type}:${payload.relatedEntity?.entityId || 'none'}:${new Date().toISOString().slice(0, 10)}`;
  const existing = await Notification.findOne({ user: payload.user, dedupeKey: payload.dedupeKey });
  return existing || Notification.create(payload);
};
const getUserNotifications = async (userId, { unreadOnly = false } = {}) => {
  const query = { user: userId, $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] };
  if (unreadOnly) query.isRead = false;
  return Notification.find(query).sort({ createdAt: -1 });
};
const getUnreadCount = async (userId) => (await getUserNotifications(userId, { unreadOnly: true })).length;
const markAsRead = async (userId, notificationId) => Notification.findOneAndUpdate({ _id: notificationId, user: userId }, { $set: { isRead: true, readAt: new Date() } }, { new: true });
const markAllAsRead = async (userId) => Notification.updateMany({ user: userId, isRead: false }, { $set: { isRead: true, readAt: new Date() } });
const deleteNotification = async (userId, notificationId) => Notification.findOneAndDelete({ _id: notificationId, user: userId });
const archiveExpiredNotifications = async (userId) => Notification.updateMany({ user: userId, expiresAt: { $lte: new Date() } }, { $set: { status: 'cancelled' } });
module.exports = { createNotification, getUserNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification, archiveExpiredNotifications, isExpired };
