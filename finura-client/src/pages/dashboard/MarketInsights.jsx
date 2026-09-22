import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Globe,
  DollarSign,
  Shield,
  Layers,
  ArrowUpRight,
  Sparkles,
  BarChart2,
  Calendar,
} from 'lucide-react';

const MARKET_UPDATES = [
  {
    title: 'Global Equities & Tech Indices',
    detail: 'Investor sentiment remains constructive with selective exposure to quality growth, enterprise AI infrastructure, and semiconductor leaders.',
    status: 'Bullish',
    trend: '+4.2% MTD',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    icon: <Globe size={22} className="text-teal-600" />,
    iconBg: 'bg-teal-50 border border-teal-100',
    statLabel: 'Tech Composite',
    statVal: '18,420.50',
  },
  {
    title: 'Fixed Income & Treasury Yields',
    detail: 'Yield curves are supporting diversified bond ladders, institutional credit spreads, and high-quality sovereign debt allocations.',
    status: 'Stable',
    trend: '4.15% Yield',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    icon: <Shield size={22} className="text-blue-600" />,
    iconBg: 'bg-blue-50 border border-blue-100',
    statLabel: '10-Yr Benchmark',
    statVal: '4.18%',
  },
  {
    title: 'Alternative Assets & Private Credit',
    detail: 'Direct private lending and real asset infrastructure continue to generate attractive risk-adjusted premiums and inflation-hedged yields.',
    status: 'Bullish',
    trend: '+8.6% Annualized',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    icon: <Layers size={22} className="text-emerald-600" />,
    iconBg: 'bg-emerald-50 border border-emerald-100',
    statLabel: 'Private Index',
    statVal: '11.4% IRR',
  },
  {
    title: 'Commodities & Macro Energy',
    detail: 'Crude and precious metals reflect disciplined supply dynamics and central bank gold accumulation amid sovereign reserve diversification.',
    status: 'Neutral',
    trend: '+1.1% Weekly',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    icon: <Activity size={22} className="text-amber-600" />,
    iconBg: 'bg-amber-50 border border-amber-100',
    statLabel: 'Gold Spot',
    statVal: '$2,860/oz',
  },
];

export default function MarketInsights() {
  const [filter, setFilter] = useState('All');

  const filteredUpdates = filter === 'All'
    ? MARKET_UPDATES
    : MARKET_UPDATES.filter((item) => item.status.toLowerCase() === filter.toLowerCase());

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
      
      {/* ── PAGE HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-slate-800/80">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase tracking-wider mb-2">
            <Sparkles size={13} />
            Institutional Intelligence
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Market Insights & Macro Telemetry
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl leading-relaxed">
            Monitor asset class performance, macroeconomic indicators, and strategic capital positioning opportunities.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 p-1.5 rounded-xl text-xs font-semibold">
          {['All', 'Bullish', 'Stable', 'Neutral'].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filter === t
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'text-slate-200 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── INSIGHT CARDS GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredUpdates.map((item) => (
          <div
            key={item.title}
            className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className={`w-12 h-12 rounded-xl ${item.iconBg} flex items-center justify-center`}>
                  {item.icon}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${item.color}`}>
                    {item.status === 'Bullish' ? <TrendingUp size={12} /> : <Activity size={12} />}
                    {item.status}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                    {item.trend}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">{item.title}</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{item.detail}</p>
              </div>
            </div>

            {/* Bottom Meta & Metric */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-bold">{item.statLabel}</span>
                <span className="text-sm font-extrabold text-slate-900 font-mono">{item.statVal}</span>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800 transition cursor-pointer"
              >
                <span>Macro Breakdown</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}