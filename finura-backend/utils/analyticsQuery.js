const mongoose = require('mongoose');
const Account = require('../models/Account');

const startOfDay = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
const endOfDay = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));

const parseDate = (value, label) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${label} must be a valid date`);
    error.statusCode = 400;
    error.errorCode = 'INVALID_DATE';
    throw error;
  }
  if (date > new Date()) {
    const error = new Error(`${label} cannot be in the future`);
    error.statusCode = 400;
    error.errorCode = 'FUTURE_DATE';
    throw error;
  }
  return date;
};

const normalizeAnalyticsFilters = async (userId, query = {}) => {
  const now = new Date();
  const requestedStart = parseDate(query.startDate, 'startDate');
  const requestedEnd = parseDate(query.endDate, 'endDate');
  const end = requestedEnd ? endOfDay(requestedEnd) : endOfDay(now);
  const start = requestedStart ? startOfDay(requestedStart) : startOfDay(new Date(end.getTime() - (29 * 24 * 60 * 60 * 1000)));
  if (start > end) {
    const error = new Error('startDate must be before or equal to endDate');
    error.statusCode = 400;
    error.errorCode = 'FUTURE_DATE';
    throw error;
  }
  if (end.getTime() - start.getTime() > 366 * 24 * 60 * 60 * 1000) {
    const error = new Error('Analytics date range cannot exceed 366 days');
    error.statusCode = 400;
    error.errorCode = 'DATE_RANGE_TOO_LARGE';
    throw error;
  }
  if (query.accountId && !mongoose.Types.ObjectId.isValid(query.accountId)) {
    const error = new Error('Invalid accountId');
    error.statusCode = 400;
    error.errorCode = 'INVALID_ACCOUNT_ID';
    throw error;
  }
  if (query.accountId && !(await Account.exists({ _id: query.accountId, user: userId }))) {
    const error = new Error('Account does not belong to the current user');
    error.statusCode = 403;
    error.errorCode = 'ACCOUNT_ACCESS_DENIED';
    throw error;
  }
  const allowedTypes = ['income', 'expense', 'investment', 'transfer'];
  if (query.transactionType && !allowedTypes.includes(query.transactionType)) {
    const error = new Error('Invalid transactionType');
    error.statusCode = 400;
    error.errorCode = 'INVALID_TRANSACTION_TYPE';
    throw error;
  }
  if (query.currency && query.currency.toUpperCase() !== 'INR') {
    const error = new Error('Only INR analytics are currently supported');
    error.statusCode = 400;
    error.errorCode = 'UNSUPPORTED_CURRENCY';
    throw error;
  }
  return {
    startDate: start,
    endDate: end,
    accountId: query.accountId || null,
    category: query.category || null,
    transactionType: query.transactionType || null,
    currency: 'INR',
  };
};

const buildTransactionQuery = (userId, filters) => ({
  user: userId,
  date: { $gte: filters.startDate, $lte: filters.endDate },
  ...(filters.accountId ? { accountId: filters.accountId } : {}),
  ...(filters.category ? { category: filters.category } : {}),
  ...(filters.transactionType ? { type: filters.transactionType } : {}),
});

module.exports = { normalizeAnalyticsFilters, buildTransactionQuery };