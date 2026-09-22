const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Account = require('../models/Account');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

describe('Budgets API', () => {
  let token;
  let otherToken;
  let user;
  let otherUser;
  let account;
  let budget;

  beforeAll(async () => {
    const signup = await request(app).post('/api/auth/signup').send({ name: 'Budget User', email: `qa_budget_${Date.now()}@finura.com`, password: 'Password123!' });
    token = signup.body.token;
    user = signup.body.user;
    const otherSignup = await request(app).post('/api/auth/signup').send({ name: 'Other Budget User', email: `qa_budget_other_${Date.now()}@finura.com`, password: 'Password123!' });
    otherToken = otherSignup.body.token;
    otherUser = otherSignup.body.user;
    account = await Account.create({ user: user._id, name: 'Budget Account', type: 'Savings', balance: 10000 });
  });

  afterAll(async () => {
    await Transaction.deleteMany({ user: { $in: [user?._id, otherUser?._id] } });
    await Budget.deleteMany({ user: { $in: [user?._id, otherUser?._id] } });
    await Account.deleteMany({ user: { $in: [user?._id, otherUser?._id] } });
    await User.deleteMany({ _id: { $in: [user?._id, otherUser?._id] } });
    await mongoose.connection.close();
  });

  it('creates and lists an own budget with expense-only actual spending', async () => {
    const create = await request(app).post('/api/budgets').set('Authorization', `Bearer ${token}`).send({ category: 'Food', amount: 6000, period: 'monthly', startDate: '2026-09-01', endDate: '2026-09-30' });
    expect(create.status).toBe(201);
    budget = create.body;

    await Transaction.create([
      { user: user._id, accountId: account._id, title: 'Food 1', amount: 2000, type: 'expense', category: 'Food', date: new Date('2026-09-05') },
      { user: user._id, accountId: account._id, title: 'Food 2', amount: 1000, type: 'expense', category: 'Food', date: new Date('2026-09-10') },
      { user: user._id, accountId: account._id, title: 'Salary', amount: 50000, type: 'income', category: 'Food', date: new Date('2026-09-12') },
      { user: user._id, accountId: account._id, title: 'Transfer', amount: 500, type: 'transfer', category: 'Food', date: new Date('2026-09-12') },
      { user: user._id, accountId: account._id, title: 'Outside', amount: 900, type: 'expense', category: 'Food', date: new Date('2026-10-01') },
      { user: user._id, accountId: account._id, title: 'Shopping', amount: 700, type: 'expense', category: 'Shopping', date: new Date('2026-09-12') },
    ]);

    const list = await request(app).get('/api/budgets').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].spent).toBe(3000);
    expect(list.body[0].remaining).toBe(3000);
    expect(list.body[0].usage).toBe(50);
    expect(list.body[0].budgetStatus).toBe('normal');
  });

  it('accepts canonical category names and rejects invalid dates or amount values', async () => {
    const validHousingBudget = await request(app).post('/api/budgets').set('Authorization', `Bearer ${token}`).send({
      category: 'Housing',
      amount: 4001,
      period: 'monthly',
      startDate: '2026-09-17',
      endDate: '2026-10-14',
    });
    expect(validHousingBudget.status).toBe(201);
    expect(validHousingBudget.body.category).toBe('Housing');

    const invalidCategory = await request(app).post('/api/budgets').set('Authorization', `Bearer ${token}`).send({
      category: 'Housing & Rent',
      amount: 1000,
      period: 'monthly',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    });
    expect(invalidCategory.status).toBe(400);
    expect(invalidCategory.body.message).toBe('Invalid budget category');

    const invalidAmount = await request(app).post('/api/budgets').set('Authorization', `Bearer ${token}`).send({
      category: 'Food',
      amount: 0,
      period: 'monthly',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    });
    expect(invalidAmount.status).toBe(400);
    expect(invalidAmount.body.message).toBe('Budget amount must be greater than 0');

    const invalidDates = await request(app).post('/api/budgets').set('Authorization', `Bearer ${token}`).send({
      category: 'Food',
      amount: 1000,
      period: 'monthly',
      startDate: '2026-09-30',
      endDate: '2026-09-01',
    });
    expect(invalidDates.status).toBe(400);
    expect(invalidDates.body.message).toBe('endDate cannot be before startDate');
  });

  it('updates and deletes an own budget', async () => {
    const update = await request(app).put(`/api/budgets/${budget._id}`).set('Authorization', `Bearer ${token}`).send({ amount: 3500 });
    expect(update.status).toBe(200);
    expect(update.body.amount).toBe(3500);
    expect(update.body.budgetStatus).toBe('warning');

    const remove = await request(app).delete(`/api/budgets/${budget._id}`).set('Authorization', `Bearer ${token}`);
    expect(remove.status).toBe(200);
    expect(await Budget.findById(budget._id)).toBeNull();
  });

  it('blocks another user from reading or editing the budget', async () => {
    const ownBudget = await Budget.create({ user: user._id, category: 'Bills', amount: 2500, period: 'monthly', startDate: new Date('2026-09-01'), endDate: new Date('2026-09-30') });
    const read = await request(app).get(`/api/budgets/${ownBudget._id}`).set('Authorization', `Bearer ${otherToken}`);
    const update = await request(app).put(`/api/budgets/${ownBudget._id}`).set('Authorization', `Bearer ${otherToken}`).send({ amount: 1 });
    expect(read.status).toBe(404);
    expect(update.status).toBe(404);
  });
});
