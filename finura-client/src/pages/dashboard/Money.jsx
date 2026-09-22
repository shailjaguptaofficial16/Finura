import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function Money() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await api.get('/dashboard/money-summary');
      setData(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load money summary');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const refresh = () => load();
    window.addEventListener('finura:transactions-updated', refresh);
    window.addEventListener('finura:accounts-updated', refresh);
    return () => { window.removeEventListener('finura:transactions-updated', refresh); window.removeEventListener('finura:accounts-updated', refresh); };
  }, [load]);

  const cardStyle = { padding: '18px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px', boxShadow: '0 6px 18px rgba(15,23,42,.04)' };
  const actionStyle = { padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer' };

  if (loading) return <div style={{ padding: '40px', color: '#64748b' }}>Loading money summary...</div>;

  return <div style={{ minHeight: '100%', padding: '28px 32px 48px', background: '#f8fafc' }}><div style={{ maxWidth: '1180px', margin: '0 auto' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}><div><p style={{ margin: 0, color: '#0f766e', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>Money module</p><h1 style={{ margin: '6px 0', color: '#0f172a', fontSize: '1.8rem' }}>Your money at a glance</h1><p style={{ margin: 0, color: '#64748b' }}>Accounts, transactions, budgets, and cash flow in one place.</p></div><button type="button" onClick={() => navigate('transactions')} style={{ border: 0, borderRadius: '8px', padding: '11px 15px', background: '#2dd4bf', color: '#0f172a', fontWeight: 800, cursor: 'pointer' }}>+ Add transaction</button></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px', marginBottom: '24px' }}>{[['Total balance', data.totalBalance], ['Income', data.totalIncome], ['Expenses', data.totalExpenses], ['Savings', data.savings]].map(([label, value]) => <div key={label} style={cardStyle}><p style={{ margin: 0, color: '#64748b', fontSize: '.82rem' }}>{label}</p><strong style={{ display: 'block', marginTop: '8px', color: '#0f172a', fontSize: '1.35rem' }}>{money(value)}</strong></div>)}</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
      <section style={cardStyle}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.05rem' }}>Accounts</h2><button type="button" onClick={() => navigate('accounts')} style={actionStyle}>View all</button></div><div style={{ display: 'grid', gap: '10px', marginTop: '16px' }}>{data.accounts?.length ? data.accounts.slice(0, 5).map((account) => <div key={account._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}><span style={{ color: '#475569' }}>{account.name}<small style={{ display: 'block', color: '#94a3b8', marginTop: '2px' }}>{account.type}</small></span><strong style={{ color: '#0f172a' }}>{money(account.balance)}</strong></div>) : <p style={{ color: '#64748b' }}>No accounts yet.</p>}</div></section>
      <section style={cardStyle}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.05rem' }}>Budget summary</h2><button type="button" onClick={() => navigate('budgets')} style={actionStyle}>View budgets</button></div><div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>{data.budgets?.length ? data.budgets.slice(0, 4).map((budget) => <div key={budget._id}><div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: '.85rem' }}><span>{budget.category}</span><strong>{budget.usage}%</strong></div><div style={{ height: '8px', marginTop: '6px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}><div style={{ width: `${Math.min(budget.usage, 100)}%`, height: '100%', background: budget.budgetStatus === 'exceeded' ? '#ef4444' : budget.budgetStatus === 'warning' ? '#f59e0b' : '#2dd4bf' }} /></div><small style={{ display: 'block', marginTop: '4px', color: budget.remaining < 0 ? '#b91c1c' : '#64748b' }}>{budget.remaining < 0 ? `${money(Math.abs(budget.remaining))} over budget` : `${money(budget.remaining)} remaining`}</small></div>) : <p style={{ color: '#64748b' }}>No active budgets yet.</p>}</div></section>
      <section style={cardStyle}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.05rem' }}>Recent transactions</h2><button type="button" onClick={() => navigate('transactions')} style={actionStyle}>View all</button></div><div style={{ display: 'grid', gap: '10px', marginTop: '16px' }}>{data.recentTransactions?.length ? data.recentTransactions.map((transaction) => <div key={transaction._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}><span style={{ color: '#475569' }}>{transaction.title || transaction.category}<small style={{ display: 'block', color: '#94a3b8', marginTop: '2px' }}>{transaction.category}</small></span><strong style={{ color: transaction.type === 'income' ? '#0f766e' : '#0f172a' }}>{transaction.type === 'income' ? '+' : '-'}{money(transaction.amount)}</strong></div>) : <p style={{ color: '#64748b' }}>No transactions yet.</p>}</div></section>
    </div>
  </div></div>;
}
