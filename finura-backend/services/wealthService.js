const Account = require('../models/Account');
const Asset = require('../models/Asset');
const CreditApplication = require('../models/CreditApplication');
const CreditCard = require('../models/CreditCard');
const Loan = require('../models/Loan');
const Investment = require('../models/Investment');
const Liability = require('../models/Liability');
const WealthSnapshot = require('../models/WealthSnapshot');
const { getCurrentPrice } = require('./investmentService');

const round = (value) => Number(Number(value || 0).toFixed(2));
const ALLOCATION_CATEGORIES = ['Cash', 'Investments', 'Real Estate', 'Gold', 'Vehicles', 'Business', 'Other'];

const getInvestmentValue = (investment) => (
  Number(investment.quantity || 0) * getCurrentPrice(investment)
);

const loadWealthData = async (userId) => {
  const [accounts, investments, assets, liabilities, creditApplications, creditCards, loans] = await Promise.all([
    Account.find({ user: userId, isActive: true }).select('type balance'),
    Investment.find({ user: userId }).select('symbol quantity purchasePrice buyPrice currentPrice investedAmount currentValue assetType type status'),
    Asset.find({ user: userId }).sort({ createdAt: -1 }),
    Liability.find({ user: userId }).sort({ createdAt: -1 }),
    CreditApplication.find({ user: userId, status: 'Approved' }).select('facilityType amount requestedAmount'),
    CreditCard.find({ user: userId, status: { $ne: 'closed' } }).select('outstandingBalance'),
    Loan.find({ user: userId, status: { $in: ['active', 'overdue'] } }).select('outstandingPrincipal'),
  ]);
  return { accounts, investments, assets, liabilities, creditApplications, creditCards, loans };
};

const calculateNetWorthFromData = ({ accounts, investments, assets, liabilities, creditApplications, creditCards = [], loans = [] }) => {

  const accountAssets = accounts
    .filter((account) => account.type !== 'Credit Card' && account.type !== 'Investment')
    .reduce((sum, account) => sum + Math.max(0, Number(account.balance || 0)), 0);
  const creditCardLiabilities = accounts
    .filter((account) => account.type === 'Credit Card')
    .reduce((sum, account) => sum + Math.max(0, -Number(account.balance || 0)), 0);
  const investmentValue = investments.reduce((sum, investment) => sum + getInvestmentValue(investment), 0);
  const manualAssets = assets.reduce((sum, asset) => sum + Number(asset.currentValue || 0), 0);
  const manualLiabilities = liabilities.reduce((sum, liability) => sum + Number(liability.outstandingAmount || 0), 0);
  const approvedCredit = creditApplications.reduce(
    (sum, application) => sum + Number(application.amount || application.requestedAmount || 0),
    0
  );
  const dedicatedCredit = creditCards.reduce((sum, card) => sum + Number(card.outstandingBalance || 0), 0);
  const loanOutstanding = loans.reduce((sum, loan) => sum + Number(loan.outstandingPrincipal || 0), 0);

  const totalAssets = round(accountAssets + investmentValue + manualAssets);
  const totalLiabilities = round(creditCardLiabilities + approvedCredit + dedicatedCredit + loanOutstanding + manualLiabilities);
  const assetBreakdown = {
    accounts: round(accountAssets),
    investments: round(investmentValue),
    manualAssets: round(manualAssets),
  };
  const liabilityBreakdown = {
    credit: round(creditCardLiabilities + approvedCredit + dedicatedCredit),
    loans: round(loanOutstanding),
    manualLiabilities: round(manualLiabilities),
  };

  return {
    totalAssets,
    totalLiabilities,
    netWorth: round(totalAssets - totalLiabilities),
    assetBreakdown,
    liabilityBreakdown,
    lastUpdated: new Date().toISOString(),
  };
};

const calculateNetWorth = async (userId) => calculateNetWorthFromData(await loadWealthData(userId));

const calculateAllocationFromData = (data) => {
  const { accounts, investments, assets } = data;
  const amounts = Object.fromEntries(ALLOCATION_CATEGORIES.map((category) => [category, 0]));
  amounts.Cash = accounts
    .filter((account) => account.type !== 'Credit Card' && account.type !== 'Investment')
    .reduce((sum, account) => sum + Math.max(0, Number(account.balance || 0)), 0);
  amounts.Investments = investments.reduce((sum, investment) => sum + getInvestmentValue(investment), 0);
  assets.forEach((asset) => {
    const category = asset.category === 'Vehicle' ? 'Vehicles' : ALLOCATION_CATEGORIES.includes(asset.category) ? asset.category : 'Other';
    amounts[category] += Number(asset.currentValue || 0);
  });

  const totalAssets = round(Object.values(amounts).reduce((sum, amount) => sum + amount, 0));
  const allocation = ALLOCATION_CATEGORIES.map((category) => ({
    category,
    amount: round(amounts[category]),
    percentage: totalAssets > 0 ? round((amounts[category] / totalAssets) * 100) : 0,
  }));
  const shares = allocation.filter((item) => item.amount > 0).map((item) => item.amount / totalAssets);
  const diversificationScore = totalAssets > 0 ? round((1 - shares.reduce((sum, share) => sum + (share ** 2), 0)) * 100) : 0;
  const riskLevel = totalAssets === 0 ? 'moderate' : diversificationScore >= 60 ? 'low' : diversificationScore >= 30 ? 'moderate' : 'high';

  return { totalAssets, allocation, diversificationScore, riskLevel };
};

const calculateAllocation = async (userId) => calculateAllocationFromData(await loadWealthData(userId));

const normalizeSnapshotDate = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    const error = new Error('Invalid snapshot date');
    error.statusCode = 400;
    throw error;
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const createWealthSnapshot = async (userId, snapshotDate) => {
  const netWorth = await calculateNetWorth(userId);
  const snapshot = await WealthSnapshot.create({
    user: userId,
    totalAssets: netWorth.totalAssets,
    totalLiabilities: netWorth.totalLiabilities,
    netWorth: netWorth.netWorth,
    snapshotDate: normalizeSnapshotDate(snapshotDate),
  });
  return snapshot;
};

const getWealthSnapshots = async (userId, { from, to } = {}) => {
  const query = { user: userId };
  if (from || to) query.snapshotDate = {};
  if (from) query.snapshotDate.$gte = normalizeSnapshotDate(from);
  if (to) query.snapshotDate.$lte = normalizeSnapshotDate(to);
  return WealthSnapshot.find(query).sort({ snapshotDate: 1 });
};

const getGrowthPercent = (current, previous) => {
  if (!previous) return 0;
  return round(((current - previous) / previous) * 100);
};

const getWealthGrowth = async (userId, currentNetWorth = null) => {
  const current = currentNetWorth === null ? await calculateNetWorth(userId) : { netWorth: currentNetWorth };
  const snapshots = await WealthSnapshot.find({ user: userId }).sort({ snapshotDate: -1 });
  const now = new Date();
  const monthlyBoundary = new Date(now);
  monthlyBoundary.setUTCMonth(monthlyBoundary.getUTCMonth() - 1);
  const yearlyBoundary = new Date(now);
  yearlyBoundary.setUTCFullYear(yearlyBoundary.getUTCFullYear() - 1);
  const previous = snapshots[0] || null;
  const monthly = snapshots.find((snapshot) => snapshot.snapshotDate <= monthlyBoundary) || null;
  const yearly = snapshots.find((snapshot) => snapshot.snapshotDate <= yearlyBoundary) || null;

  const snapshotGrowth = (boundary) => snapshots
    .filter((snapshot) => snapshot.snapshotDate >= boundary)
    .sort((left, right) => left.snapshotDate - right.snapshotDate)
    .map((snapshot) => ({ date: snapshot.snapshotDate, netWorth: snapshot.netWorth }));

  return {
    currentNetWorth: current.netWorth,
    previousNetWorth: previous?.netWorth || 0,
    absoluteGrowth: round(current.netWorth - (previous?.netWorth || 0)),
    growthPercentage: getGrowthPercent(current.netWorth, previous?.netWorth || 0),
    monthlyGrowth: snapshotGrowth(monthlyBoundary),
    monthlyGrowthAmount: round(current.netWorth - (monthly?.netWorth || current.netWorth)),
    monthlyGrowthPercentage: getGrowthPercent(current.netWorth, monthly?.netWorth || 0),
    yearlyGrowth: snapshotGrowth(yearlyBoundary),
    yearlyGrowthAmount: round(current.netWorth - (yearly?.netWorth || current.netWorth)),
    yearlyGrowthPercentage: getGrowthPercent(current.netWorth, yearly?.netWorth || 0),
    snapshotCount: snapshots.length,
    lastSnapshotDate: previous?.snapshotDate || null,
  };
};

const getWealthOverview = async (userId) => {
  const data = await loadWealthData(userId);
  const netWorth = calculateNetWorthFromData(data);
  const [growth, allocation] = await Promise.all([
    getWealthGrowth(userId, netWorth.netWorth),
    Promise.resolve(calculateAllocationFromData(data)),
  ]);
  return {
    netWorth,
    growth,
    allocation,
    assets: data.assets,
    liabilities: data.liabilities,
  };
};

module.exports = {
  calculateNetWorth,
  calculateAllocation,
  getWealthOverview,
  createWealthSnapshot,
  getWealthSnapshots,
  getWealthGrowth,
};