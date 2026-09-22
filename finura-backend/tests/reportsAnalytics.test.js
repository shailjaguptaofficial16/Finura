const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

describe('Reports analytics and exports', () => {
  let token;
  let otherToken;
  let user;
  let otherUser;
  let account;

  beforeAll(async () => {
    const first = await request(app).post('/api/auth/signup').send({ name: 'Reports User', email: `qa_reports_${Date.now()}@finura.com`, password: 'Password123!' });
    const second = await request(app).post('/api/auth/signup').send({ name: 'Other Reports User', email: `qa_reports_other_${Date.now()}@finura.com`, password: 'Password123!' });
    token = first.body.token; otherToken = second.body.token; user = first.body.user; otherUser = second.body.user;
    account = await Account.create({ user: user._id, name: 'Reports Account', type: 'Savings', balance: 37000 });
    await Transaction.create([
      { user: user._id, accountId: account._id, title: 'Salary', amount: 60000, type: 'income', category: 'Salary', date: new Date('2026-09-05') },
      { user: user._id, accountId: account._id, title: 'Rent', amount: 15000, type: 'expense', category: 'Rent', date: new Date('2026-09-06') },
      { user: user._id, accountId: account._id, title: 'Food', amount: 8000, type: 'expense', category: 'Food', date: new Date('2026-09-07') },
      { user: user._id, accountId: account._id, title: 'Transfer', amount: 10000, type: 'transfer', category: 'Transfer', date: new Date('2026-09-08') },
    ]);
  });

  afterAll(async () => {
    await Transaction.deleteMany({ user: { $in: [user?._id, otherUser?._id] } });
    await Account.deleteMany({ user: { $in: [user?._id, otherUser?._id] } });
    await User.deleteMany({ _id: { $in: [user?._id, otherUser?._id] } });
    await mongoose.connection.close();
  });

  it('requires auth and returns a zero-safe empty report', async () => {
    expect((await request(app).get('/api/analytics/reports')).status).toBe(401);
    const response = await request(app).get('/api/analytics/reports').set('Authorization', `Bearer ${otherToken}`);
    expect(response.body.data).toEqual(expect.objectContaining({ summary: { totalIncome: 0, totalExpenses: 0, totalSavings: 0, netCashFlow: 0 }, income: [], expenses: [], categories: [], accounts: [], planning: [] }));
  });

  it('composes every supported report type with consistent totals', async () => {
    const types = ['monthly-summary', 'income-expense', 'cash-flow', 'category-breakdown', 'account-summary', 'planning-summary', 'investment-summary'];
    for (const reportType of types) {
      const response = await request(app).get(`/api/analytics/reports?reportType=${reportType}&startDate=2026-09-01&endDate=2026-09-10`).set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.summary).toEqual(expect.objectContaining({ totalIncome: 60000, totalExpenses: 23000, totalSavings: 37000, netCashFlow: 37000 }));
      expect(response.body.data.period).toEqual({ startDate: '2026-09-01', endDate: '2026-09-10' });
    }
  });

  it('validates report types and exports JSON, CSV, and PDF safely', async () => {
    const invalidReport = await request(app).get('/api/analytics/reports?reportType=invalid').set('Authorization', `Bearer ${token}`);
    expect(invalidReport.status).toBe(400);
    expect(invalidReport.body.errorCode).toBe('INVALID_REPORT_TYPE');
    const invalidFormat = await request(app).get('/api/analytics/export?reportType=monthly-summary&format=xml').set('Authorization', `Bearer ${token}`);
    expect(invalidFormat.status).toBe(400);
    expect(invalidFormat.body.errorCode).toBe('INVALID_EXPORT_FORMAT');
    const json = await request(app).get('/api/analytics/export?reportType=monthly-summary&format=json').set('Authorization', `Bearer ${token}`);
    expect(json.status).toBe(200);
    expect(json.body.data).toEqual(expect.objectContaining({ reportType: 'monthly-summary', summary: expect.any(Object), rows: expect.any(Array) }));
    const csv = await request(app).get('/api/analytics/export?reportType=monthly-summary&format=csv').set('Authorization', `Bearer ${token}`);
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.headers['content-disposition']).toMatch(/finura-monthly-summary-/);
    expect(csv.text).toMatch(/month/);
    const pdf = await request(app).get('/api/analytics/export?reportType=income-expense&format=pdf').set('Authorization', `Bearer ${token}`);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toMatch(/application\/pdf/);
    expect(pdf.body.slice(0, 5).toString()).toBe('%PDF-');
  });

  it('rejects another user account filters and does not mutate financial records', async () => {
    const before = await Transaction.countDocuments({ user: user._id });
    const foreign = await Account.create({ user: otherUser._id, name: 'Foreign', type: 'Savings', balance: 1 });
    const response = await request(app).get(`/api/analytics/reports?accountId=${foreign._id}`).set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(403);
    expect(await Transaction.countDocuments({ user: user._id })).toBe(before);
    await foreign.deleteOne();
  });
});