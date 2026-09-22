const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Account = require('../models/Account');
const CreditCard = require('../models/CreditCard');
const Loan = require('../models/Loan');
const CreditScore = require('../models/CreditScore');
const CreditApplication = require('../models/CreditApplication');
const Repayment = require('../models/Repayment');
const User = require('../models/User');

describe('Credit end-to-end workflow', () => {
  let token; let otherToken; let user; let otherUser; let account; let loan; let card;
  beforeAll(async () => {
    const first = await request(app).post('/api/auth/signup').send({ name: 'Credit E2E', email: `qa_credit_e2e_${Date.now()}@finura.com`, password: 'Password123!' });
    const second = await request(app).post('/api/auth/signup').send({ name: 'Other Credit E2E', email: `qa_credit_e2e_other_${Date.now()}@finura.com`, password: 'Password123!' });
    token = first.body.token; otherToken = second.body.token; user = first.body.user; otherUser = second.body.user;
    account = await Account.create({ user: user._id, name: 'Credit Account', type: 'Savings', balance: 100000 });
  });
  afterAll(async () => { await Promise.all([Repayment.deleteMany({ user: { $in: [user?._id, otherUser?._id] } }), CreditApplication.deleteMany({ user: { $in: [user?._id, otherUser?._id] } }), CreditScore.deleteMany({ user: { $in: [user?._id, otherUser?._id] } }), CreditCard.deleteMany({ user: { $in: [user?._id, otherUser?._id] } }), Loan.deleteMany({ user: { $in: [user?._id, otherUser?._id] } }), Account.deleteMany({ user: { $in: [user?._id, otherUser?._id] } }), User.deleteMany({ _id: { $in: [user?._id, otherUser?._id] } })]); await mongoose.connection.close(); });
  it('completes the credit flow and matches Wealth liabilities', async () => {
    const headers = { Authorization: `Bearer ${token}` };
    const cardResponse = await request(app).post('/api/credit/cards').set(headers).send({ account: account._id, name: 'Travel Card', issuer: 'Bank', lastFourDigits: '9876', creditLimit: 50000, outstandingBalance: 10000 });
    expect(cardResponse.status).toBe(201); card = cardResponse.body.data;
    const loanResponse = await request(app).post('/api/credit/loans').set(headers).send({ account: account._id, name: 'Personal Loan', lender: 'Bank', loanType: 'Personal', principalAmount: 120000, outstandingPrincipal: 100000, interestRate: 12, tenureMonths: 12, nextEMIDueDate: '2026-10-05' });
    expect(loanResponse.status).toBe(201); loan = loanResponse.body.data;
    expect(await request(app).post('/api/credit/score').set(headers).send({ score: 760, provider: 'CIBIL', scoreDate: '2026-09-01' })).toHaveProperty('status', 201);
    const application = await request(app).post('/api/credit/applications').set(headers).send({ applicationType: 'Loan', lender: 'Bank', productName: 'Personal Loan', requestedAmount: 100000, annualIncome: 900000, applicationDate: '2026-09-01' });
    expect(application.status).toBe(201);
    const status = await request(app).patch(`/api/credit/applications/${application.body.data._id}/status`).set(headers).send({ status: 'under_review' });
    expect(status.status).toBe(200);
    const schedule = await request(app).post(`/api/credit/loans/${loan._id}/amortization`).set(headers);
    expect(schedule.status).toBe(201); expect(schedule.body.data.length).toBe(12);
    const dashboard = await request(app).get('/api/credit/dashboard').set(headers);
    expect(dashboard.body.data.overview).toEqual(expect.objectContaining({ totalCreditLimit: 50000, totalOutstanding: 110000, activeCreditCards: 1, activeLoans: 1 }));
    const wealth = await request(app).get('/api/wealth/net-worth').set(headers);
    expect(wealth.body.data.totalLiabilities).toBe(110000);
    const foreign = await request(app).get(`/api/credit/cards/${card._id}`).set('Authorization', `Bearer ${otherToken}`);
    expect(foreign.status).toBe(404);
  });
  it('requires authentication for credit dashboard', async () => { expect((await request(app).get('/api/credit/dashboard')).status).toBe(401); });
});
