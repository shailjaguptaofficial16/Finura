const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Account = require('../models/Account');
const Investment = require('../models/Investment');
const InvestmentTransaction = require('../models/InvestmentTransaction');
const User = require('../models/User');

describe('Investment holding and transaction lifecycle', () => {
  let token;
  let otherToken;
  let user;
  let otherUser;
  let holding;
  let account;

  beforeAll(async () => {
    const first = await request(app).post('/api/auth/signup').send({ name: 'Investment Lifecycle', email: `qa_investment_lifecycle_${Date.now()}@finura.com`, password: 'Password123!' });
    const second = await request(app).post('/api/auth/signup').send({ name: 'Other Investment', email: `qa_investment_other_${Date.now()}@finura.com`, password: 'Password123!' });
    token = first.body.token;
    otherToken = second.body.token;
    user = first.body.user;
    otherUser = second.body.user;
    account = await Account.create({ user: user._id, name: 'Brokerage Cash', type: 'Savings', balance: 25000 });
  });

  afterAll(async () => {
    await Promise.all([
      InvestmentTransaction.deleteMany({ user: { $in: [user?._id, otherUser?._id] } }),
      Investment.deleteMany({ user: { $in: [user?._id, otherUser?._id] } }),
      Account.deleteMany({ user: { $in: [user?._id, otherUser?._id] } }),
      User.deleteMany({ _id: { $in: [user?._id, otherUser?._id] } }),
    ]);
    await mongoose.connection.close();
  });

  it('creates a holding with calculated values and preserves account balance', async () => {
    const response = await request(app).post('/api/investments').set('Authorization', `Bearer ${token}`).send({
      name: 'Alpha Stock', symbol: 'ALPHA', type: 'stock', quantity: 10, buyPrice: 100, currentPrice: 120,
    });
    expect(response.status).toBe(201);
    holding = response.body.data;
    expect(holding).toEqual(expect.objectContaining({ investedAmount: 1000, currentValue: 1200, profitLoss: 200 }));
    expect((await Account.findById(account._id)).balance).toBe(25000);
  });

  it('supports ownership-scoped holding CRUD and rejects invalid quantity', async () => {
    const invalid = await request(app).post('/api/investments').set('Authorization', `Bearer ${token}`).send({ name: 'Bad', type: 'stock', quantity: 0, buyPrice: 10 });
    expect(invalid.status).toBe(400);
    const forbidden = await request(app).get(`/api/investments/${holding._id}`).set('Authorization', `Bearer ${otherToken}`);
    expect(forbidden.status).toBe(404);
    const update = await request(app).put(`/api/investments/${holding._id}`).set('Authorization', `Bearer ${token}`).send({ currentPrice: 125 });
    expect(update.status).toBe(200);
    expect(update.body.data.currentValue).toBe(1250);
  });

  it('applies weighted-average buy and sell transactions without creating cashflow entries', async () => {
    const beforeBalance = (await Account.findById(account._id)).balance;
    const buy = await request(app).post('/api/investment-transactions/buy').set('Authorization', `Bearer ${token}`).send({ investmentId: holding._id, quantity: 5, price: 110, fees: 10 });
    expect(buy.status).toBe(201);
    expect(buy.body.data.holding.quantity).toBe(15);
    expect(buy.body.data.holding.buyPrice).toBe(104);

    const failedSell = await request(app).post('/api/investment-transactions/sell').set('Authorization', `Bearer ${token}`).send({ investmentId: holding._id, quantity: 20, price: 130 });
    expect(failedSell.status).toBe(400);
    expect((await Investment.findById(holding._id)).quantity).toBe(15);

    const sell = await request(app).post('/api/investment-transactions/sell').set('Authorization', `Bearer ${token}`).send({ investmentId: holding._id, quantity: 4, price: 130, fees: 5 });
    expect(sell.status).toBe(201);
    expect(sell.body.data.holding.quantity).toBe(11);
    expect(sell.body.data.holding.investedAmount).toBe(1144);
    expect((await Account.findById(account._id)).balance).toBe(beforeBalance);
    expect(await InvestmentTransaction.countDocuments({ user: user._id })).toBe(3);
  });

  it('returns portfolio and weighted-average performance with zero-safe values', async () => {
    const portfolio = await request(app).get('/api/investments/portfolio').set('Authorization', `Bearer ${token}`);
    expect(portfolio.body.data).toEqual(expect.objectContaining({ totalInvested: 1144, currentValue: 1375, unrealizedProfitLoss: 231, holdingsCount: 1 }));
    const performance = await request(app).get('/api/investments/performance').set('Authorization', `Bearer ${token}`);
    expect(performance.body.data).toEqual(expect.objectContaining({ realizedProfitLoss: 99, unrealizedProfitLoss: 231, totalProfitLoss: 330 }));
    expect(performance.body.data.breakdown.stocks).toEqual(expect.objectContaining({ realizedProfitLoss: 99, unrealizedProfitLoss: 231 }));
  });

  it('preserves transaction history when a holding is closed', async () => {
    const deleted = await request(app).delete(`/api/investments/${holding._id}`).set('Authorization', `Bearer ${token}`);
    expect(deleted.status).toBe(200);
    expect((await Investment.findById(holding._id)).status).toBe('closed');
    expect(await InvestmentTransaction.countDocuments({ user: user._id })).toBe(3);
  });
});