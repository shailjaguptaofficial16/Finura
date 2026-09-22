const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

describe('Atomic account transfers', () => {
  let userToken;
  let otherUserToken;
  let user;
  let otherUser;
  let sourceAccount;
  let destinationAccount;
  let otherAccount;

  beforeAll(async () => {
    const userSignup = await request(app).post('/api/auth/signup').send({
      name: 'Transfer User',
      email: `qa_transfer_${Date.now()}@finura.com`,
      password: 'Password123!',
    });
    userToken = userSignup.body.token;
    user = userSignup.body.user;

    const otherSignup = await request(app).post('/api/auth/signup').send({
      name: 'Other Transfer User',
      email: `qa_transfer_other_${Date.now()}@finura.com`,
      password: 'Password123!',
    });
    otherUserToken = otherSignup.body.token;
    otherUser = otherSignup.body.user;

    [sourceAccount, destinationAccount] = await Account.create([
      { user: user._id, name: 'Source', type: 'Savings', balance: 1000 },
      { user: user._id, name: 'Destination', type: 'Wallet', balance: 100 },
    ]);
    [otherAccount] = await Account.create([
      { user: otherUser._id, name: 'Other Source', type: 'Savings', balance: 1000 },
    ]);
  });

  afterAll(async () => {
    await Transaction.deleteMany({ user: { $in: [user?._id, otherUser?._id] } });
    await Account.deleteMany({ user: { $in: [user?._id, otherUser?._id] } });
    await User.deleteMany({ _id: { $in: [user?._id, otherUser?._id] } });
    await mongoose.connection.close();
  });

  it('creates an atomic transfer and updates both balances', async () => {
    const response = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        fromAccount: sourceAccount._id,
        toAccount: destinationAccount._id,
        amount: 250,
        notes: 'Move savings',
      });

    expect(response.status).toBe(201);
    expect(response.body.transaction.type).toBe('transfer');
    expect(response.body.fromAccountBalance).toBe(750);
    expect(response.body.toAccountBalance).toBe(350);
  });

  it('rejects a transfer when the source has insufficient funds', async () => {
    const response = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        fromAccount: sourceAccount._id,
        toAccount: destinationAccount._id,
        amount: 10000,
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/insufficient funds/i);
  });

  it('blocks access to another user account', async () => {
    const response = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        fromAccount: otherAccount._id,
        toAccount: destinationAccount._id,
        amount: 10,
      });

    expect(response.status).toBe(404);
  });
});