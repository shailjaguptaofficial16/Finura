const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Goal = require('../models/Goal');

describe('Financial goals API', () => {
  let token;
  let otherToken;
  let user;
  let otherUser;
  let goal;

  beforeAll(async () => {
    const signup = await request(app).post('/api/auth/signup').send({ name: 'Goal User', email: `qa_goal_${Date.now()}@finura.com`, password: 'Password123!' });
    token = signup.body.token;
    user = signup.body.user;
    const otherSignup = await request(app).post('/api/auth/signup').send({ name: 'Other Goal User', email: `qa_goal_other_${Date.now()}@finura.com`, password: 'Password123!' });
    otherToken = otherSignup.body.token;
    otherUser = otherSignup.body.user;
  });

  afterAll(async () => {
    await Goal.deleteMany({ user: { $in: [user?._id, otherUser?._id] } });
    await User.deleteMany({ _id: { $in: [user?._id, otherUser?._id] } });
    await mongoose.connection.close();
  });

  it('creates a goal and returns progress metadata', async () => {
    const response = await request(app).post('/api/goals').set('Authorization', `Bearer ${token}`).send({
      title: 'New Laptop', targetAmount: 80000, currentAmount: 50000, targetDate: '2026-12-31', category: 'Education', priority: 'high',
    });
    expect(response.status).toBe(201);
    expect(response.body.currentAmount).toBe(50000);
    expect(response.body.progress).toBe(62.5);
    expect(response.body.remaining).toBe(30000);
    expect(response.body.progressPercentage).toBe(62.5);
    expect(response.body.remainingAmount).toBe(30000);
    expect(response.body.daysRemaining).toEqual(expect.any(Number));
    expect(response.body.requiredMonthlySaving).toBeGreaterThan(0);
    expect(response.body.requiredWeeklySaving).toBeGreaterThan(0);
    expect(['on-track', 'behind']).toContain(response.body.progressStatus);
    expect(response.body.status).toBe('active');
    goal = response.body;
  });

  it('adds a contribution without changing account balances', async () => {
    const response = await request(app).put(`/api/goals/${goal._id}/add-funds`).set('Authorization', `Bearer ${token}`).send({ amount: 10000 });
    expect(response.status).toBe(200);
    expect(response.body.currentAmount).toBe(60000);
    expect(response.body.progress).toBe(75);
  });

  it('supports an ownership-scoped single-goal read and completion handling', async () => {
    const read = await request(app)
      .get(`/api/goals/${goal._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(read.status).toBe(200);
    expect(read.body.remaining).toBe(20000);

    const complete = await request(app)
      .put(`/api/goals/${goal._id}/add-funds`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 20000 });
    expect(complete.status).toBe(200);
    expect(complete.body.progress).toBe(100);
    expect(complete.body.remaining).toBe(0);
    expect(complete.body.status).toBe('completed');

    const unauthorized = await request(app)
      .get(`/api/goals/${goal._id}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(unauthorized.status).toBe(404);
  });

  it('updates and deletes only an owned goal', async () => {
    const update = await request(app).put(`/api/goals/${goal._id}`).set('Authorization', `Bearer ${token}`).send({ title: 'Updated Laptop', priority: 'medium' });
    expect(update.status).toBe(200);
    expect(update.body.title).toBe('Updated Laptop');

    const unauthorized = await request(app).put(`/api/goals/${goal._id}`).set('Authorization', `Bearer ${otherToken}`).send({ title: 'Nope' });
    expect(unauthorized.status).toBe(404);

    const remove = await request(app).delete(`/api/goals/${goal._id}`).set('Authorization', `Bearer ${token}`);
    expect(remove.status).toBe(200);
    expect(await Goal.findById(goal._id)).toBeNull();
  });
});
