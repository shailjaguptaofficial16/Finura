const mongoose = require('mongoose');
const Investment = require('../models/Investment');

// Helper to simulate realistic current market prices based on symbol and purchase price
const simulateCurrentPrice = (symbol, purchasePrice, assetType) => {
  const cleanSymbol = String(symbol || '').toUpperCase().trim();
  const numPrice = Number(purchasePrice) || 100;

  // Deterministic seed based on symbol character codes
  const charCodeSum = cleanSymbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Market volatility delta based on asset class
  let volatilitySpread = 15; // default 15%
  if (assetType === 'crypto') volatilitySpread = 30; // crypto has higher variance
  if (assetType === 'mutual_fund') volatilitySpread = 8; // mutual funds are steady

  const deltaPercent = ((charCodeSum % (volatilitySpread * 2)) - (volatilitySpread * 0.4)) / 100;
  const multiplier = 1 + deltaPercent;
  const simulated = Number((numPrice * multiplier).toFixed(2));

  return Math.max(simulated, 0.01);
};

// ─────────────────────────────────────────────
// @desc    Add a new investment holding (Buy asset)
// @route   POST /api/investments
// @access  Private
// ─────────────────────────────────────────────
const addInvestment = async (req, res, next) => {
  try {
    const { symbol, name, quantity, purchasePrice, assetType } = req.body;
    const userId = req.user._id || req.user.id;

    if (!symbol || !name || quantity === undefined || purchasePrice === undefined || !assetType) {
      return res.status(400).json({
        message: 'Please provide symbol, name, quantity, purchase price, and asset type',
      });
    }

    const numQuantity = Number(quantity);
    const numPrice = Number(purchasePrice);

    if (!Number.isFinite(numQuantity) || numQuantity <= 0) {
      return res.status(400).json({
        message: 'Quantity must be a positive number greater than 0',
      });
    }

    if (!Number.isFinite(numPrice) || numPrice <= 0) {
      return res.status(400).json({
        message: 'Purchase price must be a positive number greater than 0',
      });
    }

    const normalizedAssetType = String(assetType).toLowerCase().trim();
    if (!['stock', 'crypto', 'mutual_fund'].includes(normalizedAssetType)) {
      return res.status(400).json({
        message: "Asset type must be 'stock', 'crypto', or 'mutual_fund'",
      });
    }

    const holding = await Investment.create({
      user: userId,
      symbol: symbol.toUpperCase().trim(),
      name: name.trim(),
      quantity: numQuantity,
      purchasePrice: numPrice,
      assetType: normalizedAssetType,
    });

    const currentPrice = simulateCurrentPrice(holding.symbol, holding.purchasePrice, holding.assetType);
    const investedValue = Number((holding.quantity * holding.purchasePrice).toFixed(2));
    const currentValue = Number((holding.quantity * currentPrice).toFixed(2));
    const profitOrLoss = Number((currentValue - investedValue).toFixed(2));
    const profitOrLossPercentage = Number((((currentPrice - holding.purchasePrice) / holding.purchasePrice) * 100).toFixed(2));

    return res.status(201).json({
      ...holding.toObject(),
      currentPrice,
      investedValue,
      currentValue,
      profitOrLoss,
      profitOrLossPercentage,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Get all investment holdings with live stats & portfolio summary
// @route   GET /api/investments
// @access  Private
// ─────────────────────────────────────────────
const getInvestments = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const rawHoldings = await Investment.find({ user: userId }).sort({ createdAt: -1 });

    // Handle empty state gracefully
    if (!rawHoldings || rawHoldings.length === 0) {
      return res.status(200).json({
        holdings: [],
        summary: {
          totalPortfolioValue: 0,
          totalInvested: 0,
          totalProfitOrLoss: 0,
          totalProfitOrLossPercentage: 0,
          totalHoldings: 0,
          assetAllocation: [
            { type: 'stock', label: 'Stocks', value: 0, percentage: 0 },
            { type: 'crypto', label: 'Crypto', value: 0, percentage: 0 },
            { type: 'mutual_fund', label: 'Mutual Funds', value: 0, percentage: 0 },
          ],
        },
      });
    }

    let totalPortfolioValue = 0;
    let totalInvested = 0;

    const allocationMap = {
      stock: 0,
      crypto: 0,
      mutual_fund: 0,
    };

    const holdings = rawHoldings.map((holding) => {
      const currentPrice = simulateCurrentPrice(holding.symbol, holding.purchasePrice, holding.assetType);
      const investedValue = Number((holding.quantity * holding.purchasePrice).toFixed(2));
      const currentValue = Number((holding.quantity * currentPrice).toFixed(2));
      const profitOrLoss = Number((currentValue - investedValue).toFixed(2));
      const profitOrLossPercentage = Number((((currentPrice - holding.purchasePrice) / holding.purchasePrice) * 100).toFixed(2));

      totalInvested += investedValue;
      totalPortfolioValue += currentValue;

      if (allocationMap[holding.assetType] !== undefined) {
        allocationMap[holding.assetType] += currentValue;
      }

      return {
        ...holding.toObject(),
        currentPrice,
        investedValue,
        currentValue,
        profitOrLoss,
        profitOrLossPercentage,
      };
    });

    const totalProfitOrLoss = Number((totalPortfolioValue - totalInvested).toFixed(2));
    const totalProfitOrLossPercentage = totalInvested > 0
      ? Number(((totalProfitOrLoss / totalInvested) * 100).toFixed(2))
      : 0;

    const assetAllocation = Object.keys(allocationMap).map((type) => ({
      type,
      label: type === 'mutual_fund' ? 'Mutual Funds' : type === 'crypto' ? 'Crypto' : 'Stocks',
      value: Number(allocationMap[type].toFixed(2)),
      percentage: totalPortfolioValue > 0 ? Math.round((allocationMap[type] / totalPortfolioValue) * 100) : 0,
    }));

    return res.status(200).json({
      holdings,
      summary: {
        totalPortfolioValue: Number(totalPortfolioValue.toFixed(2)),
        totalInvested: Number(totalInvested.toFixed(2)),
        totalProfitOrLoss,
        totalProfitOrLossPercentage,
        totalHoldings: holdings.length,
        assetAllocation,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Sell / Remove an investment holding
// @route   DELETE /api/investments/:id
// @access  Private
// ─────────────────────────────────────────────
const deleteInvestment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid investment ID',
      });
    }

    const holding = await Investment.findOne({
      _id: id,
      user: userId,
    });

    if (!holding) {
      return res.status(404).json({
        message: 'Holding not found or unauthorized',
      });
    }

    await holding.deleteOne();

    return res.status(200).json({
      id,
      message: 'Holding removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addInvestment,
  getInvestments,
  deleteInvestment,
};
