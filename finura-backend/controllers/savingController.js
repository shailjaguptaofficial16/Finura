const mongoose = require('mongoose');
const Saving = require('../models/Saving');
const Account = require('../models/Account');

const getUserId = (req) => req.user._id || req.user.id;
const VALID_TYPES = ['manual', 'automatic', 'goal'];

const parseDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error('Date must be valid');
    error.statusCode = 400;
    throw error;
  }
  return date;
};

const validateInput = ({ name, amount, type, date }) => {
  if (!name || !String(name).trim()) return 'Saving name is required';
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) return 'Amount must be greater than 0';
  if (!VALID_TYPES.includes(String(type).toLowerCase())) return 'Invalid saving type';
  if (date !== undefined) parseDate(date);
  return null;
};

const isAccountLinkedContribution = (saving) => Boolean(saving.isContribution && saving.accountId);

const applyContributionMutation = async ({ saving, nextAmount, remove = false }) => {
  const balanceDelta = remove ? Number(saving.amount) : Number(saving.amount) - Number(nextAmount);
  const accountFilter = {
    _id: saving.accountId,
    user: saving.user,
    isActive: true,
    ...(balanceDelta < 0 ? { balance: { $gte: Math.abs(balanceDelta) } } : {}),
  };
  let session;
  let account;

  const updateAccount = (options = {}) => Account.findOneAndUpdate(
    accountFilter,
    { $inc: { balance: balanceDelta } },
    { ...options, new: true }
  );

  const saveMutation = async (options = {}) => {
    if (remove) {
      await Saving.deleteOne({ _id: saving._id, user: saving.user }, options);
      return;
    }
    saving.amount = Number(nextAmount);
    await saving.save(options);
  };

  try {
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      account = await updateAccount({ session });
      if (!account) {
        const error = new Error('Insufficient account balance');
        error.statusCode = 400;
        throw error;
      }
      await saveMutation({ session });
    });
    return account;
  } catch (error) {
    if (!/transaction|replica|session|not supported/i.test(error.message || '')) throw error;

    if (session) {
      await session.endSession();
      session = null;
    }
    account = await updateAccount();
    if (!account) {
      const insufficient = new Error('Insufficient account balance');
      insufficient.statusCode = 400;
      throw insufficient;
    }

    try {
      await saveMutation();
    } catch (mutationError) {
      await Account.updateOne(
        { _id: saving.accountId, user: saving.user },
        { $inc: { balance: -balanceDelta } }
      );
      throw mutationError;
    }
    return account;
  } finally {
    if (session) await session.endSession();
  }
};

const createSaving = async (req, res, next) => {
  try {
    const { name, amount, type, date, description } = req.body;
    const validationError = validateInput({ name, amount, type, date });
    if (validationError) return res.status(400).json({ message: validationError });

    const saving = await Saving.create({
      user: getUserId(req),
      name: String(name).trim(),
      amount: Number(amount),
      type: String(type).toLowerCase(),
      date: date === undefined ? new Date() : parseDate(date),
      description: description ? String(description).trim() : '',
    });
    return res.status(201).json(saving);
  } catch (error) {
    next(error);
  }
};

const getSavings = async (req, res, next) => {
  try {
    const savings = await Saving.find({ user: getUserId(req) }).sort({ date: -1, createdAt: -1 });
    return res.status(200).json(savings);
  } catch (error) {
    next(error);
  }
};

const getSavingById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid saving ID' });
    }
    const saving = await Saving.findOne({ _id: req.params.id, user: getUserId(req) });
    if (!saving) return res.status(404).json({ message: 'Saving not found or unauthorized' });
    return res.status(200).json(saving);
  } catch (error) {
    next(error);
  }
};

const updateSaving = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid saving ID' });
    }
    const saving = await Saving.findOne({ _id: req.params.id, user: getUserId(req) });
    if (!saving) return res.status(404).json({ message: 'Saving not found or unauthorized' });

    const nextValues = {
      name: req.body.name ?? saving.name,
      amount: req.body.amount ?? saving.amount,
      type: req.body.type ?? saving.type,
      date: req.body.date ?? saving.date,
    };
    const validationError = validateInput(nextValues);
    if (validationError) return res.status(400).json({ message: validationError });

    const nextAmount = Number(nextValues.amount);
    if (isAccountLinkedContribution(saving) && nextAmount !== Number(saving.amount)) {
      saving.name = String(nextValues.name).trim();
      saving.type = String(nextValues.type).toLowerCase();
      saving.date = parseDate(nextValues.date);
      if (req.body.description !== undefined) saving.description = String(req.body.description).trim();
      await applyContributionMutation({ saving, nextAmount });
    } else {
      saving.name = String(nextValues.name).trim();
      saving.amount = nextAmount;
      saving.type = String(nextValues.type).toLowerCase();
      saving.date = parseDate(nextValues.date);
      if (req.body.description !== undefined) saving.description = String(req.body.description).trim();
      await saving.save();
    }
    return res.status(200).json(saving);
  } catch (error) {
    next(error);
  }
};

const deleteSaving = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid saving ID' });
    }
    const saving = await Saving.findOne({ _id: req.params.id, user: getUserId(req) });
    if (!saving) return res.status(404).json({ message: 'Saving not found or unauthorized' });
    if (isAccountLinkedContribution(saving)) {
      await applyContributionMutation({ saving, remove: true });
    } else {
      await saving.deleteOne();
    }
    return res.status(200).json({ id: req.params.id, message: 'Saving deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const contributeToSavings = async (req, res, next) => {
  let session;
  let usedSession = false;
  let account;
  let saving;
  const userId = getUserId(req);

  try {
    const { amount, accountId, description, name, type, date } = req.body;
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }
    if (!accountId || !mongoose.Types.ObjectId.isValid(accountId)) {
      return res.status(400).json({ message: 'Invalid Account ID provided' });
    }
    const contributionType = type ? String(type).toLowerCase() : 'manual';
    if (!VALID_TYPES.includes(contributionType)) {
      return res.status(400).json({ message: 'Invalid saving type' });
    }
    const contributionDate = date === undefined ? new Date() : parseDate(date);

    account = await Account.findOne({ _id: accountId, user: userId, isActive: true });
    if (!account) return res.status(404).json({ message: 'Account not found or unauthorized' });
    if (Number(account.balance) < numericAmount) {
      return res.status(400).json({ message: 'Insufficient account balance' });
    }

    session = await mongoose.startSession();
    usedSession = true;
    try {
      await session.withTransaction(async () => {
        account = await Account.findOneAndUpdate(
          { _id: accountId, user: userId, isActive: true, balance: { $gte: numericAmount } },
          { $inc: { balance: -numericAmount } },
          { session, new: true }
        );
        if (!account) {
          const error = new Error('Insufficient account balance');
          error.statusCode = 400;
          throw error;
        }

        [saving] = await Saving.create([{
          user: userId,
          accountId,
          isContribution: true,
          name: name && String(name).trim() ? String(name).trim() : 'Savings Contribution',
          amount: numericAmount,
          type: contributionType,
          description: description ? String(description).trim() : '',
          date: contributionDate,
        }], { session });
      });
    } catch (sessionError) {
      if (!/transaction|replica|session|not supported/i.test(sessionError.message || '')) {
        throw sessionError;
      }

      usedSession = false;
      await session.endSession();
      account = await Account.findOneAndUpdate(
        { _id: accountId, user: userId, isActive: true, balance: { $gte: numericAmount } },
        { $inc: { balance: -numericAmount } },
        { new: true }
      );
      if (!account) return res.status(400).json({ message: 'Insufficient account balance' });

      try {
        saving = await Saving.create({
          user: userId,
          accountId,
          isContribution: true,
          name: name && String(name).trim() ? String(name).trim() : 'Savings Contribution',
          amount: numericAmount,
          type: contributionType,
          description: description ? String(description).trim() : '',
          date: contributionDate,
        });
      } catch (savingError) {
        await Account.updateOne(
          { _id: accountId, user: userId },
          { $inc: { balance: numericAmount } }
        );
        throw savingError;
      }
    }

    if (usedSession) await session.endSession();
    return res.status(201).json({ saving, accountBalance: account.balance });
  } catch (error) {
    try {
      if (session) {
        if (session.inTransaction()) await session.abortTransaction();
        await session.endSession();
      }
    } catch (_) {
      // Best-effort cleanup after a failed contribution.
    }
    next(error);
  }
};

module.exports = {
  createSaving,
  getSavings,
  getSavingById,
  updateSaving,
  deleteSaving,
  contributeToSavings,
};
