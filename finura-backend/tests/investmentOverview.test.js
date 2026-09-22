const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Account = require('../models/Account');
const Investment = require('../models/Investment');
const SIP = require('../models/SIP');
const InvestmentTransaction = require('../models/InvestmentTransaction');
const User = require('../models/User');

describe('Mutual funds, SIPs, market data, and investment overview', () => {
  let token;
  let otherToken;
  let user;
  let otherUser;
  let fund;
  let account;

  beforeAll(async () => {
    const first = await request(app).post('/api/auth/signup').send({ name: 'Fund User', email: `qa_fund_${Date.now()}@finura.com`, password: 'Password123!' });
    const second = await request(app).post('/api/auth/signup').send({ name: 'Other Fund User', email: `qa_fund_other_${Date.now()}@finura.com`, password: 'Password123!' });
    token = first.body.token; otherToken = second.body.token; user = first.body.user; otherUser = second.body.user;
    account = await Account.create({ user: user._id, name: 'Fund Cash', type: 'Savings', balance: 50000 });
  });
  afterAll(async () => {
    await Promise.all([
      SIP.deleteMany({ user: { $in: [user?._id, otherUser?._id] } }),
      InvestmentTransaction.deleteMany({ user: { $in: [user?._id, otherUser?._id] } }),
      Investment.deleteMany({ user: { $in: [user?._id, otherUser?._id] } }),
      Account.deleteMany({ user: { $in: [user?._id, otherUser?._id] } }),
      User.deleteMany({ _id: { $in: [user?._id, otherUser?._id] } }),
    ]);
    await mongoose.connection.close();
  });

  it('requires authentication for the unified investment overview', async () => {
    const response = await request(app).get('/api/investments/overview');
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('creates and values a mutual fund holding', async () => {
    const response = await request(app).post('/api/mutual-funds').set('Authorization', `Bearer ${token}`).send({
      name: 'Finura Growth Fund', fundHouse: 'Finura AMC', category: 'Equity', schemeCode: 'FIN001', folioNumber: 'F-1', units: 100, averageNav: 20, currentNav: 24, platform: 'Direct',
    });
    expect(response.status).toBe(201);
    fund = response.body.data;
    expect(fund).toEqual(expect.objectContaining({ type: 'mutual_fund', investedAmount: 2000, currentValue: 2400, profitLoss: 400 }));
  });

  it('creates, pauses, resumes, and cancels SIP without account debit', async () => {
    const beforeBalance = (await Account.findById(account._id)).balance;
    const created = await request(app).post('/api/sips').set('Authorization', `Bearer ${token}`).send({ mutualFund: fund._id, amount: 1000, frequency: 'monthly', startDate: '2026-09-11', autoDebit: true });
    expect(created.status).toBe(201);
    expect(created.body.data.nextDueDate).toBeTruthy();
    const paused = await request(app).patch(`/api/sips/${created.body.data._id}/pause`).set('Authorization', `Bearer ${token}`);
    expect(paused.body.data.status).toBe('paused');
    const resumed = await request(app).patch(`/api/sips/${created.body.data._id}/resume`).set('Authorization', `Bearer ${token}`);
    expect(resumed.body.data.status).toBe('active');
    const cancelled = await request(app).patch(`/api/sips/${created.body.data._id}/cancel`).set('Authorization', `Bearer ${token}`);
    expect(cancelled.body.data.status).toBe('cancelled');
    expect((await Account.findById(account._id)).balance).toBe(beforeBalance);
  });

  it('returns mock market quotes and a complete isolated overview', async () => {
    const quote = await request(app).get('/api/market/stocks/INFY/quote').set('Authorization', `Bearer ${token}`);
    expect(quote.status).toBe(200);
    expect(quote.body.data).toEqual(expect.objectContaining({ symbol: 'INFY', dataType: 'delayed', provider: 'mock' }));
    const overview = await request(app).get('/api/investments/overview').set('Authorization', `Bearer ${token}`);
    expect(overview.status).toBe(200);
    expect(overview.body.data).toEqual(expect.objectContaining({
      portfolio: expect.objectContaining({ holdingsCount: 1, currentValue: 2400 }),
      performance: expect.any(Object), allocation: expect.any(Array), holdings: expect.any(Array), mutualFunds: expect.any(Array),
      sips: expect.objectContaining({ active: 0, cancelled: 1 }), marketStatus: expect.objectContaining({ isAvailable: true }),
    }));
    const other = await request(app).get('/api/investments/overview').set('Authorization', `Bearer ${otherToken}`);
    expect(other.body.data.portfolio.holdingsCount).toBe(0);
    expect(other.body.data.mutualFunds).toHaveLength(0);
  });
});