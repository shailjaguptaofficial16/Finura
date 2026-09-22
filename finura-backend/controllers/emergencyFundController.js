const mongoose = require('mongoose');
const EmergencyFund = require('../models/EmergencyFund');
const Account = require('../models/Account');

const getUserId = (req) => req.user._id || req.user.id;

const parseNumber = (value, field, { positive = false, required = false } = {}) => {
  if (value === undefined || value === null || value === '') {
    if (required) return `${field} is required`;
    return null;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || (positive ? number <= 0 : number < 0)) {
    return positive ? `${field} must be greater than 0` : `${field} cannot be negative`;
  }
  return null;
};

const parseDate = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error('Target date must be valid');
    error.statusCode = 400;
    throw error;
  }
  return date;
};

const validateAccount = async (accountId, userId) => {
  if (accountId === undefined || accountId === null || accountId === '') return null;
  if (!mongoose.Types.ObjectId.isValid(accountId)) return 'Invalid account ID';
  const account = await Account.findOne({ _id: accountId, user: userId, isActive: true }).select('_id');
  return account ? null : 'Account not found or unauthorized';
};

const serializeEmergencyFund = (fund) => {
  const data = fund.toObject ? fund.toObject() : fund;
  const currentAmount = Number(data.currentAmount || 0);
  const targetAmount = Number(data.monthlyEssentialExpenses || 0) * Number(data.targetMonths || 0);
  const monthlyExpenses = Number(data.monthlyEssentialExpenses || 0);
  const progressPercentage = targetAmount > 0
    ? Number(Math.min(100, (currentAmount / targetAmount) * 100).toFixed(1))
    : 0;

  return {
    ...data,
    targetAmount: Number(targetAmount.toFixed(2)),
    currentAmount: Number(currentAmount.toFixed(2)),
    progressPercentage,
    remainingAmount: Number(Math.max(0, targetAmount - currentAmount).toFixed(2)),
    coverageMonths: monthlyExpenses > 0 ? Number((currentAmount / monthlyExpenses).toFixed(1)) : 0,
    status: data.status === 'paused' ? 'paused' : currentAmount >= targetAmount ? 'completed' : 'active',
  };
};

const httpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const transferEmergencyFundAmount = async ({ userId, amount, accountId, direction }) => {
  const isContribution = direction === 'contribute';
  const accountDelta = isContribution ? -amount : amount;
  const fundDelta = isContribution ? amount : -amount;
  const accountFilter = {
    _id: accountId,
    user: userId,
    isActive: true,
    ...(isContribution ? { balance: { $gte: amount } } : {}),
  };
  const fundFilter = {
    user: userId,
    status: { $ne: 'paused' },
    ...(isContribution
      ? { $expr: { $lte: [{ $add: ['$currentAmount', amount] }, { $multiply: ['$monthlyEssentialExpenses', '$targetMonths'] }] } }
      : { currentAmount: { $gte: amount } }),
  };
  let session;
  let account;
  let fund;

  const updateAccount = (options = {}) => Account.findOneAndUpdate(
    accountFilter,
    { $inc: { balance: accountDelta } },
    { ...options, new: true }
  );
  const updateFund = (options = {}) => EmergencyFund.findOneAndUpdate(
    fundFilter,
    { $inc: { currentAmount: fundDelta } },
    { ...options, new: true }
  );

  try {
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      account = await updateAccount({ session });
      if (!account) throw httpError(isContribution ? 'Insufficient account balance' : 'Account not found or unauthorized', isContribution ? 400 : 404);
      fund = await updateFund({ session });
      if (!fund) throw httpError(isContribution ? 'Contribution exceeds remaining target or fund is paused' : 'Insufficient emergency fund balance or fund is paused', 400);
    });
    return { fund, account };
  } catch (error) {
    if (!/transaction|replica|session|not supported/i.test(error.message || '')) throw error;
    if (session) {
      await session.endSession();
      session = null;
    }

    account = await updateAccount();
    if (!account) throw httpError(isContribution ? 'Insufficient account balance' : 'Account not found or unauthorized', isContribution ? 400 : 404);
    try {
      fund = await updateFund();
      if (!fund) throw httpError(isContribution ? 'Contribution exceeds remaining target or fund is paused' : 'Insufficient emergency fund balance or fund is paused', 400);
    } catch (mutationError) {
      await Account.updateOne({ _id: accountId, user: userId }, { $inc: { balance: -accountDelta } });
      throw mutationError;
    }
    return { fund, account };
  } finally {
    if (session) await session.endSession();
  }
};

const contributeToEmergencyFund = async (req, res, next) => {
  try {
    const amount = Number(req.body.amount);
    const { accountId } = req.body;
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'Amount must be greater than 0' });
    if (!accountId || !mongoose.Types.ObjectId.isValid(accountId)) return res.status(400).json({ message: 'Invalid account ID' });
    const result = await transferEmergencyFundAmount({ userId: getUserId(req), amount, accountId, direction: 'contribute' });
    return res.status(200).json({ ...serializeEmergencyFund(result.fund), accountBalance: Number(result.account.balance.toFixed(2)) });
  } catch (error) {
    next(error);
  }
};

const withdrawFromEmergencyFund = async (req, res, next) => {
  try {
    const amount = Number(req.body.amount);
    const { accountId } = req.body;
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'Amount must be greater than 0' });
    if (!accountId || !mongoose.Types.ObjectId.isValid(accountId)) return res.status(400).json({ message: 'Invalid account ID' });
    const result = await transferEmergencyFundAmount({ userId: getUserId(req), amount, accountId, direction: 'withdraw' });
    return res.status(200).json({ ...serializeEmergencyFund(result.fund), accountBalance: Number(result.account.balance.toFixed(2)) });
  } catch (error) {
    next(error);
  }
};

const createEmergencyFund = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { monthlyEssentialExpenses, targetMonths, currentAmount, monthlyContribution, status, targetDate, accountId, notes } = req.body;
    const monthlyError = parseNumber(monthlyEssentialExpenses, 'Monthly essential expenses', { positive: true, required: true });
    const monthsError = parseNumber(targetMonths, 'Target months', { positive: true, required: true });
    const currentError = parseNumber(currentAmount, 'Current amount');
    const contributionError = parseNumber(monthlyContribution, 'Monthly contribution');
    if (monthlyError || monthsError || currentError || contributionError) return res.status(400).json({ message: monthlyError || monthsError || currentError || contributionError });
    if (status !== undefined && !['active', 'completed', 'paused'].includes(String(status).toLowerCase())) {
      return res.status(400).json({ message: 'Invalid emergency fund status' });
    }
    const accountError = await validateAccount(accountId, userId);
    if (accountError) return res.status(accountError.startsWith('Invalid') ? 400 : 404).json({ message: accountError });

    const existing = await EmergencyFund.findOne({ user: userId }).select('_id');
    if (existing) return res.status(409).json({ message: 'Emergency fund already exists' });

    const fund = await EmergencyFund.create({
      user: userId,
      monthlyEssentialExpenses: Number(monthlyEssentialExpenses),
      targetMonths: Number(targetMonths),
      currentAmount: currentAmount === undefined ? 0 : Number(currentAmount),
      monthlyContribution: monthlyContribution === undefined ? 0 : Number(monthlyContribution),
      status: status ? String(status).toLowerCase() : 'active',
      targetDate: parseDate(targetDate),
      accountId: accountId || null,
      notes: notes ? String(notes).trim() : '',
    });
    return res.status(201).json(serializeEmergencyFund(fund));
  } catch (error) {
    next(error);
  }
};

const getEmergencyFund = async (req, res, next) => {
  try {
    const fund = await EmergencyFund.findOne({ user: getUserId(req) });
    if (!fund) return res.status(404).json({ message: 'Emergency fund not found' });
    return res.status(200).json(serializeEmergencyFund(fund));
  } catch (error) {
    next(error);
  }
};

const updateEmergencyFund = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const fund = await EmergencyFund.findOne({ user: userId });
    if (!fund) return res.status(404).json({ message: 'Emergency fund not found' });

    const nextMonthlyExpenses = req.body.monthlyEssentialExpenses ?? fund.monthlyEssentialExpenses;
    const nextTargetMonths = req.body.targetMonths ?? fund.targetMonths;
    const monthlyError = parseNumber(nextMonthlyExpenses, 'Monthly essential expenses', { positive: true, required: true });
    const monthsError = parseNumber(nextTargetMonths, 'Target months', { positive: true, required: true });
    const currentError = parseNumber(req.body.currentAmount, 'Current amount');
    const contributionError = parseNumber(req.body.monthlyContribution, 'Monthly contribution');
    if (monthlyError || monthsError || currentError || contributionError) return res.status(400).json({ message: monthlyError || monthsError || currentError || contributionError });
    if (req.body.status !== undefined && !['active', 'completed', 'paused'].includes(String(req.body.status).toLowerCase())) {
      return res.status(400).json({ message: 'Invalid emergency fund status' });
    }
    const accountError = await validateAccount(req.body.accountId, userId);
    if (accountError) return res.status(accountError.startsWith('Invalid') ? 400 : 404).json({ message: accountError });

    fund.monthlyEssentialExpenses = Number(nextMonthlyExpenses);
    fund.targetMonths = Number(nextTargetMonths);
    if (req.body.currentAmount !== undefined) fund.currentAmount = Number(req.body.currentAmount);
    if (req.body.monthlyContribution !== undefined) fund.monthlyContribution = Number(req.body.monthlyContribution);
    if (req.body.status !== undefined) fund.status = String(req.body.status).toLowerCase();
    if (req.body.targetDate !== undefined) fund.targetDate = parseDate(req.body.targetDate);
    if (req.body.accountId !== undefined) fund.accountId = req.body.accountId || null;
    if (req.body.notes !== undefined) fund.notes = String(req.body.notes).trim();
    await fund.save();

    return res.status(200).json(serializeEmergencyFund(fund));
  } catch (error) {
    next(error);
  }
};

const deleteEmergencyFund = async (req, res, next) => {
  try {
    const existingFund = await EmergencyFund.findOne({ user: getUserId(req) });
    if (!existingFund) return res.status(404).json({ message: 'Emergency fund not found' });
    if (Number(existingFund.currentAmount) > 0) {
      return res.status(400).json({ message: 'Withdraw the emergency fund balance before deleting it' });
    }
    const fund = await EmergencyFund.findOneAndDelete({ _id: existingFund._id, user: getUserId(req) });
    if (!fund) return res.status(404).json({ message: 'Emergency fund not found' });
    return res.status(200).json({ id: fund._id, message: 'Emergency fund deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEmergencyFund,
  getEmergencyFund,
  updateEmergencyFund,
  deleteEmergencyFund,
  contributeToEmergencyFund,
  withdrawFromEmergencyFund,
};
