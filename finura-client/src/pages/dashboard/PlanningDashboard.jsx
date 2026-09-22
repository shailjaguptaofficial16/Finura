import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, BarChart3, CheckCircle2, LoaderCircle, PiggyBank, RefreshCw, ShieldCheck, Sparkles, Target, TrendingUp, Wallet } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import planningService from '../../services/planningService';
import './PlanningDashboard.css';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const MODULES = [
  { key: 'goals', label: 'Goals', icon: Target, path: 'goals', value: (item) => `${item.progress || 0}%`, detail: (item) => `${item.completed} completed · ${item.active} active`, tone: 'teal' },
  { key: 'savings', label: 'Savings', icon: PiggyBank, path: 'savings', value: (item) => `${Number(item.savingsRate || 0).toFixed(1)}%`, detail: (item) => `${money(item.monthlySaved)} monthly`, tone: 'blue' },
  { key: 'emergencyFund', label: 'Emergency Fund', icon: ShieldCheck, path: 'emergency-fund', value: (item) => item ? `${Number(item.coverageMonths || 0).toFixed(1)} mo` : 'Not set', detail: (item) => item ? `${Number(item.progress || 0).toFixed(1)}% funded` : 'Create a safety reserve', tone: 'amber' },
  { key: 'forecast', label: 'Forecast', icon: TrendingUp, path: 'forecast', value: (item) => item.status === 'on-track' ? 'On track' : 'Review', detail: (item) => `12m: ${money(item.projectedBalance)}`, tone: 'green' },
  { key: 'retirement', label: 'Retirement', icon: Wallet, path: 'retirement', value: (item) => item ? money(item.projectedCorpus) : 'Not set', detail: (item) => item ? `${item.status.replace('-', ' ')}` : 'Create a long-term plan', tone: 'violet' },
];

export default function PlanningDashboard() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); try { const response = await planningService.overview(); setOverview(response.data?.data || response.data); setError(''); } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to load Planning overview'); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  if (loading) return <div className="planning-dashboard-page"><div className="planning-dashboard-shell"><div className="planning-skeleton planning-skeleton-hero" /><div className="planning-skeleton-grid">{[1, 2, 3, 4, 5].map((item) => <div className="planning-skeleton" key={item} />)}</div><div className="planning-skeleton planning-skeleton-panel" /></div></div>;
  if (error) return <div className="planning-dashboard-page"><div className="planning-dashboard-shell"><div className="planning-error"><RefreshCw size={19} /><div><h2>Planning overview unavailable</h2><p>{error}</p></div><button type="button" onClick={load}>Retry</button></div></div></div>;
  const health = overview?.planningHealth?.overallStatus || overview?.overallPlanningHealth || 'healthy';
  const recommendations = overview?.recommendations || [];
  return <div className="planning-dashboard-page"><div className="planning-dashboard-shell"><header className="planning-dashboard-hero"><div><span className="planning-eyebrow">Finura Planning</span><h1>Your planning dashboard</h1><p>One read-only view across goals, savings, safety, forecasting, and retirement.</p></div><button type="button" className="planning-refresh" onClick={load} aria-label="Refresh planning overview"><RefreshCw size={16} /></button></header><section className="planning-health"><div className="planning-health-icon"><CheckCircle2 size={22} /></div><div><span>Overall Planning Health</span><strong>{health === 'good' || health === 'healthy' ? 'Good' : 'Needs attention'}</strong></div><small>Planning reads your existing modules without changing them.</small></section><section className="planning-module-grid">{MODULES.map((module) => { const Icon = module.icon; const item = overview?.[module.key]; return <button type="button" className={`planning-module planning-module-${module.tone}`} key={module.key} onClick={() => navigate(module.path)}><div className="planning-module-icon"><Icon size={19} /></div><div className="planning-module-copy"><span>{module.label}</span><strong>{module.value(item)}</strong><small>{module.detail(item)}</small></div><ArrowRight className="planning-module-arrow" size={16} /></button>; })}</section><section className="planning-bottom-grid"><div className="planning-panel"><div className="planning-panel-heading"><div><span className="planning-eyebrow">Finura Suggestions</span><h2>Small moves, clearer progress</h2></div><Sparkles size={19} /></div><div className="planning-suggestions">{recommendations.length ? recommendations.map((recommendation) => <article className={`planning-recommendation planning-recommendation-${recommendation.priority}`} key={recommendation.type}><div className="planning-recommendation-heading"><strong>{recommendation.title}</strong><span>{recommendation.priority}</span></div><p>{recommendation.message}</p><small>{recommendation.action}</small></article>) : <div className="planning-healthy-message"><CheckCircle2 size={17} /><p>No urgent planning actions. Your current pattern is in good shape.</p></div>}</div></div><div className="planning-panel planning-integrity"><div className="planning-panel-heading"><div><span className="planning-eyebrow">Read-only view</span><h2>Source modules</h2></div><BarChart3 size={19} /></div><p>Goals, savings, Emergency Fund, Forecast, and Retirement remain the source of truth. This dashboard only summarizes their current state.</p><button type="button" className="planning-link-button" onClick={() => toast.info('Planning overview refreshed from source modules')}><LoaderCircle size={15} /> Check again</button></div></section></div></div>;
}
