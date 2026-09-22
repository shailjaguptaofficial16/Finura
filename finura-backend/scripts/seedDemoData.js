const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Goal = require('../models/Goal');
const Investment = require('../models/Investment');
const Saving = require('../models/Saving');
const EmergencyFund = require('../models/EmergencyFund');
const SIP = require('../models/SIP');
const CreditCard = require('../models/CreditCard');
const CreditScore = require('../models/CreditScore');
const Loan = require('../models/Loan');
const Repayment = require('../models/Repayment');
const Liability = require('../models/Liability');
const RecurringTransaction = require('../models/RecurringTransaction');
const Notification = require('../models/Notification');
const CreditApplication = require('../models/CreditApplication');

const DEMO_EMAIL = 'demo@finura.app';
const DEMO_PASSWORD = 'DemoPassword123!';
const date = (value) => new Date(`${value}T12:00:00.000Z`);

const accounts = [
  { name: 'HDFC Salary Account', type: 'Savings', balance: 148500, currency: 'INR', accountNumberLast4: '4821', color: '#0f766e', isDefault: true },
  { name: 'SBI Everyday Account', type: 'Checking', balance: 78500, currency: 'INR', accountNumberLast4: '6310', color: '#2563eb' },
  { name: 'Home Cash', type: 'Cash', balance: 12000, currency: 'INR', color: '#d97706' },
  { name: 'ICICI Coral Credit Card', type: 'Credit Card', balance: -14500, currency: 'INR', accountNumberLast4: '1092', color: '#dc2626' },
];

const transactions = [
  ['Salary credit', 85000, 'income', 'Salary', '2026-09-01'],
  ['Consulting retainer', 24000, 'income', 'Freelance', '2026-09-03'],
  ['Dividend distribution', 2800, 'income', 'Investments', '2026-09-05'],
  ['Side project payment', 12000, 'income', 'Freelance', '2026-09-08'],
  ['Interest credit', 740, 'income', 'Interest', '2026-09-12'],
  ['Apartment rent', 28000, 'expense', 'Housing', '2026-09-02'],
  ['Grocery market', 6850, 'expense', 'Food', '2026-09-04'],
  ['Electricity bill', 2400, 'expense', 'Bills', '2026-09-05'],
  ['Metro and cab', 1850, 'expense', 'Transport', '2026-09-06'],
  ['School supplies', 3200, 'expense', 'Education', '2026-09-07'],
  ['Dining out', 2450, 'expense', 'Food', '2026-09-09'],
  ['Streaming subscriptions', 1199, 'expense', 'Entertainment', '2026-09-10'],
  ['Health insurance', 4200, 'expense', 'Healthcare', '2026-09-11'],
  ['Online shopping', 3650, 'expense', 'Shopping', '2026-09-13'],
];

const budgets = [
  { category: 'Food', amount: 12000 },
  { category: 'Transport', amount: 5000 },
  { category: 'Shopping', amount: 8000 },
].map((item) => ({ ...item, period: 'monthly', startDate: date('2026-09-01'), endDate: date('2026-09-30'), status: 'active' }));

const goals = [
  { title: 'Emergency Fund Target', category: 'Emergency Fund', targetAmount: 180000, savedAmount: 112000, deadline: '2027-03-31' },
  { title: 'Home Upgrade Fund', category: 'Home Purchase', targetAmount: 300000, savedAmount: 87500, deadline: '2027-12-31' },
];

const investments = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', quantity: 24, type: 'stock', buyPrice: 2480, currentPrice: 2710, purchaseDate: date('2025-11-15'), platform: 'Zerodha' },
  { symbol: 'NIFTY50', name: 'Nifty 50 Index Fund', quantity: 92, type: 'mutual_fund', buyPrice: 182.5, currentPrice: 201.25, purchaseDate: date('2025-08-10'), platform: 'Coin', fundHouse: 'UTI Mutual Fund' },
  { symbol: 'GOLDETF', name: 'SBI Gold ETF', quantity: 38, type: 'etf', buyPrice: 56.2, currentPrice: 61.4, purchaseDate: date('2026-01-12'), platform: 'Zerodha' },
];

const seedDemoData = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is missing');
  await mongoose.connect(process.env.MONGO_URI);

  try {
    let user = await User.findOne({ email: DEMO_EMAIL });
    if (!user) user = new User({ email: DEMO_EMAIL });
    user.name = 'Finura Demo User';
    user.password = DEMO_PASSWORD;
    user.role = 'user';
    user.baseCurrency = 'INR';
    user.profession = 'Demo account';
    user.bio = 'Development-only client presentation account. Contains fictional data.';
    user.twoFactorEnabled = false;
    await user.save();

    const childModels = [
      Transaction, Account, Budget, Goal, Investment, Saving, EmergencyFund, SIP,
      CreditCard, CreditScore, Loan, Repayment, Liability, RecurringTransaction,
      Notification, CreditApplication,
    ];
    for (const Model of childModels) await Model.deleteMany({ user: user._id });

    const createdAccounts = await Account.insertMany(accounts.map((item) => ({ ...item, user: user._id })));
    const accountByName = Object.fromEntries(createdAccounts.map((item) => [item.name, item._id]));
    const salaryAccount = accountByName['HDFC Salary Account'];
    const creditAccount = accountByName['ICICI Coral Credit Card'];

    await Transaction.insertMany(transactions.map(([title, amount, type, category, transactionDate]) => ({
      user: user._id,
      accountId: type === 'expense' && category === 'Shopping' ? creditAccount : salaryAccount,
      title,
      description: title,
      amount,
      type,
      category,
      date: date(transactionDate),
    })));

    await Budget.insertMany(budgets.map((item) => ({ ...item, user: user._id })));
    await Goal.insertMany(goals.map((item) => ({ ...item, user: user._id })));
    const createdInvestments = await Investment.insertMany(investments.map((item) => ({ ...item, user: user._id })));
    const mutualFund = createdInvestments.find((item) => item.type === 'mutual_fund');

    await Saving.insertMany([
      { user: user._id, accountId: salaryAccount, isContribution: true, name: 'Monthly savings allocation', amount: 15000, type: 'automatic', date: date('2026-09-01'), description: 'Monthly allocation toward goals' },
    ]);
    await EmergencyFund.create({ user: user._id, accountId: salaryAccount, currentAmount: 112000, monthlyEssentialExpenses: 42000, targetMonths: 6, monthlyContribution: 15000, targetDate: date('2027-03-31'), notes: 'Primary emergency reserve' });
    await SIP.create({ user: user._id, mutualFund: mutualFund._id, amount: 10000, frequency: 'monthly', startDate: date('2025-08-10'), nextDueDate: date('2026-10-10'), autoDebit: true, status: 'active' });

    await CreditCard.create({ user: user._id, account: creditAccount, name: 'ICICI Coral', issuer: 'ICICI Bank', lastFourDigits: '1092', creditLimit: 100000, outstandingBalance: 14500, billingCycleStart: 1, billingCycleEnd: 30, paymentDueDay: 15, minimumDue: 1200, annualFee: 500 });
    const loan = await Loan.create({ user: user._id, account: salaryAccount, name: 'Education Loan', lender: 'HDFC Credila', loanType: 'Education', principalAmount: 450000, outstandingPrincipal: 182000, interestRate: 8.5, tenureMonths: 60, startDate: date('2024-07-15'), nextEMIDueDate: date('2026-10-15'), status: 'active' });
    await Repayment.create({ user: user._id, loan: loan._id, installmentNumber: 26, dueDate: date('2026-09-15'), emiAmount: loan.emiAmount, principalAmount: loan.emiAmount - 1280, interestAmount: 1280, paidAmount: loan.emiAmount, status: 'paid', paidDate: date('2026-09-14') });
    await CreditScore.create({ user: user._id, score: 782, previousScore: 768, provider: 'CIBIL', scoreDate: date('2026-09-01'), notes: 'Healthy payment history in demo profile' });
    await Liability.create({ user: user._id, name: 'Education Loan Liability', category: 'Education Loan', principalAmount: 450000, outstandingAmount: 182000, interestRate: 8.5, minimumPayment: loan.emiAmount, dueDate: date('2026-10-15') });

    await RecurringTransaction.insertMany([
      { user: user._id, account: salaryAccount, title: 'Apartment rent', description: 'Monthly rent payment', amount: 28000, type: 'expense', category: 'Housing', frequency: 'monthly', startDate: date('2026-01-01'), nextRunDate: date('2026-10-01'), status: 'active' },
      { user: user._id, account: salaryAccount, title: 'Internet and mobile bill', description: 'Fiber and mobile plan', amount: 1499, type: 'expense', category: 'Bills', frequency: 'monthly', startDate: date('2026-01-05'), nextRunDate: date('2026-10-05'), status: 'active' },
      { user: user._id, account: salaryAccount, title: 'Streaming subscription', description: 'Entertainment subscription', amount: 699, type: 'expense', category: 'Entertainment', frequency: 'monthly', startDate: date('2026-01-10'), nextRunDate: date('2026-10-10'), status: 'active' },
    ]);

    await Notification.insertMany([
      { user: user._id, type: 'BUDGET_LIMIT', title: 'Food spending is trending high', message: 'Food spending is at 77% of the monthly budget. Consider two low-spend days this week.', priority: 'medium', dedupeKey: 'demo-ai-food-2026-09' },
      { user: user._id, type: 'BUDGET_LIMIT', title: 'Budget suggestion ready', message: 'Moving ₹1,000 from Shopping to Transport would better match your recent pattern.', priority: 'low', dedupeKey: 'demo-ai-budget-2026-09' },
      { user: user._id, type: 'GOAL_MILESTONE', title: 'Emergency fund is 62% complete', message: 'Your current savings rate can reach the emergency fund target ahead of schedule.', priority: 'high', dedupeKey: 'demo-ai-goal-2026-09' },
    ]);
    await CreditApplication.create({ user: user._id, facilityType: 'Working Capital Line', requestedAmount: 150000, amount: 150000, annualIncome: 1240000, monthlyIncome: 103333, purpose: 'Liquidity buffer', applicantName: user.name, applicantEmail: DEMO_EMAIL, status: 'Approved', creditScore: 782 });

    console.log('Demo data refreshed for demo@finura.app');
    console.log('Created 4 accounts, 5 income transactions, 9 expense transactions, 3 budgets, 2 goals, 3 investments, 3 recurring payments, credit records, and 3 AI-ready insights.');
  } finally {
    await mongoose.connection.close();
  }
};

seedDemoData().catch((error) => {
  console.error('Demo seed failed:', error.message);
  process.exitCode = 1;
});
