const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

describe('Multi-Account & Atomic Balance Sync API Endpoints', () => {
  let token;
  let testUser;
  let testAccount;
  const testEmail = `qa_acc_${Date.now()}@finura.com`;

  beforeAll(async () => {
    // 1. Register a test user and obtain a token
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'QA Account User',
        email: testEmail,
        password: 'Password123!',
      });

    token = signupRes.body.token;
    testUser = signupRes.body.user;
  });

  afterAll(async () => {
    try {
      if (testUser) {
        await Transaction.deleteMany({ user: testUser._id });
        await Account.deleteMany({ user: testUser._id });
        await User.deleteOne({ _id: testUser._id });
      }
    } catch (e) {
      console.warn('Cleanup warning:', e);
    }
    await mongoose.connection.close();
  });

  describe('Account Management CRUD (GET, POST, PUT, DELETE /api/accounts)', () => {
    it('should create a new account successfully with initial balance', async () => {
      const res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'HDFC Savings QA',
          type: 'Savings',
          balance: 10000,
          currency: 'INR',
          accountNumberLast4: '4821',
          color: '#00f2fe',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.name).toBe('HDFC Savings QA');
      expect(res.body.data.balance).toBe(10000);
      expect(res.body.data.type).toBe('Savings');
      testAccount = res.body.data;
    });

    it('should fetch user accounts with total aggregated balance', async () => {
      const res = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.totalBalance).toBeGreaterThanOrEqual(10000);
    });

    it('should update account details successfully', async () => {
      const res = await request(app)
        .put(`/api/accounts/${testAccount._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'HDFC Salary Premium QA',
          color: '#10b981',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('HDFC Salary Premium QA');
      expect(res.body.data.color).toBe('#10b981');
    });
  });

  describe('Atomic Transaction ↔ Account Balance Sync', () => {
    let incomeTxId;
    let expenseTxId;

    it('should credit account balance when an income transaction is added', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Consulting Income',
          amount: 2500,
          type: 'income',
          category: 'Salary',
          accountId: testAccount._id,
        });

      expect(res.status).toBe(201);
      incomeTxId = res.body._id;

      // Verify account balance increased: 10000 + 2500 = 12500
      const accRes = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${token}`);

      const updatedAcc = accRes.body.data.find((a) => a._id === testAccount._id);
      expect(updatedAcc.balance).toBe(12500);
    });

    it('should debit account balance when an expense transaction is added', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Grocery Store Bill',
          amount: 1500,
          type: 'expense',
          category: 'Food',
          accountId: testAccount._id,
        });

      expect(res.status).toBe(201);
      expenseTxId = res.body._id;

      // Verify account balance decreased: 12500 - 1500 = 11000
      const accRes = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${token}`);

      const updatedAcc = accRes.body.data.find((a) => a._id === testAccount._id);
      expect(updatedAcc.balance).toBe(11000);
    });

    it('should reverse account balance debit when expense transaction is deleted', async () => {
      const res = await request(app)
        .delete(`/api/transactions/${expenseTxId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      // Verify account balance was credited back: 11000 + 1500 = 12500
      const accRes = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${token}`);

      const updatedAcc = accRes.body.data.find((a) => a._id === testAccount._id);
      expect(updatedAcc.balance).toBe(12500);
    });

    it('should adjust account balance delta when transaction is updated', async () => {
      // Update income transaction from 2500 to 3500 (+1000 delta)
      const res = await request(app)
        .put(`/api/transactions/${incomeTxId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 3500,
        });

      expect(res.status).toBe(200);

      // Verify account balance updated: 12500 + 1000 = 13500
      const accRes = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${token}`);

      const updatedAcc = accRes.body.data.find((a) => a._id === testAccount._id);
      expect(updatedAcc.balance).toBe(13500);
    });

    it('should soft-delete account when requested', async () => {
      const res = await request(app)
        .delete(`/api/accounts/${testAccount._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const accRes = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${token}`);

      const found = accRes.body.data.find((a) => a._id === testAccount._id);
      expect(found).toBeUndefined();
    });
  });
});
