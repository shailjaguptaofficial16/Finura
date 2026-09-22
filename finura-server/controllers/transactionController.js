const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

// ─────────────────────────────────────────────
// @desc    Add a new transaction (Income, Expense, or Investment)
//          Atomically synchronizes linked Account balance
// @route   POST /api/transactions
// @access  Private
// ─────────────────────────────────────────────
const addTransaction = async (req, res, next) => {
  let session;
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

    if (accountId && !mongoose.Types.ObjectId.isValid(accountId)) {
      return res.status(400).json({ message: 'Invalid Account ID provided' });
    }

    session = await mongoose.startSession();
    session.startTransaction();

    // 1. Verify the requested account belongs to the authenticated user.
    let targetAccount;
    if (accountId) {
      targetAccount = await Account.findOne({
        _id: accountId,
        user: req.user._id,
      }).session(session);
    } else {
      // Preserve the existing default-account behavior for clients that omit accountId.
      targetAccount = await Account.findOne({
        user: req.user._id,
        isDefault: true,
        isActive: true,
      }).session(session);
      if (!targetAccount) {
        targetAccount = await Account.findOne({
          user: req.user._id,
          isActive: true,
        }).session(session);
      }
      if (!targetAccount) {
        targetAccount = new Account({
          user: userId,
          name: 'Primary Savings',
          type: 'Savings',
          balance: 0,
          currency: 'INR',
          color: '#00f2fe',
          isDefault: true,
          isActive: true,
        });
        await targetAccount.save({ session });
      }
    }
    if (!targetAccount) {
      const error = new Error('Account not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    // 2. Atomically synchronize the account balance.
    if (normalizedType === 'income') {
      targetAccount.balance = Number((targetAccount.balance + numericAmount).toFixed(2));
    } else {
      targetAccount.balance = Number((targetAccount.balance - numericAmount).toFixed(2));
    }
    await targetAccount.save({ session });

    // 3. Create the transaction in the same transaction.
    const finalTitle = (
      title ||
      description ||
      `${category} ${normalizedType === 'income' ? 'Income' : 'Expense'}`
    ).trim();
    const finalDescription = (description || title || finalTitle).trim();

    const transaction = await Transaction.create({
      user: userId,
      accountId: targetAccount._id,
      title: finalTitle,
      description: finalDescription,
      amount: numericAmount,
      type: normalizedType,
      category: category.trim(),
      date: date ? new Date(date) : new Date(),
    }, { session });

    const populatedTransaction = await Transaction.findById(transaction._id).populate(
      'accountId',
      'name type color accountNumberLast4'
    ).session(session);

    await session.commitTransaction();

    return res.status(201).json({
      ...(populatedTransaction || transaction).toObject(),
      accountBalance: targetAccount.balance,
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

// @desc    Transfer funds atomically between two owned accounts
// @route   POST /api/transactions/transfer
// @access  Private
const transferFunds = async (req, res, next) => {
  let session;
  try {
    const { fromAccount, toAccount, amount, date, notes, title, description } = req.body;
    const rawUserId = req.user._id || req.user.id;
    const userId = new mongoose.Types.ObjectId(rawUserId);
    const numericAmount = Number(amount);

    if (!mongoose.Types.ObjectId.isValid(fromAccount) || !mongoose.Types.ObjectId.isValid(toAccount)) {
      return res.status(400).json({ message: 'Valid source and destination account IDs are required' });
    }
    if (fromAccount === toAccount) {
      return res.status(400).json({ message: 'Source and destination accounts must be different' });
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number greater than 0' });
    }

    session = await mongoose.startSession();
    session.startTransaction();

    const accounts = await Account.find({
      _id: { $in: [fromAccount, toAccount] },
      user: userId,
    }).session(session);
    const sourceAccount = accounts.find((account) => account._id.toString() === fromAccount);
    const destinationAccount = accounts.find((account) => account._id.toString() === toAccount);

    if (!sourceAccount || !destinationAccount) {
      const error = new Error('One or both accounts were not found or are unauthorized');
      error.statusCode = 404;
      throw error;
    }
    if (Number(sourceAccount.balance) < numericAmount) {
      const error = new Error('Insufficient funds in source account');
      error.statusCode = 400;
      throw error;
    }

    sourceAccount.balance = Number((sourceAccount.balance - numericAmount).toFixed(2));
    destinationAccount.balance = Number((destinationAccount.balance + numericAmount).toFixed(2));
    await sourceAccount.save({ session });
    await destinationAccount.save({ session });

    const transferTitle = (title || 'Account Transfer').trim();
    const transfer = await Transaction.create([{
      user: userId,
      accountId: sourceAccount._id,
      toAccount: destinationAccount._id,
      title: transferTitle,
      description: (notes || description || transferTitle).trim(),
      amount: numericAmount,
      type: 'transfer',
      category: 'Transfer',
      date: date ? new Date(date) : new Date(),
    }], { session });

    await session.commitTransaction();

    return res.status(201).json({
      transaction: transfer[0],
      fromAccountBalance: sourceAccount.balance,
      toAccountBalance: destinationAccount.balance,
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

    // Filter by type ('income', 'expense', 'investment')
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

    const transactions = await Transaction.find(filter)
      .populate('accountId', 'name type color accountNumberLast4')
      .populate('toAccount', 'name type color')
      .sort({ date: -1, createdAt: -1 });

    return res.status(200).json(transactions || []);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Delete a transaction & reverse balance impact on linked account
// @route   DELETE /api/transactions/:id
// @access  Private
// ─────────────────────────────────────────────
const deleteTransaction = async (req, res, next) => {
  let session;
  try {
    const { id } = req.params;
    const rawUserId = req.user._id || req.user.id;
    const userId = new mongoose.Types.ObjectId(rawUserId);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid transaction ID',
      });
    }

    session = await mongoose.startSession();
    session.startTransaction();

    const transaction = await Transaction.findOne({
      _id: id,
      user: userId,
    }).session(session);

    if (!transaction) {
      const error = new Error('Transaction not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    // Reverse the balance impact on the owned linked account.
    const account = await Account.findOne({
      _id: transaction.accountId,
      user: req.user._id,
    }).session(session);
    if (!account) {
      const error = new Error('Linked account not found or unauthorized');
      error.statusCode = 404;
      throw error;
    }

    if (transaction.type === 'transfer') {
      const destinationAccount = await Account.findOne({
        _id: transaction.toAccount,
        user: userId,
      }).session(session);
      if (!destinationAccount) {
        const error = new Error('Linked destination account not found or unauthorized');
        error.statusCode = 404;
        throw error;
      }
      account.balance = Number((account.balance + transaction.amount).toFixed(2));
      destinationAccount.balance = Number((destinationAccount.balance - transaction.amount).toFixed(2));
      await account.save({ session });
      await destinationAccount.save({ session });
    } else if (transaction.type === 'income') {
      account.balance = Number((account.balance - transaction.amount).toFixed(2));
      await account.save({ session });
    } else {
      account.balance = Number((account.balance + transaction.amount).toFixed(2));
      await account.save({ session });
    }

    await transaction.deleteOne({ session });

    await session.commitTransaction();

    return res.status(200).json({
      id,
      success: true,
      message: 'Transaction deleted and account balance updated successfully',
      accountBalance: account.balance,
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
// @desc    Update a transaction & reconcile account balance delta
// @route   PUT /api/transactions/:id
// @access  Private
// ─────────────────────────────────────────────
const updateTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rawUserId = req.user._id || req.user.id;
    const userId = new mongoose.Types.ObjectId(rawUserId);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid transaction ID' });
    }

    const transaction = await Transaction.findOne({ _id: id, user: userId });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found or unauthorized' });
    }

    const { title, description, amount, type, category, date, accountId } = req.body;

    const oldAmount = Number(transaction.amount);
    const oldType = transaction.type;
    const oldAccountId = transaction.accountId ? transaction.accountId.toString() : null;

    const newAmount = amount !== undefined ? Number(amount) : oldAmount;
    const newType = type !== undefined ? String(type).toLowerCase().trim() : oldType;
    const newAccountId = accountId ? accountId.toString() : oldAccountId;

    // Validate inputs if modified
    if (amount !== undefined && (!Number.isFinite(newAmount) || newAmount <= 0)) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }
    if (type !== undefined && !['income', 'expense', 'investment'].includes(newType)) {
      return res.status(400).json({ message: 'Invalid transaction type' });
    }

    // Reconcile balances
    if (oldAccountId && newAccountId) {
      if (oldAccountId === newAccountId) {
        // Same account: calculate net delta
        const account = await Account.findOne({ _id: oldAccountId, user: userId });
        if (account) {
          // 1. Revert previous transaction effect
          if (oldType === 'income') {
            account.balance -= oldAmount;
          } else {
            account.balance += oldAmount;
          }

          // 2. Apply updated transaction effect
          if (newType === 'income') {
            account.balance += newAmount;
          } else {
            account.balance -= newAmount;
          }

          account.balance = Number(account.balance.toFixed(2));
          await account.save();
        }
      } else {
        // Different accounts: reverse on old account, apply on new account
        const oldAccount = await Account.findOne({ _id: oldAccountId, user: userId });
        if (oldAccount) {
          if (oldType === 'income') oldAccount.balance -= oldAmount;
          else oldAccount.balance += oldAmount;
          oldAccount.balance = Number(oldAccount.balance.toFixed(2));
          await oldAccount.save();
        }

        const newAccount = await Account.findOne({ _id: newAccountId, user: userId, isActive: true });
        if (newAccount) {
          if (newType === 'income') newAccount.balance += newAmount;
          else newAccount.balance -= newAmount;
          newAccount.balance = Number(newAccount.balance.toFixed(2));
          await newAccount.save();
        }

        transaction.accountId = newAccountId;
      }
    }

    if (title !== undefined) transaction.title = title.trim();
    if (description !== undefined) transaction.description = description.trim();
    if (amount !== undefined) transaction.amount = newAmount;
    if (type !== undefined) transaction.type = newType;
    if (category !== undefined) transaction.category = category.trim();
    if (date !== undefined) transaction.date = new Date(date);

    await transaction.save();

    const updated = await Transaction.findById(transaction._id).populate(
      'accountId',
      'name type color accountNumberLast4'
    );

    return res.status(200).json(updated || transaction);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Get summary calculation (Income, Expenses, Balance, Category breakdown)
// @route   GET /api/transactions/summary
// @access  Private
// ─────────────────────────────────────────────
const getTransactionSummary = async (req, res, next) => {
  try {
    const rawUserId = req.user._id || req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(rawUserId);

    const [totalsResult, expenseCategoriesResult, incomeCategoriesResult] = await Promise.all([
      // 1. Overall Income vs Expense Totals
      Transaction.aggregate([
        { $match: { user: userObjectId } },
        {
          $group: {
            _id: '$type',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),

      // 2. Expense Category Breakdown
      Transaction.aggregate([
        {
          $match: {
            user: userObjectId,
            type: 'expense',
          },
        },
        {
          $group: {
            _id: '$category',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { totalAmount: -1 } },
      ]),

      // 3. Income Category Breakdown
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
            totalAmount: { $sum: '$amount' },
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
      } else if (item._id === 'expense') {
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

    return res.status(200).json({
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      totalBalance,
      totalTransactions,
      categories: expenseCategories,
      incomeCategories,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Get 6-month monthly cashflow summary for analytics
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
          if (item._id.type === 'expense') {
            map[key].expense += item.total;
          }
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
          type: 'expense',
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
  transferFunds,
  getTransactions,
  deleteTransaction,
  updateTransaction,
  getTransactionSummary,
  getSummary: getTransactionSummary,
  getMonthlySummary,
  getCategoryBreakdown,
};
