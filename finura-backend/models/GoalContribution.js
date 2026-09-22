const mongoose = require('mongoose');

const goalContributionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    goal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal',
      required: true,
      index: true,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
  },
  { timestamps: true }
);

goalContributionSchema.index({ user: 1, goal: 1, createdAt: -1 });

module.exports = mongoose.model('GoalContribution', goalContributionSchema);
