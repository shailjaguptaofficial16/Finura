const mongoose = require('mongoose');
const RecurringTransaction = require('../models/RecurringTransaction');
const Account = require('../models/Account');

const ACCOUNT_FIELDS = 'name type color accountNumberLast4 balance currency';

const getUserId = (req) => req.user._id || req.user.id;

const parseDate = (value, fieldName) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${fieldName} must be a valid date`);
    error.statusCode = 400;
    throw error;
  }
  return date;
};

const getOwnedAccount = async (accountId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(accountId)) {
    const error = new Error('Invalid account ID');
    error.statusCode = 400;
    throw error;
  }

  const account = await Account.findOne({
    _id: accountId,
    user: userId,
    isActive: true,
  });

  if (!account) {
    const error = new Error('Account not found or unauthorized');
    error.statusCode = 404;
    throw error;
  }

  return account;
};

const populateAccount = (query) => query.populate('account', ACCOUNT_FIELDS);

const getRecurringNotifications = async (req, res, next) => {
  try {
    const now = new Date();
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + 7);

    const rules = await populateAccount(
      RecurringTransaction.find({
        user: getUserId(req),
        status: 'active',
        nextRunDate: { $gte: now, $lte: horizon },
      }).sort({ nextRunDate: 1 })
    );

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    return res.status(200).json(rules.map((rule) => {
      const runDate = new Date(rule.nextRunDate);
      const daysUntil = Math.max(0, Math.ceil((runDate - startOfToday) / (24 * 60 * 60 * 1000)));
      const dueLabel = daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`;
      const verb = rule.type === 'income' ? 'is scheduled' : 'is coming up';
      const prefix = rule.type === 'income' ? 'Your recurring' : '';

      return {
        id: rule._id,
        recurringTransaction: rule._id,
        title: rule.title,
        type: rule.type,
        amount: rule.amount,
        account: rule.account,
        nextRunDate: rule.nextRunDate,
        daysUntil,
        message: `${prefix} ${rule.title} of ₹${Number(rule.amount).toLocaleString('en-IN')} ${verb} ${dueLabel}.`.replace(/^ /, ''),
      };
    }));
  } catch (error) {
    next(error);
  }
};

const getRecurringTransactions = async (req, res, next) => {
  try {
    const recurringTransactions = await populateAccount(
      RecurringTransaction.find({ user: getUserId(req) }).sort({ nextRunDate: 1, createdAt: -1 })
    );
    return res.status(200).json(recurringTransactions);
  } catch (error) {
    next(error);
  }
};

const getRecurringTransaction = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid recurring transaction ID' });
    }

    const recurringTransaction = await populateAccount(
      RecurringTransaction.findOne({ _id: req.params.id, user: getUserId(req) })
    );

    if (!recurringTransaction) {
      return res.status(404).json({ message: 'Recurring transaction not found or unauthorized' });
    }

    return res.status(200).json(recurringTransaction);
  } catch (error) {
    next(error);
  }
};

const createRecurringTransaction = async (req, res, next) => {
  try {
    const {
      account,
      title,
      description,
      amount,
      type,
      category,
      frequency,
      startDate,
      nextRunDate,
      endDate,
      status,
    } = req.body;
    const userId = getUserId(req);

    if (!account || !title || !String(title).trim() || !type || !category || !frequency || !startDate) {
      return res.status(400).json({
        message: 'Account, title, amount, type, category, frequency, and startDate are required',
      });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    const parsedStartDate = parseDate(startDate, 'startDate');
    const parsedNextRunDate = nextRunDate ? parseDate(nextRunDate, 'nextRunDate') : parsedStartDate;
    const parsedEndDate = endDate ? parseDate(endDate, 'endDate') : null;

    if (parsedEndDate && parsedEndDate < parsedStartDate) {
      return res.status(400).json({ message: 'endDate cannot be before startDate' });
    }

    await getOwnedAccount(account, userId);

    const recurringTransaction = await RecurringTransaction.create({
      user: userId,
      account,
      title: String(title).trim(),
      description: description === undefined ? '' : String(description).trim(),
      amount: numericAmount,
      type: String(type).toLowerCase().trim(),
      category: String(category).trim(),
      frequency: String(frequency).toLowerCase().trim(),
      startDate: parsedStartDate,
      nextRunDate: parsedNextRunDate,
      endDate: parsedEndDate,
      status: status ? String(status).toLowerCase().trim() : 'active',
    });

    return res.status(201).json(await populateAccount(
      RecurringTransaction.findById(recurringTransaction._id)
    ));
  } catch (error) {
    next(error);
  }
};

const updateRecurringTransaction = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid recurring transaction ID' });
    }

    const recurringTransaction = await RecurringTransaction.findOne({
      _id: req.params.id,
      user: getUserId(req),
    });
    if (!recurringTransaction) {
      return res.status(404).json({ message: 'Recurring transaction not found or unauthorized' });
    }

    const allowedFields = ['title', 'description', 'amount', 'type', 'category', 'frequency', 'status'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        recurringTransaction[field] = typeof req.body[field] === 'string'
          ? req.body[field].trim()
          : req.body[field];
      }
    }

    if (req.body.account !== undefined) {
      await getOwnedAccount(req.body.account, getUserId(req));
      recurringTransaction.account = req.body.account;
    }
    if (req.body.startDate !== undefined) {
      recurringTransaction.startDate = parseDate(req.body.startDate, 'startDate');
    }
    if (req.body.nextRunDate !== undefined) {
      recurringTransaction.nextRunDate = parseDate(req.body.nextRunDate, 'nextRunDate');
    }
    if (req.body.endDate !== undefined) {
      recurringTransaction.endDate = req.body.endDate ? parseDate(req.body.endDate, 'endDate') : null;
    }

    if (recurringTransaction.endDate && recurringTransaction.endDate < recurringTransaction.startDate) {
      return res.status(400).json({ message: 'endDate cannot be before startDate' });
    }

    await recurringTransaction.save();
    return res.status(200).json(await populateAccount(
      RecurringTransaction.findById(recurringTransaction._id)
    ));
  } catch (error) {
    next(error);
  }
};

const deleteRecurringTransaction = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid recurring transaction ID' });
    }

    const recurringTransaction = await RecurringTransaction.findOne({
      _id: req.params.id,
      user: getUserId(req),
    });
    if (!recurringTransaction) {
      return res.status(404).json({ message: 'Recurring transaction not found or unauthorized' });
    }

    await recurringTransaction.deleteOne();
    return res.status(200).json({
      id: req.params.id,
      message: 'Recurring transaction deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

const pauseRecurringTransaction = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid recurring transaction ID' });
    }

    const recurringTransaction = await RecurringTransaction.findOne({
      _id: req.params.id,
      user: getUserId(req),
    });
    if (!recurringTransaction) {
      return res.status(404).json({ message: 'Recurring transaction not found or unauthorized' });
    }
    if (['completed', 'cancelled'].includes(recurringTransaction.status)) {
      return res.status(400).json({ message: `Cannot pause a ${recurringTransaction.status} recurring transaction` });
    }

    recurringTransaction.status = 'paused';
    await recurringTransaction.save();
    return res.status(200).json(recurringTransaction);
  } catch (error) {
    next(error);
  }
};

const resumeRecurringTransaction = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid recurring transaction ID' });
    }

    const recurringTransaction = await RecurringTransaction.findOne({
      _id: req.params.id,
      user: getUserId(req),
    });
    if (!recurringTransaction) {
      return res.status(404).json({ message: 'Recurring transaction not found or unauthorized' });
    }
    if (['completed', 'cancelled'].includes(recurringTransaction.status)) {
      return res.status(400).json({ message: `Cannot resume a ${recurringTransaction.status} recurring transaction` });
    }

    recurringTransaction.status = 'active';
    await recurringTransaction.save();
    return res.status(200).json(recurringTransaction);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecurringNotifications,
  getRecurringTransactions,
  getRecurringTransaction,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  pauseRecurringTransaction,
  resumeRecurringTransaction,
};
