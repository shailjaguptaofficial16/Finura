const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Goal = require('../models/Goal');

describe('Planning overview API', () => {
  let firstToken;
  let secondToken;
  let firstUser;
  let secondUser;

  beforeAll(async () => {
    const firstSignup = await request(app).post('/api/auth/signup').send({
      name: 'Planning First User',
      email: `qa_planning_first_${Date.now()}@finura.com`,
      password: 'Password123!',
    });
    const secondSignup = await request(app).post('/api/auth/signup').send({
      name: 'Planning Second User',
      email: `qa_planning_second_${Date.now()}@finura.com`,
      password: 'Password123!',
    });
    firstToken = firstSignup.body.token;
    secondToken = secondSignup.body.token;
    firstUser = firstSignup.body.user;
    secondUser = secondSignup.body.user;
  });

  afterAll(async () => {
    await Goal.deleteMany({ user: { $in: [firstUser?._id, secondUser?._id] } });
    await User.deleteMany({ _id: { $in: [firstUser?._id, secondUser?._id] } });
    await mongoose.connection.close();
  });

  it('requires authentication and returns a standardized error', async () => {
    const response = await request(app).get('/api/planning/overview');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ success: false });
  });

  it('returns a frontend-friendly empty overview for a new user', async () => {
    const response = await request(app)
      .get('/api/planning/overview')
      .set('Authorization', `Bearer ${firstToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(expect.objectContaining({
      goals: expect.any(Object),
      savings: expect.any(Object),
      emergencyFund: null,
      forecast: expect.any(Object),
      retirement: null,
      planningHealth: expect.objectContaining({
        overallStatus: expect.any(String),
        goalHealth: expect.any(Object),
        savingsHealth: expect.any(Object),
        emergencyHealth: expect.any(Object),
        forecastHealth: expect.any(Object),
        retirementHealth: expect.any(Object),
      }),
      recommendations: expect.any(Array),
    }));
  });

  it('does not expose another user\'s planning data', async () => {
    await Goal.create({ user: secondUser._id, title: 'Private Goal', targetAmount: 900000 });

    const response = await request(app)
      .get('/api/planning/overview')
      .set('Authorization', `Bearer ${firstToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.goals.total).toBe(0);
    expect(response.body.data.goals.totalTargetAmount).toBe(0);
  });
});