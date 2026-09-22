const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for investment holding'],
      index: true,
    },
    symbol: {
      type: String,
      required: [true, 'Asset symbol is required (e.g. AAPL, BTC)'],
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Asset name is required (e.g. Apple Inc., Bitcoin)'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.000001, 'Quantity must be greater than 0'],
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Purchase price is required'],
      min: [0.01, 'Purchase price must be greater than 0'],
    },
    assetType: {
      type: String,
      enum: {
        values: ['stock', 'crypto', 'mutual_fund'],
        message: "Asset type must be 'stock', 'crypto', or 'mutual_fund'",
      },
      required: [true, 'Asset type is required'],
      lowercase: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
investmentSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Investment', investmentSchema);
