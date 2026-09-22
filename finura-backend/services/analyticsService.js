const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const { getPortfolioValuation } = require('./investmentService');
const InvestmentTransaction = require('../models/InvestmentTransaction');
const { buildTransactionQuery } = require('../utils/analyticsQuery');

const round = (value) => Number(Number(value || 0).toFixed(2));
const isIncome = (transaction) => transaction.type === 'income';
const isExpense = (transaction) => transaction.type === 'expense';
const metadata = (filters, hasData) => ({ startDate: filters.startDate.toISOString().slice(0, 10), endDate: filters.endDate.toISOString().slice(0, 10), currency: filters.currency, hasData });
const monthKey = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

const getTransactions = async (userId, filters) => Transaction.find(buildTransactionQuery(userId, filters)).select('amount type category date accountId recurringTransaction title description').sort({ date: 1 });
const monthlyAverage = (amount, filters) => Math.max(1, ((filters.endDate.getUTCFullYear() - filters.startDate.getUTCFullYear()) * 12) + filters.endDate.getUTCMonth() - filters.startDate.getUTCMonth() + 1);

const getIncomeSummary = async (userId, filters) => {
  const transactions = (await getTransactions(userId, filters)).filter(isIncome);
  const totalIncome = round(transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0));
  const sources = new Map();
  transactions.forEach((item) => { const source = item.category || 'Other'; const current = sources.get(source) || { amount: 0, transactionCount: 0 }; current.amount += Number(item.amount || 0); current.transactionCount += 1; sources.set(source, current); });
  return { summary: { totalIncome, averageMonthlyIncome: round(totalIncome / monthlyAverage(totalIncome, filters)), incomeTransactionCount: transactions.length, recurringIncome: 0, oneTimeIncome: totalIncome, incomeGrowthPercentage: null }, breakdown: [...sources.entries()].map(([source, item]) => ({ source, amount: round(item.amount), percentage: totalIncome > 0 ? round((item.amount / totalIncome) * 100) : 0, transactionCount: item.transactionCount })), trends: getMonthlyTrend(transactions, filters, 'income'), sources: [...sources.entries()].map(([source, item]) => ({ source, amount: round(item.amount), percentage: totalIncome > 0 ? round((item.amount / totalIncome) * 100) : 0, transactionCount: item.transactionCount })), monthlyTrend: getMonthlyTrend(transactions, filters, 'income'), metadata: metadata(filters, transactions.length > 0) };
};

const getExpenseSummary = async (userId, filters) => {
  const transactions = (await getTransactions(userId, filters)).filter(isExpense);
  const totalExpense = round(transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0));
  const duration = filters.endDate.getTime() - filters.startDate.getTime();
  const previousFilters = { ...filters, startDate: new Date(filters.startDate.getTime() - duration - 1), endDate: new Date(filters.startDate.getTime() - 1) };
  const previousTransactions = (await getTransactions(userId, previousFilters)).filter(isExpense);
  const previousExpense = previousTransactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const recurringExpense = round(transactions.filter((item) => item.recurringTransaction).reduce((sum, item) => sum + Number(item.amount || 0), 0));
  const largest = transactions.reduce((current, item) => (!current || Number(item.amount) > Number(current.amount) ? item : current), null);
  const categories = getCategories(transactions, totalExpense).map((item) => ({ ...item, amount: item.totalAmount }));
  const monthlyTrend = getMonthlyTrend(transactions, filters, 'expense').map((item) => ({ month: item.month, totalExpense: item.totalExpense, transactionCount: item.transactionCount }));
  return {
    summary: {
      totalExpense,
      averageMonthlyExpense: round(totalExpense / monthlyAverage(totalExpense, filters)),
      expenseTransactionCount: transactions.length,
      recurringExpense,
      oneTimeExpense: round(totalExpense - recurringExpense),
      expenseGrowthPercentage: previousExpense === 0 ? null : round(((totalExpense - previousExpense) / previousExpense) * 100),
    },
    breakdown: categories,
    categories,
    trends: monthlyTrend,
    monthlyTrend,
    largestExpense: largest ? { amount: round(largest.amount), category: largest.category || 'Other', date: new Date(largest.date).toISOString().slice(0, 10), description: largest.description || largest.title || 'Expense' } : null,
    metadata: metadata(filters, transactions.length > 0),
  };
};

const getCategories = (transactions, total) => {
  const grouped = new Map();
  transactions.forEach((item) => { const category = item.category || 'Other'; const current = grouped.get(category) || { totalAmount: 0, transactionCount: 0 }; current.totalAmount += Number(item.amount || 0); current.transactionCount += 1; grouped.set(category, current); });
  return [...grouped.entries()].map(([category, item]) => ({ category, totalAmount: round(item.totalAmount), transactionCount: item.transactionCount, percentage: total > 0 ? round((item.totalAmount / total) * 100) : 0 }));
};

const getMonthlyTrend = (transactions) => {
  const grouped = new Map();
  transactions.forEach((item) => { const month = monthKey(new Date(item.date)); const current = grouped.get(month) || { month, income: 0, expense: 0, transactionCount: 0 }; if (item.type === 'income') current.income += Number(item.amount || 0); if (item.type === 'expense') current.expense += Number(item.amount || 0); current.transactionCount += 1; grouped.set(month, current); });
  return [...grouped.values()].sort((left, right) => left.month.localeCompare(right.month)).map((item) => ({ ...item, income: round(item.income), expense: round(item.expense), totalIncome: round(item.income), totalExpense: round(item.expense), netCashFlow: round(item.income - item.expense) }));
};

const getAnalyticsOverview = async (userId, filters) => {
  const transactions = await getTransactions(userId, filters);
  const income = transactions.filter(isIncome).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expense = transactions.filter(isExpense).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const summary = { totalIncome: round(income), totalExpense: round(expense), netCashFlow: round(income - expense), incomeTransactionCount: transactions.filter(isIncome).length, expenseTransactionCount: transactions.filter(isExpense).length };
  return { summary, breakdown: getCategories(transactions.filter(isExpense), expense), trends: getMonthlyTrend(transactions.filter((item) => isIncome(item) || isExpense(item)), filters, 'income'), metadata: metadata(filters, transactions.length > 0) };
};

const buildCategoryRows = (transactions) => {
  const grouped = new Map();
  transactions.forEach((item) => {
    const category = item.category || 'Other';
    const current = grouped.get(category) || { category, totalAmount: 0, transactionCount: 0 };
    current.totalAmount += Number(item.amount || 0);
    current.transactionCount += 1;
    grouped.set(category, current);
  });
  const total = [...grouped.values()].reduce((sum, item) => sum + item.totalAmount, 0);
  return [...grouped.values()].map((item) => ({ ...item, totalAmount: round(item.totalAmount), percentage: total > 0 ? round((item.totalAmount / total) * 100) : 0, averageTransaction: item.transactionCount > 0 ? round(item.totalAmount / item.transactionCount) : 0 })).sort((left, right) => right.totalAmount - left.totalAmount);
};

const getCategoryBreakdown = async (userId, filters) => {
  const currentTransactions = (await getTransactions(userId, filters)).filter((item) => isIncome(item) || isExpense(item));
  const expenseTransactions = currentTransactions.filter(isExpense);
  const incomeTransactions = currentTransactions.filter(isIncome);
  const selectedTransactions = filters.transactionType === 'income' ? incomeTransactions : expenseTransactions;
  const categories = buildCategoryRows(selectedTransactions);
  const selectedTotal = categories.reduce((sum, item) => sum + item.totalAmount, 0);
  const duration = filters.endDate.getTime() - filters.startDate.getTime();
  const previousFilters = { ...filters, startDate: new Date(filters.startDate.getTime() - duration - 1), endDate: new Date(filters.startDate.getTime() - 1) };
  const previousTransactions = (await getTransactions(userId, previousFilters)).filter((item) => isIncome(item) || isExpense(item));
  const previousRows = buildCategoryRows(filters.transactionType === 'income' ? previousTransactions.filter(isIncome) : previousTransactions.filter(isExpense));
  const previousByCategory = new Map(previousRows.map((item) => [item.category, item.totalAmount]));
  const monthlyTrend = [...new Set(categories.map((item) => item.category))].map((category) => ({
    category,
    monthlyTrend: getMonthlyTrend(selectedTransactions.filter((item) => (item.category || 'Other') === category)).map((item) => ({ month: item.month, amount: item.totalIncome + item.totalExpense, transactionCount: item.transactionCount })),
    growthPercentage: previousByCategory.get(category) ? round(((categories.find((item) => item.category === category).totalAmount - previousByCategory.get(category)) / previousByCategory.get(category)) * 100) : null,
  }));
  const income = buildCategoryRows(incomeTransactions).map((item) => ({ category: item.category, amount: item.totalAmount }));
  const expense = buildCategoryRows(expenseTransactions).map((item) => ({ category: item.category, amount: item.totalAmount }));
  return {
    summary: { totalAmount: round(selectedTotal), categoryCount: categories.length, topCategory: categories[0]?.category || null, lowestCategory: categories[categories.length - 1]?.category || null },
    categories,
    breakdown: categories,
    monthlyTrend,
    trends: monthlyTrend,
    incomeExpense: { income, expense },
    metadata: { ...metadata(filters, selectedTransactions.length > 0), type: filters.transactionType || 'expense' },
  };
};
const getCashFlowSummary = async (userId, filters) => {
  const [transactions, investmentTransactions] = await Promise.all([
    getTransactions(userId, filters),
    filters.accountId ? [] : InvestmentTransaction.find({ user: userId, type: 'sell', transactionDate: { $gte: filters.startDate, $lte: filters.endDate } }).select('totalAmount fees transactionDate quantity price').sort({ transactionDate: 1 }),
  ]);
  const movements = [
    ...transactions.filter((item) => isIncome(item) || isExpense(item) || item.type === 'investment').map((item) => ({ type: isIncome(item) ? 'inflow' : 'outflow', amount: Number(item.amount || 0), category: item.category || 'Other', date: item.date, description: item.description || item.title || 'Cash movement' })),
    ...investmentTransactions.map((item) => ({ type: 'inflow', amount: Math.max(0, Number(item.totalAmount || 0) - Number(item.fees || 0)), category: 'Investment Sell', date: item.transactionDate, description: 'Investment sell proceeds' })),
  ];
  const inflows = movements.filter((item) => item.type === 'inflow');
  const outflows = movements.filter((item) => item.type === 'outflow');
  const totalInflow = round(inflows.reduce((sum, item) => sum + item.amount, 0));
  const totalOutflow = round(outflows.reduce((sum, item) => sum + item.amount, 0));
  const monthMap = new Map();
  movements.forEach((item) => { const month = monthKey(new Date(item.date)); const row = monthMap.get(month) || { month, inflow: 0, outflow: 0 }; row[item.type] += item.amount; monthMap.set(month, row); });
  const monthlyTrend = [...monthMap.values()].sort((left, right) => left.month.localeCompare(right.month)).map((row) => { const netCashFlow = round(row.inflow - row.outflow); return { month: row.month, inflow: round(row.inflow), outflow: round(row.outflow), netCashFlow, status: netCashFlow > 0 ? 'positive' : netCashFlow < 0 ? 'negative' : 'neutral' }; });
  const positiveMonths = monthlyTrend.filter((item) => item.status === 'positive').length;
  const negativeMonths = monthlyTrend.filter((item) => item.status === 'negative').length;
  const neutralMonths = monthlyTrend.filter((item) => item.status === 'neutral').length;
  const largest = (items) => { const item = items.reduce((largestItem, current) => (!largestItem || current.amount > largestItem.amount ? current : largestItem), null); return item ? { amount: round(item.amount), category: item.category, date: new Date(item.date).toISOString().slice(0, 10), description: item.description } : null; };
  return {
    summary: { totalInflow, totalOutflow, netCashFlow: round(totalInflow - totalOutflow), averageMonthlyCashFlow: round((totalInflow - totalOutflow) / Math.max(1, monthlyTrend.length)), positiveMonths, negativeMonths, neutralMonths, consistencyPercentage: monthlyTrend.length > 0 ? round((positiveMonths / monthlyTrend.length) * 100) : 0 },
    largestInflow: largest(inflows),
    largestOutflow: largest(outflows),
    monthlyTrend,
    breakdown: [],
    trends: monthlyTrend,
    metadata: metadata(filters, movements.length > 0),
  };
};
const getMonthlyTrends = async (userId, filters) => { const transactions = await getTransactions(userId, filters); return { summary: {}, breakdown: [], trends: getMonthlyTrend(transactions.filter((item) => isIncome(item) || isExpense(item)), filters, 'income'), metadata: metadata(filters, transactions.length > 0) }; };
const trendChange = (current, previous) => previous === 0 ? (current > 0 ? 100 : 0) : round(((current - previous) / Math.abs(previous)) * 100);
const trendStatus = (change) => Math.abs(change) < 1 ? 'stable' : change > 0 ? 'increasing' : 'decreasing';
const getTrendAnalytics = async (userId, filters) => {
  const transactions = (await getTransactions(userId, filters)).filter((item) => isIncome(item) || isExpense(item));
  const grouped = new Map();
  transactions.forEach((item) => {
    const month = monthKey(new Date(item.date));
    const row = grouped.get(month) || { month, income: 0, expenses: 0 };
    if (isIncome(item)) row.income += Number(item.amount || 0);
    if (isExpense(item)) row.expenses += Number(item.amount || 0);
    grouped.set(month, row);
  });
  const monthly = [...grouped.values()].sort((left, right) => left.month.localeCompare(right.month)).map((row) => ({ month: row.month, income: round(row.income), expenses: round(row.expenses), savings: round(row.income - row.expenses), cashFlow: round(row.income - row.expenses) }));
  const current = monthly.at(-1) || { income: 0, expenses: 0, savings: 0, cashFlow: 0 };
  const previous = monthly.at(-2) || { income: 0, expenses: 0, savings: 0, cashFlow: 0 };
  const comparison = ['income', 'expenses', 'savings', 'cashFlow'].reduce((result, metric) => {
    const change = trendChange(current[metric], previous[metric]);
    result[metric] = { current: current[metric], previous: previous[metric], change, status: trendStatus(change) };
    return result;
  }, {});
  const best = monthly.reduce((bestMonth, row) => (!bestMonth || row.cashFlow > bestMonth.cashFlow ? row : bestMonth), null);
  const worst = monthly.reduce((worstMonth, row) => (!worstMonth || row.cashFlow < worstMonth.cashFlow ? row : worstMonth), null);
  return { monthly, comparison, summary: { overallStatus: current.cashFlow > 0 ? 'positive' : current.cashFlow < 0 ? 'negative' : 'neutral', bestMonth: best?.month || null, worstMonth: worst?.month || null }, metadata: metadata(filters, monthly.length > 0) };
};
const getBudgetPerformance = async (userId, filters) => {
  const [budgets, transactions] = await Promise.all([
    Budget.find({ user: userId, startDate: { $lte: filters.endDate }, endDate: { $gte: filters.startDate }, status: { $ne: 'cancelled' } }),
    getTransactions(userId, filters),
  ]);
  const expenses = transactions.filter(isExpense);
  const breakdown = budgets.map((budget) => {
    const spent = expenses.filter((item) => item.category === budget.category).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return { category: budget.category, budgetAmount: round(budget.amount), spent: round(spent), remaining: round(budget.amount - spent), utilizationPercentage: budget.amount > 0 ? round((spent / budget.amount) * 100) : 0 };
  });
  return { summary: { totalBudget: round(breakdown.reduce((sum, item) => sum + item.budgetAmount, 0)), totalSpent: round(breakdown.reduce((sum, item) => sum + item.spent, 0)) }, breakdown, trends: [], metadata: metadata(filters, breakdown.length > 0) };
};
const getInvestmentAnalytics = async (userId, filters) => {
  const portfolio = await getPortfolioValuation(userId);
  return { summary: { totalInvested: portfolio.totalInvested, currentValue: portfolio.currentValue, unrealizedProfitLoss: portfolio.unrealizedProfitLoss, returnPercentage: portfolio.returnPercentage, holdingsCount: portfolio.holdingsCount }, breakdown: Object.entries(portfolio.breakdown).map(([category, amount]) => ({ category, amount, percentage: portfolio.currentValue > 0 ? round((amount / portfolio.currentValue) * 100) : 0 })), trends: [], metadata: metadata(filters, portfolio.holdingsCount > 0) };
};

module.exports = { getIncomeSummary, getExpenseSummary, getCategoryBreakdown, getCashFlowSummary, getMonthlyTrends, getTrendAnalytics, getAnalyticsOverview, getBudgetPerformance, getInvestmentAnalytics };