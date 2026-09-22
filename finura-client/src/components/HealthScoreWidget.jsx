import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Activity, ShieldCheck, TrendingUp, Target, Layers, ArrowUpRight, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import api from '../services/api';

export default function HealthScoreWidget({ className = '' }) {
  const [data, setData] = useState({
    score: 50,
    status: 'Good',
    details: {
      baseScore: 30,
      cashflowScore: 10,
      savingsScore: 0,
      investmentScore: 10,
    },
    metrics: {},
  });
  const [loading, setLoading] = useState(true);

  // Fetch real score from API
  const fetchHealthScore = useCallback(async () => {
    try {
      const response = await api.get('/analytics/health-score');
      if (response.data) {
        setData(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch health score:', err);
      // Suppress toast on initial load for empty profiles
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealthScore();

    const handleUpdate = () => fetchHealthScore();
    window.addEventListener('finura:transactions-updated', handleUpdate);
    window.addEventListener('finura:goals-updated', handleUpdate);
    window.addEventListener('finura:investments-updated', handleUpdate);

    return () => {
      window.removeEventListener('finura:transactions-updated', handleUpdate);
      window.removeEventListener('finura:goals-updated', handleUpdate);
      window.removeEventListener('finura:investments-updated', handleUpdate);
    };
  }, [fetchHealthScore]);

  const score = data.score ?? 50;
  const status = data.status ?? 'Good';
  const details = data.details || { baseScore: 30, cashflowScore: 10, savingsScore: 0, investmentScore: 10 };

  // Dynamic color styling
  const colorTheme = useMemo(() => {
    if (score >= 80) {
      return {
        text: 'text-emerald-500',
        bg: 'bg-emerald-50',
        border: 'border-emerald-500',
        stroke: '#10b981',
        labelBg: '#ecfdf5',
        labelText: '#047857',
        badge: 'Excellent',
      };
    }
    if (score >= 60) {
      return {
        text: 'text-amber-500',
        bg: 'bg-amber-50',
        border: 'border-amber-500',
        stroke: '#f59e0b',
        labelBg: '#fffbeb',
        labelText: '#b45309',
        badge: 'Good',
      };
    }
    return {
      text: 'text-rose-500',
      bg: 'bg-rose-50',
      border: 'border-rose-500',
      stroke: '#ef4444',
      labelBg: '#fef2f2',
      labelText: '#b91c1c',
      badge: 'Needs Attention',
    };
  }, [score]);

  // Dynamic recommendations
  const recommendation = useMemo(() => {
    if (score >= 80) {
      return {
        title: 'Optimal Financial Resilience',
        tip: 'Excellent cashflow control and multi-asset compounding. Continue maintaining steady monthly savings.',
        icon: <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />,
      };
    }
    if (details.cashflowScore < 20) {
      return {
        title: 'Optimize Monthly Cashflow',
        tip: 'Your outflows are close to or exceeding income. Reduce discretionary expenses to maintain a surplus cash reserve.',
        icon: <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />,
      };
    }
    if (details.savingsScore < 15) {
      return {
        title: 'Boost Goal Savings Rate',
        tip: 'Allocate at least 10% to 20% of net income into dedicated savings targets to improve liquidity resilience.',
        icon: <Target size={16} className="text-amber-600 shrink-0 mt-0.5" />,
      };
    }
    if (details.investmentScore < 20) {
      return {
        title: 'Deploy Capital into Investments',
        tip: 'Add equities, index funds, or crypto to your portfolio to activate the +20 investment diversification bonus.',
        icon: <TrendingUp size={16} className="text-blue-600 shrink-0 mt-0.5" />,
      };
    }
    return {
      title: 'Solid Baseline',
      tip: 'Maintain your current income and build continuous milestone contributions to achieve an Excellent score.',
      icon: <Info size={16} className="text-teal-600 shrink-0 mt-0.5" />,
    };
  }, [score, details]);

  // Radial Gauge Calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex items-center justify-center min-h-[220px] ${className}`}>
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-teal-100 border-t-teal-600 rounded-full animate-spin mx-auto mb-2" />
          <span className="text-xs text-slate-400 font-medium">Computing Financial Health Score...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-5 ${className}`}>
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
          <Activity size={18} style={{ color: colorTheme.stroke }} />
          <span>Financial Health Score</span>
        </div>
        <span
          style={{ backgroundColor: colorTheme.labelBg, color: colorTheme.labelText }}
          className="text-xs font-bold px-2.5 py-0.5 rounded-full"
        >
          {status}
        </span>
      </div>

      {/* Main Score & Radial Meter */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className={`text-4xl sm:text-5xl font-extrabold tracking-tight ${colorTheme.text}`}>
            {score}
          </div>
          <span className="text-xs text-slate-400 font-semibold block mt-1">
            out of 100 max points
          </span>
        </div>

        {/* Circular Progress Gauge */}
        <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
          <svg width="96" height="96" viewBox="0 0 96 96" className="transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="transparent"
              stroke="#f1f5f9"
              strokeWidth="8"
            />
            <circle
              cx="48"
              cy="48"
              r={radius}
              fill="transparent"
              stroke={colorTheme.stroke}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-bold text-slate-800 text-sm">
            {score}%
          </div>
        </div>
      </div>

      {/* Score Pillars Breakdown Bar */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Score Components Breakdown
        </div>
        <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block">Base</span>
            <span className="font-bold text-slate-700">{details.baseScore}/30</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block">Cashflow</span>
            <span className={`font-bold ${details.cashflowScore >= 20 ? 'text-emerald-600' : 'text-slate-700'}`}>
              {details.cashflowScore}/25
            </span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block">Savings</span>
            <span className={`font-bold ${details.savingsScore >= 15 ? 'text-amber-600' : 'text-slate-700'}`}>
              {details.savingsScore}/25
            </span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-400 block">Invest</span>
            <span className={`font-bold ${details.investmentScore >= 20 ? 'text-blue-600' : 'text-slate-700'}`}>
              {details.investmentScore}/20
            </span>
          </div>
        </div>
      </div>

      {/* Smart Advisory Recommendation Box */}
      <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-start gap-2.5 text-xs">
        {recommendation.icon}
        <div className="space-y-0.5">
          <div className="font-bold text-slate-800">{recommendation.title}</div>
          <p className="text-slate-500 leading-relaxed">{recommendation.tip}</p>
        </div>
      </div>

    </div>
  );
}
