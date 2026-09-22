const mongoose = require('mongoose');
require('../server');
const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const RecurringTransaction = require('../models/RecurringTransaction');
const {
  calculateNextRunDate,
  runRecurringTransaction,
} = require('../utils/recurrenceEngine');

describe('Recurring transaction engine', () => {
  let user;
  let account;

  beforeAll(async () => {
    user = await User.create({
      name: 'Engine Test User',
      email: `qa_engine_${Date.now()}@finura.com`,
      password: 'Password123!',
    });
    account = await Account.create({
      user: user._id,
      name: 'Engine Account',
      type: 'Savings',
      balance: 50000,
    });
  });

  afterEach(async () => {
    await Transaction.deleteMany({ user: user._id });
    await RecurringTransaction.deleteMany({ user: user._id });
    await Account.updateOne({ _id: account._id }, { $set: { balance: 50000 } });
  });

  afterAll(async () => {
    await Account.deleteMany({ user: user._id });
    await User.deleteOne({ _id: user._id });
    await mongoose.connection.close();
  });

  it('calculates monthly and yearly dates', () => {
    expect(calculateNextRunDate('2026-09-01', 'monthly').toISOString().slice(0, 10)).toBe('2026-10-01');
    expect(calculateNextRunDate('2026-09-05', 'monthly').toISOString().slice(0, 10)).toBe('2026-10-05');
    expect(calculateNextRunDate('2026-09-01', 'yearly').toISOString().slice(0, 10)).toBe('2027-09-01');
  });

  it('creates one actual transaction and updates the account balance', async () => {
    const recurring = await RecurringTransaction.create({
      user: user._id,
      account: account._id,
      title: 'Salary',
      amount: 50000,
      type: 'income',
      category: 'Salary',
      frequency: 'monthly',
      startDate: new Date('2026-09-01'),
      nextRunDate: new Date('2026-10-01'),
    });

    const generated = await runRecurringTransaction(recurring._id, new Date('2026-10-01T12:00:00Z'));
    expect(generated).not.toBeNull();
    expect(await Transaction.countDocuments({ recurringTransaction: recurring._id })).toBe(1);
    expect((await Account.findById(account._id)).balance).toBe(100000);
    expect((await RecurringTransaction.findById(recurring._id)).nextRunDate.toISOString().slice(0, 10)).toBe('2026-11-01');
  });

  it('does not duplicate an already generated scheduled occurrence', async () => {
    const recurring = await RecurringTransaction.create({
      user: user._id,
      account: account._id,
      title: 'Salary',
      amount: 50000,
      type: 'income',
      category: 'Salary',
      frequency: 'monthly',
      startDate: new Date('2026-09-01'),
      nextRunDate: new Date('2026-10-01'),
    });

    await runRecurringTransaction(recurring._id, new Date('2026-10-01T12:00:00Z'));
    await RecurringTransaction.updateOne({ _id: recurring._id }, { $set: { nextRunDate: new Date('2026-10-01') } });
    await runRecurringTransaction(recurring._id, new Date('2026-10-01T12:00:00Z'));

    expect(await Transaction.countDocuments({ recurringTransaction: recurring._id })).toBe(1);
    expect((await Account.findById(account._id)).balance).toBe(100000);
  });

  it('does not generate while paused and resumes future generation', async () => {
    const recurring = await RecurringTransaction.create({
      user: user._id,
      account: account._id,
      title: 'Rent',
      amount: 20000,
      type: 'expense',
      category: 'Housing',
      frequency: 'monthly',
      startDate: new Date('2026-09-01'),
      nextRunDate: new Date('2026-10-01'),
      status: 'paused',
    });

    expect(await runRecurringTransaction(recurring._id, new Date('2026-10-01'))).toBeNull();
    expect(await Transaction.countDocuments({ recurringTransaction: recurring._id })).toBe(0);

    await RecurringTransaction.updateOne({ _id: recurring._id }, { $set: { status: 'active' } });
    expect(await runRecurringTransaction(recurring._id, new Date('2026-10-01'))).not.toBeNull();
    expect((await Account.findById(account._id)).balance).toBe(30000);
  });

  it('stops future generation after the recurring rule is deleted', async () => {
    const recurring = await RecurringTransaction.create({
      user: user._id,
      account: account._id,
      title: 'Internet',
      amount: 999,
      type: 'expense',
      category: 'Utilities',
      frequency: 'monthly',
      startDate: new Date('2026-09-01'),
      nextRunDate: new Date('2026-10-01'),
    });

    await recurring.deleteOne();
    expect(await runRecurringTransaction(recurring._id, new Date('2026-10-01'))).toBeNull();
    expect(await Transaction.countDocuments({ recurringTransaction: recurring._id })).toBe(0);
  });
});
