const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const InvestmentTransaction = require('../models/InvestmentTransaction');
const User = require('../models/User');

describe('Analytics API', () => {
  let token;
  let otherToken;
  let user;
  let otherUser;
  let account;

  beforeAll(async () => {
    const first = await request(app).post('/api/auth/signup').send({ name: 'Analytics User', email: `qa_analytics_${Date.now()}@finura.com`, password: 'Password123!' });
    const second = await request(app).post('/api/auth/signup').send({ name: 'Other Analytics User', email: `qa_analytics_other_${Date.now()}@finura.com`, password: 'Password123!' });
    token = first.body.token; otherToken = second.body.token; user = first.body.user; otherUser = second.body.user;
    account = await Account.create({ user: user._id, name: 'Analytics Account', type: 'Savings', balance: 37000 });
    await Transaction.create([
      { user: user._id, accountId: account._id, title: 'Salary', amount: 50000, type: 'income', category: 'Salary', date: new Date('2026-09-05') },
      { user: user._id, accountId: account._id, title: 'Freelance', amount: 10000, type: 'income', category: 'Freelance', date: new Date('2026-09-06') },
      { user: user._id, accountId: account._id, title: 'Food', amount: 5000, type: 'expense', category: 'Food', date: new Date('2026-09-07') },
      { user: user._id, accountId: account._id, title: 'Rent', amount: 15000, type: 'expense', category: 'Rent', date: new Date('2026-09-08') },
      { user: user._id, accountId: account._id, title: 'Transfer', amount: 10000, type: 'transfer', category: 'Transfer', date: new Date('2026-09-08') },
      { user: user._id, accountId: account._id, title: 'Investment Buy', amount: 8000, type: 'investment', category: 'Investment', date: new Date('2026-09-09') },
    ]);
  });

  afterAll(async () => {
    await InvestmentTransaction.deleteMany({ user: { $in: [user?._id, otherUser?._id] } });
    await Transaction.deleteMany({ user: { $in: [user?._id, otherUser?._id] } });
    await Account.deleteMany({ user: { $in: [user?._id, otherUser?._id] } });
    await User.deleteMany({ _id: { $in: [user?._id, otherUser?._id] } });
    await mongoose.connection.close();
  });

  it('requires authentication and returns a standard empty response for a new user', async () => {
    const unauthorized = await request(app).get('/api/analytics/overview');
    expect(unauthorized.status).toBe(401);
    const empty = await request(app).get('/api/analytics/overview').set('Authorization', `Bearer ${otherToken}`);
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual(expect.objectContaining({ success: true, data: expect.objectContaining({ summary: expect.objectContaining({ totalIncome: 0, totalExpense: 0, netCashFlow: 0 }), breakdown: [], metadata: expect.objectContaining({ hasData: false }) }) }));
    const emptyExpenses = await request(app).get('/api/analytics/expenses').set('Authorization', `Bearer ${otherToken}`);
    expect(emptyExpenses.body.data).toEqual(expect.objectContaining({ summary: expect.objectContaining({ totalExpense: 0, recurringExpense: 0, oneTimeExpense: 0, expenseGrowthPercentage: null }), categories: [], monthlyTrend: [], largestExpense: null }));
    const emptyCashFlow = await request(app).get('/api/analytics/cash-flow').set('Authorization', `Bearer ${otherToken}`);
    expect(emptyCashFlow.body.data).toEqual(expect.objectContaining({ summary: expect.objectContaining({ totalInflow: 0, totalOutflow: 0, netCashFlow: 0, consistencyPercentage: 0 }), largestInflow: null, largestOutflow: null, monthlyTrend: [] }));
  });

  it('calculates income, expenses, cash flow, categories, and trends without double-counting', async () => {
    const headers = { Authorization: `Bearer ${token}` };
    const income = await request(app).get('/api/analytics/income?startDate=2026-09-01&endDate=2026-09-10').set(headers);
    expect(income.body.data.summary).toEqual(expect.objectContaining({ totalIncome: 60000, incomeTransactionCount: 2 }));
    expect(income.body.data.sources).toHaveLength(2);

    const expense = await request(app).get('/api/analytics/expenses?startDate=2026-09-01&endDate=2026-09-10').set(headers);
    expect(expense.body.data.summary).toEqual(expect.objectContaining({ totalExpense: 20000, expenseTransactionCount: 2, recurringExpense: 0, oneTimeExpense: 20000, expenseGrowthPercentage: null }));
    expect(expense.body.data.largestExpense).toEqual(expect.objectContaining({ amount: 15000, category: 'Rent', date: '2026-09-08', description: 'Rent' }));
    expect(expense.body.data.categories).toEqual(expect.arrayContaining([expect.objectContaining({ category: 'Rent', amount: 15000, percentage: 75, transactionCount: 1 })]));
    expect(expense.body.data.monthlyTrend).toEqual([expect.objectContaining({ month: '2026-09', totalExpense: 20000, transactionCount: 2 })]);

    const overview = await request(app).get('/api/analytics/overview?startDate=2026-09-01&endDate=2026-09-10').set(headers);
    expect(overview.body.data.summary).toEqual(expect.objectContaining({ totalIncome: 60000, totalExpense: 20000, netCashFlow: 40000 }));
    expect(overview.body.data.metadata).toEqual(expect.objectContaining({ currency: 'INR', hasData: true }));

    const categories = await request(app).get('/api/analytics/categories?startDate=2026-09-01&endDate=2026-09-10').set(headers);
    expect(categories.body.data.summary).toEqual(expect.objectContaining({ totalAmount: 20000, topCategory: 'Rent', lowestCategory: 'Food' }));
    expect(categories.body.data.breakdown).toEqual(expect.arrayContaining([expect.objectContaining({ category: 'Food', totalAmount: 5000, percentage: 25, averageTransaction: 5000 })]));
    expect(categories.body.data.monthlyTrend.find((item) => item.category === 'Food').monthlyTrend[0]).toEqual(expect.objectContaining({ month: '2026-09', amount: 5000, transactionCount: 1 }));
    const incomeCategories = await request(app).get('/api/analytics/categories?type=income&limit=1&startDate=2026-09-01&endDate=2026-09-10').set(headers);
    expect(incomeCategories.body.data.categories).toHaveLength(1);
    expect(incomeCategories.body.data.categories[0]).toEqual(expect.objectContaining({ category: 'Salary', totalAmount: 50000, percentage: 83.33 }));
    const invalidLimit = await request(app).get('/api/analytics/categories?limit=0').set(headers);
    expect(invalidLimit.status).toBe(400);

    await Transaction.create({ user: user._id, accountId: account._id, title: 'Previous Food', amount: 1000, type: 'expense', category: 'Food', date: new Date('2026-08-25') });
    const growthCategories = await request(app).get('/api/analytics/categories?startDate=2026-09-01&endDate=2026-09-10').set(headers);
    expect(growthCategories.body.data.monthlyTrend.find((item) => item.category === 'Food').growthPercentage).toBe(400);

    const trends = await request(app).get('/api/analytics/trends?startDate=2026-09-01&endDate=2026-09-10').set(headers);
    expect(trends.body.data.monthly[0]).toEqual(expect.objectContaining({ month: '2026-09', income: 60000, expenses: 20000, savings: 40000, cashFlow: 40000 }));
    expect(trends.body.data.comparison.income).toEqual(expect.objectContaining({ current: 60000, previous: 0, change: 100, status: 'increasing' }));
  });

  it('validates dates and account ownership without mutating transactions', async () => {
    const invalid = await request(app).get('/api/analytics/overview?startDate=2026-09-12&endDate=2026-09-01').set('Authorization', `Bearer ${token}`);
    expect(invalid.status).toBe(400);
    expect(invalid.body.errorCode).toBe('FUTURE_DATE');
    const foreignAccount = await Account.create({ user: otherUser._id, name: 'Other', type: 'Savings', balance: 1 });
    const forbidden = await request(app).get(`/api/analytics/income?accountId=${foreignAccount._id}`).set('Authorization', `Bearer ${token}`);
    expect(forbidden.status).toBe(403);
    expect(await Transaction.countDocuments({ user: user._id })).toBe(7);
    await foreignAccount.deleteOne();
    const excessiveRange = await request(app).get('/api/analytics/overview?startDate=2024-01-01&endDate=2026-01-01').set('Authorization', `Bearer ${token}`);
    expect(excessiveRange.status).toBe(400);
    expect(excessiveRange.body.errorCode).toBe('DATE_RANGE_TOO_LARGE');
  });

  it('separates recurring expenses from one-time expenses', async () => {
    await Transaction.create({ user: user._id, accountId: account._id, title: 'Recurring utility', amount: 2000, type: 'expense', category: 'Bills', recurringTransaction: new mongoose.Types.ObjectId(), date: new Date('2026-09-10') });
    const response = await request(app).get('/api/analytics/expenses?startDate=2026-09-01&endDate=2026-09-10').set('Authorization', `Bearer ${token}`);
    expect(response.body.data.summary).toEqual(expect.objectContaining({ totalExpense: 22000, recurringExpense: 2000, oneTimeExpense: 20000 }));
  });

  it('compares the latest two months and identifies best and worst cash-flow months', async () => {
    await Transaction.create([
      { user: user._id, accountId: account._id, title: 'Previous Salary', amount: 50000, type: 'income', category: 'Salary', date: new Date('2026-08-05') },
      { user: user._id, accountId: account._id, title: 'Previous Rent', amount: 20000, type: 'expense', category: 'Rent', date: new Date('2026-08-06') },
    ]);
    const response = await request(app).get('/api/analytics/trends?startDate=2026-08-01&endDate=2026-09-10').set('Authorization', `Bearer ${token}`);
    expect(response.body.data.comparison.income).toEqual(expect.objectContaining({ current: 60000, previous: 50000, change: 20, status: 'increasing' }));
    expect(response.body.data.comparison.expenses).toEqual(expect.objectContaining({ current: 22000, previous: 21000, change: 4.76, status: 'increasing' }));
    expect(response.body.data.summary.bestMonth).toBe('2026-09');
    expect(response.body.data.summary.worstMonth).toBe('2026-08');
  });

  it('calculates actual cash flow separately from accounting analytics', async () => {
    await InvestmentTransaction.create({ user: user._id, investment: new mongoose.Types.ObjectId(), type: 'sell', quantity: 1, price: 12000, totalAmount: 12000, fees: 0, transactionDate: new Date('2026-09-10') });
    const beforeCount = await Transaction.countDocuments({ user: user._id });
    const response = await request(app).get('/api/analytics/cash-flow?startDate=2026-09-01&endDate=2026-09-10').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.data.summary).toEqual(expect.objectContaining({ totalInflow: 72000, totalOutflow: 30000, netCashFlow: 42000, positiveMonths: 1, negativeMonths: 0, neutralMonths: 0, consistencyPercentage: 100 }));
    expect(response.body.data.largestInflow).toEqual(expect.objectContaining({ amount: 50000, category: 'Salary' }));
    expect(response.body.data.largestOutflow).toEqual(expect.objectContaining({ amount: 15000, category: 'Rent' }));
    expect(response.body.data.monthlyTrend[0]).toEqual(expect.objectContaining({ inflow: 72000, outflow: 30000, netCashFlow: 42000, status: 'positive' }));
    expect(await Transaction.countDocuments({ user: user._id })).toBe(beforeCount);
  });
});