const CreditCard = require('../models/CreditCard');
const Loan = require('../models/Loan');
const CreditScore = require('../models/CreditScore');
const CreditApplication = require('../models/CreditApplication');
const Repayment = require('../models/Repayment');
const { getCreditOverview } = require('./creditService');

const getCreditDashboard = async (userId) => {
  const [overview, creditCards, loans, repayments, applications, scoreTrend] = await Promise.all([
    getCreditOverview(userId),
    CreditCard.find({ user: userId }).select('-__v').sort({ createdAt: -1 }),
    Loan.find({ user: userId }).select('-__v').sort({ nextEMIDueDate: 1 }),
    Repayment.find({ user: userId }).populate('loan', 'name lender').sort({ dueDate: 1 }),
    CreditApplication.find({ user: userId }).select('-__v').sort({ applicationDate: -1, createdAt: -1 }).limit(20),
    CreditScore.find({ user: userId }).select('score category change provider scoreDate').sort({ scoreDate: 1 }).limit(24),
  ]);
  const upcomingEMIs = repayments.filter((item) => ['pending', 'partial'].includes(item.status));
  const overdueEMIs = repayments.filter((item) => item.status === 'overdue');
  return { overview, creditCards, loans, upcomingEMIs, overdueEMIs, applications, scoreTrend, analytics: { repaymentProgress: loans.length ? Number((loans.reduce((sum, loan) => sum + (1 - (loan.outstandingPrincipal / loan.principalAmount)), 0) / loans.length * 100).toFixed(2)) : 0, emiBurdenRatio: 0, onTimePaymentRate: repayments.length ? Number((repayments.filter((item) => item.status === 'paid').length / repayments.length * 100).toFixed(2)) : 0, totalInterestPayable: Number(loans.reduce((sum, loan) => sum + Number(loan.totalInterest || 0), 0).toFixed(2)) } };
};
module.exports = { getCreditDashboard };
