const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const User = require('../models/User');

describe('Auth API Endpoints', () => {
  let testEmail = `qa_${Date.now()}@finura.com`;

  // Clean up created database records and close connection
  afterAll(async () => {
    try {
      await User.deleteMany({ email: /qa_.*@finura.com/ });
    } catch (e) {
      console.warn('Cleanup warning:', e);
    }
    await mongoose.connection.close();
  });

  describe('POST /api/auth/signup', () => {
    it('should register a new user successfully and return a token', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'QA Test User',
          email: testEmail,
          password: 'Password123!',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('name', 'QA Test User');
      expect(res.body.user).toHaveProperty('email', testEmail);
    });

    it('should deny registration if email already exists', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'QA Test User Duplicate',
          email: testEmail,
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate user and return a JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('email', testEmail);
    });

    it('should deny login with invalid password (401 status)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('message');
    });
  });
});
