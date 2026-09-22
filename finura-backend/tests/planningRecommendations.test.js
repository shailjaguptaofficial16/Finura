const { buildPlanningRecommendations } = require('../services/planningRecommendationService');

const buildOverview = (overrides = {}) => ({
  emergencyFund: null,
  retirement: null,
  goalSavings: { monthlyRequiredForGoals: 0, estimatedMonthlyGap: 0 },
  savings: { monthlySaving: 50000 },
  forecast: { projectedBalance: 500000 },
  ...overrides,
});

describe('Planning recommendation service', () => {
  it('returns no recommendations for a financially healthy user', () => {
    expect(buildPlanningRecommendations(buildOverview())).toEqual([]);
  });

  it('does not recommend an emergency fund when fully funded', () => {
    const overview = buildOverview({
      emergencyFund: { coverageMonths: 6, targetMonths: 6 },
    });

    expect(buildPlanningRecommendations(overview)).toEqual([]);
  });

  it('recommends emergency funding and includes the coverage gap', () => {
    const [recommendation] = buildPlanningRecommendations(buildOverview({
      emergencyFund: { coverageMonths: 1, targetMonths: 6 },
    }));

    expect(recommendation).toMatchObject({
      type: 'emergency-fund',
      priority: 'high',
      metric: { current: 1, target: 6, gap: 5 },
    });
  });

  it('recommends only shortfalls and orders them by priority', () => {
    const recommendations = buildPlanningRecommendations(buildOverview({
      emergencyFund: { coverageMonths: 1, targetMonths: 6 },
      retirement: { projectedCorpus: 18000000, requiredCorpus: 22000000, shortfall: 4000000 },
      goalSavings: { monthlyRequiredForGoals: 70000, estimatedMonthlyGap: 20000 },
      savings: { monthlySaving: 50000 },
      forecast: { projectedBalance: -1000 },
    }));

    expect(recommendations.map(({ type, priority }) => ({ type, priority }))).toEqual([
      { type: 'emergency-fund', priority: 'high' },
      { type: 'retirement', priority: 'high' },
      { type: 'forecast', priority: 'high' },
      { type: 'goals', priority: 'medium' },
    ]);
    expect(new Set(recommendations.map(({ type }) => type)).size).toBe(recommendations.length);
  });

  it('does not recommend retirement when projected corpus meets the target', () => {
    const overview = buildOverview({
      retirement: { projectedCorpus: 22000000, requiredCorpus: 22000000, shortfall: 0 },
    });

    expect(buildPlanningRecommendations(overview)).toEqual([]);
  });
});