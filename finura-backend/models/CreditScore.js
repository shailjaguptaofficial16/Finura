const mongoose = require('mongoose');

const getScoreCategory = (score) => score < 550 ? 'Poor' : score < 650 ? 'Fair' : score < 750 ? 'Good' : score < 800 ? 'Very Good' : 'Excellent';
const creditScoreSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  score: { type: Number, required: true, min: 300, max: 900 },
  provider: { type: String, enum: ['CIBIL', 'Experian', 'Equifax', 'CRIF', 'Other'], required: true },
  scoreDate: { type: Date, required: true, validate: { validator: (value) => value <= new Date(), message: 'Score date cannot be in the future' } },
  previousScore: { type: Number, min: 300, max: 900, default: null },
  change: { type: Number, default: 0 },
  category: { type: String, enum: ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'] },
  notes: { type: String, trim: true, maxlength: 1000, default: '' },
}, { timestamps: true });
creditScoreSchema.pre('validate', function deriveScore(next) { this.change = this.previousScore === null ? 0 : this.score - this.previousScore; this.category = getScoreCategory(this.score); next(); });
creditScoreSchema.index({ user: 1, scoreDate: -1 });

module.exports = mongoose.model('CreditScore', creditScoreSchema);