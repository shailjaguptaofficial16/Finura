const Repayment = require('../models/Repayment');
const Loan = require('../models/Loan');

const round = (value) => Number(Number(value || 0).toFixed(2));
const generateRepayments = async (userId, loan) => {
  const monthlyRate = Number(loan.interestRate) / 12 / 100;
  const emi = Number(loan.emiAmount || 0);
  const start = new Date(loan.startDate || new Date());
  const rows = [];
  let balance = Number(loan.principalAmount || 0);
  for (let installmentNumber = 1; installmentNumber <= loan.tenureMonths; installmentNumber += 1) {
    const interest = monthlyRate === 0 ? 0 : balance * monthlyRate;
    const principal = Math.min(balance, Math.max(0, emi - interest));
    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + installmentNumber);
    rows.push({ user: userId, loan: loan._id, installmentNumber, dueDate, emiAmount: round(emi), principalAmount: round(principal), interestAmount: round(interest) });
    balance = Math.max(0, balance - principal);
  }
  return Repayment.insertMany(rows, { ordered: false });
};
const refreshOverdue = async (userId) => { await Repayment.updateMany({ user: userId, status: 'pending', dueDate: { $lt: new Date() } }, { $set: { status: 'overdue' } }); };
module.exports = { generateRepayments, refreshOverdue };
