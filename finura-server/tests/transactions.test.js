const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

describe('Transactions API Endpoints', () => {
  let token;
  let testUser;
  const testEmail = `qa_trx_${Date.now()}@finura.com`;

  beforeAll(async () => {
    // Register a test user and obtain a token
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'QA Trx User',
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
        await User.deleteOne({ _id: testUser._id });
      }
    } catch (e) {
      console.warn('Cleanup warning:', e);
    }
    await mongoose.connection.close();
  });

  describe('POST /api/transactions', () => {
    it('should create a new transaction successfully when authenticated', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'QA Test Salary',
          amount: 5000,
          type: 'income',
          category: 'Salary',
          date: new Date(),
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('title', 'QA Test Salary');
      expect(res.body).toHaveProperty('amount', 5000);
      expect(res.body).toHaveProperty('type', 'income');
      expect(res.body).toHaveProperty('category', 'Salary');
    });

    it('should block transaction creation with status 401 when token is missing', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({
          title: 'Unauthenticated Salary',
          amount: 5000,
          type: 'income',
          category: 'Salary',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/transactions', () => {
    it('should fetch user transactions successfully when authenticated', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('title', 'QA Test Salary');
    });

    it('should prevent access and return 401 when token is invalid or missing', async () => {
      const res = await request(app)
        .get('/api/transactions');

      expect(res.status).toBe(401);
    });
  });
});
