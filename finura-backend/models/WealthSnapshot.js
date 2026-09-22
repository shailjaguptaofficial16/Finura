const mongoose = require('mongoose');

const wealthSnapshotSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required for snapshot ownership'],
      index: true,
    },
    totalAssets: { type: Number, required: true, min: 0 },
    totalLiabilities: { type: Number, required: true, min: 0 },
    netWorth: { type: Number, required: true },
    snapshotDate: { type: Date, required: true },
  },
  { timestamps: true }
);

wealthSnapshotSchema.index({ user: 1, snapshotDate: -1 }, { unique: true });

module.exports = mongoose.model('WealthSnapshot', wealthSnapshotSchema);