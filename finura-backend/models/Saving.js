const mongoose = require('mongoose');

const savingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required for saving ownership'],
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
    isContribution: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
      required: [true, 'Saving name is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Saving amount is required'],
      min: [0.01, 'Saving amount must be greater than 0'],
    },
    type: {
      type: String,
      enum: {
        values: ['manual', 'automatic', 'goal'],
        message: 'Saving type must be manual, automatic, or goal',
      },
      required: [true, 'Saving type is required'],
      lowercase: true,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

savingSchema.index({ user: 1 });
savingSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('Saving', savingSchema);
