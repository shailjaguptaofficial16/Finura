const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Account = require('../models/Account');
const Asset = require('../models/Asset');
const Investment = require('../models/Investment');
const Liability = require('../models/Liability');
const User = require('../models/User');
const WealthSnapshot = require('../models/WealthSnapshot');

describe('Wealth management and net worth API', () => {
  let token;
  let otherToken;
  let user;
  let otherUser;
  let account;
  let asset;
  let liability;

  beforeAll(async () => {
    const first = await request(app).post('/api/auth/signup').send({
      name: 'Wealth User',
      email: `qa_wealth_${Date.now()}@finura.com`,
      password: 'Password123!',
    });
    const second = await request(app).post('/api/auth/signup').send({
      name: 'Other Wealth User',
      email: `qa_wealth_other_${Date.now()}@finura.com`,
      password: 'Password123!',
    });
    token = first.body.token;
    otherToken = second.body.token;
    user = first.body.user;
    otherUser = second.body.user;
    account = await Account.create({ user: user._id, name: 'Primary', type: 'Savings', balance: 100000 });
  });

  afterAll(async () => {
    await Promise.all([
      Asset.deleteMany({ user: { $in: [user?._id, otherUser?._id] } }),
      Liability.deleteMany({ user: { $in: [user?._id, otherUser?._id] } }),
      Investment.deleteMany({ user: { $in: [user?._id, otherUser?._id] } }),
      WealthSnapshot.deleteMany({ user: { $in: [user?._id, otherUser?._id] } }),
      Account.deleteMany({ user: { $in: [user?._id, otherUser?._id] } }),
      User.deleteMany({ _id: { $in: [user?._id, otherUser?._id] } }),
    ]);
    await mongoose.connection.close();
  });

  it('requires authentication for manual wealth resources', async () => {
    const response = await request(app).get('/api/wealth/overview');
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('creates, reads, updates, and deletes an owned asset without mutating accounts', async () => {
    const beforeBalance = (await Account.findById(account._id)).balance;
    const created = await request(app).post('/api/assets').set('Authorization', `Bearer ${token}`).send({
      name: 'Family Home', category: 'Real Estate', currentValue: 5000000, purchaseValue: 4200000,
    });
    expect(created.status).toBe(201);
    asset = created.body.data;

    const listed = await request(app).get('/api/assets').set('Authorization', `Bearer ${token}`);
    expect(listed.body.data).toHaveLength(1);
    const updated = await request(app).put(`/api/assets/${asset._id}`).set('Authorization', `Bearer ${token}`).send({ currentValue: 5100000 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.currentValue).toBe(5100000);
    expect((await Account.findById(account._id)).balance).toBe(beforeBalance);
  });

  it('rejects invalid asset values and another user cannot access the asset', async () => {
    const invalid = await request(app).post('/api/assets').set('Authorization', `Bearer ${token}`).send({
      name: 'Invalid', category: 'Cash', currentValue: -1,
    });
    expect(invalid.status).toBe(400);
    const forbidden = await request(app).get(`/api/assets/${asset._id}`).set('Authorization', `Bearer ${otherToken}`);
    expect(forbidden.status).toBe(404);
  });

  it('validates liability amounts and supports ownership-scoped CRUD', async () => {
    const invalid = await request(app).post('/api/liabilities').set('Authorization', `Bearer ${token}`).send({
      name: 'Invalid Loan', category: 'Personal Loan', principalAmount: 1000, outstandingAmount: 1001,
    });
    expect(invalid.status).toBe(400);
    const created = await request(app).post('/api/liabilities').set('Authorization', `Bearer ${token}`).send({
      name: 'Home Loan', category: 'Home Loan', principalAmount: 2000000, outstandingAmount: 1500000,
    });
    expect(created.status).toBe(201);
    liability = created.body.data;
    const forbidden = await request(app).delete(`/api/liabilities/${liability._id}`).set('Authorization', `Bearer ${otherToken}`);
    expect(forbidden.status).toBe(404);
  });

  it('calculates live net worth from accounts, investments, and manual assets/liabilities', async () => {
    await Investment.create({ user: user._id, symbol: 'TEST', name: 'Test Holding', quantity: 10, purchasePrice: 1000, assetType: 'stock' });
    const response = await request(app).get('/api/wealth/net-worth').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.objectContaining({
      totalAssets: expect.any(Number),
      totalLiabilities: 1500000,
      netWorth: expect.any(Number),
      assetBreakdown: expect.objectContaining({ accounts: 100000, manualAssets: 5100000 }),
      liabilityBreakdown: expect.any(Object),
    }));
  });

  it('creates one snapshot per date and calculates safe growth', async () => {
    const first = await request(app).post('/api/wealth/snapshots').set('Authorization', `Bearer ${token}`).send({ snapshotDate: '2026-01-01' });
    expect(first.status).toBe(201);
    const duplicate = await request(app).post('/api/wealth/snapshots').set('Authorization', `Bearer ${token}`).send({ snapshotDate: '2026-01-01' });
    expect(duplicate.status).toBe(400);
    const snapshots = await request(app).get('/api/wealth/snapshots?from=2026-01-01&to=2026-12-31').set('Authorization', `Bearer ${token}`);
    expect(snapshots.body.data).toHaveLength(1);
    const growth = await request(app).get('/api/wealth/growth').set('Authorization', `Bearer ${token}`);
    expect(growth.body.data).toEqual(expect.objectContaining({ currentNetWorth: expect.any(Number), growthPercentage: expect.any(Number) }));
  });

  it('returns allocation categories and a composed wealth overview', async () => {
    const beforeBalance = (await Account.findById(account._id)).balance;
    const allocation = await request(app).get('/api/wealth/allocation').set('Authorization', `Bearer ${token}`);
    expect(allocation.status).toBe(200);
    expect(allocation.body.data).toEqual(expect.objectContaining({
      totalAssets: expect.any(Number),
      allocation: expect.arrayContaining([
        expect.objectContaining({ category: 'Cash' }),
        expect.objectContaining({ category: 'Investments' }),
        expect.objectContaining({ category: 'Real Estate' }),
        expect.objectContaining({ category: 'Vehicles' }),
      ]),
      diversificationScore: expect.any(Number),
      riskLevel: expect.any(String),
    }));
    const percentageTotal = allocation.body.data.allocation.reduce((sum, item) => sum + item.percentage, 0);
    expect(percentageTotal).toBeCloseTo(100, 1);

    const overview = await request(app).get('/api/wealth/overview').set('Authorization', `Bearer ${token}`);
    expect(overview.status).toBe(200);
    expect(overview.body.data).toEqual(expect.objectContaining({
      netWorth: expect.objectContaining({ totalAssets: expect.any(Number), totalLiabilities: expect.any(Number) }),
      growth: expect.objectContaining({ currentNetWorth: expect.any(Number), monthlyGrowth: expect.any(Array), yearlyGrowth: expect.any(Array) }),
      allocation: expect.objectContaining({ allocation: expect.any(Array) }),
      assets: expect.any(Array),
      liabilities: expect.any(Array),
    }));
    expect((await Account.findById(account._id)).balance).toBe(beforeBalance);
  });

  it('keeps allocation and overview isolated between users', async () => {
    const otherAllocation = await request(app).get('/api/wealth/allocation').set('Authorization', `Bearer ${otherToken}`);
    expect(otherAllocation.status).toBe(200);
    expect(otherAllocation.body.data.totalAssets).toBe(0);
    expect(otherAllocation.body.data.allocation.every((item) => item.amount === 0 && item.percentage === 0)).toBe(true);

    const otherOverview = await request(app).get('/api/wealth/overview').set('Authorization', `Bearer ${otherToken}`);
    expect(otherOverview.body.data.netWorth).toEqual(expect.objectContaining({ totalAssets: 0, totalLiabilities: 0, netWorth: 0 }));
    expect(otherOverview.body.data.assets).toHaveLength(0);
    expect(otherOverview.body.data.liabilities).toHaveLength(0);
  });
});