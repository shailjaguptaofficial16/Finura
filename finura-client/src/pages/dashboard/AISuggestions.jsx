import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bot, ChevronRight, Info, RefreshCw, Sparkles } from 'lucide-react';
import api from '../../services/api';
import './AISuggestions.css';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const percent = (value) => `${Number(value || 0).toFixed(1)}%`;
const formatPeriod = (start, end) => {
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  if (!startDate || !endDate) return 'Current data';
  const formatter = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${formatter.format(startDate)} – ${formatter.format(endDate)}`;
};
const unwrap = (response, fallback = []) => {
  if (response?.data && Object.prototype.hasOwnProperty.call(response.data, 'data')) return response.data.data ?? fallback;
  return response?.data ?? fallback;
};

const normalizeId = (value, fallback = 'suggestion') => value || fallback;

export default function AISuggestions() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePeriod, setActivePeriod] = useState('Last 30 days');
  const requestLockRef = useRef(false);

  const buildSuggestions = useCallback(async () => {
    if (requestLockRef.current) return;
    requestLockRef.current = true;
    setLoading(true);
    setError('');

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);

      const [overviewResult, budgetsResult, recurringResult, goalsResult, creditResult, wealthResult] = await Promise.allSettled([
        api.get(`/analytics/overview?startDate=${startDate.toISOString().slice(0, 10)}&endDate=${endDate.toISOString().slice(0, 10)}`),
        api.get('/budgets'),
        api.get('/recurring'),
        api.get('/goals'),
        api.get('/credit/dashboard'),
        api.get('/wealth/overview'),
      ]);

      const overview = overviewResult.status === 'fulfilled' ? unwrap(overviewResult.value, null) : null;
      const budgets = budgetsResult.status === 'fulfilled' ? unwrap(budgetsResult.value, []) : [];
      const recurringRules = recurringResult.status === 'fulfilled' ? unwrap(recurringResult.value, []) : [];
      const goals = goalsResult.status === 'fulfilled' ? unwrap(goalsResult.value, []) : [];
      const creditDashboard = creditResult.status === 'fulfilled' ? unwrap(creditResult.value, null) : null;
      const wealthOverview = wealthResult.status === 'fulfilled' ? unwrap(wealthResult.value, null) : null;

      const periodLabel = formatPeriod(startDate, endDate);
      const builtSuggestions = [];
      const analyticsSummary = overview?.summary || {};
      const income = Number(analyticsSummary.totalIncome || 0);
      const expenses = Number(analyticsSummary.totalExpense || 0);
      const netCashFlow = Number(analyticsSummary.netCashFlow || 0);
      const creditOverview = creditDashboard?.overview || {};
      const creditUtilization = Number(creditOverview.creditUtilization || 0);
      const totalMonthlyEMI = Number(creditOverview.totalMonthlyEMI || 0);
      const outstanding = Number(creditOverview.totalOutstanding || 0);
      const emergencyGoal = Array.isArray(goals)
        ? goals.find((goal) => (goal.category || '').toLowerCase().includes('emergency')) || null
        : null;
      const emergencyProgress = emergencyGoal ? Number((Number(emergencyGoal.savedAmount || emergencyGoal.currentAmount || 0) / Math.max(Number(emergencyGoal.targetAmount || 1), 1)) * 100) : 0;

      if (income > 0 || expenses > 0) {
        const availableSurplus = Math.max(0, netCashFlow);
        if (availableSurplus > 0) {
          builtSuggestions.push({
            id: normalizeId('savings-opportunity'),
            title: 'Savings opportunity',
            category: 'Saving opportunities',
            explanation: 'Your recent cash flow shows a positive net position, which may indicate room to direct part of the surplus toward planned savings without changing your current spending pattern.',
            metric: money(availableSurplus),
            period: periodLabel,
            suggestion: 'Review your monthly surplus and decide whether to increase contributions to savings or emergency goals.',
            caution: 'This is a monitoring observation, not a promise of future results.',
          });
        }
      }

      const budgetRows = Array.isArray(budgets) ? budgets : [];
      const highUtilizationBudget = budgetRows
        .filter((budget) => Number(budget.amount || 0) > 0)
        .map((budget) => ({
          ...budget,
          spent: Number(budget.spent || budget.totalSpent || 0),
          utilization: Number(budget.amount || 0) > 0 ? ((Number(budget.spent || 0) / Number(budget.amount || 1)) * 100) : 0,
        }))
        .sort((left, right) => right.utilization - left.utilization)[0];

      if (highUtilizationBudget && highUtilizationBudget.utilization >= 80) {
        builtSuggestions.push({
          id: normalizeId('budget-adjustment'),
          title: 'Budget adjustment review',
          category: 'Budget adjustments',
          explanation: `The ${highUtilizationBudget.category || 'selected'} budget is trending at ${percent(highUtilizationBudget.utilization)} of its limit based on your saved budget data. This indicates a review opportunity while the period remains open.`,
          metric: `${money(highUtilizationBudget.spent)} / ${money(highUtilizationBudget.amount)}`,
          period: periodLabel,
          suggestion: 'Compare the current month against the category limit and decide whether to rebalance or pause discretionary spending.',
          caution: 'Budget data is informational and not a spending instruction.',
        });
      }

      const recurringExpenses = Array.isArray(recurringRules)
        ? recurringRules.filter((item) => (item.type || '').toLowerCase() === 'expense' && Number(item.amount || 0) > 0)
        : [];
      const recurringTotal = recurringExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      if (recurringTotal > 0) {
        builtSuggestions.push({
          id: normalizeId('recurring-review'),
          title: 'Recurring-expense review',
          category: 'Recurring-expense review',
          explanation: `You have ${recurringExpenses.length} active recurring expense entries with a combined monthly value of ${money(recurringTotal)}. This is a useful checkpoint to review whether each recurring item still matches your current spending baseline.`,
          metric: money(recurringTotal),
          period: 'Current recurring schedule',
          suggestion: 'Review the recurring list and confirm which expenses are still required or can be adjusted.',
          caution: 'Recurring review is for information only and does not change billing or subscriptions automatically.',
        });
      }

      if (outstanding > 0 || totalMonthlyEMI > 0) {
        builtSuggestions.push({
          id: normalizeId('debt-organization'),
          title: 'Debt-payment organization',
          category: 'Debt-payment organization',
          explanation: `Your outstanding credit and loan balance is ${money(outstanding)}, and the current monthly EMI burden is ${money(totalMonthlyEMI)}. This can be useful to prioritize repayment planning in a structured order.`,
          metric: money(totalMonthlyEMI),
          period: periodLabel,
          suggestion: 'Compare active loan payments and credit balances to decide which obligations feel most urgent or costly in terms of cash flow.',
          caution: 'This is a planning observation; it does not promise faster repayment or credit improvement.',
        });
      }

      if (emergencyGoal) {
        const emergencySaved = Number(emergencyGoal.savedAmount || emergencyGoal.currentAmount || 0);
        const emergencyTarget = Number(emergencyGoal.targetAmount || 0);
        if (emergencyTarget > 0) {
          const emergencyMetric = emergencyProgress;
          builtSuggestions.push({
            id: normalizeId(emergencyGoal._id || 'emergency-progress'),
            title: 'Emergency-fund progress',
            category: 'Emergency-fund progress',
            explanation: `Your emergency fund goal is ${percent(emergencyMetric)} complete, with ${money(emergencySaved)} saved against a ${money(emergencyTarget)} target. This is a useful checkpoint to assess readiness for short-term flexibility.`,
            metric: `${percent(emergencyMetric)} complete`,
            period: `Goal: ${emergencyGoal.title || 'Emergency fund'}`,
            suggestion: 'Continue funding the goal according to your current plan and review whether your target remains aligned with your current risk tolerance.',
            caution: 'This is informational and does not guarantee emergency coverage or future outcomes.',
          });
        }
      }

      if (wealthOverview && Number(wealthOverview.totalAssets || wealthOverview.totalNAV || 0) > 0) {
        const assetValue = Number(wealthOverview.totalAssets || wealthOverview.totalNAV || 0);
        const investmentValue = Number(wealthOverview.investmentValue || wealthOverview.portfolioValue || 0);
        if (investmentValue > 0 && assetValue > 0) {
          const investmentShare = (investmentValue / assetValue) * 100;
          builtSuggestions.push({
            id: normalizeId('investment-allocation'),
            title: 'Investment-allocation observation',
            category: 'Investment-allocation observations',
            explanation: `Based on your current wealth data, investments represent ${percent(investmentShare)} of your reported total asset value. This highlights how your portfolio is currently weighted relative to non-investment holdings.`,
            metric: `${percent(investmentShare)} of asset value`,
            period: 'Current wealth snapshot',
            suggestion: 'Review whether your current allocation matches your stated risk and liquidity preferences before making any portfolio decisions.',
            caution: 'This is a portfolio observation only and not a recommendation to buy or sell.',
          });
        }
      }

      if (creditUtilization > 0) {
        builtSuggestions.push({
          id: normalizeId('credit-utilization'),
          title: 'Credit-utilization awareness',
          category: 'Credit-utilization awareness',
          explanation: `Your reported credit utilization is ${percent(creditUtilization)}. This metric is useful for understanding how much of your available credit is currently in use.`,
          metric: percent(creditUtilization),
          period: periodLabel,
          suggestion: 'Keep an eye on utilization over time and compare it to your repayment plan before taking on additional revolving balances.',
          caution: 'This metric reflects current usage and does not guarantee a credit-score change.',
        });
      }

      const uniqueSuggestions = builtSuggestions.filter((item, index, array) =>
        array.findIndex((candidate) => candidate.id === item.id) === index
      );

      setSuggestions(uniqueSuggestions);
      setActivePeriod(periodLabel);
      if (!uniqueSuggestions.length) {
        setError('');
      }
    } catch (requestError) {
      setSuggestions([]);
      setError(requestError?.response?.data?.message || 'Unable to generate suggestions from your current financial data.');
    } finally {
      requestLockRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    buildSuggestions();
  }, [buildSuggestions]);

  const hasData = suggestions.length > 0;

  return (
    <main className="ai-suggestions-page">
      <section className="ai-suggestions-shell">
        <header className="ai-suggestions-header">
          <div className="ai-suggestions-header-copy">
            <span className="eyebrow">Finura AI</span>
            <h1>Suggestions</h1>
            <p>Review personalized, data-based observations using your current financial activity and account balances.</p>
          </div>
          <button type="button" onClick={buildSuggestions} disabled={loading} className="refresh-button">
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </header>

        {loading && (
          <div className="ai-suggestions-state loading-state" aria-live="polite">
            <Bot size={28} />
            <p>Preparing your suggestions from verified financial data…</p>
          </div>
        )}

        {!loading && error && (
          <div className="ai-suggestions-state error-state">
            <AlertTriangle size={28} />
            <h2>Suggestions unavailable</h2>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && !hasData && (
          <div className="ai-suggestions-state empty-state">
            <Info size={28} />
            <h2>Insufficient data for suggestions</h2>
            <p>More financial activity is needed before Finura AI can create meaningful, personalized suggestions.</p>
          </div>
        )}

        {!loading && !error && hasData && (
          <>
            <div className="ai-suggestions-summary">
              <div className="summary-pill">
                <Sparkles size={15} />
                <span>{suggestions.length} suggestions</span>
              </div>
              <div className="summary-period">Period: {activePeriod}</div>
            </div>

            <div className="ai-suggestions-grid">
              {suggestions.map((suggestion) => (
                <article key={suggestion.id} className="ai-suggestion-card">
                  <div className="card-header-row">
                    <div>
                      <span className="suggestion-category">{suggestion.category}</span>
                      <h3>{suggestion.title}</h3>
                    </div>
                    <span className="metric-badge">{suggestion.metric}</span>
                  </div>

                  <p className="card-explanation">{suggestion.explanation}</p>

                  <div className="card-meta">
                    <div>
                      <span className="meta-label">Period</span>
                      <strong>{suggestion.period}</strong>
                    </div>
                    <div>
                      <span className="meta-label">Recommended next step</span>
                      <strong>{suggestion.suggestion}</strong>
                    </div>
                  </div>

                  <p className="card-caution">{suggestion.caution}</p>
                </article>
              ))}
            </div>

            <div className="ai-suggestions-note">
              <ChevronRight size={16} />
              <span>These observations are informational and not a guarantee of results, returns, savings, or credit outcomes.</span>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
