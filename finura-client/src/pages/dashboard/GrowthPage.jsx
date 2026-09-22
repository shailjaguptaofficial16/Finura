import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowDownRight, ArrowUpRight, CalendarRange, RefreshCw, TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../../services/api';

const formatMoney = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatPercent = (value) => `${Number(value || 0) >= 0 ? '+' : ''}${Number(value || 0).toFixed(1)}%`;

const formatSnapshotDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
};

export default function GrowthPage() {
  const [snapshots, setSnapshots] = useState([]);
  const [growth, setGrowth] = useState(null);
  const [netWorth, setNetWorth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [snapshotsRes, growthRes, netWorthRes] = await Promise.all([
        api.get('/wealth/snapshots'),
        api.get('/wealth/growth'),
        api.get('/wealth/net-worth'),
      ]);

      const snapshotList = Array.isArray(snapshotsRes.data?.data)
        ? snapshotsRes.data.data
        : Array.isArray(snapshotsRes.data)
          ? snapshotsRes.data
          : [];

      setSnapshots(snapshotList.sort((left, right) => new Date(left.snapshotDate) - new Date(right.snapshotDate)));
      setGrowth(growthRes.data?.data || growthRes.data || null);
      setNetWorth(netWorthRes.data?.data || netWorthRes.data || null);
    } catch (requestError) {
      console.error('Failed to load growth data:', requestError);
      setError(requestError.response?.data?.message || 'Unable to load wealth growth details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const refreshHandler = () => fetchData();
    window.addEventListener('finura:wealth-updated', refreshHandler);
    return () => window.removeEventListener('finura:wealth-updated', refreshHandler);
  }, [fetchData]);

  const filteredSnapshots = useMemo(() => {
    if (!snapshots.length) return [];
    const now = new Date();
    const cutoff = new Date(now);
    if (range === '6m') cutoff.setMonth(now.getMonth() - 6);
    if (range === '12m') cutoff.setFullYear(now.getFullYear() - 1);
    if (range === 'all') return snapshots;
    return snapshots.filter((snapshot) => new Date(snapshot.snapshotDate) >= cutoff);
  }, [range, snapshots]);

  const chartData = useMemo(
    () =>
      filteredSnapshots.map((snapshot) => ({
        date: formatSnapshotDate(snapshot.snapshotDate),
        value: Number(snapshot.netWorth || 0),
        assets: Number(snapshot.totalAssets || 0),
        liabilities: Number(snapshot.totalLiabilities || 0),
      })),
    [filteredSnapshots]
  );

  const previousSnapshot = filteredSnapshots.length > 1 ? filteredSnapshots[filteredSnapshots.length - 2] : null;
  const currentAssets = Number(netWorth?.totalAssets || 0);
  const currentLiabilities = Number(netWorth?.totalLiabilities || 0);
  const previousAssets = Number(previousSnapshot?.totalAssets || 0);
  const previousLiabilities = Number(previousSnapshot?.totalLiabilities || 0);
  const assetGrowth = currentAssets - previousAssets;
  const liabilityChange = currentLiabilities - previousLiabilities;

  if (loading) {
    return (
      <main className="min-h-full bg-slate-50 p-4 sm:p-6">
        <div className="mx-auto max-w-7xl space-y-5 animate-pulse">
          <div className="h-28 rounded-2xl bg-slate-200" />
          <div className="grid gap-5 md:grid-cols-4">
            <div className="h-28 rounded-2xl bg-slate-200" />
            <div className="h-28 rounded-2xl bg-slate-200" />
            <div className="h-28 rounded-2xl bg-slate-200" />
            <div className="h-28 rounded-2xl bg-slate-200" />
          </div>
          <div className="h-80 rounded-2xl bg-slate-200" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="grid min-h-full place-items-center bg-slate-50 p-6">
        <section className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto text-red-600" size={28} />
          <h1 className="mt-3 text-xl font-bold text-slate-900">Growth data is unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <button type="button" onClick={fetchData} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            <RefreshCw size={15} /> Retry
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-6 text-white shadow-lg md:flex-row md:items-end md:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-[.18em] text-emerald-300">Finura Wealth</span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Growth</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">Historical net worth movement using your saved wealth snapshots.</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={range} onChange={(event) => setRange(event.target.value)} className="h-10 rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-emerald-300">
              <option value="all" className="text-slate-900">All time</option>
              <option value="6m" className="text-slate-900">Last 6 months</option>
              <option value="12m" className="text-slate-900">Last 12 months</option>
            </select>
          </div>
        </header>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Current net worth" value={Number(growth?.currentNetWorth ?? netWorth?.netWorth ?? 0)} tone="emerald" icon={TrendingUp} detail="Latest snapshot" />
          <Metric label="Previous period" value={Number(growth?.previousNetWorth ?? previousSnapshot?.netWorth ?? 0)} tone="slate" icon={CalendarRange} detail="Previous saved snapshot" />
          <Metric label="Absolute change" value={Number(growth?.absoluteGrowth ?? (Number(netWorth?.netWorth || 0) - Number(previousSnapshot?.netWorth || 0)))} tone={Number(growth?.absoluteGrowth ?? 0) >= 0 ? 'emerald' : 'red'} icon={Number(growth?.absoluteGrowth ?? 0) >= 0 ? ArrowUpRight : ArrowDownRight} detail="Net worth movement" />
          <Metric label="Percentage change" value={Number(growth?.growthPercentage ?? 0)} tone={Number(growth?.growthPercentage ?? 0) >= 0 ? 'emerald' : 'red'} icon={TrendingUp} detail="Change vs previous snapshot" isPercentage />
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <ArrowUpRight size={15} className="text-emerald-600" /> Asset growth
            </div>
            <strong className="mt-3 block text-2xl font-extrabold tracking-tight text-slate-900">{formatMoney(assetGrowth)}</strong>
            <span className="mt-1 block text-xs text-slate-500">Current assets vs {previousSnapshot ? formatSnapshotDate(previousSnapshot.snapshotDate) : 'latest saved snapshot'}</span>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <ArrowDownRight size={15} className="text-red-600" /> Liability change
            </div>
            <strong className="mt-3 block text-2xl font-extrabold tracking-tight text-slate-900">{formatMoney(liabilityChange)}</strong>
            <span className="mt-1 block text-xs text-slate-500">Current liabilities vs {previousSnapshot ? formatSnapshotDate(previousSnapshot.snapshotDate) : 'latest saved snapshot'}</span>
          </article>
        </section>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Net worth trend</h2>
              <p className="mt-1 text-xs text-slate-500">Historical net worth values from backend snapshots</p>
            </div>
          </div>

          {chartData.length ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="growth-fill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`} />
                  <Tooltip formatter={(value) => formatMoney(value)} labelFormatter={(label) => `${label}`} />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fill="url(#growth-fill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="grid h-80 place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm text-slate-500">
              No historical net worth snapshots are available yet. Save a snapshot or add accounts and liabilities to begin the trend.
            </div>
          )}
        </article>
      </div>
    </main>
  );
}

function Metric({ label, value, tone = 'slate', icon: Icon, detail, isPercentage = false }) {
  const positive = Number(value || 0) >= 0;
  const displayValue = isPercentage ? formatPercent(value) : formatMoney(value);
  const color = tone === 'red' ? 'text-red-600' : tone === 'emerald' ? 'text-emerald-600' : 'text-slate-900';

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        <Icon size={15} className={tone === 'red' ? 'text-red-600' : tone === 'emerald' ? 'text-emerald-600' : 'text-slate-600'} />
        {label}
      </div>
      <strong className={`mt-3 block text-2xl font-extrabold tracking-tight ${color}`}>{displayValue}</strong>
      <span className="mt-1 block text-xs text-slate-500">{detail}</span>
      {!isPercentage && !positive && <span className="mt-2 inline-flex rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700">Negative movement</span>}
    </article>
  );
}
