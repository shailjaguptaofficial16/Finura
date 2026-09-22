const mongoose = require('mongoose');
const Investment = require('../models/Investment');
const InvestmentTransaction = require('../models/InvestmentTransaction');
const { sendSuccess } = require('../middleware/errorMiddleware');
const { calculateHolding, getPortfolioValuation, getPerformance, getInvestmentOverview, getBuyPrice } = require('../services/investmentService');

const TYPES = ['stock', 'mutual_fund', 'etf', 'bond', 'crypto', 'gold', 'fixed_deposit', 'other'];
const getUserId = (req) => req.user._id || req.user.id;
const idIsValid = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeInput = (body) => {
  const type = String(body.type || body.assetType || '').toLowerCase().trim();
  const buyPrice = Number(body.buyPrice ?? body.purchasePrice);
  const quantity = Number(body.quantity);
  const currentPrice = body.currentPrice === undefined || body.currentPrice === null ? buyPrice : Number(body.currentPrice);
  if (!body.name || !TYPES.includes(type) || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(buyPrice) || buyPrice < 0 || !Number.isFinite(currentPrice) || currentPrice < 0) {
    const error = new Error('Provide a valid name, investment type, positive quantity, and non-negative prices');
    error.statusCode = 400;
    throw error;
  }
  return {
    name: String(body.name).trim(),
    symbol: String(body.symbol || body.name).trim().toUpperCase(),
    type,
    assetType: type,
    quantity,
    buyPrice,
    purchasePrice: buyPrice,
    currentPrice,
    purchaseDate: body.purchaseDate || null,
    platform: body.platform || '',
    notes: body.notes || '',
    status: 'active',
  };
};

const addInvestment = async (req, res, next) => {
  let holding;
  try {
    holding = await Investment.create({ ...normalizeInput(req.body), user: getUserId(req) });
    await InvestmentTransaction.create({
      user: getUserId(req), investment: holding._id, type: 'buy', quantity: holding.quantity,
      price: holding.buyPrice, totalAmount: holding.quantity * holding.buyPrice, transactionDate: holding.purchaseDate || new Date(),
    });
    return sendSuccess(res, calculateHolding(holding), 201);
  } catch (error) {
    if (holding?._id) await Investment.deleteOne({ _id: holding._id, user: getUserId(req) });
    return next(error);
  }
};

const getInvestments = async (req, res, next) => {
  try {
    const holdings = await Investment.find({ user: getUserId(req) }).sort({ createdAt: -1 });
    const calculated = holdings.map(calculateHolding);
    const portfolio = await getPortfolioValuation(getUserId(req));
    return res.status(200).json({ holdings: calculated, summary: {
      totalPortfolioValue: portfolio.currentValue,
      totalInvested: portfolio.totalInvested,
      totalProfitOrLoss: portfolio.unrealizedProfitLoss,
      totalProfitOrLossPercentage: portfolio.returnPercentage,
      totalHoldings: portfolio.holdingsCount,
      assetAllocation: Object.entries(portfolio.breakdown).map(([type, value]) => ({ type, value })),
    } });
  } catch (error) {
    return next(error);
  }
};

const getInvestment = async (req, res, next) => {
  try {
    if (!idIsValid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid investment ID' });
    const holding = await Investment.findOne({ _id: req.params.id, user: getUserId(req) });
    if (!holding) return res.status(404).json({ success: false, message: 'Holding not found' });
    return sendSuccess(res, calculateHolding(holding));
  } catch (error) {
    return next(error);
  }
};

const updateInvestment = async (req, res, next) => {
  try {
    if (!idIsValid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid investment ID' });
    const holding = await Investment.findOne({ _id: req.params.id, user: getUserId(req) });
    if (!holding) return res.status(404).json({ success: false, message: 'Holding not found' });
    const allowed = ['name', 'symbol', 'type', 'assetType', 'quantity', 'buyPrice', 'purchasePrice', 'currentPrice', 'purchaseDate', 'platform', 'notes'];
    allowed.forEach((field) => { if (req.body[field] !== undefined) holding[field] = req.body[field]; });
    const normalized = normalizeInput(holding.toObject());
    Object.assign(holding, normalized);
    await holding.save();
    return sendSuccess(res, calculateHolding(holding));
  } catch (error) {
    return next(error);
  }
};

const deleteInvestment = async (req, res, next) => {
  try {
    if (!idIsValid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid investment ID' });
    const holding = await Investment.findOneAndUpdate({ _id: req.params.id, user: getUserId(req) }, { $set: { quantity: 0, status: 'closed' } }, { new: true });
    if (!holding) return res.status(404).json({ success: false, message: 'Holding not found' });
    return sendSuccess(res, calculateHolding(holding), 200, 'Holding closed successfully');
  } catch (error) {
    return next(error);
  }
};

const getPortfolio = async (req, res, next) => {
  try { return sendSuccess(res, await getPortfolioValuation(getUserId(req))); } catch (error) { return next(error); }
};

const getInvestmentPerformance = async (req, res, next) => {
  try { return sendSuccess(res, await getPerformance(getUserId(req))); } catch (error) { return next(error); }
};

const getInvestmentDashboardOverview = async (req, res, next) => {
  try { return sendSuccess(res, await getInvestmentOverview(getUserId(req))); } catch (error) { return next(error); }
};

const createTransaction = (type) => async (req, res, next) => {
  let original;
  try {
    const { investmentId, quantity, price, fees = 0, transactionDate, notes } = req.body;
    if (!idIsValid(investmentId)) return res.status(400).json({ success: false, message: 'Valid investment ID is required' });
    const amount = Number(quantity);
    const executionPrice = Number(price);
    const transactionFees = Number(fees);
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(executionPrice) || executionPrice < 0 || !Number.isFinite(transactionFees) || transactionFees < 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be positive and price/fees cannot be negative' });
    }
    const query = { _id: investmentId, user: getUserId(req), ...(type === 'sell' ? { quantity: { $gte: amount }, status: 'active' } : {}) };
    const holding = await Investment.findOne(query);
    if (!holding) return res.status(type === 'sell' ? 400 : 404).json({ success: false, message: type === 'sell' ? 'Insufficient holding quantity' : 'Holding not found' });
    original = {
      quantity: holding.quantity,
      buyPrice: getBuyPrice(holding),
      purchasePrice: holding.purchasePrice,
      investedAmount: holding.investedAmount,
      currentValue: holding.currentValue,
      status: holding.status,
    };
    if (type === 'buy') {
      const oldCost = holding.quantity * getBuyPrice(holding);
      holding.quantity += amount;
      holding.buyPrice = (oldCost + (amount * executionPrice) + transactionFees) / holding.quantity;
      holding.purchasePrice = holding.buyPrice;
    } else {
      holding.quantity -= amount;
      if (holding.quantity === 0) holding.status = 'closed';
    }
    holding.investedAmount = holding.quantity * holding.buyPrice;
    holding.currentValue = holding.quantity * (holding.currentPrice ?? holding.buyPrice);
    await holding.save();
    const transaction = await InvestmentTransaction.create({ user: getUserId(req), investment: holding._id, type, quantity: amount, price: executionPrice, fees: transactionFees, totalAmount: (amount * executionPrice) + transactionFees, transactionDate, notes });
    return sendSuccess(res, { transaction, holding: calculateHolding(holding) }, 201);
  } catch (error) {
    if (original) await Investment.updateOne({ _id: req.body.investmentId, user: getUserId(req) }, { $set: original });
    return next(error);
  }
};

const getTransactions = async (req, res, next) => {
  try { return sendSuccess(res, await InvestmentTransaction.find({ user: getUserId(req) }).populate('investment', 'name symbol type assetType').sort({ transactionDate: -1, createdAt: -1 })); } catch (error) { return next(error); }
};

const getTransaction = async (req, res, next) => {
  try {
    if (!idIsValid(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid transaction ID' });
    const transaction = await InvestmentTransaction.findOne({ _id: req.params.id, user: getUserId(req) }).populate('investment', 'name symbol type assetType');
    if (!transaction) return res.status(404).json({ success: false, message: 'Investment transaction not found' });
    return sendSuccess(res, transaction);
  } catch (error) { return next(error); }
};

module.exports = {
  addInvestment, getInvestments, getInvestment, updateInvestment, deleteInvestment, getPortfolio,
  getInvestmentPerformance, buyInvestment: createTransaction('buy'), sellInvestment: createTransaction('sell'),
  getTransactions, getTransaction, getInvestmentDashboardOverview,
};