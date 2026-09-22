/**
 * Finura Seed & Demo Data
 * Centralized mock/demo dataset isolated from production controller logic.
 */

const seedUsers = [
  {
    name: 'Sarah Jenkins',
    email: 'demo@finura.app',
    password: 'DemoPassword123!',
    role: 'user',
    bio: 'Fintech enthusiast and angel investor.',
    profession: 'Senior Product Architect',
    baseCurrency: 'INR',
    riskProfile: 'Moderate Growth',
    twoFactorEnabled: false,
  },
  {
    name: 'Finura Admin',
    email: 'admin@finura.com',
    password: 'AdminPassword123!',
    role: 'admin',
    bio: 'System Administrator and Compliance Officer.',
    profession: 'Chief Risk Officer',
    baseCurrency: 'USD',
    riskProfile: 'Balanced',
    twoFactorEnabled: true,
  },
];

const seedAccounts = [
  {
    name: 'HDFC Savings',
    type: 'Savings',
    balance: 145000,
    currency: 'INR',
    accountNumberLast4: '4821',
    color: '#00f2fe',
    isDefault: true,
  },
  {
    name: 'Paytm Digital Wallet',
    type: 'Wallet',
    balance: 8500,
    currency: 'INR',
    accountNumberLast4: '9920',
    color: '#10b981',
    isDefault: false,
  },
  {
    name: 'SBI Salary Account',
    type: 'Checking',
    balance: 78500,
    currency: 'INR',
    accountNumberLast4: '6310',
    color: '#2563eb',
    isDefault: false,
  },
  {
    name: 'Physical Cash',
    type: 'Cash',
    balance: 12000,
    currency: 'INR',
    accountNumberLast4: '',
    color: '#f59e0b',
    isDefault: false,
  },
  {
    name: 'ICICI Coral Credit Card',
    type: 'Credit Card',
    balance: -14500,
    currency: 'INR',
    accountNumberLast4: '1092',
    color: '#ef4444',
    isDefault: false,
  },
  {
    name: 'Zerodha Investment Account',
    type: 'Investment',
    balance: 320000,
    currency: 'INR',
    accountNumberLast4: '7734',
    color: '#8b5cf6',
    isDefault: false,
  },
];

const seedTransactions = [
  {
    title: 'Monthly Enterprise Salary',
    amount: 8500.00,
    type: 'income',
    category: 'Salary',
    date: new Date('2026-08-01'),
    description: 'Corporate payroll direct deposit',
  },
  {
    title: 'Luxury Apartment Rent',
    amount: 2200.00,
    type: 'expense',
    category: 'Housing',
    date: new Date('2026-08-02'),
    description: 'Monthly lease payment',
  },
  {
    title: 'Whole Foods Market',
    amount: 340.50,
    type: 'expense',
    category: 'Groceries',
    date: new Date('2026-08-05'),
    description: 'Bi-weekly grocery restock',
  },
  {
    title: 'Consulting Retainer Fee',
    amount: 3200.00,
    type: 'income',
    category: 'Freelance',
    date: new Date('2026-08-10'),
    description: 'Advisory retainer payment',
  },
  {
    title: 'Vanguard Index Auto-Invest',
    amount: 1500.00,
    type: 'investment',
    category: 'Equities',
    date: new Date('2026-08-15'),
    description: 'DCA Equity contribution',
  },
  {
    title: 'Electric & Fiber Internet',
    amount: 185.20,
    type: 'expense',
    category: 'Utilities',
    date: new Date('2026-08-18'),
    description: 'Home utilities invoice',
  },
  {
    title: 'Health Insurance Premium',
    amount: 1250,
    type: 'expense',
    category: 'Healthcare',
    date: new Date('2026-08-20'),
    description: 'Annual health cover installment',
  },
  {
    title: 'Metro and Cab Travel',
    amount: 620,
    type: 'expense',
    category: 'Transport',
    date: new Date('2026-08-22'),
    description: 'Commuting and client meetings',
  },
  {
    title: 'Dividend Distribution',
    amount: 980,
    type: 'income',
    category: 'Investments',
    date: new Date('2026-08-25'),
    description: 'Quarterly equity dividend',
  },
  {
    title: 'Streaming and Software',
    amount: 899,
    type: 'expense',
    category: 'Entertainment',
    date: new Date('2026-08-28'),
    description: 'Professional and personal subscriptions',
  },
];

const seedInvestments = [
  {
    symbol: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    quantity: 65,
    purchasePrice: 242.50,
    assetType: 'stock',
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust',
    quantity: 35,
    purchasePrice: 440.20,
    assetType: 'stock',
  },
  {
    symbol: 'BND',
    name: 'Vanguard Total Bond Market',
    quantity: 120,
    purchasePrice: 72.80,
    assetType: 'mutual_fund',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum Network',
    quantity: 4.5,
    purchasePrice: 2650.00,
    assetType: 'crypto',
  },
  {
    symbol: 'VFIAX',
    name: 'Vanguard 500 Index Admiral',
    quantity: 28,
    purchasePrice: 412.30,
    assetType: 'mutual_fund',
  },
];

const seedBudgets = [
  { category: 'Food', amount: 12000, period: 'monthly', startDate: new Date('2026-08-01'), endDate: new Date('2026-08-31'), status: 'active' },
  { category: 'Transport', amount: 5000, period: 'monthly', startDate: new Date('2026-08-01'), endDate: new Date('2026-08-31'), status: 'active' },
  { category: 'Entertainment', amount: 4000, period: 'monthly', startDate: new Date('2026-08-01'), endDate: new Date('2026-08-31'), status: 'active' },
];

const seedLiabilities = [
  { name: 'ICICI Card Balance', category: 'Credit Card', principalAmount: 35000, outstandingAmount: 14500, interestRate: 36, minimumPayment: 2500, dueDate: new Date('2026-09-10') },
  { name: 'Education Loan', category: 'Education Loan', principalAmount: 450000, outstandingAmount: 182000, interestRate: 8.5, minimumPayment: 8500, dueDate: new Date('2026-09-15') },
];

const seedRecurringTransactions = [
  { title: 'Home Internet', description: 'Monthly fiber internet bill', amount: 1199, type: 'expense', category: 'Bills', frequency: 'monthly', startDate: new Date('2026-08-05'), nextRunDate: new Date('2026-09-05'), status: 'active' },
];

const seedNotifications = [
  { type: 'BUDGET_LIMIT', title: 'Food budget is nearing its limit', message: 'You have used 82% of your monthly Food budget.', priority: 'medium', dedupeKey: 'demo-food-budget-aug-2026' },
  { type: 'GOAL_MILESTONE', title: 'Emergency fund is 75% complete', message: 'You are close to your emergency liquidity goal.', priority: 'low', dedupeKey: 'demo-emergency-goal-75' },
  { type: 'INVESTMENT_ALERT', title: 'Portfolio review ready', message: 'Finura AI has a new allocation insight for your investment mix.', priority: 'high', dedupeKey: 'demo-portfolio-review-2026' },
];

const seedGoals = [
  {
    title: 'Emergency Liquidity Reserve',
    category: 'Emergency Fund',
    targetAmount: 30000,
    savedAmount: 22500,
    deadline: '2026-12-31',
  },
  {
    title: 'Strategic Angel Syndicate Fund',
    category: 'Investment',
    targetAmount: 50000,
    savedAmount: 35000,
    deadline: '2027-06-30',
  },
  {
    title: 'Commercial Property Equity',
    category: 'Home Purchase',
    targetAmount: 100000,
    savedAmount: 48000,
    deadline: '2028-01-01',
  },
];

const seedCreditApplications = [
  {
    facilityType: 'Working Capital Line',
    requestedAmount: 125000,
    amount: 125000,
    annualIncome: 185000,
    monthlyIncome: 15416,
    purpose: 'Strategic operational scale and liquidity buffering',
    applicantName: 'Sarah Jenkins',
    applicantEmail: 'demo@finura.app',
    status: 'Approved',
    creditScore: 785,
  },
];

const marketIndices = [
  { name: 'S&P 500', value: '4,567.80', change: '+1.24%', up: true },
  { name: 'NASDAQ', value: '14,230.40', change: '+0.89%', up: true },
  { name: 'NIFTY 50', value: '19,435.20', change: '-0.32%', up: false },
  { name: 'Gold (oz)', value: '$1,985.40', change: '+0.56%', up: true },
];

const defaultAllocation = {
  labels: ['Equities', 'Private Credit', 'Real Estate', 'Gold', 'Cash Reserves', 'Alternative Assets'],
  data: [42, 20, 15, 10, 8, 5],
  breakdown: [
    { label: 'Equities', value: '42%', amount: '$430K', color: '#10B981' },
    { label: 'Private Credit', value: '20%', amount: '$204K', color: '#0EA5E9' },
    { label: 'Real Estate', value: '15%', amount: '$153K', color: '#F59E0B' },
    { label: 'Gold', value: '10%', amount: '$102K', color: '#EAB308' },
    { label: 'Cash Reserves', value: '8%', amount: '$82K', color: '#64748B' },
    { label: 'Alternative Assets', value: '5%', amount: '$51K', color: '#8B5CF6' },
  ],
};

module.exports = {
  seedUsers,
  seedAccounts,
  seedTransactions,
  seedInvestments,
  seedGoals,
  seedCreditApplications,
  seedBudgets,
  seedLiabilities,
  seedRecurringTransactions,
  seedNotifications,
  marketIndices,
  defaultAllocation,
};
