const round = (value) => Number(Number(value || 0).toFixed(2));
const Investment = require('../models/Investment');
const Goal = require('../models/Goal');

const futureValueOfAnnuity = (payment, monthlyRate, months) => {
  if (months <= 0 || payment <= 0) return 0;
  if (monthlyRate === 0) return payment * months;
  return payment * (((1 + monthlyRate) ** months - 1) / monthlyRate);
};

const growingAnnuityPresentValue = (payment, monthlyReturn, monthlyInflation, months) => {
  if (months <= 0 || payment <= 0) return 0;
  if (monthlyReturn === monthlyInflation) return (payment * months) / (1 + monthlyReturn);
  return payment * (
    (1 - ((1 + monthlyInflation) / (1 + monthlyReturn)) ** months)
    / (monthlyReturn - monthlyInflation)
  );
};

const calculateRetirementProjection = (inputs) => {
  const yearsToRetirement = Number(inputs.retirementAge) - Number(inputs.currentAge);
  const retirementYears = Number(inputs.lifeExpectancy) - Number(inputs.retirementAge);
  const inflation = Number(inputs.inflationRate) / 100;
  const expectedReturn = Number(inputs.expectedReturn) / 100;
  const currentMonthlyExpenses = Number(inputs.currentMonthlyExpenses);
  const currentRetirementSavings = Number(inputs.currentRetirementSavings || 0);
  const monthlyContribution = Number(inputs.monthlyContribution || 0);
  const otherIncome = Number(inputs.otherIncome || 0);
  const retirementMonthlyExpense = currentMonthlyExpenses * ((1 + inflation) ** yearsToRetirement);
  const monthlyReturn = (1 + expectedReturn) ** (1 / 12) - 1;
  const monthlyInflation = (1 + inflation) ** (1 / 12) - 1;
  const retirementMonths = retirementYears * 12;
  const requiredCorpus = Math.max(
    0,
    growingAnnuityPresentValue(
      Math.max(0, retirementMonthlyExpense - otherIncome),
      monthlyReturn,
      monthlyInflation,
      retirementMonths
    )
  );
  const projectedCurrentSavings = currentRetirementSavings * ((1 + monthlyReturn) ** (yearsToRetirement * 12));
  const projectedContributions = futureValueOfAnnuity(monthlyContribution, monthlyReturn, yearsToRetirement * 12);
  const projectedCorpus = projectedCurrentSavings + projectedContributions;
  const surplus = Math.max(0, projectedCorpus - requiredCorpus);
  const shortfall = Math.max(0, requiredCorpus - projectedCorpus);
  const surplusOrShortfall = projectedCorpus - requiredCorpus;

  return {
    yearsToRetirement,
    retirementMonthlyExpense: round(retirementMonthlyExpense),
    retirementYears,
    requiredCorpus: round(requiredCorpus),
    projectedCorpus: round(projectedCorpus),
    projectedCurrentSavings: round(projectedCurrentSavings),
    projectedContributions: round(projectedContributions),
    futureValueOfCurrentSavings: round(projectedCurrentSavings),
    futureValueOfContributions: round(projectedContributions),
    shortfall: round(shortfall),
    surplus: round(surplus),
    surplusOrShortfall: round(surplusOrShortfall),
    status: surplusOrShortfall > 0 ? 'surplus' : surplusOrShortfall < 0 ? 'shortfall' : 'on-track',
    monthlyReturnRate: round(monthlyReturn * 100),
    monthlyInflationRate: round(monthlyInflation * 100),
  };
};

const getRetirementIntegration = async (userId) => {
  const [investments, goals] = await Promise.all([
    Investment.find({ user: userId }).select('quantity purchasePrice'),
    Goal.find({ user: userId, status: { $ne: 'cancelled' } }).select('title category targetAmount currentAmount savedAmount'),
  ]);
  const investmentValue = investments.reduce(
    (sum, investment) => sum + (Number(investment.quantity || 0) * Number(investment.purchasePrice || 0)),
    0
  );
  const retirementGoals = goals.filter((goal) => (
    String(goal.category || '').toLowerCase() === 'retirement'
    || String(goal.title || '').toLowerCase().includes('retirement')
  ));
  const retirementGoalTarget = retirementGoals.reduce((sum, goal) => sum + Number(goal.targetAmount || 0), 0);
  const retirementGoalCurrentAmount = retirementGoals.reduce(
    (sum, goal) => sum + Math.max(Number(goal.currentAmount || 0), Number(goal.savedAmount || 0)),
    0
  );

  return {
    investmentValue: round(investmentValue),
    investmentCount: investments.length,
    investmentIncludedAsCurrentSavings: false,
    retirementGoalTarget: round(retirementGoalTarget),
    retirementGoalCurrentAmount: round(retirementGoalCurrentAmount),
    retirementGoalRemainingAmount: round(Math.max(0, retirementGoalTarget - retirementGoalCurrentAmount)),
    retirementGoalProgress: retirementGoalTarget > 0
      ? round(Math.min(100, (retirementGoalCurrentAmount / retirementGoalTarget) * 100))
      : 0,
    retirementGoalCount: retirementGoals.length,
  };
};

const buildRetirementProjection = async (plan) => {
  const data = plan.toObject ? plan.toObject() : plan;
  const integration = await getRetirementIntegration(data.user);
  const useInvestmentValue = Number(data.currentRetirementSavings || 0) === 0 && integration.investmentValue > 0;
  const projection = calculateRetirementProjection({
    ...data,
    currentRetirementSavings: useInvestmentValue ? integration.investmentValue : data.currentRetirementSavings,
  });
  return {
    projection: {
      ...projection,
      currentRetirementSavingsUsed: round(useInvestmentValue ? integration.investmentValue : data.currentRetirementSavings),
    },
    integration: {
      ...integration,
      investmentIncludedAsCurrentSavings: useInvestmentValue,
    },
  };
};

module.exports = {
  calculateRetirementProjection,
  buildRetirementProjection,
  getRetirementIntegration,
};
