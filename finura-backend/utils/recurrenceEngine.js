const mongoose = require('mongoose');
const RecurringTransaction = require('../models/RecurringTransaction');
const Transaction = require('../models/Transaction');
const { createTransactionAndUpdateBalance } = require('../services/transactionService');
const { supportsMongoTransactions } = require('./mongoTransactions');

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

const calculateNextRunDate = (date, frequency) => {
  const currentDate = new Date(date);
  if (Number.isNaN(currentDate.getTime())) {
    throw new Error('A valid date is required to calculate the next run date');
  }

  const nextDate = new Date(currentDate);
  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly': {
      const dayOfMonth = currentDate.getDate();
      nextDate.setDate(1);
      nextDate.setMonth(nextDate.getMonth() + 1);
      nextDate.setDate(Math.min(dayOfMonth, getDaysInMonth(nextDate.getFullYear(), nextDate.getMonth())));
      break;
    }
    case 'yearly': {
      const dayOfMonth = currentDate.getDate();
      const month = currentDate.getMonth();
      nextDate.setDate(1);
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      nextDate.setMonth(month);
      nextDate.setDate(Math.min(dayOfMonth, getDaysInMonth(nextDate.getFullYear(), month)));
      break;
    }
    default:
      throw new Error(`Unsupported recurring frequency: ${frequency}`);
  }

  return nextDate;
};

const advanceRecurringRule = (recurring, occurrenceDate) => {
  const nextRunDate = calculateNextRunDate(occurrenceDate, recurring.frequency);
  recurring.lastRunDate = occurrenceDate;
  if (recurring.endDate && nextRunDate > recurring.endDate) {
    recurring.status = 'completed';
  } else {
    recurring.nextRunDate = nextRunDate;
  }
};

const runRecurringTransaction = async (recurringTransactionId, now = new Date()) => {
  const session = supportsMongoTransactions() ? await mongoose.startSession() : null;
  try {
    if (session) {
      session.startTransaction();
    }

    const recurring = await RecurringTransaction.findOne({
      _id: recurringTransactionId,
      status: 'active',
      nextRunDate: { $lte: now },
    }).session(session);

    if (!recurring) {
      if (session) await session.abortTransaction();
      return null;
    }

    if (recurring.endDate && recurring.nextRunDate > recurring.endDate) {
      recurring.status = 'completed';
      await recurring.save({ session });
      if (session) await session.commitTransaction();
      return null;
    }

    const occurrenceDate = new Date(recurring.nextRunDate);
    const existingTransaction = await Transaction.findOne({
      user: recurring.user,
      recurringTransaction: recurring._id,
      recurringRunDate: occurrenceDate,
    }).session(session);

    if (existingTransaction) {
      advanceRecurringRule(recurring, occurrenceDate);
      await recurring.save({ session });
      if (session) await session.commitTransaction();
      return existingTransaction;
    }

    const { transaction } = await createTransactionAndUpdateBalance({
      userId: recurring.user,
      accountId: recurring.account,
      title: recurring.title,
      description: recurring.description,
      amount: recurring.amount,
      type: recurring.type,
      category: recurring.category,
      date: occurrenceDate,
      recurringTransaction: recurring._id,
      recurringRunDate: occurrenceDate,
      requireSufficientFunds: true,
      session,
    });

    advanceRecurringRule(recurring, occurrenceDate);
    await recurring.save({ session });

    if (session) await session.commitTransaction();
    return transaction;
  } catch (error) {
    if (session?.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    if (session) await session.endSession();
  }
};

const processDueRecurringTransactions = async (now = new Date()) => {
  const dueTransactions = await RecurringTransaction.find({
    status: 'active',
    nextRunDate: { $lte: now },
  }).select('_id');

  const results = [];
  for (const recurring of dueTransactions) {
    try {
      const transaction = await runRecurringTransaction(recurring._id, now);
      if (transaction) results.push(transaction);
    } catch (error) {
      console.error(`Recurring transaction ${recurring._id} failed: ${error.message}`);
    }
  }

  return results;
};

module.exports = {
  calculateNextRunDate,
  runRecurringTransaction,
  processDueRecurringTransactions,
};
