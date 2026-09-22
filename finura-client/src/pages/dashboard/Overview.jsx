import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import TransactionModal from '../../components/TransactionModal';
import { formatCurrency, getPreferredCurrency } from '../../utils/formatters';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Layers,
  Plus,
  X,
  Scale,
  ArrowRight,
} from 'lucide-react';
import { EmptyState, ErrorState, DashboardSkeleton } from '../../components/common';

const CATEGORY_PALETTE = [
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#14b8a6', // Teal
  '#64748b', // Slate
];

const DEFAULT_MONTHLY_EMPTY = [
  { month: 'Jan', income: 0, expense: 0 },
  { month: 'Feb', income: 0, expense: 0 },
  { month: 'Mar', income: 0, expense: 0 },
  { month: 'Apr', income: 0, expense: 0 },
  { month: 'May', income: 0, expense: 0 },
  { month: 'Jun', income: 0, expense: 0 },
];

export default function Overview() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State Management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalBalance: 0,
    totalTransactions: 0,
    categoryBreakdown: [],
    expenseBreakdown: [],
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [wealthOverview, setWealthOverview] = useState(null);
  const [currency, setCurrency] = useState(getPreferredCurrency);

  // Modal States
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState('expense');
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalSubmitting, setGoalSubmitting] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    targetAmount: '',
    deadline: '',
    category: 'Other',
  });

  // Fetch all real dashboard metrics
  const fetchDashboardData = useCallback(async () => {
    setError(null);
    try {
      const [summaryRes, monthlyRes, trxRes, goalsRes, wealthRes] = await Promise.allSettled([
        api.get('/transactions/summary'),
        api.get('/transactions/monthly-summary'),
        api.get('/transactions'),
        api.get('/goals'),
        api.get('/wealth/overview'),
      ]);

      const allFailed = [summaryRes, monthlyRes, trxRes, goalsRes, wealthRes].every(
        (r) => r.status === 'rejected'
      );
      if (allFailed) {
        setError('Unable to synchronize financial telemetry. Please check server connectivity.');
      }

      if (summaryRes.status === 'fulfilled' && summaryRes.value?.data) {
        setSummary(summaryRes.value.data);
      }

      if (monthlyRes.status === 'fulfilled' && Array.isArray(monthlyRes.value?.data) && monthlyRes.value.data.length > 0) {
        setMonthlyData(monthlyRes.value.data);
      } else {
        setMonthlyData(DEFAULT_MONTHLY_EMPTY);
      }

      if (trxRes.status === 'fulfilled' && Array.isArray(trxRes.value?.data)) {
        setRecentTransactions(trxRes.value.data.slice(0, 5));
      } else {
        setRecentTransactions([]);
      }

      if (goalsRes.status === 'fulfilled' && Array.isArray(goalsRes.value?.data)) {
        setGoals(goalsRes.value.data);
      } else {
        setGoals([]);
      }

      if (wealthRes.status === 'fulfilled') {
        setWealthOverview(wealthRes.value?.data?.data || wealthRes.value?.data || null);
      } else {
        setWealthOverview(null);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('An unexpected error occurred while loading dashboard telemetry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    const handleUpdate = () => fetchDashboardData();
    window.addEventListener('finura:transactions-updated', handleUpdate);
    window.addEventListener('finura:goals-updated', handleUpdate);
    window.addEventListener('finura:investments-updated', handleUpdate);

    return () => {
      window.removeEventListener('finura:transactions-updated', handleUpdate);
      window.removeEventListener('finura:goals-updated', handleUpdate);
      window.removeEventListener('finura:investments-updated', handleUpdate);
    };
  }, [fetchDashboardData]);

  useEffect(() => {
    const handlePreferencesUpdate = () => setCurrency(getPreferredCurrency());
    window.addEventListener('finura:preferences-updated', handlePreferencesUpdate);
    return () => window.removeEventListener('finura:preferences-updated', handlePreferencesUpdate);
  }, []);

  // Calculations & Metrics (Preserved 100% logic)
  const totalIncome = Math.abs(Number(summary.totalIncome) || 0);
  const totalExpenses = Math.abs(Number(summary.totalExpenses ?? summary.totalExpense) || 0);
  const netWorth = Number(wealthOverview?.netWorth?.netWorth ?? summary.netWorth ?? 0) || 0;
  const netCashflow = totalIncome - totalExpenses;
  const isPositiveCashflow = netCashflow >= 0;

  // Donut Chart Data preparation
  const categoryData = useMemo(() => {
    const raw = summary.categoryBreakdown || summary.expenseBreakdown || [];
    if (!raw.length) {
      return [{ name: 'No Expense Data', value: 1, percentage: 100, isPlaceholder: true }];
    }
    return raw.map((item) => ({
      name: item.name || item.category || 'General',
      value: Number(item.value || item.total || 0),
      percentage: item.percentage || 0,
      isPlaceholder: false,
    }));
  }, [summary.categoryBreakdown, summary.expenseBreakdown]);

  const hasExpenseData = useMemo(() => {
    return (summary.categoryBreakdown?.length > 0 || summary.expenseBreakdown?.length > 0) && totalExpenses > 0;
  }, [summary, totalExpenses]);

  // Quick Action Handlers
  const handleOpenTransaction = (type) => {
    setTransactionType(type);
    setTransactionModalOpen(true);
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!newGoal.title.trim()) {
      toast.error('Please enter a goal title');
      return;
    }
    const target = Number(newGoal.targetAmount);
    if (!target || target <= 0) {
      toast.error('Target amount must be greater than $0');
      return;
    }

    setGoalSubmitting(true);
    try {
      await api.post('/goals', {
        title: newGoal.title.trim(),
        targetAmount: target,
        deadline: newGoal.deadline || null,
        category: newGoal.category,
      });

      toast.success(`Goal "${newGoal.title}" created successfully! 🎯`);
      setGoalModalOpen(false);
      setNewGoal({ title: '', targetAmount: '', deadline: '', category: 'Other' });
      fetchDashboardData();
      window.dispatchEvent(new CustomEvent('finura:goals-updated'));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create goal');
    } finally {
      setGoalSubmitting(false);
    }
  };

  // Currency Formatter
  const formatMoney = (val) => formatCurrency(val, currency);
  const metricMoneyClass = (val) => {
    const length = formatMoney(val).length;
    if (length > 18) return 'text-base sm:text-lg';
    if (length > 14) return 'text-lg sm:text-xl';
    return 'text-2xl sm:text-3xl';
  };

  // Custom Chart Tooltips (Dark Glassmorphic)
  const CustomBarTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-slate-900/95 text-white text-xs p-3.5 rounded-xl shadow-2xl border border-slate-700/80 backdrop-blur-md space-y-1.5 min-w-[140px]">
        <div className="text-slate-400 font-semibold mb-1 border-b border-slate-800 pb-1">{label}</div>
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex justify-between gap-4 font-semibold" style={{ color: entry.color }}>
            <span>{entry.name}:</span>
            <span>{formatMoney(Number(entry.value || 0))}</span>
          </div>
        ))}
      </div>
    );
  };

  const CustomPieTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    if (data.isPlaceholder) return null;
    return (
      <div className="bg-slate-900/95 text-white text-xs p-3.5 rounded-xl shadow-2xl border border-slate-700/80 backdrop-blur-md">
        <div className="font-semibold text-slate-200">{data.name}</div>
        <div className="text-emerald-400 font-extrabold text-sm mt-1">{formatMoney(data.value)}</div>
        <div className="text-slate-400 mt-0.5 text-[11px]">{data.percentage}% of total expenses</div>
      </div>
    );
  };

  // Theme-matching Reusable Skeleton Loading State (Zero dark flash or layout jump)
  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
      
      {/* ── ERROR BANNER (Reusable ErrorState) ── */}
      {error && (
        <ErrorState
          compact
          title="Telemetry Synchronization Notice"
          message={error}
          onRetry={fetchDashboardData}
        />
      )}

      {/* ── 1. PAGE HEADER BANNER (Hero Section) ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-slate-800/80">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider mb-3">
            <Sparkles size={13} className="text-emerald-400 shrink-0" />
            <span>Institutional Wealth Telemetry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading">
            Financial Health & Liquidity Overview
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Monitor real-time cash inflows, verified expenditures, liquid reserves, and net capital growth.
          </p>
        </div>

        {/* Action Buttons: Stack full-width on mobile (<640px), side-by-side on sm+ */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={() => handleOpenTransaction('income')}
            className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-sm font-sans active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>Add Income</span>
          </button>
          
          <button
            type="button"
            onClick={() => handleOpenTransaction('expense')}
            className="w-full sm:w-auto bg-white/10 hover:bg-white/15 text-white border border-white/20 px-5 py-2.5 rounded-xl transition-all font-semibold flex items-center justify-center gap-2 cursor-pointer text-sm backdrop-blur-sm active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* ── 2. 4 FINANCIAL SNAPSHOT METRIC CARDS (Equal Height & Resilient Typography) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Metric 1: Total Net Worth */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full min-w-0">
          <div className="flex justify-between items-center gap-2 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 truncate">
              <Wallet size={16} className="text-teal-600 shrink-0" />
              <span className="truncate">Total Net Worth</span>
            </span>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 shrink-0 whitespace-nowrap">
              Live Assets
            </span>
          </div>
          <div>
            <div
              className={`${metricMoneyClass(netWorth)} font-extrabold text-slate-900 tracking-tight font-heading break-words leading-tight`}
              title={formatMoney(netWorth)}
            >
              {formatMoney(netWorth)}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1 truncate">Liquid capital + investments</p>
          </div>
        </div>

        {/* Metric 2: Total Inflow / Income */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full min-w-0">
          <div className="flex justify-between items-center gap-2 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 truncate">
              <TrendingUp size={16} className="text-emerald-600 shrink-0" />
              <span className="truncate">Total Income</span>
            </span>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 whitespace-nowrap">
              + Inflow
            </span>
          </div>
          <div>
            <div
              className={`${metricMoneyClass(totalIncome)} font-extrabold text-emerald-600 tracking-tight font-heading break-words leading-tight`}
              title={`+${formatMoney(totalIncome)}`}
            >
              +{formatMoney(totalIncome)}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1 truncate">Verified gross cash inflow</p>
          </div>
        </div>

        {/* Metric 3: Total Outflow / Expenses */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full min-w-0">
          <div className="flex justify-between items-center gap-2 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 truncate">
              <TrendingDown size={16} className="text-rose-600 shrink-0" />
              <span className="truncate">Total Expenses</span>
            </span>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 shrink-0 whitespace-nowrap">
              {totalIncome > 0 ? `${Math.round((totalExpenses / totalIncome) * 100)}% of income` : 'Outflow'}
            </span>
          </div>
          <div>
            <div
              className={`${metricMoneyClass(totalExpenses)} font-extrabold text-rose-600 tracking-tight font-heading break-words leading-tight`}
              title={`-${formatMoney(totalExpenses)}`}
            >
              -{formatMoney(totalExpenses)}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1 truncate">Tracked living expenditures</p>
          </div>
        </div>

        {/* Metric 4: Net Cashflow */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full min-w-0">
          <div className="flex justify-between items-center gap-2 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 truncate">
              <Scale size={16} className={`shrink-0 ${isPositiveCashflow ? 'text-teal-600' : 'text-rose-600'}`} />
              <span className="truncate">Net Cashflow</span>
            </span>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 whitespace-nowrap ${
                isPositiveCashflow ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {isPositiveCashflow ? '+ Positive' : '- Negative'}
            </span>
          </div>
          <div>
            <div
              className={`${metricMoneyClass(netCashflow)} font-extrabold tracking-tight font-heading break-words leading-tight ${
                isPositiveCashflow ? 'text-teal-700' : 'text-rose-600'
              }`}
              title={`${isPositiveCashflow ? '+' : ''}${formatMoney(netCashflow)}`}
            >
              {isPositiveCashflow ? '+' : ''}{formatMoney(netCashflow)}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1 truncate">
              Monthly capital retention
            </p>
          </div>
        </div>

      </div>

      {/* ── 3. CHARTS SECTION (Responsive Equal-Height Grid) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Cashflow Monthly Bar Chart (2 cols on large screens) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full min-w-0">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight font-heading">Cashflow Telemetry</h3>
              <p className="text-xs text-slate-500 font-medium">Monthly Inflow (Income) vs Outflow (Expenses)</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                Income
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shrink-0" />
                Expenses
              </span>
            </div>
          </div>

          <div className="w-full h-72 min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
                <Bar dataKey="expense" name="Expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Breakdown Donut Chart (1 col on large screens) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-full min-w-0">
          <div className="mb-2">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight font-heading">Expense Distribution</h3>
            <p className="text-xs text-slate-500 font-medium">Categorized expenditure share</p>
          </div>

          <div className="w-full h-52 min-h-[200px] relative flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  innerRadius={55}
                  outerRadius={78}
                  paddingAngle={hasExpenseData ? 3 : 0}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isPlaceholder ? '#f1f5f9' : CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {!hasExpenseData && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-xs text-slate-400 font-medium">No expense records</span>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
            {categoryData.slice(0, 3).map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between text-slate-600 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.isPlaceholder ? '#cbd5e1' : CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length] }}
                  />
                  <span className="font-medium truncate max-w-[130px]">{item.name}</span>
                </div>
                <div className="font-semibold text-slate-900 shrink-0">
                  {item.isPlaceholder ? '—' : `${formatMoney(item.value)} (${item.percentage}%)`}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── 4. RECENT TRANSACTIONS (Table & Client-Demo Empty State) ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight font-heading">Recent Financial Activity</h3>
            <p className="text-xs text-slate-500 font-medium">Latest recorded inflows and outflows</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard/reports')}
            className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.98]"
          >
            <span>View Full Ledger</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <EmptyState
            title="No transactions recorded yet"
            description="Record your first income or expense to activate automatic cashflow telemetry, category breakdowns, and monthly analytics."
            actionText="Record Income"
            onAction={() => handleOpenTransaction('income')}
            secondaryActionText="Record Expense"
            onSecondaryAction={() => handleOpenTransaction('expense')}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider py-3.5 px-4 text-left border-b border-slate-200/80 font-bold">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {recentTransactions.map((trx) => {
                  const isIncome = trx.type === 'income';
                  const dateStr = trx.date
                    ? new Date(trx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—';

                  return (
                    <tr key={trx._id || trx.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors text-sm text-slate-800">
                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">{dateStr}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-[220px] truncate" title={trx.title}>
                        {trx.title}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {trx.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                            isIncome
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {trx.type}
                        </span>
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-extrabold whitespace-nowrap ${
                          isIncome ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isIncome ? '+' : '-'}{formatMoney(Number(trx.amount || 0))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Modal (Universal) */}
      <TransactionModal
        open={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        defaultType={transactionType}
        onSuccess={() => {
          fetchDashboardData();
          window.dispatchEvent(new CustomEvent('finura:transactions-updated'));
        }}
      />

      {/* Create Goal Modal */}
      {goalModalOpen && (
        <div
          onClick={() => !goalSubmitting && setGoalModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100 animate-fade-in"
          >
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-5">
              <div>
                <h3 className="text-lg font-bold text-white font-heading">Create Financial Milestone</h3>
                <p className="text-xs text-slate-400">Set a target amount and deadline for tracking</p>
              </div>
              <button
                type="button"
                onClick={() => setGoalModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Goal Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Emergency Fund, House Down Payment"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Target Amount ($)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="10000"
                    value={newGoal.targetAmount}
                    onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={newGoal.category}
                    onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  >
                    <option value="Emergency Fund">Emergency Fund</option>
                    <option value="Home Purchase">Home Purchase</option>
                    <option value="Retirement">Retirement</option>
                    <option value="Investment">Investment</option>
                    <option value="Travel">Travel</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Target Deadline (Optional)
                </label>
                <input
                  type="date"
                  value={newGoal.deadline}
                  onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setGoalModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={goalSubmitting}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {goalSubmitting ? 'Creating...' : 'Save Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

