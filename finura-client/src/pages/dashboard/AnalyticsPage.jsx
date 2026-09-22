import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { toast } from 'react-toastify';
import analyticsService from '../../services/analyticsService';
import './AnalyticsPage.css';

const CONFIG = {
  overview: { title: 'Analytics Overview', endpoint: 'getAnalyticsOverview', empty: 'No analytics data available for this period.' },
  income: { title: 'Income Analytics', endpoint: 'getIncomeAnalytics', empty: 'No income recorded for this period.' },
  expenses: { title: 'Expense Analytics', endpoint: 'getExpenseAnalytics', empty: 'No expenses recorded for this period.' },
  categories: { title: 'Category Analytics', endpoint: 'getCategoryAnalytics', empty: 'No category data available for this period.' },
  'cash-flow': { title: 'Cash Flow Analytics', endpoint: 'getCashFlowAnalytics', empty: 'No cash movements recorded for this period.' },
  trends: { title: 'Trend Analytics', endpoint: 'getTrendAnalytics', empty: 'No sufficient trend data available.' },
};

const EMPTY_FILTERS = { startDate: '', endDate: '', accountId: '', category: '', type: 'expense' };
const money = (value) => `${Number(value || 0) < 0 ? '-' : ''}₹${Math.abs(Number(value || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const paramsFromFilters = (filters, kind) => ({ ...filters, ...(kind === 'categories' ? { type: filters.type || 'expense', limit: 10 } : {}) });

export default function AnalyticsPage({ kind }) {
  const config = CONFIG[kind] || CONFIG.income;
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [data, setData] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const requests = [analyticsService[config.endpoint](paramsFromFilters(filters, kind))];
      if (kind === 'trends') requests.push(analyticsService.getCategoryAnalytics(paramsFromFilters(filters, 'categories')));
      const [response, categoryResponse] = await Promise.all(requests);
      setData(response.data);
      setCategoryData(categoryResponse?.data || null);
      setError('');
    } catch (requestError) {
      setData(null);
      setCategoryData(null);
      setError(requestError.response?.data?.message || 'Unable to load analytics');
    } finally {
      setLoading(false);
    }
  }, [config.endpoint, filters, kind]);

  useEffect(() => { load(); }, [load]);

  const exportReport = async (format) => {
    try {
      const reportType = kind === 'income' ? 'income-expense' : kind === 'expenses' ? 'category-breakdown' : kind === 'cash-flow' ? 'cash-flow' : kind === 'trends' ? 'monthly-summary' : 'category-breakdown';
      const response = await analyticsService.exportAnalytics({ ...paramsFromFilters(filters, kind), reportType, format });
      if (format === 'json') {
        download(new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' }), 'finura-analytics.json');
        return;
      }
      download(new Blob([response.data], { type: response.headers['content-type'] }), `finura-${kind}.${format}`);
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'Export failed';
      setError(message);
      toast.error(message);
    }
  };

  const summary = data?.summary || {};
  const rows = kind === 'categories' ? (data?.categories || []) : kind === 'trends' ? (data?.monthly || []) : (data?.monthlyTrend || data?.trends || data?.breakdown || []);
  const isEmpty = !loading && !error && rows.length === 0 && Object.values(summary).every((value) => !value);
  const cards = useMemo(() => {
    if (kind === 'overview') return [['Total Income', summary.totalIncome], ['Total Expenses', summary.totalExpense], ['Net Cash Flow', summary.netCashFlow], ['Transactions', (summary.incomeTransactionCount || 0) + (summary.expenseTransactionCount || 0)]];
    if (kind === 'income') return [['Total Income', summary.totalIncome], ['Monthly Average', summary.averageMonthlyIncome], ['Transactions', summary.incomeTransactionCount], ['Growth', `${summary.incomeGrowthPercentage ?? 0}%`]];
    if (kind === 'expenses') return [['Total Expenses', summary.totalExpense], ['Monthly Average', summary.averageMonthlyExpense], ['Transactions', summary.expenseTransactionCount], ['Growth', `${summary.expenseGrowthPercentage ?? 0}%`]];
    if (kind === 'cash-flow') return [['Total Inflow', summary.totalInflow], ['Total Outflow', summary.totalOutflow], ['Net Cash Flow', summary.netCashFlow], ['Consistency', `${summary.consistencyPercentage || 0}%`]];
    if (kind === 'trends') return [['Income', data?.comparison?.income?.current], ['Expenses', data?.comparison?.expenses?.current], ['Net Cash Flow', data?.comparison?.cashFlow?.current], ['Best Month', data?.summary?.bestMonth || 'N/A']];
    return [['Categories', summary.categoryCount], ['Top Category', summary.topCategory || 'N/A'], ['Total Amount', summary.totalAmount], ['Lowest Category', summary.lowestCategory || 'N/A']];
  }, [data, kind, summary]);

  return (
    <main className="analytics-page">
      <div className="analytics-shell">
        <header className="analytics-header">
          <div><span>Finura Analytics</span><h1>{config.title}</h1><p>Read-only insights from your existing financial records.</p></div>
          <div className="analytics-actions"><button type="button" onClick={load} aria-label="Refresh analytics"><RefreshCw size={16} /></button><button type="button" onClick={() => exportReport('csv')}><Download size={16} /> Export CSV</button></div>
        </header>

        <section className="analytics-filters">
          <label>From<input type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} /></label>
          <label>To<input type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} /></label>
          <label>Account ID<input value={filters.accountId} placeholder="Optional account" onChange={(event) => setFilters({ ...filters, accountId: event.target.value })} /></label>
          <label>Category<input value={filters.category} placeholder="All categories" onChange={(event) => setFilters({ ...filters, category: event.target.value })} /></label>
          {kind === 'categories' && <label>Type<select value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}><option value="expense">Expense</option><option value="income">Income</option></select></label>}
          <button type="button" onClick={() => setFilters(EMPTY_FILTERS)}>Reset</button>
        </section>

        {loading ? <div className="analytics-loading"><i /><i /><i /></div> : error ? <section className="analytics-state analytics-error"><h2>Analytics unavailable</h2><p>{error}</p><button type="button" onClick={load}>Retry</button></section> : isEmpty ? <section className="analytics-state"><h2>No data yet</h2><p>{config.empty}</p></section> : <>
          <section className="analytics-card-grid">{cards.map(([label, value]) => <Metric key={label} label={label} value={value} kind={kind} />)}</section>
          {kind === 'categories' ? <CategoryView rows={rows} total={summary.totalAmount} /> : kind === 'trends' ? <><TrendView rows={rows} comparison={data.comparison} /><CategoryView rows={categoryData?.categories || []} total={categoryData?.summary?.totalAmount} /></> : <GenericRows kind={kind} rows={rows} />}
        </>}
      </div>
    </main>
  );
}

function Metric({ label, value, kind }) {
  const isExpense = label.toLowerCase().includes('expense') || label === 'Total Outflow';
  const isPositive = label.toLowerCase().includes('income') || label === 'Total Inflow';
  const formatted = typeof value === 'number' ? money(value) : value;
  return <article className={`analytics-metric ${isExpense ? 'expense' : isPositive ? 'positive' : ''}`}><span>{label}</span><strong>{formatted}</strong>{kind === 'trends' && label === 'Net Cash Flow' && <small>{value >= 0 ? 'Positive' : 'Negative'} month trend</small>}</article>;
}

function CategoryView({ rows, total }) {
  const max = Math.max(...rows.map((row) => Number(row.totalAmount || 0)), 1);
  return <section className="analytics-grid-section"><article className="analytics-panel"><div className="analytics-panel-heading"><div><span>Expense distribution</span><h2>Category breakdown</h2></div><strong>{money(total)}</strong></div><div className="category-bars">{rows.map((row) => <div className="category-bar" key={row.category}><div className="category-bar-label"><strong>{row.category}</strong><span>{money(row.totalAmount)} · {row.transactionCount} {row.transactionCount === 1 ? 'transaction' : 'transactions'}</span></div><div className="category-track"><i style={{ width: `${(Number(row.totalAmount || 0) / max) * 100}%` }} /></div></div>)}</div></article><article className="analytics-panel analytics-table-panel"><div className="analytics-panel-heading"><div><span>Verified totals</span><h2>Category detail</h2></div></div><DataTable headers={['Category', 'Total amount', 'Transactions']} rows={rows.map((row) => [row.category, money(row.totalAmount), row.transactionCount])} /></article></section>;
}

function TrendView({ rows, comparison }) {
  const max = Math.max(...rows.flatMap((row) => [row.income, row.expenses, Math.abs(row.cashFlow)]).map(Number), 1);
  return <><section className="analytics-panel"><div className="analytics-panel-heading"><div><span>Monthly movement</span><h2>Income, expenses and net cash flow</h2></div><div className="analytics-legend"><span className="income-dot">Income</span><span className="expense-dot">Expenses</span><span className="net-dot">Net cash flow</span></div></div><div className="trend-chart">{rows.map((row) => <div className="trend-column" key={row.month}><div className="trend-bars"><i className="income-bar" style={{ height: `${(Number(row.income || 0) / max) * 100}%` }} title={`Income ${money(row.income)}`} /><i className="expense-bar" style={{ height: `${(Number(row.expenses || 0) / max) * 100}%` }} title={`Expenses ${money(row.expenses)}`} /><i className={`net-bar ${Number(row.cashFlow) < 0 ? 'negative' : ''}`} style={{ height: `${(Math.abs(Number(row.cashFlow || 0)) / max) * 100}%` }} title={`Net cash flow ${money(row.cashFlow)}`} /></div><strong>{row.month}</strong><small>{money(row.cashFlow)}</small></div>)}</div></section><section className="analytics-panel analytics-table-panel"><div className="analytics-panel-heading"><div><span>Monthly detail</span><h2>Trend totals</h2></div></div><DataTable headers={['Month', 'Income', 'Expenses', 'Net cash flow']} rows={rows.map((row) => [row.month, money(row.income), money(row.expenses), money(row.cashFlow)])} /><div className="analytics-comparison"><Trend label="Income change" value={comparison?.income} /><Trend label="Expense change" value={comparison?.expenses} /><Trend label="Net cash-flow change" value={comparison?.cashFlow} /></div></section></>;
}

function GenericRows({ kind, rows }) {
  if (!rows.length) return null;
  const headers = kind === 'cash-flow' ? ['Month', 'Inflow', 'Outflow', 'Net cash flow'] : ['Period', 'Amount', 'Transactions'];
  const tableRows = rows.map((row) => kind === 'cash-flow' ? [row.month, money(row.inflow), money(row.outflow), money(row.netCashFlow)] : [row.month || row.category, money(row.amount || row.totalAmount || row.totalExpense || row.totalIncome), row.transactionCount || '-']);
  return <section className="analytics-panel analytics-table-panel"><div className="analytics-panel-heading"><div><span>Period breakdown</span><h2>Financial activity</h2></div></div><DataTable headers={headers} rows={tableRows} /></section>;
}

function DataTable({ headers, rows }) {
  return <div className="analytics-table-wrap"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

function Trend({ label, value }) { const positive = value?.status === 'increasing'; return <article className="analytics-trend"><span>{label}</span><strong>{money(value?.current)}</strong><small className={positive ? 'positive' : 'negative'}>{positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {value?.change || 0}% · {value?.status || 'stable'}</small></article>; }
function download(blob, filename) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }
