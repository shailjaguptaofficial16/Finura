const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');

describe('AI assistant API', () => {
  let token; let user;
  beforeAll(async () => { const signup = await request(app).post('/api/auth/signup').send({ name: 'AI User', email: `qa_ai_${Date.now()}@finura.com`, password: 'Password123!' }); token = signup.body.token; user = signup.body.user; });
  afterAll(async () => { await User.deleteOne({ _id: user?._id }); await mongoose.connection.close(); });
  it('requires auth and returns a safe contextual answer', async () => { expect((await request(app).post('/api/ai/assistant').send({ message: 'Summarize my finances' })).status).toBe(401); const response = await request(app).post('/api/ai/assistant').set('Authorization', `Bearer ${token}`).send({ message: 'Summarize my finances' }); expect(response.status).toBe(200); expect(response.body.data).toEqual(expect.objectContaining({ answer: expect.any(String), intent: expect.any(String), disclaimer: expect.stringContaining('general financial guidance') })); });
  it('rejects empty and mutation requests', async () => { const headers = { Authorization: `Bearer ${token}` }; expect((await request(app).post('/api/ai/assistant').set(headers).send({ message: '' })).status).toBe(400); const mutation = await request(app).post('/api/ai/assistant').set(headers).send({ message: 'Transfer money to my account' }); expect(mutation.status).toBe(400); expect(mutation.body.errorCode).toBe('AI_MUTATION_BLOCKED'); });
});
