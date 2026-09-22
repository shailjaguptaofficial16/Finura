import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowDownRight, ArrowUpRight, Building2, CircleDollarSign, Landmark, PieChart as PieChartIcon, RefreshCw, ShieldCheck, Wallet } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../../services/api';

const colors = ['#0f766e', '#2563eb', '#d97706', '#b45309', '#64748b', '#7c3aed', '#475569'];
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'No snapshot';

const Metric = ({ label, value, icon: Icon, tone = 'teal', detail }) => (
  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><Icon size={16} className={`text-${tone}-600`} />{label}</span>
    <strong className="mt-3 block text-2xl font-extrabold tracking-tight text-slate-900">{money(value)}</strong>
    {detail && <span className="mt-1 block text-xs text-slate-500">{detail}</span>}
  </article>
);

export default function WealthAdvisory() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/wealth/overview');
      setOverview(response.data?.data || response.data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load wealth overview');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const allocation = overview?.allocation?.allocation || [];
  const chartData = useMemo(() => allocation.filter((item) => item.amount > 0), [allocation]);
  const netWorth = overview?.netWorth || {};
  const growth = overview?.growth || {};
  const assets = overview?.assets || [];
  const liabilities = overview?.liabilities || [];
  const isEmpty = !netWorth.totalAssets && !netWorth.totalLiabilities && !assets.length && !liabilities.length;
  const growthPositive = Number(growth.absoluteGrowth || 0) >= 0;

  if (loading) return <main className="min-h-full bg-slate-50 p-6"><div className="mx-auto max-w-7xl animate-pulse space-y-5"><div className="h-32 rounded-2xl bg-slate-200" /><div className="grid gap-5 md:grid-cols-3"><div className="h-32 rounded-2xl bg-slate-200" /><div className="h-32 rounded-2xl bg-slate-200" /><div className="h-32 rounded-2xl bg-slate-200" /></div><div className="h-80 rounded-2xl bg-slate-200" /></div></main>;
  if (error) return <main className="grid min-h-full place-items-center bg-slate-50 p-6"><section className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm"><AlertCircle className="mx-auto text-red-600" size={28} /><h1 className="mt-3 text-xl font-bold text-slate-900">Wealth overview unavailable</h1><p className="mt-2 text-sm text-slate-500">{error}</p><button type="button" onClick={load} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"><RefreshCw size={15} /> Retry</button></section></main>;

  return <main className="min-h-full bg-slate-50 p-4 sm:p-6"><div className="mx-auto max-w-7xl space-y-5">
    <header className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 p-6 text-white shadow-lg sm:flex-row sm:items-end"><div><span className="text-xs font-bold uppercase tracking-[.18em] text-teal-300">Finura Wealth</span><h1 className="mt-2 text-3xl font-extrabold tracking-tight">Your wealth dashboard</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">A live view of accounts, investments, manual assets, liabilities, and wealth growth.</p></div><button type="button" onClick={load} aria-label="Refresh wealth overview" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white"><RefreshCw size={15} /> Refresh</button></header>
    {isEmpty && <section className="flex flex-col gap-3 rounded-2xl border border-teal-100 bg-teal-50 p-5 text-teal-900 sm:flex-row sm:items-center"><ShieldCheck size={24} /><div><strong>Your wealth picture starts here</strong><p className="mt-1 text-sm text-teal-800">Add an account, investment, asset, or liability to begin tracking your net worth.</p></div></section>}
    <section className="grid gap-5 md:grid-cols-3"><Metric label="Net Worth" value={netWorth.netWorth} icon={CircleDollarSign} detail="Total assets minus liabilities" /><Metric label="Total Assets" value={netWorth.totalAssets} icon={Wallet} tone="emerald" detail="Accounts, investments, and manual assets" /><Metric label="Total Liabilities" value={netWorth.totalLiabilities} icon={Landmark} tone="amber" detail="Outstanding balances only" /></section>
    <section className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between"><div><h2 className="text-lg font-bold text-slate-900">Asset allocation</h2><p className="mt-1 text-xs text-slate-500">Goals, savings, and emergency funds are not separate assets.</p></div><PieChartIcon className="text-teal-700" size={20} /></div><div className="mt-4 grid gap-5 sm:grid-cols-[190px_1fr] sm:items-center">{chartData.length ? <ResponsiveContainer width="100%" height={190}><PieChart><Pie data={chartData} dataKey="amount" nameKey="category" innerRadius={54} outerRadius={82} paddingAngle={3}>{chartData.map((item) => <Cell key={item.category} fill={colors[allocation.findIndex((entry) => entry.category === item.category) % colors.length]} />)}</Pie><Tooltip formatter={(value) => money(value)} /></PieChart></ResponsiveContainer> : <div className="grid h-44 place-items-center rounded-full border-[22px] border-slate-100 text-center text-xs text-slate-400">No assets recorded</div>}<div className="space-y-2">{allocation.map((item, index) => <div key={item.category} className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2 text-slate-600"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />{item.category}</span><span className="font-semibold text-slate-900">{money(item.amount)} <small className="font-normal text-slate-500">{item.percentage}%</small></span></div>)}</div></div><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm"><span className="text-slate-500">Diversification score</span><strong className="text-slate-900">{overview?.allocation?.diversificationScore || 0}/100 · {overview?.allocation?.riskLevel || 'moderate'}</strong></div></article>
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between"><div><h2 className="text-lg font-bold text-slate-900">Wealth growth</h2><p className="mt-1 text-xs text-slate-500">Compared with your latest saved snapshot.</p></div>{growthPositive ? <ArrowUpRight className="text-emerald-600" size={21} /> : <ArrowDownRight className="text-red-600" size={21} />}</div><strong className={`mt-7 block text-3xl font-extrabold ${growthPositive ? 'text-emerald-600' : 'text-red-600'}`}>{growthPositive ? '+' : ''}{money(growth.absoluteGrowth)}</strong><p className="mt-1 text-sm text-slate-500">{growth.growthPercentage || 0}% overall growth</p><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-4"><span className="text-xs text-slate-500">Monthly</span><strong className="mt-1 block text-lg text-slate-900">{money(growth.monthlyGrowthAmount)}</strong></div><div className="rounded-xl bg-slate-50 p-4"><span className="text-xs text-slate-500">Yearly</span><strong className="mt-1 block text-lg text-slate-900">{money(growth.yearlyGrowthAmount)}</strong></div></div><p className="mt-5 text-xs text-slate-500">Last snapshot: {formatDate(growth.lastSnapshotDate)}</p></article>
    </section>
    <section className="grid gap-5 lg:grid-cols-2"><List title="Assets" icon={Building2} items={assets} valueKey="currentValue" empty="No manual assets recorded." /><List title="Liabilities" icon={Landmark} items={liabilities} valueKey="outstandingAmount" empty="No liabilities recorded." /></section>
  </div></main>;
}

function List({ title, icon: Icon, items, valueKey, empty }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Icon size={19} className="text-teal-700" />{title}</h2><span className="text-xs font-semibold text-slate-500">{items.length} records</span></div>{items.length ? <div className="mt-4 divide-y divide-slate-100">{items.slice(0, 6).map((item) => <div key={item._id} className="flex items-center justify-between gap-3 py-3"><div><strong className="block text-sm text-slate-800">{item.name}</strong><span className="text-xs text-slate-500">{item.category}</span></div><span className="font-semibold text-slate-900">{money(item[valueKey])}</span></div>)}</div> : <p className="mt-5 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">{empty}</p>}</article>;
}