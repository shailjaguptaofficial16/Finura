const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const RecurringTransaction = require('../models/RecurringTransaction');

describe('Recurring transaction management', () => {
  let token;
  let otherToken;
  let user;
  let otherUser;
  let account;
  let otherAccount;
  let rule;

  beforeAll(async () => {
    const signup = await request(app).post('/api/auth/signup').send({
      name: 'Recurring Test User',
      email: `qa_recurring_${Date.now()}@finura.com`,
      password: 'Password123!',
    });
    token = signup.body.token;
    user = signup.body.user;

    const otherSignup = await request(app).post('/api/auth/signup').send({
      name: 'Other Recurring User',
      email: `qa_recurring_other_${Date.now()}@finura.com`,
      password: 'Password123!',
    });
    otherToken = otherSignup.body.token;
    otherUser = otherSignup.body.user;

    account = await Account.create({
      user: user._id,
      name: 'HDFC Bank',
      type: 'Savings',
      balance: 100000,
    });
    otherAccount = await Account.create({
      user: otherUser._id,
      name: 'Other Bank',
      type: 'Savings',
      balance: 100000,
    });
  });

  afterAll(async () => {
    await Transaction.deleteMany({ user: { $in: [user?._id, otherUser?._id] } });
    await RecurringTransaction.deleteMany({ user: { $in: [user?._id, otherUser?._id] } });
    await Account.deleteMany({ user: { $in: [user?._id, otherUser?._id] } });
    await User.deleteMany({ _id: { $in: [user?._id, otherUser?._id] } });
    await mongoose.connection.close();
  });

  it('creates a monthly recurring salary rule', async () => {
    const response = await request(app)
      .post('/api/recurring')
      .set('Authorization', `Bearer ${token}`)
      .send({
        account: account._id,
        title: 'Salary',
        amount: 50000,
        type: 'income',
        category: 'Salary',
        frequency: 'monthly',
        startDate: '2026-09-01',
        nextRunDate: '2026-10-01',
      });

    expect(response.status).toBe(201);
    expect(response.body.title).toBe('Salary');
    expect(response.body.status).toBe('active');
    rule = response.body;
  });

  it('pauses and resumes a recurring rule', async () => {
    const paused = await request(app)
      .post(`/api/recurring/${rule._id}/pause`)
      .set('Authorization', `Bearer ${token}`);
    expect(paused.status).toBe(200);
    expect(paused.body.status).toBe('paused');

    const resumed = await request(app)
      .post(`/api/recurring/${rule._id}/resume`)
      .set('Authorization', `Bearer ${token}`);
    expect(resumed.status).toBe(200);
    expect(resumed.body.status).toBe('active');
  });

  it('rejects another user from editing the rule', async () => {
    const response = await request(app)
      .put(`/api/recurring/${rule._id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ amount: 1 });

    expect(response.status).toBe(404);
  });

  it('rejects another user account reference', async () => {
    const response = await request(app)
      .put(`/api/recurring/${rule._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ account: otherAccount._id });

    expect(response.status).toBe(404);
  });

  it('deletes the rule without deleting historical transactions', async () => {
    const historical = await Transaction.create({
      user: user._id,
      accountId: account._id,
      title: 'Salary',
      amount: 50000,
      type: 'income',
      category: 'Salary',
      recurringTransaction: rule._id,
      recurringRunDate: new Date('2026-09-01'),
    });

    const response = await request(app)
      .delete(`/api/recurring/${rule._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(await RecurringTransaction.findById(rule._id)).toBeNull();
    expect(await Transaction.findById(historical._id)).not.toBeNull();
  });
});
