const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 };

const formatAmount = (value) => Number(value || 0).toLocaleString('en-IN');

const buildPlanningRecommendations = (overview) => {
  const recommendations = [];
  const emergency = overview.emergencyFund;
  const retirement = overview.retirement;
  const goalSavings = overview.goalSavings;
  const forecast = overview.forecast;

  if (emergency && emergency.targetMonths > 0 && emergency.coverageMonths < emergency.targetMonths) {
    const priority = emergency.coverageMonths < emergency.targetMonths * 0.5 ? 'high' : 'medium';
    recommendations.push({
      type: 'emergency-fund',
      priority,
      title: 'Build your emergency fund',
      message: `Your emergency fund covers ${emergency.coverageMonths.toFixed(1)} months against a ${emergency.targetMonths.toFixed(1)} month target.`,
      action: 'Increase monthly emergency savings',
      metric: {
        current: emergency.coverageMonths,
        target: emergency.targetMonths,
        gap: Number((emergency.targetMonths - emergency.coverageMonths).toFixed(2)),
      },
    });
  }

  if (retirement && Number(retirement.shortfall || 0) > 0) {
    recommendations.push({
      type: 'retirement',
      priority: 'high',
      title: 'Close your retirement gap',
      message: `Your projected retirement corpus is ${formatAmount(retirement.shortfall)} below the required corpus.`,
      action: 'Increase your monthly retirement contribution',
      metric: {
        current: retirement.projectedCorpus,
        target: retirement.requiredCorpus,
        gap: retirement.shortfall,
      },
    });
  }

  if (goalSavings && Number(goalSavings.estimatedMonthlyGap || 0) > 0) {
    recommendations.push({
      type: 'goals',
      priority: 'medium',
      title: 'Review goal funding',
      message: `Active goals require approximately ${formatAmount(goalSavings.monthlyRequiredForGoals)}/month, while current savings capacity is ${formatAmount(overview.savings.monthlySaving)}/month.`,
      action: 'Increase goal contributions or adjust target dates',
      metric: {
        current: overview.savings.monthlySaving,
        target: goalSavings.monthlyRequiredForGoals,
        gap: goalSavings.estimatedMonthlyGap,
      },
    });
  }

  if (forecast && Number(forecast.projectedBalance || 0) < 0) {
    recommendations.push({
      type: 'forecast',
      priority: 'high',
      title: 'Review your projected cash position',
      message: 'Your projected cash position is declining below zero if the current pattern continues.',
      action: 'Review upcoming expenses and recurring commitments',
      metric: { current: forecast.projectedBalance, target: 0, gap: Math.abs(forecast.projectedBalance) },
    });
  }

  return recommendations
    .filter((recommendation, index, all) => all.findIndex((item) => item.type === recommendation.type) === index)
    .sort((left, right) => PRIORITY_WEIGHT[right.priority] - PRIORITY_WEIGHT[left.priority]);
};

module.exports = { buildPlanningRecommendations };
