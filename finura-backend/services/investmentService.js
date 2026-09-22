const Investment = require('../models/Investment');
const InvestmentTransaction = require('../models/InvestmentTransaction');
const SIP = require('../models/SIP');

const round = (value) => Number(Number(value || 0).toFixed(2));
const normalizeType = (holding) => holding.type || holding.assetType || 'other';
const getBuyPrice = (holding) => Number(holding.buyPrice ?? holding.purchasePrice ?? 0);
const getCurrentPrice = (holding) => Number(holding.currentPrice ?? getBuyPrice(holding));
const TYPE_KEYS = ['stocks', 'mutualFunds', 'etfs', 'bonds', 'crypto', 'gold', 'fixedDeposits', 'other'];
const typeKey = (type) => ({ stock: 'stocks', mutual_fund: 'mutualFunds', etf: 'etfs', bond: 'bonds', crypto: 'crypto', gold: 'gold', fixed_deposit: 'fixedDeposits' }[type] || 'other');

const calculateHolding = (holding) => {
  const quantity = Number(holding.quantity || 0);
  const buyPrice = getBuyPrice(holding);
  const currentPrice = getCurrentPrice(holding);
  const investedAmount = round(quantity * buyPrice);
  const currentValue = round(quantity * currentPrice);
  return {
    ...holding.toObject(), type: normalizeType(holding), buyPrice, currentPrice, investedAmount, currentValue,
    profitLoss: round(currentValue - investedAmount), profitOrLoss: round(currentValue - investedAmount),
    profitLossPercentage: investedAmount > 0 ? round(((currentValue - investedAmount) / investedAmount) * 100) : 0,
    status: quantity > 0 ? 'active' : 'closed',
  };
};

const getPortfolioValuation = async (userId) => {
  const holdings = await Investment.find({ user: userId }).sort({ createdAt: -1 });
  const values = holdings.filter((holding) => Number(holding.quantity || 0) > 0 && holding.status !== 'closed').map(calculateHolding);
  const totalInvested = round(values.reduce((sum, holding) => sum + holding.investedAmount, 0));
  const currentValue = round(values.reduce((sum, holding) => sum + holding.currentValue, 0));
  const breakdown = Object.fromEntries(TYPE_KEYS.map((key) => [key, 0]));
  values.forEach((holding) => { const key = typeKey(holding.type); breakdown[key] = round(breakdown[key] + holding.currentValue); });
  const unrealizedProfitLoss = round(currentValue - totalInvested);
  return { totalInvested, currentValue, unrealizedProfitLoss, returnPercentage: totalInvested > 0 ? round((unrealizedProfitLoss / totalInvested) * 100) : 0, holdingsCount: values.length, breakdown, holdings: values };
};

const getPerformance = async (userId) => {
  const [portfolio, transactions] = await Promise.all([
    getPortfolioValuation(userId),
    InvestmentTransaction.find({ user: userId }).populate('investment', 'type assetType symbol name').sort({ transactionDate: 1, createdAt: 1 }),
  ]);
  const realized = Object.fromEntries(TYPE_KEYS.map((key) => [key, { investedAmount: 0, profitLoss: 0 }]));
  const averageCosts = new Map();
  transactions.forEach((transaction) => {
    const holding = transaction.investment;
    if (!holding) return;
    const key = typeKey(normalizeType(holding));
    const quantity = Number(transaction.quantity || 0);
    const price = Number(transaction.price || 0);
    const fees = Number(transaction.fees || 0);
    const state = averageCosts.get(String(holding._id)) || { quantity: 0, cost: 0 };
    if (transaction.type === 'buy') {
      state.quantity += quantity;
      state.cost += quantity * price + fees;
    } else {
      const averageCost = state.quantity > 0 ? state.cost / state.quantity : 0;
      const costBasis = quantity * averageCost;
      realized[key].investedAmount += costBasis;
      realized[key].profitLoss += quantity * price - costBasis - fees;
      state.quantity = Math.max(0, state.quantity - quantity);
      state.cost = Math.max(0, state.cost - costBasis);
    }
    averageCosts.set(String(holding._id), state);
  });
  const breakdown = Object.fromEntries(TYPE_KEYS.map((key) => [key, {
    realizedProfitLoss: round(realized[key].profitLoss),
    unrealizedProfitLoss: round(portfolio.holdings.filter((holding) => typeKey(holding.type) === key).reduce((sum, holding) => sum + holding.profitLoss, 0)),
    totalProfitLoss: 0,
  }]));
  Object.values(breakdown).forEach((item) => { item.totalProfitLoss = round(item.realizedProfitLoss + item.unrealizedProfitLoss); });
  const realizedProfitLoss = round(Object.values(breakdown).reduce((sum, item) => sum + item.realizedProfitLoss, 0));
  const unrealizedProfitLoss = portfolio.unrealizedProfitLoss;
  const totalProfitLoss = round(realizedProfitLoss + unrealizedProfitLoss);
  const totalInvested = round(portfolio.totalInvested + Object.values(realized).reduce((sum, item) => sum + item.investedAmount, 0));
  return { realizedProfitLoss, unrealizedProfitLoss, totalProfitLoss, realizedReturnPercentage: totalInvested > 0 ? round((realizedProfitLoss / totalInvested) * 100) : 0, unrealizedReturnPercentage: portfolio.totalInvested > 0 ? round((unrealizedProfitLoss / portfolio.totalInvested) * 100) : 0, totalReturnPercentage: totalInvested > 0 ? round((totalProfitLoss / totalInvested) * 100) : 0, breakdown };
};

const getInvestmentOverview = async (userId) => {
  const [portfolio, performance, sips] = await Promise.all([
    getPortfolioValuation(userId), getPerformance(userId), SIP.find({ user: userId }).populate('mutualFund', 'name symbol schemeCode').sort({ nextDueDate: 1 }),
  ]);
  const active = sips.filter((sip) => sip.status === 'active');
  return {
    portfolio: { totalInvested: portfolio.totalInvested, currentValue: portfolio.currentValue, unrealizedProfitLoss: portfolio.unrealizedProfitLoss, returnPercentage: portfolio.returnPercentage, holdingsCount: portfolio.holdingsCount },
    performance: { realizedProfitLoss: performance.realizedProfitLoss, unrealizedProfitLoss: performance.unrealizedProfitLoss, totalProfitLoss: performance.totalProfitLoss, totalReturnPercentage: performance.totalReturnPercentage },
    allocation: Object.entries(portfolio.breakdown).map(([type, value]) => ({ type, value, percentage: portfolio.currentValue > 0 ? round((value / portfolio.currentValue) * 100) : 0 })),
    holdings: portfolio.holdings, mutualFunds: portfolio.holdings.filter((holding) => holding.type === 'mutual_fund'),
    sips: { active: active.length, paused: sips.filter((sip) => sip.status === 'paused').length, cancelled: sips.filter((sip) => sip.status === 'cancelled').length, totalMonthlyAmount: round(active.filter((sip) => sip.frequency === 'monthly').reduce((sum, sip) => sum + Number(sip.amount || 0), 0)), upcoming: active.slice(0, 5) },
    marketStatus: { isAvailable: true, lastUpdated: new Date().toISOString(), dataType: 'delayed' },
  };
};

module.exports = { calculateHolding, getPortfolioValuation, getPerformance, getInvestmentOverview, getBuyPrice, getCurrentPrice };
