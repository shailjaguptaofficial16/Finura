const Retirement = require('../models/Retirement');
const { buildPlanningForecast, buildRetirementProjection } = require('./forecastService');
const { buildPlanningRecommendations } = require('./planningRecommendationService');

const round = (value) => Number(Number(value || 0).toFixed(2));

const getGoalCurrentAmount = (goal) => Math.max(
  Number(goal.currentAmount || 0),
  Number(goal.savedAmount || 0)
);

const getRemainingMonths = (goal, now = new Date()) => {
  const rawDate = goal.targetDate || goal.deadline;
  if (!rawDate) return null;
  const targetDate = new Date(rawDate);
  if (Number.isNaN(targetDate.getTime()) || targetDate <= now) return null;
  return Math.max(1, Math.ceil((targetDate.getTime() - now.getTime()) / (30.4375 * 24 * 60 * 60 * 1000)));
};

const buildPlanningOverview = async (userId) => {
  const [forecast, retirementPlan] = await Promise.all([
    buildPlanningForecast({ userId, forecastPeriod: 12 }),
    Retirement.findOne({ user: userId }),
  ]);
  const goals = forecast.goals || [];

  const activeGoals = goals.filter((goal) => !['completed', 'cancelled'].includes(goal.status));
  const completedGoals = goals.filter((goal) => goal.status === 'completed');
  const goalTarget = goals.reduce((sum, goal) => sum + Number(goal.targetAmount || 0), 0);
  const goalCurrent = goals.reduce(
    (sum, goal) => sum + getGoalCurrentAmount(goal),
    0
  );
  const goalProgress = goalTarget > 0 ? round(Math.min(100, (goalCurrent / goalTarget) * 100)) : 0;
  const monthlySaving = Number(forecast.averageMonthlySavings || 0);
  const monthlyRequiredForGoals = activeGoals.reduce((sum, goal) => {
    const remainingAmount = Math.max(0, Number(goal.targetAmount || 0) - getGoalCurrentAmount(goal));
    const remainingMonths = getRemainingMonths(goal);
    return sum + (remainingMonths && remainingAmount > 0 ? remainingAmount / remainingMonths : 0);
  }, 0);
  const estimatedMonthlyGap = Math.max(0, monthlyRequiredForGoals - monthlySaving);
  const goalSavingsStatus = monthlyRequiredForGoals === 0 || monthlySaving >= monthlyRequiredForGoals
    ? 'on-track'
    : 'needs-attention';
  const projectedBalance = forecast.forecast.at(-1)?.projectedBalance ?? forecast.currentBalance;
  const projectedPoint = forecast.forecast.at(-1);
  const forecastStatus = projectedBalance < 0 || forecast.averageMonthlySavings < 0 ? 'at-risk' : 'on-track';
  const retirement = retirementPlan ? await buildRetirementProjection(retirementPlan) : null;
  const retirementStatus = retirement?.projection.status || 'not-configured';
  const emergency = forecast.emergencyFund ? {
    currentAmount: forecast.emergencyFund.current,
    targetAmount: forecast.emergencyFund.target,
    progress: forecast.emergencyFund.target > 0
      ? round(Math.min(100, (forecast.emergencyFund.current / forecast.emergencyFund.target) * 100))
      : 0,
    coverageMonths: forecast.emergencyFund.current > 0 && forecast.emergencyFund.monthlyEssentialExpenses > 0
      ? round(forecast.emergencyFund.current / forecast.emergencyFund.monthlyEssentialExpenses)
      : 0,
    targetMonths: forecast.emergencyFund.monthlyEssentialExpenses > 0
      ? Number(forecast.emergencyFund.target / forecast.emergencyFund.monthlyEssentialExpenses)
      : 0,
    estimatedCompletionMonths: forecast.emergencyFund.estimatedCompletionMonths,
    status: forecast.emergencyFund.status,
  } : null;
  const emergencyStatus = emergency
    ? emergency.coverageMonths >= emergency.targetMonths
      ? 'fully-funded'
      : emergency.coverageMonths >= emergency.targetMonths * 0.75
        ? 'nearly-funded'
        : emergency.coverageMonths > 0 ? 'building' : 'not-started'
    : 'not-configured';
  const retirementReadiness = retirement
    ? retirement.projection.requiredCorpus > 0
      ? round(Math.min(100, Math.max(0, (retirement.projection.projectedCorpus / retirement.projection.requiredCorpus) * 100)))
      : 100
    : 0;
  const goalHealthStatus = goals.length === 0 || goalSavingsStatus === 'on-track' ? 'on-track' : 'needs-attention';
  const savingsHealthStatus = forecast.averageMonthlyIncome > 0 && forecast.savingsRate >= 20 ? 'healthy'
    : forecast.averageMonthlySavings > 0 ? 'needs-attention' : 'at-risk';
  const emergencyHealthStatus = ['fully-funded', 'nearly-funded'].includes(emergencyStatus) ? 'funded'
    : ['building'].includes(emergencyStatus) ? 'building' : emergencyStatus;
  const retirementHealthStatus = !retirement ? 'not-configured' : retirementReadiness >= 100 ? 'on-track' : 'needs-attention';
  const criticalRisk = forecastStatus === 'at-risk' || emergencyStatus === 'not-started' || emergencyStatus === 'building' && forecastStatus === 'at-risk';
  const needsAttention = [goalHealthStatus, savingsHealthStatus, emergencyHealthStatus, retirementHealthStatus]
    .some((status) => ['needs-attention', 'at-risk', 'not-configured'].includes(status));
  const health = criticalRisk ? 'at-risk' : needsAttention ? 'needs-attention' : 'healthy';
  const planningHealth = {
    overallStatus: health,
    goalHealth: { progress: goalProgress, status: goalHealthStatus },
    savingsHealth: { savingsRate: forecast.savingsRate, monthlySavings: monthlySaving, status: savingsHealthStatus },
    emergencyHealth: { coverageMonths: emergency?.coverageMonths || 0, status: emergencyHealthStatus },
    forecastHealth: { projectedBalance: round(projectedBalance), status: forecastStatus },
    retirementHealth: { readiness: retirementReadiness, status: retirementHealthStatus },
  };
  const overview = {
    goals: {
      total: goals.length,
      totalGoals: goals.length,
      active: activeGoals.length,
      activeGoals: activeGoals.length,
      completed: completedGoals.length,
      completedGoals: completedGoals.length,
      totalTargetAmount: round(goalTarget),
      totalSavedAmount: round(goalCurrent),
      progress: goalProgress,
      overallProgress: goalProgress,
      status: goalHealthStatus,
    },
    savings: {
      totalSaved: forecast.savings.current,
      monthlySaved: monthlySaving,
      monthlySaving,
      savingsRate: forecast.savingsRate,
      projected12Months: forecast.savings.projected12Months,
      status: savingsHealthStatus,
    },
    goalSavings: {
      monthlyRequiredForGoals: round(monthlyRequiredForGoals),
      estimatedMonthlyGap: round(estimatedMonthlyGap),
      status: goalSavingsStatus,
    },
    emergencyFund: emergency ? { ...emergency, status: emergencyStatus } : null,
    forecast: {
      projectedBalance: round(projectedBalance),
      projectedIncome: round(projectedPoint?.income),
      projectedExpenses: round(projectedPoint?.expenses),
      horizon: forecast.forecastPeriod,
      monthlySavings: monthlySaving,
      status: forecastStatus,
    },
    retirement: retirement ? {
      yearsToRetirement: retirement.projection.yearsToRetirement,
      requiredCorpus: retirement.projection.requiredCorpus,
      projectedCorpus: retirement.projection.projectedCorpus,
      surplusOrShortfall: retirement.projection.surplusOrShortfall,
      shortfall: retirement.projection.shortfall,
      surplus: retirement.projection.surplus,
      status: retirementStatus,
      investmentValue: retirement.integration.investmentValue,
      goalProgress: retirement.integration.retirementGoalProgress,
    } : null,
    financialSafety: {
      emergencyFundStatus: emergencyStatus,
      forecastStatus,
      overallStatus: criticalRisk ? 'at-risk' : emergencyStatus === 'not-configured' ? 'needs-attention' : 'good',
    },
    retirementReadiness: retirement ? {
      status: retirementHealthStatus,
      score: retirementReadiness,
      summary: retirementReadiness >= 100 ? 'Projected corpus meets the required retirement corpus.' : 'Projected corpus is below the required retirement corpus.',
    } : null,
    planningHealth,
    goalHealth: planningHealth.goalHealth,
    savingsHealth: planningHealth.savingsHealth,
    emergencyHealth: planningHealth.emergencyHealth,
    forecastHealth: planningHealth.forecastHealth,
    retirementHealth: planningHealth.retirementHealth,
    overallStatus: health,
    overallPlanningHealth: health,
    recommendations: [],
    suggestions: [],
  };

  overview.recommendations = buildPlanningRecommendations(overview);
  overview.suggestions = overview.recommendations.map((recommendation) => recommendation.message);
  return overview;
};

module.exports = { buildPlanningOverview };
