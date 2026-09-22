import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const defaultMonthlyData = [
  { month: 'Jan', income: 0, expense: 0 },
  { month: 'Feb', income: 0, expense: 0 },
  { month: 'Mar', income: 0, expense: 0 },
  { month: 'Apr', income: 0, expense: 0 },
  { month: 'May', income: 0, expense: 0 },
  { month: 'Jun', income: 0, expense: 0 },
];

const COLORS = ['#0f766e', '#14b8a6', '#2dd4bf', '#38bdf8', '#818cf8', '#f87171', '#fbbf24'];

export default function ExpenseChart() {
  const [monthlyData, setMonthlyData] = useState(defaultMonthlyData);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('All Time');

  const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    return (
      <div
        style={{
          borderRadius: '10px',
          background: '#0f172a',
          padding: '10px 14px',
          color: '#fff',
          fontSize: '12px',
          boxShadow: '0 10px 24px rgba(15,23,42,0.25)',
        }}
      >
        <div style={{ marginBottom: '6px', color: '#94a3b8', fontWeight: 600 }}>{label || 'Period'}</div>
        {payload.map((entry) => (
          <div key={entry.dataKey} style={{ color: entry.color || '#fff', marginBottom: '2px' }}>
            {entry.name}: ${Number(entry.value || 0).toLocaleString()}
          </div>
        ))}
      </div>
    );
  };

  const fetchChartData = useCallback(async () => {
    try {
      const [monthlyRes, summaryRes, categoryRes] = await Promise.allSettled([
        api.get('/transactions/monthly-summary'),
        api.get('/transactions/summary'),
        api.get('/transactions/category-breakdown'),
      ]);

      // Monthly Income vs Expenses data
      if (monthlyRes.status === 'fulfilled' && Array.isArray(monthlyRes.value?.data) && monthlyRes.value.data.length > 0) {
        setMonthlyData(monthlyRes.value.data);
      } else {
        setMonthlyData(defaultMonthlyData);
      }

      // Categorized Expense Breakdown data (from category endpoint or summary aggregation)
      if (categoryRes.status === 'fulfilled' && Array.isArray(categoryRes.value?.data) && categoryRes.value.data.length > 0) {
        setCategoryData(categoryRes.value.data);
      } else if (summaryRes.status === 'fulfilled' && Array.isArray(summaryRes.value?.data?.expenseBreakdown)) {
        setCategoryData(summaryRes.value.data.expenseBreakdown);
      } else {
        setCategoryData([]);
      }
    } catch (err) {
      // Promise.allSettled never rejects from API errors — only unexpected runtime errors reach here
      console.error('Failed to fetch chart data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChartData();

    const handleTransactionsUpdated = () => fetchChartData();
    window.addEventListener('finura:transactions-updated', handleTransactionsUpdated);

    return () => {
      window.removeEventListener('finura:transactions-updated', handleTransactionsUpdated);
    };
  }, [fetchChartData]);

  if (loading) {
    return (
      <div
        className="white-card"
        style={{
          marginTop: '30px',
          padding: '40px 24px',
          color: '#64748b',
          textAlign: 'center',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            width: '28px',
            height: '28px',
            border: '3px solid #ccfbf1',
            borderTopColor: '#0f766e',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ margin: '14px 0 0 0', fontWeight: 500, color: '#475569' }}>
          Loading financial cashflow charts...
        </p>
      </div>
    );
  }

  return (
    <div className="expense-chart-container" style={{ marginTop: '30px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Income vs Expenses Bar Chart */}
        <div
          style={{
            padding: '24px',
            minHeight: '360px',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                Income vs Expenses
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Monthly cashflow breakdown
              </p>
            </div>
            <div style={{ display: 'inline-flex', borderRadius: '999px', border: '1px solid #e2e8f0', background: '#f8fafc', padding: '3px' }}>
              {['All Time', 'This Month'].map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setDateRange(range)}
                  style={{
                    border: 0,
                    borderRadius: '999px',
                    padding: '5px 12px',
                    background: dateRange === range ? '#0f172a' : 'transparent',
                    color: dateRange === range ? '#ffffff' : '#64748b',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: '100%', height: '270px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barGap={8} margin={{ top: 8, right: 16, left: -8, bottom: 8 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="4 4" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `$${val}`} />
                <RechartsTooltip cursor={{ fill: 'rgba(15,118,110,0.04)' }} content={<ChartTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: 10, fontSize: '12px', color: '#475569' }} />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name="Expenses" fill="#f87171" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Spending Breakdown Donut Chart */}
        <div
          style={{
            padding: '24px',
            minHeight: '360px',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              Spending Breakdown
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Expense categorization
            </p>
          </div>

          {categoryData.length > 0 ? (
            <div style={{ width: '100%', height: '270px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={64}
                    outerRadius={96}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(val) => [`$${Number(val).toLocaleString()}`, 'Amount']}
                    contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                  />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#475569', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '240px',
                color: '#94a3b8',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px dashed #e2e8f0',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 500 }}>No expense data recorded yet</p>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Add expense transactions to see category distribution</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
