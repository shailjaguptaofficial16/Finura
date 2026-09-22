const mongoose = require('mongoose');
const Account = require('../models/Account');

/**
 * Default starter accounts created for new users upon first access
 */
const createStarterAccounts = async (userId) => {
  const starterData = [
    {
      user: userId,
      name: 'HDFC Savings',
      type: 'Savings',
      balance: 145000,
      currency: 'INR',
      accountNumberLast4: '4821',
      color: '#00f2fe',
      isDefault: true,
      isActive: true,
    },
    {
      user: userId,
      name: 'Paytm Digital Wallet',
      type: 'Wallet',
      balance: 8500,
      currency: 'INR',
      accountNumberLast4: '9920',
      color: '#10b981',
      isDefault: false,
      isActive: true,
    },
    {
      user: userId,
      name: 'Physical Cash',
      type: 'Cash',
      balance: 12000,
      currency: 'INR',
      accountNumberLast4: '',
      color: '#f59e0b',
      isDefault: false,
      isActive: true,
    },
    {
      user: userId,
      name: 'ICICI Coral Credit Card',
      type: 'Credit Card',
      balance: -14500,
      currency: 'INR',
      accountNumberLast4: '1092',
      color: '#ef4444',
      isDefault: false,
      isActive: true,
    },
    {
      user: userId,
      name: 'Zerodha Investment Account',
      type: 'Investment',
      balance: 320000,
      currency: 'INR',
      accountNumberLast4: '7734',
      color: '#8b5cf6',
      isDefault: false,
      isActive: true,
    },
  ];

  return await Account.insertMany(starterData);
};

// ─────────────────────────────────────────────
// @desc    Get all accounts for authenticated user + total aggregated balance
// @route   GET /api/accounts
// @access  Private
// ─────────────────────────────────────────────
const getAccounts = async (req, res, next) => {
  try {
    const rawUserId = req.user._id || req.user.id;
    const userId = new mongoose.Types.ObjectId(rawUserId);

    let accounts = await Account.find({ user: userId, isActive: true }).sort({
      isDefault: -1,
      createdAt: 1,
    });

    // Auto-provision starter accounts if user has zero accounts
    if (accounts.length === 0) {
      accounts = await createStarterAccounts(userId);
    }

    // Compute aggregated net balance (Liquid Cash + Savings + Wallets + Investments - Credit Card Liabilities)
    let totalBalance = 0;
    let totalCashAndBank = 0;
    let totalCreditLiability = 0;
    let totalInvestments = 0;

    accounts.forEach((acc) => {
      const bal = Number(acc.balance) || 0;
      totalBalance += bal;

      if (['Savings', 'Checking', 'Cash', 'Wallet'].includes(acc.type)) {
        totalCashAndBank += bal;
      } else if (acc.type === 'Credit Card') {
        totalCreditLiability += Math.abs(bal);
      } else if (acc.type === 'Investment') {
        totalInvestments += bal;
      }
    });

    return res.status(200).json({
      success: true,
      count: accounts.length,
      totalBalance: Number(totalBalance.toFixed(2)),
      breakdown: {
        totalCashAndBank: Number(totalCashAndBank.toFixed(2)),
        totalCreditLiability: Number(totalCreditLiability.toFixed(2)),
        totalInvestments: Number(totalInvestments.toFixed(2)),
      },
      data: accounts,
      accounts,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Create a new account with initial balance
// @route   POST /api/accounts
// @access  Private
// ─────────────────────────────────────────────
const createAccount = async (req, res, next) => {
  try {
    const rawUserId = req.user._id || req.user.id;
    const userId = new mongoose.Types.ObjectId(rawUserId);

    const { name, type, balance, currency, accountNumberLast4, color, isDefault } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Account name is required',
      });
    }

    const validTypes = ['Savings', 'Checking', 'Credit Card', 'Wallet', 'Investment', 'Cash'];
    const resolvedType = type && validTypes.includes(type) ? type : 'Savings';

    // If marked as default, unset existing default
    if (isDefault) {
      await Account.updateMany({ user: userId }, { isDefault: false });
    }

    // Check if this is user's first account
    const existingCount = await Account.countDocuments({ user: userId, isActive: true });
    const shouldBeDefault = isDefault !== undefined ? Boolean(isDefault) : existingCount === 0;

    const account = await Account.create({
      user: userId,
      name: name.trim(),
      type: resolvedType,
      balance: Number(balance) || 0,
      currency: (currency || 'INR').toUpperCase().trim(),
      accountNumberLast4: (accountNumberLast4 || '').trim(),
      color: color || '#00f2fe',
      isDefault: shouldBeDefault,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: account,
      account,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Update account details
// @route   PUT /api/accounts/:id
// @access  Private
// ─────────────────────────────────────────────
const updateAccount = async (req, res, next) => {
  try {
    const rawUserId = req.user._id || req.user.id;
    const userId = new mongoose.Types.ObjectId(rawUserId);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account ID',
      });
    }

    const account = await Account.findOne({ _id: id, user: userId });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found or access denied',
      });
    }

    const { name, type, balance, currency, accountNumberLast4, color, isDefault } = req.body;

    if (name) account.name = name.trim();
    if (type) {
      const validTypes = ['Savings', 'Checking', 'Credit Card', 'Wallet', 'Investment', 'Cash'];
      if (validTypes.includes(type)) account.type = type;
    }
    if (balance !== undefined && Number.isFinite(Number(balance))) {
      account.balance = Number(balance);
    }
    if (currency) account.currency = currency.toUpperCase().trim();
    if (accountNumberLast4 !== undefined) account.accountNumberLast4 = String(accountNumberLast4).trim();
    if (color) account.color = color.trim();

    if (isDefault) {
      await Account.updateMany({ user: userId }, { isDefault: false });
      account.isDefault = true;
    }

    await account.save();

    return res.status(200).json({
      success: true,
      message: 'Account updated successfully',
      data: account,
      account,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Soft or hard delete account
// @route   DELETE /api/accounts/:id
// @access  Private
// ─────────────────────────────────────────────
const deleteAccount = async (req, res, next) => {
  try {
    const rawUserId = req.user._id || req.user.id;
    const userId = new mongoose.Types.ObjectId(rawUserId);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account ID',
      });
    }

    const account = await Account.findOne({ _id: id, user: userId });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found or access denied',
      });
    }

    // Soft delete account so transaction history retains foreign key integrity
    account.isActive = false;
    await account.save();

    return res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
      id,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
};
