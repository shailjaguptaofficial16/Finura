const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Account = require('../models/Account');
const CreditCard = require('../models/CreditCard');
const Loan = require('../models/Loan');
const CreditScore = require('../models/CreditScore');
const User = require('../models/User');

describe('Credit management and overview API', () => {
  let token; let otherToken; let user; let otherUser; let account; let card; let loan;
  beforeAll(async () => {
    const first = await request(app).post('/api/auth/signup').send({ name: 'Credit User', email: `qa_credit_${Date.now()}@finura.com`, password: 'Password123!' });
    const second = await request(app).post('/api/auth/signup').send({ name: 'Other Credit User', email: `qa_credit_other_${Date.now()}@finura.com`, password: 'Password123!' });
    token = first.body.token; otherToken = second.body.token; user = first.body.user; otherUser = second.body.user;
    account = await Account.create({ user: user._id, name: 'Credit Account', type: 'Savings', balance: 10000 });
  });
  afterAll(async () => {
    await Promise.all([CreditCard.deleteMany({ user: { $in: [user?._id, otherUser?._id] } }), Loan.deleteMany({ user: { $in: [user?._id, otherUser?._id] } }), CreditScore.deleteMany({ user: { $in: [user?._id, otherUser?._id] } }), Account.deleteMany({ user: { $in: [user?._id, otherUser?._id] } }), User.deleteMany({ _id: { $in: [user?._id, otherUser?._id] } })]);
    await mongoose.connection.close();
  });

  it('returns a zero-safe empty credit overview', async () => {
    const response = await request(app).get('/api/credit/overview').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.objectContaining({ totalCreditLimit: 0, totalOutstanding: 0, availableCredit: 0, creditUtilization: 0, activeCreditCards: 0, activeLoans: 0, totalMonthlyEMI: 0, latestCreditScore: null, nextEMIDue: null }));
  });

  it('creates a card, loan, and score with derived overview metrics', async () => {
    const createdCard = await request(app).post('/api/credit/cards').set('Authorization', `Bearer ${token}`).send({ account: account._id, name: 'Finura Card', issuer: 'Finura Bank', lastFourDigits: '1234', creditLimit: 100000, outstandingBalance: 25000, minimumDue: 1000 });
    expect(createdCard.status).toBe(201); card = createdCard.body.data;
    expect(card.availableCredit).toBe(75000);
    const createdLoan = await request(app).post('/api/credit/loans').set('Authorization', `Bearer ${token}`).send({ account: account._id, name: 'Personal Loan', lender: 'Finura Bank', loanType: 'Personal', principalAmount: 120000, outstandingPrincipal: 100000, interestRate: 12, tenureMonths: 12, nextEMIDueDate: '2026-10-05' });
    expect(createdLoan.status).toBe(201); loan = createdLoan.body.data;
    expect(createdLoan.body.data.emiAmount).toBeGreaterThan(0);
    const score = await request(app).post('/api/credit/score').set('Authorization', `Bearer ${token}`).send({ score: 780, provider: 'CIBIL', scoreDate: '2026-09-01', previousScore: 760 });
    expect(score.status).toBe(201); expect(score.body.data).toEqual(expect.objectContaining({ category: 'Very Good', change: 20 }));
    const overview = await request(app).get('/api/credit/overview').set('Authorization', `Bearer ${token}`);
    expect(overview.body.data).toEqual(expect.objectContaining({ totalCreditLimit: 100000, totalOutstanding: 125000, availableCredit: 75000, creditUtilization: 25, activeCreditCards: 1, activeLoans: 1, latestCreditScore: expect.objectContaining({ score: 780 }), nextEMIDue: expect.any(String) }));
  });

  it('enforces account ownership, card validation, and cross-user isolation', async () => {
    const foreignAccount = await Account.create({ user: otherUser._id, name: 'Foreign', type: 'Savings', balance: 1 });
    const forbidden = await request(app).post('/api/credit/cards').set('Authorization', `Bearer ${token}`).send({ account: foreignAccount._id, name: 'Bad', issuer: 'Bank', lastFourDigits: '5555', creditLimit: 1000, outstandingBalance: 0 });
    expect(forbidden.status).toBe(403);
    const invalid = await request(app).post('/api/credit/cards').set('Authorization', `Bearer ${token}`).send({ name: 'Over', issuer: 'Bank', lastFourDigits: '5555', creditLimit: 1000, outstandingBalance: 1001 });
    expect(invalid.status).toBe(400);
    const foreignRead = await request(app).get(`/api/credit/cards/${card._id}`).set('Authorization', `Bearer ${otherToken}`);
    expect(foreignRead.status).toBe(404);
    const otherOverview = await request(app).get('/api/credit/overview').set('Authorization', `Bearer ${otherToken}`);
    expect(otherOverview.body.data.totalOutstanding).toBe(0);
    await foreignAccount.deleteOne();
  });
});