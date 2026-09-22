const CreditCard = require('../models/CreditCard');
const Loan = require('../models/Loan');
const CreditScore = require('../models/CreditScore');

const round = (value) => Number(Number(value || 0).toFixed(2));
const getCreditOverview = async (userId) => {
  const [cards, loans, latestScore] = await Promise.all([
    CreditCard.find({ user: userId, status: { $ne: 'closed' } }).sort({ createdAt: -1 }),
    Loan.find({ user: userId, status: { $in: ['active', 'overdue'] } }).sort({ nextEMIDueDate: 1 }),
    CreditScore.findOne({ user: userId }).sort({ scoreDate: -1, createdAt: -1 }),
  ]);
  const totalCreditLimit = round(cards.reduce((sum, card) => sum + Number(card.creditLimit || 0), 0));
  const totalOutstanding = round(cards.reduce((sum, card) => sum + Number(card.outstandingBalance || 0), 0) + loans.reduce((sum, loan) => sum + Number(loan.outstandingPrincipal || 0), 0));
  const totalMonthlyEMI = round(loans.reduce((sum, loan) => sum + Number(loan.emiAmount || 0), 0));
  const nextEMI = loans.filter((loan) => loan.nextEMIDueDate).sort((a, b) => a.nextEMIDueDate - b.nextEMIDueDate)[0];
  return { totalCreditLimit, totalOutstanding, availableCredit: round(totalCreditLimit - cards.reduce((sum, card) => sum + Number(card.outstandingBalance || 0), 0)), creditUtilization: totalCreditLimit > 0 ? round((cards.reduce((sum, card) => sum + Number(card.outstandingBalance || 0), 0) / totalCreditLimit) * 100) : 0, activeCreditCards: cards.filter((card) => card.status === 'active').length, activeLoans: loans.length, totalMonthlyEMI, latestCreditScore: latestScore ? { score: latestScore.score, category: latestScore.category, change: latestScore.change, provider: latestScore.provider, scoreDate: latestScore.scoreDate } : null, nextEMIDue: nextEMI?.nextEMIDueDate || null };
};

module.exports = { getCreditOverview };
