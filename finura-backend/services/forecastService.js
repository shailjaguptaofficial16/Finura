const mongoose = require('mongoose');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const Goal = require('../models/Goal');
const Saving = require('../models/Saving');
const EmergencyFund = require('../models/EmergencyFund');

const HORIZONS = [1, 3, 6, 12, 24];
const HISTORY_MONTHS = 6;
const MONTH_MS = 30.4375 * 24 * 60 * 60 * 1000;

const round = (value) => Number(Number(value || 0).toFixed(2));
const monthKey = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

const getMonthStart = (date, offset = 0) => new Date(Date.UTC(
  date.getUTCFullYear(),
  date.getUTCMonth() + offset,
  1
));

const getHistory = (transactions, now) => {
  const buckets = new Map();
  const firstMonth = getMonthStart(now, -(HISTORY_MONTHS - 1));

  for (let index = 0; index < HISTORY_MONTHS; index += 1) {
    const date = getMonthStart(firstMonth, index);
    buckets.set(monthKey(date), { month: monthKey(date), income: 0, expenses: 0 });
  }

  transactions.forEach((transaction) => {
    const key = monthKey(new Date(transaction.date));
    const bucket = buckets.get(key);
    if (!bucket) return;
    const amount = Number(transaction.amount || 0);
    if (transaction.type === 'income') bucket.income += amount;
    if (transaction.type === 'expense' || transaction.type === 'investment') bucket.expenses += amount;
  });

  const availableMonths = [...buckets.values()].filter((bucket) => bucket.income !== 0 || bucket.expenses !== 0);
  const divisor = availableMonths.length || 1;
  const averageIncome = availableMonths.reduce((sum, bucket) => sum + bucket.income, 0) / divisor;
  const averageExpenses = availableMonths.reduce((sum, bucket) => sum + bucket.expenses, 0) / divisor;

  return {
    buckets: [...buckets.values()].map((bucket) => ({
      ...bucket,
      income: round(bucket.income),
      expenses: round(bucket.expenses),
      savings: round(bucket.income - bucket.expenses),
    })),
    availableMonths: availableMonths.length,
    averageIncome: round(averageIncome),
    averageExpenses: round(averageExpenses),
    averageSavings: round(averageIncome - averageExpenses),
  };
};

const calculateForecast = ({ currentBalance, history, forecastPeriod, assumptions = {} }) => {
  const incomeGrowthRate = Number(assumptions.incomeGrowthRate || 0) / 100;
  const expenseGrowthRate = Number(assumptions.expenseGrowthRate || 0) / 100;
  const savingsGrowthRate = Number(assumptions.savingsGrowthRate || 0) / 100;
  const start = new Date();
  let projectedBalance = Number(currentBalance || 0);
  const forecast = [];

  for (let month = 1; month <= forecastPeriod; month += 1) {
    const income = history.averageIncome * ((1 + incomeGrowthRate) ** month);
    const expenses = history.averageExpenses * ((1 + expenseGrowthRate) ** month);
    const savings = (income - expenses) * (1 + savingsGrowthRate);
    projectedBalance += savings;
    const date = getMonthStart(start, month);
    forecast.push({
      month: monthKey(date),
      income: round(income),
      expenses: round(expenses),
      savings: round(savings),
      projectedBalance: round(projectedBalance),
    });
  }

  return {
    forecast,
    horizons: HORIZONS.map((months) => {
      const point = forecast[Math.min(months, forecast.length) - 1];
      return {
        months,
        projectedBalance: point ? point.projectedBalance : round(currentBalance),
      };
    }),
  };
};

const calculateScenario = ({ currentBalance, averageMonthlyIncome, averageMonthlyExpenses, months, scenario = {} }) => {
  const incomeChangePercent = Number(scenario.incomeChangePercent || 0);
  const expenseChangePercent = Number(scenario.expenseChangePercent || 0);
  const savingsChangePercent = Number(scenario.savingsChangePercent || 0);
  const monthlyIncome = averageMonthlyIncome * (1 + (incomeChangePercent / 100));
  const monthlyExpenses = averageMonthlyExpenses * (1 + (expenseChangePercent / 100));
  const monthlySavings = (monthlyIncome - monthlyExpenses) * (1 + (savingsChangePercent / 100));
  const forecast = [];
  let projectedBalance = Number(currentBalance || 0);
  const start = new Date();

  for (let month = 1; month <= months; month += 1) {
    projectedBalance += monthlySavings;
    forecast.push({
      month: monthKey(getMonthStart(start, month)),
      income: round(monthlyIncome),
      expenses: round(monthlyExpenses),
      savings: round(monthlySavings),
      projectedBalance: round(projectedBalance),
    });
  }

  return {
    months,
    scenario: {
      incomeChangePercent,
      expenseChangePercent,
      savingsChangePercent,
    },
    monthlyIncome: round(monthlyIncome),
    monthlyExpenses: round(monthlyExpenses),
    monthlySavings: round(monthlySavings),
    projectedBalance: round(projectedBalance),
    forecast,
  };
};

const buildGoalForecast = ({ goals, averageMonthlySavings, now = new Date() }) => goals.map((goal) => {
  const targetAmount = Number(goal.targetAmount || 0);
  const currentAmount = Math.max(Number(goal.currentAmount || 0), Number(goal.savedAmount || 0));
  const remainingAmount = Math.max(0, targetAmount - currentAmount);
  const targetDate = goal.targetDate || goal.deadline ? new Date(goal.targetDate || goal.deadline) : null;
  const validTargetDate = targetDate && !Number.isNaN(targetDate.getTime()) ? targetDate : null;
  const monthsToTarget = validTargetDate
    ? Math.max(1, Math.ceil((validTargetDate.getTime() - now.getTime()) / MONTH_MS))
    : null;
  const requiredMonthlySaving = monthsToTarget && remainingAmount > 0
    ? remainingAmount / monthsToTarget
    : 0;
  const completionMonths = averageMonthlySavings > 0 && remainingAmount > 0
    ? Math.ceil(remainingAmount / averageMonthlySavings)
    : null;
  const estimatedCompletionDate = completionMonths
    ? getMonthStart(now, completionMonths + 1)
    : null;
  const projectedAmountAtTarget = monthsToTarget
    ? currentAmount + (averageMonthlySavings * monthsToTarget)
    : null;
  let status = 'on-track';
  if (currentAmount >= targetAmount) status = 'completed';
  else if (validTargetDate && validTargetDate < now) status = 'overdue';
  else if (validTargetDate && projectedAmountAtTarget < targetAmount) status = 'at-risk';
  else if (!validTargetDate && averageMonthlySavings <= 0) status = 'at-risk';

  return {
    title: goal.title,
    targetAmount: round(targetAmount),
    currentAmount: round(currentAmount),
    remainingAmount: round(remainingAmount),
    requiredMonthlySaving: round(requiredMonthlySaving),
    averageMonthlySaving: round(averageMonthlySavings),
    estimatedCompletionDate,
    projectedAmountAtTarget: projectedAmountAtTarget === null ? null : round(projectedAmountAtTarget),
    targetDate: validTargetDate,
    status,
  };
});

const buildForecast = async ({ userId, forecastPeriod = 12, assumptions = {} }) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const historyStart = getMonthStart(now, -(HISTORY_MONTHS - 1));
  const [accounts, transactions] = await Promise.all([
    Account.find({ user: userObjectId, isActive: true }).select('balance'),
    Transaction.find({
      user: userObjectId,
      date: { $gte: historyStart },
      type: { $in: ['income', 'expense', 'investment'] },
    }).select('amount type date'),
  ]);

  const currentBalance = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const history = getHistory(transactions, now);
  const period = Math.min(24, Math.max(1, Math.trunc(Number(forecastPeriod) || 12)));
  const projection = calculateForecast({ currentBalance, history, forecastPeriod: period, assumptions });

  return {
    currentBalance: round(currentBalance),
    averageMonthlyIncome: history.averageIncome,
    averageMonthlyExpenses: history.averageExpenses,
    averageMonthlySavings: history.averageSavings,
    savingsRate: history.averageIncome > 0 ? round((history.averageSavings / history.averageIncome) * 100) : 0,
    historyMonths: history.availableMonths,
    historyWindowMonths: HISTORY_MONTHS,
    insufficientData: history.availableMonths < 3,
    assumptions: {
      incomeGrowthRate: Number(assumptions.incomeGrowthRate || 0),
      expenseGrowthRate: Number(assumptions.expenseGrowthRate || 0),
      savingsGrowthRate: Number(assumptions.savingsGrowthRate || 0),
    },
    forecastPeriod: period,
    ...projection,
    disclaimer: 'Projected based on recent financial patterns. Actual results may vary.',
  };
};

const buildPlanningForecast = async ({ userId, forecastPeriod = 12, assumptions = {} }) => {
  const [base, goals, savings, emergencyFund] = await Promise.all([
    buildForecast({ userId, forecastPeriod, assumptions }),
    Goal.find({ user: userId, status: { $ne: 'cancelled' } }).select('title targetAmount currentAmount savedAmount status targetDate deadline'),
    Saving.find({ user: userId }).select('amount'),
    EmergencyFund.findOne({ user: userId }).select('currentAmount monthlyEssentialExpenses targetMonths monthlyContribution status'),
  ]);
  const currentSavings = savings.reduce((sum, saving) => sum + Number(saving.amount || 0), 0);
  const monthlySavings = base.averageMonthlySavings;
  const emergencyCurrent = Number(emergencyFund?.currentAmount || 0);
  const emergencyTarget = emergencyFund
    ? Number(emergencyFund.monthlyEssentialExpenses || 0) * Number(emergencyFund.targetMonths || 0)
    : 0;
  const emergencyMonthlyContribution = emergencyCurrent < emergencyTarget
    ? Number(emergencyFund?.monthlyContribution || Math.max(0, monthlySavings))
    : 0;
  const emergencyRemaining = Math.max(0, emergencyTarget - emergencyCurrent);

  return {
    ...base,
    savings: {
      current: round(currentSavings),
      monthly: round(monthlySavings),
      projected12Months: round(currentSavings + (monthlySavings * 12)),
    },
    emergencyFund: emergencyFund ? {
      current: round(emergencyCurrent),
      target: round(emergencyTarget),
      monthlyEssentialExpenses: round(emergencyFund.monthlyEssentialExpenses),
      monthlyContribution: round(emergencyMonthlyContribution),
      estimatedCompletionMonths: emergencyMonthlyContribution > 0 && emergencyRemaining > 0
        ? Math.ceil(emergencyRemaining / emergencyMonthlyContribution)
        : emergencyRemaining === 0 ? 0 : null,
      status: emergencyFund.status,
    } : null,
    goals: buildGoalForecast({ goals, averageMonthlySavings: monthlySavings }),
    allocationRisk: emergencyFund && emergencyMonthlyContribution > monthlySavings
      ? 'Emergency Fund allocation exceeds projected monthly savings'
      : null,
  };
};

module.exports = {
  buildForecast,
  calculateForecast,
  calculateScenario,
  buildPlanningForecast,
  buildGoalForecast,
  getHistory,
};
