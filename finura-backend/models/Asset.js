const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required for asset ownership'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Asset name is required'],
      trim: true,
      maxlength: [120, 'Asset name cannot exceed 120 characters'],
    },
    category: {
      type: String,
      enum: ['Cash', 'Real Estate', 'Gold', 'Vehicle', 'Business', 'Other'],
      required: [true, 'Asset category is required'],
    },
    currentValue: {
      type: Number,
      required: [true, 'Current asset value is required'],
      min: [0, 'Current asset value cannot be negative'],
    },
    purchaseValue: {
      type: Number,
      min: [0, 'Purchase value cannot be negative'],
      default: 0,
    },
    purchaseDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Asset notes cannot exceed 1000 characters'],
      default: '',
    },
  },
  { timestamps: true }
);

assetSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Asset', assetSchema);