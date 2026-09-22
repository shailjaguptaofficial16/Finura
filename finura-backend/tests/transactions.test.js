const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

describe('Transactions API Endpoints', () => {
  let token;
  let testUser;
  const testEmail = `qa_trx_${Date.now()}@finura.com`;

  beforeAll(async () => {
    // Register a test user and obtain a token
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'QA Trx User',
        email: testEmail,
        password: 'Password123!',
      });
    
    token = signupRes.body.token;
    testUser = signupRes.body.user;
  });

  afterAll(async () => {
    try {
      if (testUser) {
        await Transaction.deleteMany({ user: testUser._id });
        await Account.deleteMany({ user: testUser._id });
        await User.deleteOne({ _id: testUser._id });
      }
    } catch (e) {
      console.warn('Cleanup warning:', e);
    }
    await mongoose.connection.close();
  });

  // ────────────────────────────────────────────────────────────────────
  // POST /api/transactions
  // ────────────────────────────────────────────────────────────────────
  describe('POST /api/transactions', () => {
    it('should create a new transaction successfully when authenticated', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'QA Test Salary',
          amount: 5000,
          type: 'income',
          category: 'Salary',
          date: new Date(),
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body).toHaveProperty('title', 'QA Test Salary');
      expect(res.body).toHaveProperty('amount', 5000);
      expect(res.body).toHaveProperty('type', 'income');
      expect(res.body).toHaveProperty('category', 'Salary');
    });

    it('should block transaction creation with status 401 when token is missing', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({
          title: 'Unauthenticated Salary',
          amount: 5000,
          type: 'income',
          category: 'Salary',
        });

      expect(res.status).toBe(401);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // GET /api/transactions
  // ────────────────────────────────────────────────────────────────────
  describe('GET /api/transactions', () => {
    it('should fetch user transactions successfully when authenticated', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should prevent access and return 401 when token is invalid or missing', async () => {
      const res = await request(app)
        .get('/api/transactions');

      expect(res.status).toBe(401);
    });

    it('should filter transactions by type=income', async () => {
      const res = await request(app)
        .get('/api/transactions?type=income')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((tx) => {
        expect(tx.type).toBe('income');
      });
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // POST /api/transactions/transfer
  // ────────────────────────────────────────────────────────────────────
  describe('POST /api/transactions/transfer', () => {
    let fromAccountId;
    let toAccountId;
    let transferRef;

    beforeAll(async () => {
      // Explicitly create two test accounts for the transfer tests
      const acc1Res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'QA Transfer Source', type: 'Savings', balance: 10000, currency: 'INR' });

      const acc2Res = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'QA Transfer Dest', type: 'Savings', balance: 5000, currency: 'INR' });

      fromAccountId = (acc1Res.body?.data || acc1Res.body?.account)?._id;
      toAccountId = (acc2Res.body?.data || acc2Res.body?.account)?._id;

      expect(fromAccountId).toBeTruthy();
      expect(toAccountId).toBeTruthy();
    });

    it('should create a transfer between two accounts successfully', async () => {
      // Get balances before (look up by specific account IDs)
      const accBefore = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${token}`);
      const accountsBefore = accBefore.body?.data || accBefore.body?.accounts || [];
      const fromBefore = accountsBefore.find((a) => a._id === fromAccountId);
      const toBefore = accountsBefore.find((a) => a._id === toAccountId);

      expect(fromBefore).toBeTruthy();
      expect(toBefore).toBeTruthy();

      const balFromBefore = fromBefore.balance;
      const balToBefore = toBefore.balance;

      const res = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fromAccount: fromAccountId,
          toAccount: toAccountId,
          amount: 500,
          date: new Date().toISOString(),
          notes: 'QA Transfer Test',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('transferRef');
      expect(res.body).toHaveProperty('debit');
      expect(res.body).toHaveProperty('credit');
      expect(res.body.debit.amount).toBe(500);
      expect(res.body.credit.amount).toBe(500);
      expect(res.body.debit.type).toBe('transfer');
      expect(res.body.credit.type).toBe('transfer');
      expect(res.body.debit.category).toBe('Transfer');

      transferRef = res.body.transferRef;

      // Verify account balances changed correctly (delta = ±500)
      const accAfter = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${token}`);
      const accountsAfter = accAfter.body?.data || accAfter.body?.accounts || [];
      const fromAfter = accountsAfter.find((a) => a._id === fromAccountId);
      const toAfter = accountsAfter.find((a) => a._id === toAccountId);

      expect(fromAfter.balance).toBeCloseTo(balFromBefore - 500, 2);
      expect(toAfter.balance).toBeCloseTo(balToBefore + 500, 2);
    });

    it('should reject transfer when source and destination accounts are the same', async () => {
      const res = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fromAccount: fromAccountId,
          toAccount: fromAccountId,
          amount: 100,
        });

      expect(res.status).toBe(400);
    });

    it('should reject transfer with amount <= 0', async () => {
      const res = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fromAccount: fromAccountId,
          toAccount: toAccountId,
          amount: -50,
        });

      expect(res.status).toBe(400);
    });

    it('should reject transfer with invalid account IDs', async () => {
      const res = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fromAccount: 'invalid-id',
          toAccount: toAccountId,
          amount: 100,
        });

      expect(res.status).toBe(400);
    });

    it('should reject transfer when not authenticated', async () => {
      const res = await request(app)
        .post('/api/transactions/transfer')
        .send({
          fromAccount: fromAccountId,
          toAccount: toAccountId,
          amount: 100,
        });

      expect(res.status).toBe(401);
    });

    it('should reject transfer to a non-existent account', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fromAccount: fromAccountId,
          toAccount: fakeId,
          amount: 100,
        });

      expect(res.status).toBe(404);
    });

    it('should filter transactions by type=transfer', async () => {
      const res = await request(app)
        .get('/api/transactions?type=transfer')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      res.body.forEach((tx) => {
        expect(tx.type).toBe('transfer');
      });
    });

    describe('DELETE /api/transactions/:id (transfer reversal)', () => {
      it('should reverse both sides of a transfer on delete and restore balances', async () => {
        // Snapshot balances BEFORE the new transfer
        const accRes = await request(app)
          .get('/api/accounts')
          .set('Authorization', `Bearer ${token}`);
        const accounts = accRes.body?.data || accRes.body?.accounts || [];
        const srcBefore = accounts.find((a) => a._id === fromAccountId);
        const dstBefore = accounts.find((a) => a._id === toAccountId);

        const balSrcBefore = srcBefore.balance;
        const balDstBefore = dstBefore.balance;

        const createRes = await request(app)
          .post('/api/transactions/transfer')
          .set('Authorization', `Bearer ${token}`)
          .send({
            fromAccount: fromAccountId,
            toAccount: toAccountId,
            amount: 200,
            notes: 'QA Reversal Test',
          });

        expect(createRes.status).toBe(201);
        const debitId = createRes.body.debit._id;

        // Delete the debit side — should reverse BOTH sides atomically
        const deleteRes = await request(app)
          .delete(`/api/transactions/${debitId}`)
          .set('Authorization', `Bearer ${token}`);

        expect(deleteRes.status).toBe(200);
        expect(deleteRes.body.success).toBe(true);

        // Verify balances are fully restored to their pre-transfer values
        const accAfter = await request(app)
          .get('/api/accounts')
          .set('Authorization', `Bearer ${token}`);
        const accountsAfter = accAfter.body?.data || accAfter.body?.accounts || [];
        const srcAfter = accountsAfter.find((a) => a._id === fromAccountId);
        const dstAfter = accountsAfter.find((a) => a._id === toAccountId);

        expect(srcAfter.balance).toBeCloseTo(balSrcBefore, 2);
        expect(dstAfter.balance).toBeCloseTo(balDstBefore, 2);
      });
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // GET /api/transactions/summary (analytics correctness)
  // ────────────────────────────────────────────────────────────────────
  describe('GET /api/transactions/summary', () => {
    it('should return summary without transfers in income/expense totals', async () => {
      const res = await request(app)
        .get('/api/transactions/summary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalIncome');
      expect(res.body).toHaveProperty('totalExpenses');
      expect(res.body).toHaveProperty('totalBalance');
      expect(res.body).toHaveProperty('transferCount');
      // Transfer category should not appear in expense categories
      const hasTransferCategory = (res.body.categories || []).some(
        (cat) => cat.category === 'Transfer'
      );
      expect(hasTransferCategory).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // PUT /api/transactions/:id  (2D tests)
  // ────────────────────────────────────────────────────────────────────
  describe('PUT /api/transactions/:id', () => {
    let incomeId;
    let expenseId;
    let accountAId;
    let accountBId;

    beforeAll(async () => {
      const [accA, accB] = await Promise.all([
        request(app).post('/api/accounts').set('Authorization', `Bearer ${token}`)
          .send({ name: 'QA Update AccA', type: 'Savings', balance: 20000, currency: 'INR' }),
        request(app).post('/api/accounts').set('Authorization', `Bearer ${token}`)
          .send({ name: 'QA Update AccB', type: 'Checking', balance: 10000, currency: 'INR' }),
      ]);
      accountAId = (accA.body?.data || accA.body?.account)?._id;
      accountBId = (accB.body?.data || accB.body?.account)?._id;

      const [inc, exp] = await Promise.all([
        request(app).post('/api/transactions').set('Authorization', `Bearer ${token}`)
          .send({ title: 'QA Income', amount: 3000, type: 'income', category: 'Salary', accountId: accountAId }),
        request(app).post('/api/transactions').set('Authorization', `Bearer ${token}`)
          .send({ title: 'QA Expense', amount: 2000, type: 'expense', category: 'Food', accountId: accountAId }),
      ]);
      incomeId  = inc.body._id;
      expenseId = exp.body._id;
    });

    it('should update amount and apply correct balance delta', async () => {
      const accBefore = await request(app).get('/api/accounts').set('Authorization', `Bearer ${token}`);
      const aBefore = (accBefore.body?.data || accBefore.body?.accounts || []).find(a => a._id === accountAId);

      const res = await request(app).put(`/api/transactions/${incomeId}`)
        .set('Authorization', `Bearer ${token}`).send({ amount: 5000 });

      expect(res.status).toBe(200);
      expect(res.body.amount).toBe(5000);

      const accAfter = await request(app).get('/api/accounts').set('Authorization', `Bearer ${token}`);
      const aAfter = (accAfter.body?.data || accAfter.body?.accounts || []).find(a => a._id === accountAId);
      expect(aAfter.balance).toBeCloseTo(aBefore.balance + 2000, 2);
    });

    it('should flip income→expense and correct account balance', async () => {
      const accBefore = await request(app).get('/api/accounts').set('Authorization', `Bearer ${token}`);
      const aBefore = (accBefore.body?.data || accBefore.body?.accounts || []).find(a => a._id === accountAId);

      const res = await request(app).put(`/api/transactions/${incomeId}`)
        .set('Authorization', `Bearer ${token}`).send({ type: 'expense', category: 'Food' });

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('expense');

      const accAfter = await request(app).get('/api/accounts').set('Authorization', `Bearer ${token}`);
      const aAfter = (accAfter.body?.data || accAfter.body?.accounts || []).find(a => a._id === accountAId);
      // Was income +5000, now expense -5000 → net delta -10000
      expect(aAfter.balance).toBeCloseTo(aBefore.balance - 10000, 2);
    });

    it('should update category + title without touching balance', async () => {
      const accBefore = await request(app).get('/api/accounts').set('Authorization', `Bearer ${token}`);
      const aBefore = (accBefore.body?.data || accBefore.body?.accounts || []).find(a => a._id === accountAId);

      const res = await request(app).put(`/api/transactions/${expenseId}`)
        .set('Authorization', `Bearer ${token}`).send({ title: 'QA Updated', category: 'Transport' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('QA Updated');
      expect(res.body.category).toBe('Transport');

      const accAfter = await request(app).get('/api/accounts').set('Authorization', `Bearer ${token}`);
      const aAfter = (accAfter.body?.data || accAfter.body?.accounts || []).find(a => a._id === accountAId);
      expect(aAfter.balance).toBeCloseTo(aBefore.balance, 2);
    });

    it('should move transaction to a different account and correct both balances', async () => {
      const accsBefore = await request(app).get('/api/accounts').set('Authorization', `Bearer ${token}`);
      const allBefore = accsBefore.body?.data || accsBefore.body?.accounts || [];
      const aBefore = allBefore.find(a => a._id === accountAId);
      const bBefore = allBefore.find(a => a._id === accountBId);

      const res = await request(app).put(`/api/transactions/${expenseId}`)
        .set('Authorization', `Bearer ${token}`).send({ accountId: accountBId });

      expect(res.status).toBe(200);
      const newAccId = res.body.accountId?._id || res.body.accountId;
      expect(newAccId).toBe(accountBId);

      const accsAfter = await request(app).get('/api/accounts').set('Authorization', `Bearer ${token}`);
      const allAfter = accsAfter.body?.data || accsAfter.body?.accounts || [];
      const aAfter = allAfter.find(a => a._id === accountAId);
      const bAfter = allAfter.find(a => a._id === accountBId);
      expect(aAfter.balance).toBeCloseTo(aBefore.balance + 2000, 2);
      expect(bAfter.balance).toBeCloseTo(bBefore.balance - 2000, 2);
    });

    it('should edit a transfer amount and reconcile both account balances', async () => {
      const createRes = await request(app)
        .post('/api/transactions/transfer').set('Authorization', `Bearer ${token}`)
        .send({ fromAccount: accountAId, toAccount: accountBId, amount: 1000, notes: 'QA edit-xfer' });
      expect(createRes.status).toBe(201);
      const debitId = createRes.body.debit._id;

      const accsBefore = await request(app).get('/api/accounts').set('Authorization', `Bearer ${token}`);
      const allBefore = accsBefore.body?.data || accsBefore.body?.accounts || [];
      const aBefore = allBefore.find(a => a._id === accountAId);
      const bBefore = allBefore.find(a => a._id === accountBId);

      const res = await request(app).put(`/api/transactions/${debitId}`)
        .set('Authorization', `Bearer ${token}`).send({ amount: 600 });

      expect(res.status).toBe(200);
      const updatedAmt = res.body.transaction?.amount ?? res.body.amount;
      expect(updatedAmt).toBe(600);

      const accsAfter = await request(app).get('/api/accounts').set('Authorization', `Bearer ${token}`);
      const allAfter = accsAfter.body?.data || accsAfter.body?.accounts || [];
      const aAfter = allAfter.find(a => a._id === accountAId);
      const bAfter = allAfter.find(a => a._id === accountBId);
      // Old 1000→600: A gets back 400, B gives back 400
      expect(aAfter.balance).toBeCloseTo(aBefore.balance + 400, 2);
      expect(bAfter.balance).toBeCloseTo(bBefore.balance - 400, 2);
    });

    it('should return 400 for amount = 0', async () => {
      const res = await request(app).put(`/api/transactions/${expenseId}`)
        .set('Authorization', `Bearer ${token}`).send({ amount: 0 });
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid type value', async () => {
      const res = await request(app).put(`/api/transactions/${expenseId}`)
        .set('Authorization', `Bearer ${token}`).send({ type: 'transfer' });
      expect(res.status).toBe(400);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).put(`/api/transactions/${expenseId}`)
        .send({ amount: 999 });
      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent transaction ID', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).put(`/api/transactions/${fakeId}`)
        .set('Authorization', `Bearer ${token}`).send({ amount: 100 });
      expect(res.status).toBe(404);
    });

    it('should return 404 when moving to an account not owned by the user', async () => {
      const foreignAccId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).put(`/api/transactions/${expenseId}`)
        .set('Authorization', `Bearer ${token}`).send({ accountId: foreignAccId });
      expect(res.status).toBe(404);
    });
  });
});
