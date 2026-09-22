const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for investment holding'],
      index: true,
    },
    symbol: { type: String, uppercase: true, trim: true, default: '' },
    name: {
      type: String,
      required: [true, 'Asset name is required (e.g. Apple Inc., Bitcoin)'],
      trim: true,
    },
    quantity: { type: Number, required: true, min: [0, 'Quantity cannot be negative'] },
    type: {
      type: String,
      enum: ['stock', 'mutual_fund', 'etf', 'bond', 'crypto', 'gold', 'fixed_deposit', 'other'],
      required: [true, 'Investment type is required'],
      lowercase: true,
      trim: true,
    },
    assetType: { type: String, lowercase: true, trim: true },
    buyPrice: { type: Number, min: [0, 'Buy price cannot be negative'] },
    purchasePrice: { type: Number, min: [0, 'Purchase price cannot be negative'] },
    currentPrice: { type: Number, min: [0, 'Current price cannot be negative'], default: null },
    investedAmount: { type: Number, min: 0, default: 0 },
    currentValue: { type: Number, min: 0, default: 0 },
    purchaseDate: { type: Date, default: null },
    platform: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    fundHouse: { type: String, trim: true, default: '' },
    category: { type: String, trim: true, default: '' },
    schemeCode: { type: String, trim: true, default: '' },
    folioNumber: { type: String, trim: true, default: '' },
    units: { type: Number, min: 0, default: 0 },
    averageNav: { type: Number, min: 0, default: 0 },
    currentNav: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: ['active', 'closed'], default: 'active' },
  },
  {
    timestamps: true,
  }
);

// Indexes
investmentSchema.index({ user: 1, createdAt: -1 });
investmentSchema.index({ user: 1, symbol: 1, type: 1 });

investmentSchema.pre('validate', function syncInvestmentFields(next) {
  if (!this.type && this.assetType) this.type = this.assetType;
  if (!this.assetType && this.type) this.assetType = this.type;
  if (this.buyPrice === undefined && this.purchasePrice !== undefined) this.buyPrice = this.purchasePrice;
  if (this.purchasePrice === undefined && this.buyPrice !== undefined) this.purchasePrice = this.buyPrice;
  if (this.type === 'mutual_fund' && !this.symbol) this.symbol = this.name;
  if (this.quantity === undefined || this.buyPrice === undefined) return next();
  this.investedAmount = Number((this.quantity * this.buyPrice).toFixed(2));
  const price = this.currentPrice === null || this.currentPrice === undefined ? this.buyPrice : this.currentPrice;
  this.currentValue = Number((this.quantity * price).toFixed(2));
  if (this.type === 'mutual_fund') {
    this.units = this.quantity;
    this.averageNav = this.buyPrice;
    this.currentNav = price;
  }
  this.status = this.quantity > 0 ? 'active' : 'closed';
  return next();
});

module.exports = mongoose.model('Investment', investmentSchema);
