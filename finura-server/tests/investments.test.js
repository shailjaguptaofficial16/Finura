const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const User = require('../models/User');
const Investment = require('../models/Investment');

describe('Investments API Endpoints', () => {
  let token;
  let testUser;
  const testEmail = `qa_inv_${Date.now()}@finura.com`;

  beforeAll(async () => {
    // Register a test user and obtain a token
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'QA Inv User',
        email: testEmail,
        password: 'Password123!',
      });
    
    token = signupRes.body.token;
    testUser = signupRes.body.user;
  });

  afterAll(async () => {
    try {
      if (testUser) {
        await Investment.deleteMany({ user: testUser._id });
        await User.deleteOne({ _id: testUser._id });
      }
    } catch (e) {
      console.warn('Cleanup warning:', e);
    }
    await mongoose.connection.close();
  });

  describe('GET /api/investments with empty holdings', () => {
    it('should successfully fetch empty holdings without 500 server crash', async () => {
      const res = await request(app)
        .get('/api/investments')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // Validate that holdings is an empty array
      expect(res.body).toHaveProperty('holdings');
      expect(Array.isArray(res.body.holdings)).toBe(true);
      expect(res.body.holdings.length).toBe(0);
      
      // Validate that summary contains zero allocations
      expect(res.body).toHaveProperty('summary');
      expect(res.body.summary).toHaveProperty('totalPortfolioValue', 0);
      expect(res.body.summary).toHaveProperty('totalInvested', 0);
    });
  });
});
