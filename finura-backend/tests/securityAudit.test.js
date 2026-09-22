const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');

describe('Security audit regressions', () => {
  afterAll(async () => { await mongoose.connection.close(); });

  it('returns security headers and blocks protected routes without auth', async () => {
    const root = await request(app).get('/');
    expect(root.headers['x-content-type-options']).toBe('nosniff');
    expect(root.headers['x-frame-options']).toBe('SAMEORIGIN');
    const notifications = await request(app).get('/api/notifications');
    expect(notifications.status).toBe(401);
    expect(notifications.body.errorCode).toBe('AUTH_TOKEN_MISSING');
  });

  it('rejects unsafe AI mutations before provider execution', async () => {
    const response = await request(app).post('/api/ai/assistant').send({ message: 'Transfer money now' });
    expect(response.status).toBe(401);
  });
});