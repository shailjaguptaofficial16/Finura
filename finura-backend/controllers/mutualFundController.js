const Investment = require('../models/Investment');
const { sendSuccess } = require('../middleware/errorMiddleware');
const { calculateHolding } = require('../services/investmentService');

const userId = (req) => req.user._id || req.user.id;
const getFund = (req, id = req.params.id) => Investment.findOne({ _id: id, user: userId(req), type: 'mutual_fund' });

const normalizeFund = (body) => {
  const units = Number(body.units);
  const averageNav = Number(body.averageNav);
  const currentNav = Number(body.currentNav ?? body.averageNav);
  if (!body.name || !Number.isFinite(units) || units <= 0 || !Number.isFinite(averageNav) || averageNav < 0 || !Number.isFinite(currentNav) || currentNav < 0) {
    const error = new Error('Provide a valid fund name, positive units, and non-negative NAV values');
    error.statusCode = 400;
    throw error;
  }
  return {
    name: String(body.name).trim(), type: 'mutual_fund', assetType: 'mutual_fund',
    symbol: String(body.schemeCode || body.name).trim().toUpperCase(),
    quantity: units, units, buyPrice: averageNav, purchasePrice: averageNav, currentPrice: currentNav,
    averageNav, currentNav, fundHouse: body.fundHouse || '', category: body.category || '', schemeCode: body.schemeCode || '',
    folioNumber: body.folioNumber || '', platform: body.platform || '', notes: body.notes || '',
  };
};

const createMutualFund = async (req, res, next) => {
  try { return sendSuccess(res, calculateHolding(await Investment.create({ ...normalizeFund(req.body), user: userId(req) })), 201); } catch (error) { return next(error); }
};
const getMutualFunds = async (req, res, next) => {
  try { return sendSuccess(res, (await Investment.find({ user: userId(req), type: 'mutual_fund' }).sort({ createdAt: -1 })).map(calculateHolding)); } catch (error) { return next(error); }
};
const getMutualFund = async (req, res, next) => {
  try { const fund = await getFund(req); if (!fund) return res.status(404).json({ success: false, message: 'Mutual fund holding not found' }); return sendSuccess(res, calculateHolding(fund)); } catch (error) { return next(error); }
};
const updateMutualFund = async (req, res, next) => {
  try {
    const fund = await getFund(req);
    if (!fund) return res.status(404).json({ success: false, message: 'Mutual fund holding not found' });
    const updated = normalizeFund({ ...fund.toObject(), ...req.body });
    Object.assign(fund, updated);
    await fund.save();
    return sendSuccess(res, calculateHolding(fund));
  } catch (error) { return next(error); }
};
const deleteMutualFund = async (req, res, next) => {
  try { const fund = await getFund(req); if (!fund) return res.status(404).json({ success: false, message: 'Mutual fund holding not found' }); fund.quantity = 0; fund.status = 'closed'; await fund.save(); return sendSuccess(res, calculateHolding(fund)); } catch (error) { return next(error); }
};

module.exports = { createMutualFund, getMutualFunds, getMutualFund, updateMutualFund, deleteMutualFund };