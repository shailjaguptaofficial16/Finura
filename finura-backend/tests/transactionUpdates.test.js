const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

describe('Atomic transaction updates', () => {
  let token;
  let otherToken;
  let user;
  let otherUser;
  let source;
  let destination;
  let thirdAccount;
  let otherAccount;

  beforeAll(async () => {
    const signup = await request(app).post('/api/auth/signup').send({
      name: 'Update User',
      email: `qa_update_${Date.now()}@finura.com`,
      password: 'Password123!',
    });
    token = signup.body.token;
    user = signup.body.user;

    const otherSignup = await request(app).post('/api/auth/signup').send({
      name: 'Other Update User',
      email: `qa_update_other_${Date.now()}@finura.com`,
      password: 'Password123!',
    });
    otherToken = otherSignup.body.token;
    otherUser = otherSignup.body.user;

    [source, destination, thirdAccount] = await Account.create([
      { user: user._id, name: 'Source', type: 'Savings', balance: 1000 },
      { user: user._id, name: 'Destination', type: 'Wallet', balance: 500 },
      { user: user._id, name: 'Third', type: 'Cash', balance: 100 },
    ]);
    [otherAccount] = await Account.create([
      { user: otherUser._id, name: 'Other', type: 'Savings', balance: 1000 },
    ]);
  });

  afterAll(async () => {
    await Transaction.deleteMany({ user: { $in: [user?._id, otherUser?._id] } });
    await Account.deleteMany({ user: { $in: [user?._id, otherUser?._id] } });
    await User.deleteMany({ _id: { $in: [user?._id, otherUser?._id] } });
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Transaction.deleteMany({ user: user._id });
    await Account.updateOne({ _id: source._id }, { $set: { balance: 1000 } });
    await Account.updateOne({ _id: destination._id }, { $set: { balance: 500 } });
    await Account.updateOne({ _id: thirdAccount._id }, { $set: { balance: 100 } });
  });

  it('changes amount and preserves the correct balance effect', async () => {
    const createRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Expense',
        amount: 100,
        type: 'expense',
        category: 'Food',
        accountId: source._id,
      });

    expect(createRes.status).toBe(201);

    const response = await request(app)
      .put(`/api/transactions/${createRes.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 250 });

    expect(response.status).toBe(200);
    const updatedAccount = await Account.findById(source._id);
    expect(updatedAccount.balance).toBe(750);
  });

  it('moves a transaction between owned accounts', async () => {
    const createRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Income',
        amount: 100,
        type: 'income',
        category: 'Salary',
        accountId: source._id,
      });

    expect(createRes.status).toBe(201);

    const response = await request(app)
      .put(`/api/transactions/${createRes.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ accountId: destination._id });

    expect(response.status).toBe(200);
    expect((await Account.findById(source._id)).balance).toBe(1000);
    expect((await Account.findById(destination._id)).balance).toBe(600);
  });

  it('supports income to expense and expense to income changes', async () => {
    const createRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Cashflow',
        amount: 50,
        type: 'income',
        category: 'Other Income',
        accountId: thirdAccount._id,
      });

    expect(createRes.status).toBe(201);

    const toExpense = await request(app)
      .put(`/api/transactions/${createRes.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'expense' });
    expect(toExpense.status).toBe(200);

    const toIncome = await request(app)
      .put(`/api/transactions/${createRes.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'income' });
    expect(toIncome.status).toBe(200);
  });

  it('edits both sides of a transfer atomically', async () => {
    const transferRes = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fromAccount: source._id,
        toAccount: destination._id,
        amount: 100,
        notes: 'Test transfer',
      });

    expect(transferRes.status).toBe(201);
    const debitId = transferRes.body.debit._id;

    const response = await request(app)
      .put(`/api/transactions/${debitId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fromAccount: destination._id, toAccount: thirdAccount._id, amount: 75 });

    expect(response.status).toBe(200);
    const pair = await Transaction.find({ transferRef: transferRes.body.transferRef });
    expect(pair.every((item) => item.amount === 75)).toBe(true);
    expect((await Account.findById(destination._id)).balance).toBe(425);
    expect((await Account.findById(thirdAccount._id)).balance).toBe(175);
  });

  it('rejects insufficient funds without changing balances', async () => {
    const createRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Large Expense',
        amount: 10,
        type: 'expense',
        category: 'Other',
        accountId: thirdAccount._id,
      });

    expect(createRes.status).toBe(201);
    const before = (await Account.findById(thirdAccount._id)).balance;

    const response = await request(app)
      .put(`/api/transactions/${createRes.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 10000 });

    expect(response.status).toBe(400);
    expect((await Account.findById(thirdAccount._id)).balance).toBe(before);
    expect((await Transaction.findById(createRes.body._id)).amount).toBe(10);
  });

  it('blocks an unauthorized transaction update', async () => {
    const transaction = await Transaction.create({
      user: user._id,
      accountId: source._id,
      title: 'Private Expense',
      amount: 10,
      type: 'expense',
      category: 'Other',
    });

    const response = await request(app)
      .put(`/api/transactions/${transaction._id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ amount: 20 });

    expect(response.status).toBe(404);
  });

  it('blocks an unauthorized replacement account', async () => {
    const transaction = await Transaction.create({
      user: user._id,
      accountId: source._id,
      title: 'Account Check',
      amount: 10,
      type: 'expense',
      category: 'Other',
    });

    const response = await request(app)
      .put(`/api/transactions/${transaction._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ accountId: otherAccount._id });

    expect(response.status).toBe(404);
  });
});
