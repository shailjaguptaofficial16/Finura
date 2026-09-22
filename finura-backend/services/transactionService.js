const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

const createTransactionAndUpdateBalance = async ({
  userId,
  accountId,
  title,
  description,
  amount,
  type,
  category,
  date,
  recurringTransaction = null,
  recurringRunDate = null,
  requireSufficientFunds = false,
  session = null,
}) => {
  const query = Account.findOne({
    _id: accountId,
    user: userId,
    isActive: true,
  });
  if (session) query.session(session);

  const account = await query;
  if (!account) {
    const error = new Error('Account not found or unauthorized');
    error.statusCode = 404;
    throw error;
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    const error = new Error('Amount must be greater than 0');
    error.statusCode = 400;
    throw error;
  }

  if (requireSufficientFunds && type !== 'income' && account.balance < numericAmount) {
    const error = new Error('Insufficient funds for recurring transaction');
    error.statusCode = 400;
    throw error;
  }

  if (type === 'income') {
    account.balance = Number((account.balance + numericAmount).toFixed(2));
  } else {
    account.balance = Number((account.balance - numericAmount).toFixed(2));
  }

  const saveOptions = session ? { session } : {};
  await account.save(saveOptions);

  const [transaction] = await Transaction.create([{
    user: new mongoose.Types.ObjectId(userId),
    accountId: account._id,
    title,
    description,
    amount: numericAmount,
    type,
    category,
    date,
    recurringTransaction,
    recurringRunDate,
  }], saveOptions);

  return { account, transaction };
};

module.exports = {
  createTransactionAndUpdateBalance,
};
