const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user:{
    
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required for transaction ownership'],
      index: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Account ID is required for transaction'],
      index: true,
    },
    toAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: function () {
        return this.type === 'transfer';
      },
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      enum: {
        values: ['income', 'expense', 'investment', 'transfer'],
        message: 'Transaction type must be income, expense, investment, or transfer',
      },
      required: [true, 'Transaction type is required'],
      lowercase: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    category: {
      type: String,
      required: [true, 'Transaction category is required'],
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to ensure title and description are populated cleanly
transactionSchema.pre('save', function (next) {
  if (!this.title && this.description) {
    this.title = this.description;
  } else if (!this.description && this.title) {
    this.description = this.title;
  } else if (!this.title && !this.description) {
    this.title = `${this.category} ${this.type === 'income' ? 'Income' : 'Expense'}`;
    this.description = this.title;
  }
  next();
});

// Indexes
transactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
