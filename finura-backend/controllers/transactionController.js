const mongoose = require('mongoose');
const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const { supportsMongoTransactions } = require('../utils/mongoTransactions');
const { createTransactionAndUpdateBalance } = require('../services/transactionService');

// ─────────────────────────────────────────────
// @desc    Add a new transaction (Income, Expense, or Investment)
//          Atomically synchronizes linked Account balance
// @route   POST /api/transactions
// @access  Private
// ─────────────────────────────────────────────
const addTransaction = async (req, res, next) => {
  try {
    const { title, description, amount, type, category, date, accountId } = req.body;
    const rawUserId = req.user._id || req.user.id;
    const userId = new mongoose.Types.ObjectId(rawUserId);

    if (amount === undefined || amount === null || !type || !category) {
      return res.status(400).json({
        message: 'Please provide amount, type (income/expense/investment), and category',
      });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        message: 'Amount must be a positive number greater than 0',
      });
    }

    const normalizedType = String(type).toLowerCase().trim();
    if (!['income', 'expense', 'investment'].includes(normalizedType)) {
      return res.status(400).json({
        message: "Transaction type must be 'income', 'expense', or 'investment'",
      });
    }

    // 1. Resolve Target Account (with fallback to user's default/first account)
    let targetAccount;
    if (accountId) {
      if (!mongoose.Types.ObjectId.isValid(accountId)) {
        return res.status(400).json({ message: 'Invalid Account ID provided' });
      }
      targetAccount = await Account.findOne({ _id: accountId, user: userId, isActive: true });
      if (!targetAccount) {
        return res.status(404).json({ message: 'Selected Account not found or inactive' });
      }
    } else {
      // Auto-link to default or first active account
      targetAccount = await Account.findOne({ user: userId, isDefault: true, isActive: true });
      if (!targetAccount) {
        targetAccount = await Account.findOne({ user: userId, isActive: true });
      }
      // If user has no account at all, auto-provision primary starter account
      if (!targetAccount) {
        targetAccount = await Account.create({
          user: userId,
          name: 'Primary Savings',
          type: 'Savings',
          balance: 0,
          currency: 'INR',
          color: '#00f2fe',
          isDefault: true,
          isActive: true,
        });
      }
    }

    // The shared Step 2B service updates the balance and creates the ledger event.
    const finalTitle = (
      title ||
      description ||
      `${category} ${normalizedType === 'income' ? 'Income' : 'Expense'}`
    ).trim();
    const finalDescription = (description || title || finalTitle).trim();

    const { transaction } = await createTransactionAndUpdateBalance({
      userId,
      accountId: targetAccount._id,
      title: finalTitle,
      description: finalDescription,
      amount: numericAmount,
      type: normalizedType,
      category: category.trim(),
      date: date ? new Date(date) : new Date(),
    });

    const populatedTransaction = await Transaction.findById(transaction._id).populate(
      'accountId',
      'name type color accountNumberLast4'
    );

    return res.status(201).json(populatedTransaction || transaction);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Create an account-to-account transfer
//          Atomically debits source and credits destination
// @route   POST /api/transactions/transfer
// @access  Private
// ─────────────────────────────────────────────
const createTransfer = async (req, res, next) => {
  const session = await mongoose.startSession();
  let usedSession = true;

  try {
    const { fromAccount, toAccount, amount, date, notes } = req.body;
    const rawUserId = req.user._id || req.user.id;
    const userId = new mongoose.Types.ObjectId(rawUserId);

    const numericAmount = Number(amount);

    // Validate both accounts belong to the user and are active
    const [sourceAccount, destAccount] = await Promise.all([
      Account.findOne({ _id: fromAccount, user: userId, isActive: true }),
      Account.findOne({ _id: toAccount, user: userId, isActive: true }),
    ]);

    if (!sourceAccount) {
      return res.status(404).json({ message: 'Source account not found or inactive' });
    }
    if (!destAccount) {
      return res.status(404).json({ message: 'Destination account not found or inactive' });
    }
    if (sourceAccount.currency !== destAccount.currency) {
      return res.status(400).json({ message: 'Transfers between different currencies are not supported' });
    }

    // Generate a shared reference ID to link both transaction records
    const transferRef = crypto.randomUUID();
    const transferDate = date ? new Date(date) : new Date();
    const notesText = (notes || '').trim();
    const transferTitle = notesText || `Transfer to ${destAccount.name}`;
    const transferTitleCredit = notesText || `Transfer from ${sourceAccount.name}`;

    let debitTx, creditTx;

    try {
      await session.withTransaction(async () => {
        // Use atomic findOneAndUpdate with $inc to avoid double-apply on retry
        await Account.findOneAndUpdate(
          { _id: sourceAccount._id, user: userId },
          { $inc: { balance: -numericAmount } },
          { session, new: true }
        );
        await Account.findOneAndUpdate(
          { _id: destAccount._id, user: userId },
          { $inc: { balance: numericAmount } },
          { session, new: true }
        );

        // Create debit transaction (what leaves the source account)
        const [debit] = await Transaction.create(
          [
            {
              user: userId,
              accountId: sourceAccount._id,
              toAccountId: destAccount._id,
              transferRef,
              title: transferTitle,
              description: transferTitle,
              amount: numericAmount,
              type: 'transfer',
              category: 'Transfer',
              date: transferDate,
            },
          ],
          { session }
        );

        // Create credit transaction (what arrives at the destination)
        const [credit] = await Transaction.create(
          [
            {
              user: userId,
              accountId: destAccount._id,
              toAccountId: sourceAccount._id,
              transferRef,
              title: transferTitleCredit,
              description: transferTitleCredit,
              amount: numericAmount,
              type: 'transfer',
              category: 'Transfer',
              date: transferDate,
            },
          ],
          { session }
        );

        debitTx = debit;
        creditTx = credit;
      });
    } catch (sessionError) {
      // Fallback: MongoDB replica set not available — perform sequential writes
      if (
        sessionError.message?.includes('Transaction') ||
        sessionError.message?.includes('replica') ||
        sessionError.message?.includes('session') ||
        sessionError.message?.includes('not supported')
      ) {
        usedSession = false;
        await session.endSession();

        // Re-fetch fresh account data to avoid any stale in-memory state
        const [freshSource, freshDest] = await Promise.all([
          Account.findOne({ _id: sourceAccount._id, user: userId }),
          Account.findOne({ _id: destAccount._id, user: userId }),
        ]);

        if (freshSource) {
          freshSource.balance = Number((freshSource.balance - numericAmount).toFixed(2));
          await freshSource.save();
        }
        if (freshDest) {
          freshDest.balance = Number((freshDest.balance + numericAmount).toFixed(2));
          await freshDest.save();
        }

        debitTx = await Transaction.create({
          user: userId,
          accountId: sourceAccount._id,
          toAccountId: destAccount._id,
          transferRef,
          title: transferTitle,
          description: transferTitle,
          amount: numericAmount,
          type: 'transfer',
          category: 'Transfer',
          date: transferDate,
        });

        creditTx = await Transaction.create({
          user: userId,
          accountId: destAccount._id,
          toAccountId: sourceAccount._id,
          transferRef,
          title: transferTitleCredit,
          description: transferTitleCredit,
          amount: numericAmount,
          type: 'transfer',
          category: 'Transfer',
          date: transferDate,
        });
      } else {
        throw sessionError;
      }
    }

    if (usedSession) {
      await session.endSession();
    }

    // Populate and return both transaction records
    const [populatedDebit, populatedCredit] = await Promise.all([
      Transaction.findById(debitTx._id)
        .populate('accountId', 'name type color accountNumberLast4')
        .populate('toAccountId', 'name type color accountNumberLast4'),
      Transaction.findById(creditTx._id)
        .populate('accountId', 'name type color accountNumberLast4')
        .populate('toAccountId', 'name type color accountNumberLast4'),
    ]);

    return res.status(201).json({
      success: true,
      message: 'Transfer completed successfully',
      transferRef,
      debit: populatedDebit || debitTx,
      credit: populatedCredit || creditTx,
    });
  } catch (error) {
    try {
      await session.endSession();
    } catch (_) {
      // ignore session cleanup errors
    }
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Get all transactions with optional filtering
// @route   GET /api/transactions
// @access  Private
// ─────────────────────────────────────────────
const getTransactions = async (req, res, next) => {
  try {
    const rawUserId = req.user._id || req.user.id;
    const userId = new mongoose.Types.ObjectId(rawUserId);
    const { type, category, startDate, endDate, search, accountId } = req.query;

    const filter = {
      user: userId,
    };

    // Filter by specific account
    if (accountId && mongoose.Types.ObjectId.isValid(accountId)) {
      filter.accountId = new mongoose.Types.ObjectId(accountId);
    }

    // Filter by type ('income', 'expense', 'investment', 'transfer')
    if (type && type !== 'All' && type !== 'all') {
      filter.type = String(type).toLowerCase().trim();
    }

    // Filter by category
    if (category && category !== 'All' && category !== 'all') {
      filter.category = String(category).trim();
    }

    // Filter by date range
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    // Search in title, description, or category
    if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { category: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    // For transfers: only return the debit side (type=transfer, accountId is source)
    // This avoids showing both debit + credit records in a flat list
    if (filter.type === 'transfer') {
      // Both sides are transfer — show all transfer records for the user
      // (frontend can display direction via toAccountId)
    }

    const transactions = await Transaction.find(filter)
      .populate('accountId', 'name type color accountNumberLast4')
      .populate('toAccountId', 'name type color accountNumberLast4')
      .sort({ date: -1, createdAt: -1 });

    return res.status(200).json(transactions || []);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Delete a transaction & reverse balance impact on linked account
//          For transfers: reverses both the debit and credit sides atomically
// @route   DELETE /api/transactions/:id
// @access  Private
// ─────────────────────────────────────────────
const deleteTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rawUserId = req.user._id || req.user.id;
    const userId = new mongoose.Types.ObjectId(rawUserId);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid transaction ID',
      });
    }

    const transaction = await Transaction.findOne({
      _id: id,
      user: userId,
    });

    if (!transaction) {
      return res.status(404).json({
        message: 'Transaction not found or unauthorized',
      });
    }

    // ── Transfer reversal ──────────────────────────────────────────────────────
    if (transaction.type === 'transfer' && transaction.transferRef) {
      // Find both sides of the transfer
      const bothSides = await Transaction.find({
        transferRef: transaction.transferRef,
        user: userId,
      });

      const session = await mongoose.startSession();
      let usedSession = true;

      try {
        await session.withTransaction(async () => {
          for (const tx of bothSides) {
            if (tx.accountId) {
              const account = await Account.findOne({ _id: tx.accountId, user: userId });
              if (account) {
                // Determine which side this is:
                // The debit side (source) had money removed → add back
                // The credit side (dest) had money added → remove
                const isDebitSide = tx.toAccountId &&
                  tx.toAccountId.toString() === (transaction.toAccountId || transaction.accountId).toString()
                    ? tx._id.toString() === id
                    : tx.accountId.toString() !== (transaction.toAccountId || '').toString();

                // Simpler approach: detect by comparing this tx's accountId
                // If this tx is the debit (fromAccount), its balance was decremented → restore
                // If this tx is the credit (toAccount), its balance was incremented → restore
                // We reverse based on which of the two records this is:
                // Both records have same amount. The "source" account needs +amount, "dest" needs -amount
                const sourceAccountId = transaction.accountId.toString();
                if (tx.accountId.toString() === sourceAccountId) {
                  // This tx's account was debited → reverse by crediting
                  account.balance = Number((account.balance + tx.amount).toFixed(2));
                } else {
                  // This tx's account was credited → reverse by debiting
                  account.balance = Number((account.balance - tx.amount).toFixed(2));
                }
                await account.save({ session });
              }
            }
            await tx.deleteOne({ session });
          }
        });
      } catch (sessionError) {
        if (
          sessionError.message?.includes('Transaction') ||
          sessionError.message?.includes('replica') ||
          sessionError.message?.includes('session')
        ) {
          usedSession = false;
          await session.endSession();

          // Sequential fallback
          for (const tx of bothSides) {
            if (tx.accountId) {
              const account = await Account.findOne({ _id: tx.accountId, user: userId });
              if (account) {
                const sourceAccountId = transaction.accountId.toString();
                if (tx.accountId.toString() === sourceAccountId) {
                  account.balance = Number((account.balance + tx.amount).toFixed(2));
                } else {
                  account.balance = Number((account.balance - tx.amount).toFixed(2));
                }
                await account.save();
              }
            }
            await tx.deleteOne();
          }
        } else {
          throw sessionError;
        }
      }

      if (usedSession) {
        await session.endSession();
      }

      return res.status(200).json({
        id,
        success: true,
        message: 'Transfer reversed and both accounts updated successfully',
        deletedCount: bothSides.length,
      });
    }

    // ── Standard transaction reversal ─────────────────────────────────────────
    if (transaction.accountId) {
      const account = await Account.findOne({ _id: transaction.accountId, user: userId });
      if (account) {
        if (transaction.type === 'income') {
          account.balance = Number((account.balance - transaction.amount).toFixed(2));
        } else {
          account.balance = Number((account.balance + transaction.amount).toFixed(2));
        }
        await account.save();
      }
    }

    await transaction.deleteOne();

    return res.status(200).json({
      id,
      success: true,
      message: 'Transaction deleted and account balance updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Update a transaction & atomically reconcile account balance
//          2D.1  Resolve ID + ownership
//          2D.2  Input validation
//          2D.3  Reverse old effect on old account
//          2D.4  Validate new account ownership
//          2D.5  Apply new effect on new account
//          2D.6  Transfer edit: reverse old pair, apply new pair
//          2D.7  All writes inside a session with fallback
// @route   PUT /api/transactions/:id
// @access  Private
// ─────────────────────────────────────────────
const updateTransaction = async (req, res, next) => {
  let session;
  try {
    const { id } = req.params;
    const rawUserId = req.user._id || req.user.id;
    const userId = new mongoose.Types.ObjectId(rawUserId);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid transaction ID' });
    }

    const { title, description, amount, type, category, date, accountId, fromAccount, toAccount, notes } = req.body;
    const newAmount = amount === undefined ? undefined : Number(amount);
    const newType = type === undefined ? undefined : String(type).toLowerCase().trim();
    const newDate = date === undefined ? undefined : new Date(date);

    if (amount !== undefined && (!Number.isFinite(newAmount) || newAmount <= 0)) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }
    if (newType !== undefined && !['income', 'expense', 'investment', 'transfer'].includes(newType)) {
      return res.status(400).json({ message: 'Invalid transaction type' });
    }
    if (date !== undefined && Number.isNaN(newDate.getTime())) {
      return res.status(400).json({ message: 'Invalid transaction date' });
    }
    if (category !== undefined && !String(category).trim()) {
      return res.status(400).json({ message: 'Category cannot be empty' });
    }

    const suppliedAccountIds = [accountId, fromAccount, toAccount].filter(Boolean);
    if (suppliedAccountIds.some((value) => !mongoose.Types.ObjectId.isValid(value))) {
      return res.status(400).json({ message: 'Invalid account ID' });
    }

    if (supportsMongoTransactions()) {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    const transaction = await Transaction.findOne({ _id: id, user: userId }).session(session);
    if (!transaction) {
      const error = new Error('Transaction not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    const oldType = transaction.type;
    const oldAmount = Number(transaction.amount);
    let oldSourceId = transaction.accountId.toString();
    let oldDestinationId = transaction.toAccountId ? transaction.toAccountId.toString() : null;
    const nextType = newType || oldType;

    if ((oldType === 'transfer') !== (nextType === 'transfer')) {
      const error = new Error('Changing between transfer and income/expense is not supported');
      error.statusCode = 400;
      throw error;
    }

    let transferPair = [];
    if (oldType === 'transfer') {
      transferPair = await Transaction.find({
        transferRef: transaction.transferRef,
        user: userId,
      }).session(session);
      if (transferPair.length !== 2 || !oldDestinationId) {
        const error = new Error('Transfer pair is incomplete');
        error.statusCode = 409;
        throw error;
      }
      const debit = transferPair.find((item) => item.title?.startsWith('Transfer to ')) || transferPair[0];
      oldSourceId = debit.accountId.toString();
      oldDestinationId = debit.toAccountId.toString();
    }

    const nextSourceId = nextType === 'transfer'
      ? String(fromAccount || oldSourceId)
      : String(accountId || oldSourceId);
    const nextDestinationId = nextType === 'transfer'
      ? String(toAccount || oldDestinationId)
      : null;

    if (nextType === 'transfer' && nextSourceId === nextDestinationId) {
      const error = new Error('Source and destination accounts must be different');
      error.statusCode = 400;
      throw error;
    }

    const accountIds = [...new Set([
      oldSourceId,
      oldDestinationId,
      nextSourceId,
      nextDestinationId,
    ].filter(Boolean))];
    const accounts = await Account.find({
      _id: { $in: accountIds },
      user: userId,
      isActive: true,
    }).session(session);
    const accountMap = new Map(accounts.map((account) => [account._id.toString(), account]));

    for (const accountIdToCheck of accountIds) {
      if (!accountMap.has(accountIdToCheck)) {
        const error = new Error('Account not found or unauthorized');
        error.statusCode = 404;
        throw error;
      }
    }

    const oldSource = accountMap.get(oldSourceId);
    const oldDestination = oldDestinationId ? accountMap.get(oldDestinationId) : null;

    const nextAmount = newAmount === undefined ? oldAmount : newAmount;
    const nextSource = accountMap.get(nextSourceId);
    const nextDestination = nextDestinationId ? accountMap.get(nextDestinationId) : null;

    if (oldType === 'transfer') {
      oldSource.balance = Number((oldSource.balance + oldAmount).toFixed(2));
      if (oldDestination) {
        oldDestination.balance = Number((oldDestination.balance - oldAmount).toFixed(2));
      }
    } else if (oldType === 'income') {
      oldSource.balance = Number((oldSource.balance - oldAmount).toFixed(2));
    } else {
      oldSource.balance = Number((oldSource.balance + oldAmount).toFixed(2));
    }

    if ((nextType === 'expense' || nextType === 'investment' || nextType === 'transfer')
      && nextSource.balance < nextAmount) {
      const error = new Error('Insufficient funds in source account');
      error.statusCode = 400;
      throw error;
    }

    if (nextType === 'transfer') {
      nextSource.balance = Number((nextSource.balance - nextAmount).toFixed(2));
      nextDestination.balance = Number((nextDestination.balance + nextAmount).toFixed(2));
    } else if (nextType === 'income') {
      nextSource.balance = Number((nextSource.balance + nextAmount).toFixed(2));
    } else {
      nextSource.balance = Number((nextSource.balance - nextAmount).toFixed(2));
    }

    const accountsToSave = [...new Set([...accountMap.values()])];
    for (const account of accountsToSave) {
      await account.save({ session });
    }

    const nextTitle = title === undefined ? transaction.title : String(title).trim();
    const nextDescription = description === undefined
      ? (notes === undefined ? transaction.description : String(notes).trim())
      : String(description).trim();
    const nextCategory = nextType === 'transfer'
      ? 'Transfer'
      : (category === undefined ? transaction.category : String(category).trim());
    const nextDate = newDate || transaction.date;

    if (nextType === 'transfer') {
      const debit = transferPair.find((item) => item.title?.startsWith('Transfer to ')) || transferPair[0];
      const credit = transferPair.find((item) => item._id.toString() !== debit._id.toString());
      const transferTitle = notes === undefined ? nextTitle : String(notes).trim();
      debit.accountId = nextSourceId;
      debit.toAccountId = nextDestinationId;
      debit.amount = nextAmount;
      debit.title = transferTitle || `Transfer to ${nextDestination.name}`;
      debit.description = nextDescription || debit.title;
      debit.date = nextDate;
      debit.category = nextCategory;
      credit.accountId = nextDestinationId;
      credit.toAccountId = nextSourceId;
      credit.amount = nextAmount;
      credit.title = transferTitle || `Transfer from ${nextSource.name}`;
      credit.description = nextDescription || credit.title;
      credit.date = nextDate;
      credit.category = nextCategory;
      await debit.save({ session });
      await credit.save({ session });
    } else {
      transaction.accountId = nextSourceId;
      transaction.toAccountId = null;
      transaction.amount = nextAmount;
      transaction.type = nextType;
      transaction.title = nextTitle;
      transaction.description = nextDescription;
      transaction.category = nextCategory;
      transaction.date = nextDate;
      await transaction.save({ session });
    }

    const updated = await Transaction.findById(transaction._id)
      .populate('accountId', 'name type color accountNumberLast4')
      .populate('toAccountId', 'name type color accountNumberLast4')
      .session(session);

    if (session) {
      await session.commitTransaction();
    }
    return res.status(200).json({
      ...(updated || transaction).toObject(),
      accountBalance: nextSource.balance,
    });
  } catch (error) {
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

// ─────────────────────────────────────────────
// @desc    Get summary calculation (Income, Expenses, Balance, Category breakdown)
//          Transfers are excluded from income/expense totals
// @route   GET /api/transactions/summary
// @access  Private
// ─────────────────────────────────────────────
const getTransactionSummary = async (req, res, next) => {
  try {
    const rawUserId = req.user._id || req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(rawUserId);

    const [totalsResult, expenseCategoriesResult, incomeCategoriesResult] = await Promise.all([
      // 1. Overall Income vs Expense Totals (exclude transfers)
      Transaction.aggregate([
        {
          $match: {
            user: userObjectId,
            type: { $in: ['income', 'expense', 'investment'] },
          },
        },
        {
          $group: {
            _id: '$type',
            totalAmount: { $sum: { $abs: '$amount' } },
            count: { $sum: 1 },
          },
        },
      ]),

      // 2. Expense Category Breakdown (exclude transfers)
      Transaction.aggregate([
        {
          $match: {
            user: userObjectId,
            type: { $in: ['expense', 'investment'] },
          },
        },
        {
          $group: {
            _id: '$category',
            totalAmount: { $sum: { $abs: '$amount' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { totalAmount: -1 } },
      ]),

      // 3. Income Category Breakdown (exclude transfers)
      Transaction.aggregate([
        {
          $match: {
            user: userObjectId,
            type: 'income',
          },
        },
        {
          $group: {
            _id: '$category',
            totalAmount: { $sum: { $abs: '$amount' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { totalAmount: -1 } },
      ]),
    ]);

    let totalIncome = 0;
    let totalExpenses = 0;
    let totalTransactions = 0;

    totalsResult.forEach((item) => {
      totalTransactions += item.count;
      if (item._id === 'income') {
        totalIncome = item.totalAmount;
      } else if (item._id === 'expense' || item._id === 'investment') {
        totalExpenses += item.totalAmount;
      }
    });

    const totalBalance = Number((totalIncome - totalExpenses).toFixed(2));

    const expenseCategories = expenseCategoriesResult.map((cat) => ({
      category: cat._id,
      amount: Number(cat.totalAmount.toFixed(2)),
      count: cat.count,
      percentage: totalExpenses > 0 ? Number(((cat.totalAmount / totalExpenses) * 100).toFixed(1)) : 0,
    }));

    const incomeCategories = incomeCategoriesResult.map((cat) => ({
      category: cat._id,
      amount: Number(cat.totalAmount.toFixed(2)),
      count: cat.count,
      percentage: totalIncome > 0 ? Number(((cat.totalAmount / totalIncome) * 100).toFixed(1)) : 0,
    }));

    // Count transfers separately (each transfer creates 2 records; count unique refs)
    const transferCount = await Transaction.countDocuments({
      user: userObjectId,
      type: 'transfer',
    });

    return res.status(200).json({
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      totalBalance,
      totalTransactions,
      transferCount,
      categories: expenseCategories,
      incomeCategories,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Get 6-month monthly cashflow summary for analytics
//          Transfers are excluded from income/expense buckets
// @route   GET /api/transactions/monthly-summary
// @access  Private
// ─────────────────────────────────────────────
const getMonthlySummary = async (req, res, next) => {
  try {
    const rawUserId = req.user._id || req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(rawUserId);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyData = await Transaction.aggregate([
      {
        $match: {
          user: userObjectId,
          date: { $gte: sixMonthsAgo },
          // Exclude transfers from cashflow chart
          type: { $in: ['income', 'expense', 'investment'] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const map = {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      map[key] = {
        month: `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`,
        income: 0,
        expense: 0,
      };
    }

    monthlyData.forEach((item) => {
      const key = `${item._id.year}-${item._id.month}`;
      if (!map[key]) return;

      if (item._id.type === 'income') {
        map[key].income += item.total;
      } else {
        map[key].expense += item.total;
      }
    });

    const result = Object.values(map);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Get category breakdown for expense chart
//          Transfers are excluded
// @route   GET /api/transactions/category-breakdown
// @access  Private
// ─────────────────────────────────────────────
const getCategoryBreakdown = async (req, res, next) => {
  try {
    const rawUserId = req.user._id || req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(rawUserId);

    const categories = await Transaction.aggregate([
      {
        $match: {
          user: userObjectId,
          type: { $in: ['expense', 'investment'] },
          // Exclude Transfer category from spending breakdown
          category: { $ne: 'Transfer' },
        },
      },
      {
        $group: {
          _id: '$category',
          value: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { value: -1 } },
    ]);

    const totalExpense = categories.reduce((sum, item) => sum + item.value, 0);

    const result = categories.map((cat) => ({
      name: cat._id,
      category: cat._id,
      value: cat.value,
      percentage: totalExpense > 0 ? Math.round((cat.value / totalExpense) * 100) : 0,
    }));

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addTransaction,
  createTransfer,
  getTransactions,
  deleteTransaction,
  updateTransaction,
  getTransactionSummary,
  getSummary: getTransactionSummary,
  getMonthlySummary,
  getCategoryBreakdown,
};
