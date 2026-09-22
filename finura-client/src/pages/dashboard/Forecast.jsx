import React, { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarClock, CheckCircle2, LoaderCircle, RefreshCw, Sparkles, Target, TrendingUp } from 'lucide-react';
import { toast } from 'react-toastify';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import forecastService from '../../services/forecastService';
import './Forecast.css';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const dateLabel = (value) => value ? new Date(value).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'No target date';

function Metric({ label, value, detail, tone = 'teal', icon: Icon }) {
  return <article className={`forecast-metric forecast-metric-${tone}`}><div className="forecast-metric-icon"><Icon size={17} /></div><div><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div></article>;
}

export default function Forecast() {
  const [months, setMonths] = useState(12);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scenario, setScenario] = useState({ incomeChangePercent: 10, expenseChangePercent: -10, savingsChangePercent: 0 });
  const [scenarioResult, setScenarioResult] = useState(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await forecastService.planning(months); setData(response.data); setError(''); setScenarioResult(null); }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to generate your forecast.'); }
    finally { setLoading(false); }
  }, [months]);

  useEffect(() => { load(); }, [load]);

  const calculateScenario = async () => {
    setScenarioLoading(true);
    try { const response = await forecastService.scenario({ months, ...scenario }); setScenarioResult(response.data); toast.success('Scenario calculated'); }
    catch (requestError) { toast.error(requestError.response?.data?.message || 'Unable to calculate scenario'); }
    finally { setScenarioLoading(false); }
  };

  if (loading) return <div className="forecast-page"><div className="forecast-shell"><div className="forecast-skeleton forecast-skeleton-hero" /><div className="forecast-skeleton-grid"><div className="forecast-skeleton" /><div className="forecast-skeleton" /><div className="forecast-skeleton" /><div className="forecast-skeleton" /></div><div className="forecast-skeleton forecast-skeleton-chart" /></div></div>;
  if (error) return <div className="forecast-page"><div className="forecast-shell"><div className="forecast-error"><AlertTriangle size={22} /><div><h2>Forecast unavailable</h2><p>{error}</p></div><button type="button" onClick={load}><RefreshCw size={15} /> Retry</button></div></div></div>;

  const chartData = data?.forecast || [];
  const finalPoint = chartData[chartData.length - 1];
  const scenarioDifference = scenarioResult ? Number(scenarioResult.projectedBalance || 0) - Number(finalPoint?.projectedBalance || 0) : 0;
  const insufficient = data?.insufficientData;

  return <div className="forecast-page"><div className="forecast-shell">
    <header className="forecast-hero"><div><span className="forecast-eyebrow">Planning / Forecast</span><h1>Financial Forecast</h1><p>See where your finances could be heading if recent patterns continue.</p></div><label className="forecast-period">Forecast period<select value={months} onChange={(event) => setMonths(Number(event.target.value))}><option value="6">6 months</option><option value="12">12 months</option><option value="24">24 months</option></select></label></header>
    {insufficient && <div className="forecast-notice"><Activity size={17} /><span>There is limited history available. This projection uses the data we have and will become more reliable as patterns build.</span></div>}
    <section className="forecast-metric-grid"><Metric label="Current balance" value={money(data.currentBalance)} detail="Across active accounts" icon={Activity} /><Metric label="Monthly savings" value={money(data.averageMonthlySavings)} detail={`${Number(data.savingsRate || 0).toFixed(1)}% savings rate`} icon={ArrowUpRight} tone="blue" /><Metric label="Average income" value={money(data.averageMonthlyIncome)} detail={`${data.historyMonths} month history`} icon={TrendingUp} tone="green" /><Metric label="Average expenses" value={money(data.averageMonthlyExpenses)} detail="Investment outflows included" icon={ArrowDownRight} tone="amber" /></section>
    <section className="forecast-chart-panel"><div className="forecast-section-heading"><div><span className="forecast-eyebrow">Projection</span><h2>Projected balance</h2></div><strong>{money(finalPoint?.projectedBalance)}</strong></div><div className="forecast-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 18, right: 14, left: 0, bottom: 2 }}><XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} /><YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} width={48} /><Tooltip formatter={(value, name) => [money(value), name === 'projectedBalance' ? 'Balance' : name]} contentStyle={{ border: '1px solid #dcebe7', borderRadius: 8, fontSize: 12 }} /><Line type="monotone" dataKey="projectedBalance" stroke="#0f766e" strokeWidth={3} dot={{ r: 3, fill: '#0f766e' }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div><p className="forecast-disclaimer">{data.disclaimer}</p></section>
    <section className="forecast-planning-grid"><div className="forecast-panel"><div className="forecast-section-heading"><div><span className="forecast-eyebrow">Allocation view</span><h2>Savings projection</h2></div><Target size={19} /></div><div className="forecast-inline-stats"><div><span>Current</span><strong>{money(data.savings?.current)}</strong></div><div><span>Monthly</span><strong>{money(data.savings?.monthly)}</strong></div><div><span>12 months</span><strong>{money(data.savings?.projected12Months)}</strong></div></div><p className="forecast-muted">Savings allocations are planning designations, not additional wealth.</p></div><div className="forecast-panel"><div className="forecast-section-heading"><div><span className="forecast-eyebrow">Safety reserve</span><h2>Emergency Fund</h2></div><CheckCircle2 size={19} /></div>{data.emergencyFund ? <><div className="forecast-emergency-line"><strong>{money(data.emergencyFund.current)}</strong><span>of {money(data.emergencyFund.target)}</span></div><div className="forecast-mini-progress"><span style={{ width: `${data.emergencyFund.target ? Math.min(100, (data.emergencyFund.current / data.emergencyFund.target) * 100) : 0}%` }} /></div><p className="forecast-muted">Expected completion: {data.emergencyFund.estimatedCompletionMonths === null ? 'Set a positive monthly allocation' : `${data.emergencyFund.estimatedCompletionMonths} months`}</p></> : <p className="forecast-muted">No Emergency Fund configured yet.</p>}</div></section>
    {data.allocationRisk && <div className="forecast-risk"><AlertTriangle size={17} /><span>{data.allocationRisk}</span></div>}
    <section className="forecast-panel forecast-goals-panel"><div className="forecast-section-heading"><div><span className="forecast-eyebrow">Planning confidence</span><h2>Your goals</h2></div><CalendarClock size={19} /></div>{data.goals?.length ? <div className="forecast-goal-list">{data.goals.map((goal) => <article className="forecast-goal" key={goal.title}><div><strong>{goal.title}</strong><span>{money(goal.currentAmount)} / {money(goal.targetAmount)} · {goal.targetDate ? dateLabel(goal.targetDate) : 'No target date'}</span></div><div className="forecast-goal-right"><b className={`forecast-goal-status forecast-goal-${goal.status}`}>{goal.status.replace('-', ' ')}</b><small>{goal.estimatedCompletionDate ? `Est. ${dateLabel(goal.estimatedCompletionDate)}` : 'No estimate yet'}</small></div></article>)}</div> : <p className="forecast-muted">No goals to project yet.</p>}</section>
    <section className="forecast-panel forecast-scenario"><div className="forecast-section-heading"><div><span className="forecast-eyebrow"><Sparkles size={13} /> What if?</span><h2>Try a scenario</h2></div></div><div className="forecast-sliders"><label>Income change <b>{scenario.incomeChangePercent > 0 ? '+' : ''}{scenario.incomeChangePercent}%</b><input type="range" min="-10" max="10" value={scenario.incomeChangePercent} onChange={(event) => setScenario({ ...scenario, incomeChangePercent: Number(event.target.value) })} /></label><label>Expense change <b>{scenario.expenseChangePercent > 0 ? '+' : ''}{scenario.expenseChangePercent}%</b><input type="range" min="-10" max="10" value={scenario.expenseChangePercent} onChange={(event) => setScenario({ ...scenario, expenseChangePercent: Number(event.target.value) })} /></label><button type="button" className="forecast-button" onClick={calculateScenario} disabled={scenarioLoading}>{scenarioLoading ? <><LoaderCircle className="forecast-spin" size={16} /> Calculating</> : 'Calculate scenario'}</button></div>{scenarioResult && <div className="forecast-scenario-result"><div><span>Current forecast</span><strong>{money(finalPoint?.projectedBalance)}</strong></div><div><span>Scenario forecast</span><strong>{money(scenarioResult.projectedBalance)}</strong></div><div className={scenarioDifference >= 0 ? 'forecast-difference-positive' : 'forecast-difference-negative'}><span>Difference</span><strong>{scenarioDifference >= 0 ? '+' : ''}{money(scenarioDifference)}</strong></div></div>}</section>
  </div></div>;
}
