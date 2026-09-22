import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ExportReport from '../../components/ExportReport';
import TransactionModal from '../../components/TransactionModal';
import EditTransactionModal from '../../components/EditTransactionModal';

const CATEGORIES = [
  'All',
  'Food',
  'Housing',
  'Transport',
  'Utilities',
  'Salary',
  'Investment',
  'Entertainment',
  'Healthcare',
  'Shopping',
  'Other',
];

const getBadgeStyle = (category) => {
  switch (category) {
    case 'Salary':
    case 'Income':
      return { bg: '#ECFDF5', color: '#10B981' };
    case 'Investment':
      return { bg: '#F0FDFA', color: '#0F766E' };
    case 'Housing':
      return { bg: '#EFF6FF', color: '#3B82F6' };
    case 'Transport':
      return { bg: '#FEF2F2', color: '#EF4444' };
    case 'Food':
    case 'Groceries':
      return { bg: '#FDF4FF', color: '#D946EF' };
    case 'Entertainment':
      return { bg: '#FFFBEB', color: '#F59E0B' };
    case 'Utilities':
      return { bg: '#F5F3FF', color: '#8B5CF6' };
    case 'Healthcare':
      return { bg: '#FFF1F2', color: '#F43F5E' };
    case 'Shopping':
      return { bg: '#F0FDF4', color: '#16A34A' };
    case 'Transfer':
      return { bg: '#F0F9FF', color: '#0369A1' };
    default:
      return { bg: '#F1F5F9', color: '#64748B' };
  }
};

// SVG icons
const TransferIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M7 16V4m0 0L3 8m4-4l4 4" />
    <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalBalance: 0,
    totalTransactions: 0,
    transferCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Fetch transactions and summary
  const fetchTransactionsData = useCallback(async () => {
    try {
      const [trxRes, summaryRes] = await Promise.allSettled([
        api.get('/transactions'),
        api.get('/transactions/summary'),
      ]);

      if (trxRes.status === 'fulfilled' && Array.isArray(trxRes.value.data)) {
        setTransactions(trxRes.value.data);
      } else {
        setTransactions([]);
      }

      if (summaryRes.status === 'fulfilled' && summaryRes.value?.data) {
        setSummary(summaryRes.value.data);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactionsData();

    const handleUpdate = () => fetchTransactionsData();
    window.addEventListener('finura:transactions-updated', handleUpdate);
    return () => window.removeEventListener('finura:transactions-updated', handleUpdate);
  }, [fetchTransactionsData]);

  // Delete transaction with optimistic update
  const handleDeleteTransaction = async (id, title, isTransfer) => {
    const confirmMsg = isTransfer
      ? `Reverse transfer "${title || 'Transfer'}"? This will restore both account balances.`
      : `Delete transaction "${title || 'Transaction'}"?`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setDeletingId(id);
    try {
      await api.delete(`/transactions/${id}`);
      setTransactions((prev) => prev.filter((t) => t._id !== id && t.transferRef !== prev.find(p => p._id === id)?.transferRef));
      toast.success(isTransfer ? 'Transfer reversed and balances restored' : 'Transaction removed successfully');
      fetchTransactionsData();
      window.dispatchEvent(new CustomEvent('finura:transactions-updated'));
      window.dispatchEvent(new CustomEvent('finura:accounts-updated'));
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      toast.error(err.response?.data?.message || 'Failed to delete transaction');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter & Search logic
  const filteredTransactions = useMemo(() => {
    return (transactions || []).filter((item) => {
      // Type filter
      if (typeFilter !== 'All' && item?.type?.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }
      // Category filter (skip for transfer type)
      if (categoryFilter !== 'All' && item?.type !== 'transfer' && item?.category !== categoryFilter) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesTitle = item?.title?.toLowerCase().includes(query);
        const matchesCategory = item?.category?.toLowerCase().includes(query);
        const matchesDesc = item?.description?.toLowerCase().includes(query);
        const matchesAccount = item?.accountId?.name?.toLowerCase().includes(query);
        const matchesToAccount = (item?.toAccount || item?.toAccountId)?.name?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesCategory && !matchesDesc && !matchesAccount && !matchesToAccount) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, typeFilter, categoryFilter, searchTerm]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, categoryFilter, searchTerm]);

  const netBalance = summary.totalBalance ?? (summary.totalIncome - summary.totalExpenses);

  const typeFilterTabs = [
    { value: 'All', label: 'All' },
    { value: 'income', label: 'Income' },
    { value: 'expense', label: 'Expense' },
    { value: 'transfer', label: 'Transfer' },
  ];

  return (
    <div className="dash-scrollable-area animate-fade-in" style={{ paddingBottom: '40px' }}>
      {/* Top Banner Header */}
      <div
        className="white-card"
        style={{
          marginBottom: '24px',
          padding: '28px 32px',
          background: 'linear-gradient(135deg, #0f172a 0%, #0f766e 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.8 }}>
            Cashflow Engine
          </span>
          <h2 style={{ margin: '6px 0 8px', fontSize: '1.75rem', fontWeight: 700 }}>
            Transaction History & Records
          </h2>
          <p style={{ margin: 0, opacity: 0.9, maxWidth: '600px', lineHeight: 1.5, fontSize: '0.95rem' }}>
            Track categorized income deposits, business expenditures, transfers, and export financial records.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '11px 20px',
              background: '#ffffff',
              color: '#0f766e',
              borderRadius: '10px',
              cursor: 'pointer',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>+ Add Transaction</span>
          </button>
          <ExportReport transactions={transactions} />
        </div>
      </div>

      {/* KPI Cards Summary Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Net Cashflow */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Net Cash Balance</span>
          <h3 style={{ margin: '6px 0 2px', fontSize: '1.6rem', fontWeight: 800, color: netBalance >= 0 ? '#0f172a' : '#ef4444' }}>
            ${netBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: netBalance >= 0 ? '#10b981' : '#ef4444' }}>
            {netBalance >= 0 ? '● Positive Reserve' : '● Negative Deficit'}
          </span>
        </div>

        {/* Total Inflow */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Total Income</span>
          <h3 style={{ margin: '6px 0 2px', fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>
            +${(summary.totalIncome || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Verified inflows</span>
        </div>

        {/* Total Outflow */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Total Expenses</span>
          <h3 style={{ margin: '6px 0 2px', fontSize: '1.6rem', fontWeight: 800, color: '#ef4444' }}>
            -${(summary.totalExpenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Tracked spending</span>
        </div>

        {/* Total Records */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Transactions</span>
          <h3 style={{ margin: '6px 0 2px', fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
            {summary.totalTransactions || transactions.filter(t => t.type !== 'transfer').length}
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Audit-ready records</span>
        </div>

        {/* Transfers Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Transfers</span>
          <h3 style={{ margin: '6px 0 2px', fontSize: '1.6rem', fontWeight: 800, color: '#0369a1' }}>
            {summary.transferCount || transactions.filter(t => t.type === 'transfer').length}
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Internal movements</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="white-card" style={{ padding: 0, background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {/* Table Controls & Filter Toolbar */}
        <div
          style={{
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #e2e8f0',
            flexWrap: 'wrap',
            gap: '16px',
            background: '#fafafa',
          }}
        >
          {/* Left: Type Toggle Tabs */}
          <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
            {typeFilterTabs.map(({ value, label }) => {
              const active = typeFilter.toLowerCase() === value.toLowerCase();
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTypeFilter(value)}
                  style={{
                    border: 'none',
                    background: active ? '#ffffff' : 'transparent',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontWeight: active ? 700 : 500,
                    fontSize: '0.85rem',
                    color: active ? '#0f172a' : '#64748b',
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  {value === 'transfer' && <TransferIcon />}
                  {label}
                </button>
              );
            })}
          </div>

          {/* Right: Category Dropdown & Search Input */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
            {/* Category Dropdown — hide when filtering by transfer */}
            {typeFilter !== 'transfer' && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="All">All Categories</option>
                {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}

            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '200px' }}>
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    fontSize: '12px',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Date
                </th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Description
                </th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Account
                </th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Type
                </th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                  Amount
                </th>
                <th style={{ padding: '14px 20px', fontWeight: 600, color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        border: '3px solid #ccfbf1',
                        borderTopColor: '#0f766e',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        margin: '0 auto 12px',
                      }}
                    />
                    <span>Loading verified cashflow records...</span>
                  </td>
                </tr>
              ) : paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '56px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>💸</div>
                    <h4 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '1.1rem', fontWeight: 700 }}>
                      No Transactions Found
                    </h4>
                    <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.9rem' }}>
                      {transactions.length === 0
                        ? 'Start tracking your financial cashflow by recording your first transaction.'
                        : 'No records matched your active filter criteria.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowModal(true)}
                      style={{
                        padding: '10px 18px',
                        background: '#0f766e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(15, 118, 110, 0.25)',
                      }}
                    >
                      + Record New Transaction
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((trx) => {
                  const badge = getBadgeStyle(trx?.category);
                  const isIncome = trx?.type === 'income';
                  const isTransfer = trx?.type === 'transfer';
                  const dateStr = trx?.date
                    ? new Date(trx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—';

                  // For transfers: show direction with account names
                  const destinationAccount = trx?.toAccount || trx?.toAccountId;
                  const transferLabel = isTransfer && destinationAccount
                    ? `${trx?.accountId?.name || 'Account'} → ${destinationAccount?.name || 'Account'}`
                    : null;

                  // Amount color: green for income, neutral blue for transfer, default dark for expense
                  const amountColor = isIncome ? '#10b981' : isTransfer ? '#0369a1' : '#0f172a';
                  const amountPrefix = isIncome ? '+' : isTransfer ? '⇄' : '-';

                  return (
                    <tr
                      key={trx._id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease',
                        background: isTransfer ? 'rgba(240, 249, 255, 0.3)' : 'transparent',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = isTransfer ? 'rgba(240, 249, 255, 0.3)' : 'transparent')}
                    >
                      {/* Date */}
                      <td style={{ padding: '16px 20px', fontSize: '0.85rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {dateStr}
                      </td>

                      {/* Description */}
                      <td style={{ padding: '16px 20px', fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>
                        {isTransfer && transferLabel ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369a1' }}>
                              <TransferIcon />
                              <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Transfer</span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {trx?.accountId?.name}
                              <ArrowRightIcon />
                              {destinationAccount?.name}
                            </div>
                            {trx?.title && trx.title !== `Transfer to ${destinationAccount?.name}` && trx.title !== `Transfer from ${trx?.accountId?.name}` && (
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{trx.title}</div>
                            )}
                          </div>
                        ) : (
                          trx?.title || trx?.description || 'Untitled'
                        )}
                      </td>

                      {/* Account */}
                      <td style={{ padding: '16px 20px' }}>
                        {trx?.accountId ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              color: '#475569',
                            }}
                          >
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: trx.accountId.color || '#00f2fe',
                                flexShrink: 0,
                              }}
                            />
                            {trx.accountId.name}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>

                      {/* Type */}
                      <td style={{ padding: '16px 20px', fontSize: '0.85rem' }}>
                        {isTransfer ? (
                          <span
                            style={{
                              background: '#F0F9FF',
                              color: '#0369A1',
                              padding: '4px 10px',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <TransferIcon />
                            Transfer
                          </span>
                        ) : (
                          <span
                            style={{
                              background: badge.bg,
                              color: badge.color,
                              padding: '4px 10px',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              display: 'inline-block',
                            }}
                          >
                            {trx?.category || 'Other'}
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td
                        style={{
                          padding: '16px 20px',
                          textAlign: 'right',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          color: amountColor,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isTransfer ? '⇄ ' : isIncome ? '+' : '-'}
                        ${Number(trx?.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setEditingTransaction(trx)}
                          title="Edit Transaction"
                          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#0f766e')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTransaction(trx._id, trx.title, isTransfer)}
                          disabled={deletingId === trx._id}
                          title={isTransfer ? 'Reverse Transfer' : 'Delete Transaction'}
                          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: deletingId === trx._id ? 'not-allowed' : 'pointer', padding: '6px', borderRadius: '6px', transition: 'all 0.15s ease' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = isTransfer ? '#0369a1' : '#ef4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                        >
                          {isTransfer ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="1 4 1 10 7 10" />
                              <polyline points="23 20 23 14 17 14" />
                              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredTransactions.length > 0 && (
          <div
            style={{
              padding: '16px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#64748b',
              fontSize: '0.85rem',
              borderTop: '1px solid #e2e8f0',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredTransactions.length)} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} entries
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1,
                  fontSize: '0.85rem',
                  fontWeight: 500,
                }}
              >
                Previous
              </button>

              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                // Smart pagination: show first, last, and pages around current
                let page;
                if (totalPages <= 7) {
                  page = i + 1;
                } else if (currentPage <= 4) {
                  page = i + 1 <= 5 ? i + 1 : i === 5 ? '...' : totalPages;
                } else if (currentPage >= totalPages - 3) {
                  page = i === 0 ? 1 : i === 1 ? '...' : totalPages - (6 - i);
                } else {
                  const pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
                  page = pages[i];
                }
                if (page === '...') {
                  return <span key={`ellipsis-${i}`} style={{ padding: '6px 4px', color: '#94a3b8' }}>…</span>;
                }
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    style={{
                      border: page === currentPage ? 'none' : '1px solid #cbd5e1',
                      background: page === currentPage ? '#0f766e' : '#ffffff',
                      color: page === currentPage ? '#ffffff' : '#334155',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: page === currentPage ? 700 : 500,
                      fontSize: '0.85rem',
                    }}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.5 : 1,
                  fontSize: '0.85rem',
                  fontWeight: 500,
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Record Transaction Modal */}
      <TransactionModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          fetchTransactionsData();
          window.dispatchEvent(new CustomEvent('finura:accounts-updated'));
        }}
      />
      <EditTransactionModal
        open={Boolean(editingTransaction)}
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSuccess={() => {
          setEditingTransaction(null);
          fetchTransactionsData();
          window.dispatchEvent(new CustomEvent('finura:accounts-updated'));
        }}
      />
    </div>
  );
}
