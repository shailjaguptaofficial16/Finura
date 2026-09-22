import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import TransactionModal from '../components/TransactionModal';
import { EmptyState, ErrorState, CardSkeleton } from '../components/common';
import { RefreshCw, CreditCard } from 'lucide-react';
import { formatSafeNumber } from '../utils/formatters';
import './Accounts.css';

const ACCOUNT_TYPES = ['Savings', 'Checking', 'Credit Card', 'Wallet', 'Investment', 'Cash'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'];
const ACCENT_COLORS = ['#00f2fe', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9'];

const getTypeIcon = (type) => {
  switch (type) {
    case 'Savings':
    case 'Checking':
      return '🏦';
    case 'Wallet':
      return '📱';
    case 'Credit Card':
      return '💳';
    case 'Investment':
      return '📈';
    case 'Cash':
      return '💵';
    default:
      return '💰';
  }
};

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState({
    totalBalance: 0,
    totalCashAndBank: 0,
    totalCreditLiability: 0,
    totalInvestments: 0,
    count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [filterType, setFilterType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [activeAccountForTx, setActiveAccountForTx] = useState(null);
  const [showTxModal, setShowTxModal] = useState(false);

  // Add account form
  const [addForm, setAddForm] = useState({
    name: '',
    type: 'Savings',
    balance: '',
    currency: 'INR',
    accountNumberLast4: '',
    color: '#00f2fe',
    isDefault: false,
  });
  const [formErrors, setFormErrors] = useState({});
  const [savingAccount, setSavingAccount] = useState(false);

  // Fetch accounts data
  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const res = await api.get('/accounts');
      const list = res.data?.data || res.data?.accounts || (Array.isArray(res.data) ? res.data : []);
      setAccounts(list);

      if (res.data?.breakdown) {
        setSummary({
          totalBalance: res.data.totalBalance || 0,
          totalCashAndBank: res.data.breakdown.totalCashAndBank || 0,
          totalCreditLiability: res.data.breakdown.totalCreditLiability || 0,
          totalInvestments: res.data.breakdown.totalInvestments || 0,
          count: list.length,
        });
      } else {
        // Fallback computation
        let tot = 0;
        let cash = 0;
        let credit = 0;
        let inv = 0;
        list.forEach((acc) => {
          const bal = Number(acc.balance) || 0;
          tot += bal;
          if (['Savings', 'Checking', 'Cash', 'Wallet'].includes(acc.type)) cash += bal;
          else if (acc.type === 'Credit Card') credit += Math.abs(bal);
          else if (acc.type === 'Investment') inv += bal;
        });
        setSummary({
          totalBalance: tot,
          totalCashAndBank: cash,
          totalCreditLiability: credit,
          totalInvestments: inv,
          count: list.length,
        });
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
      const errMsg = err.response?.data?.message || 'Unable to synchronize account telemetry. Please try again.';
      setFetchError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();

    const handleAccountsUpdated = () => fetchAccounts();
    window.addEventListener('finura:accounts-updated', handleAccountsUpdated);
    window.addEventListener('finura:transactions-updated', handleAccountsUpdated);

    return () => {
      window.removeEventListener('finura:accounts-updated', handleAccountsUpdated);
      window.removeEventListener('finura:transactions-updated', handleAccountsUpdated);
    };
  }, [fetchAccounts]);

  // Handle Escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showAddModal && !savingAccount) setShowAddModal(false);
        if (editingAccount && !savingAccount) setEditingAccount(null);
      }
    };
    if (showAddModal || editingAccount) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal, editingAccount, savingAccount]);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const matchesType =
        filterType === 'All' ||
        acc.type === filterType ||
        (filterType === 'Bank' && (acc.type === 'Savings' || acc.type === 'Checking'));

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        acc.name.toLowerCase().includes(query) ||
        (acc.accountNumberLast4 && acc.accountNumberLast4.includes(query)) ||
        acc.type.toLowerCase().includes(query);

      return matchesType && matchesSearch;
    });
  }, [accounts, filterType, searchQuery]);

  // Create new account with validation & duplicate submission protection
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (savingAccount) return;

    const errs = {};
    if (!addForm.name.trim()) {
      errs.name = 'Account name is required';
    }
    const bal = Number(addForm.balance);
    if (addForm.balance !== '' && isNaN(bal)) {
      errs.balance = 'Please enter a valid numeric balance';
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    setFormErrors({});
    setSavingAccount(true);
    try {
      await api.post('/accounts', {
        ...addForm,
        name: addForm.name.trim(),
        balance: Number(addForm.balance) || 0,
      });
      toast.success(`Account "${addForm.name.trim()}" created successfully! 🎉`);
      setShowAddModal(false);
      setAddForm({
        name: '',
        type: 'Savings',
        balance: '',
        currency: 'INR',
        accountNumberLast4: '',
        color: '#00f2fe',
        isDefault: false,
      });
      fetchAccounts();
    } catch (err) {
      console.error('Failed to create account:', err);
      toast.error(err.response?.data?.message || 'Error creating account. Please try again.');
    } finally {
      setSavingAccount(false);
    }
  };


  // Update existing account
  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    if (!editingAccount || !editingAccount.name.trim()) return;

    setSavingAccount(true);
    try {
      await api.put(`/accounts/${editingAccount._id}`, {
        name: editingAccount.name.trim(),
        type: editingAccount.type,
        balance: Number(editingAccount.balance),
        currency: editingAccount.currency,
        accountNumberLast4: editingAccount.accountNumberLast4,
        color: editingAccount.color,
        isDefault: editingAccount.isDefault,
      });
      toast.success('Account updated successfully!');
      setEditingAccount(null);
      fetchAccounts();
    } catch (err) {
      console.error('Failed to update account:', err);
      toast.error(err.response?.data?.message || 'Error updating account');
    } finally {
      setSavingAccount(false);
    }
  };

  // Delete account
  const handleDeleteAccount = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the account "${name}"?`)) return;

    try {
      await api.delete(`/accounts/${id}`);
      toast.success('Account removed successfully');
      fetchAccounts();
    } catch (err) {
      console.error('Failed to delete account:', err);
      toast.error(err.response?.data?.message || 'Error deleting account');
    }
  };

  const formatCurrency = (val, curr = 'INR') => {
    const symbol = curr === 'INR' ? '₹' : '$';
    return `${symbol}${formatSafeNumber(val)}`;
  };

  return (
    <div
      className="accounts-page"
      style={{
        minHeight: '100vh',
        backgroundColor: '#0b0f17',
        color: '#f8fafc',
        padding: 'clamp(16px, 3vw, 36px)',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#00f2fe',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              Multi-Account Architecture
            </span>
            <span
              style={{
                fontSize: '0.68rem',
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'rgba(0, 242, 254, 0.15)',
                color: '#00f2fe',
                fontWeight: 600,
              }}
            >
              Real-Time Sync
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Accounts & Liquidity
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="accounts-secondary-action"
            onClick={() => {
              setActiveAccountForTx(accounts[0]?._id || '');
              setShowTxModal(true);
            }}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(0, 242, 254, 0.3)',
              color: '#00f2fe',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s',
            }}
          >
            <span>⚡</span> Record Transaction
          </button>

          <button
            type="button"
            className="accounts-primary-action"
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00f2fe 0%, #0d9488 100%)',
              border: 'none',
              color: '#0b0f17',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 20px rgba(0, 242, 254, 0.35)',
              transition: 'all 0.2s',
            }}
          >
            <span>+</span> Add New Account
          </button>
        </div>
      </div>

      {/* Aggregated Balance Summary Hero */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        {/* Net Consolidated Balance */}
        <div
          className="account-summary-card"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(11, 15, 23, 0.95))',
            borderRadius: '16px',
            padding: '22px',
            border: '1px solid rgba(0, 242, 254, 0.3)',
            boxShadow: '0 10px 30px -10px rgba(0, 242, 254, 0.2)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>
            Consolidated Net Balance
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#00f2fe', letterSpacing: '-0.02em' }}>
            {formatCurrency(summary.totalBalance)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Across {summary.count} active accounts
          </div>
        </div>

        {/* Liquid Cash & Bank */}
        <div
          className="account-summary-card"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.7), rgba(11, 15, 23, 0.85))',
            borderRadius: '16px',
            padding: '22px',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            boxShadow: '0 10px 25px -10px rgba(16, 185, 129, 0.15)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>
            Liquid Cash & Bank
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#10b981' }}>
            {formatCurrency(summary.totalCashAndBank)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Immediate spendable liquidity
          </div>
        </div>

        {/* Total Investments */}
        <div
          className="account-summary-card"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.7), rgba(11, 15, 23, 0.85))',
            borderRadius: '16px',
            padding: '22px',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            boxShadow: '0 10px 25px -10px rgba(139, 92, 246, 0.15)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>
            Investment Assets
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#a78bfa' }}>
            {formatCurrency(summary.totalInvestments)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Equities, ETFs, Crypto Holdings
          </div>
        </div>

        {/* Credit Liabilities */}
        <div
          className="account-summary-card"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.7), rgba(11, 15, 23, 0.85))',
            borderRadius: '16px',
            padding: '22px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            boxShadow: '0 10px 25px -10px rgba(239, 68, 68, 0.15)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>
            Credit Card Outstanding
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f87171' }}>
            {formatCurrency(summary.totalCreditLiability)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Unbilled active liabilities
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        className="accounts-toolbar"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <div className="account-filters" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', maxWidth: '100%' }}>
          {['All', 'Bank', 'Wallet', 'Cash', 'Credit Card', 'Investment'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterType(tab)}
              className={`account-filter ${filterType === tab ? 'is-active' : ''}`}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: filterType === tab ? '#00f2fe' : 'rgba(255, 255, 255, 0.08)',
                background: filterType === tab ? 'rgba(0, 242, 254, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                color: filterType === tab ? '#00f2fe' : '#94a3b8',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {tab === 'All' ? 'All Accounts' : tab}
            </button>
          ))}
        </div>

        <div className="account-search" style={{ position: 'relative', width: 'clamp(200px, 30vw, 280px)' }}>
          <input
            type="text"
            placeholder="Search account name or digits..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 34px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#f8fafc',
              fontSize: '0.85rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
            🔍
          </span>
        </div>
      </div>

      {/* Account Cards Grid */}
      {fetchError ? (
        <ErrorState
          title="Unable to Load Accounts"
          message={fetchError}
          onRetry={fetchAccounts}
          className="my-8"
        />
      ) : loading ? (
        <div className="my-8">
          <CardSkeleton count={3} />
        </div>
      ) : filteredAccounts.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={searchQuery ? 'No accounts match your search filter' : 'No accounts configured yet'}
          description={
            searchQuery
              ? 'Try adjusting your search query or category filter.'
              : 'Add your first bank account, credit card, or digital wallet to begin tracking net worth.'
          }
          actionText="Create Account"
          onAction={() => setShowAddModal(true)}
          className="my-8"
        />
      ) : (
        <div
          className="account-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px',
          }}
        >
          {filteredAccounts.map((account) => {
            const isNegative = Number(account.balance) < 0;
            const cardAccent = account.color || '#00f2fe';

            return (
              <div
                key={account._id}
                className="account-card"
                style={{
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85), rgba(11, 15, 23, 0.95))',
                  borderRadius: '18px',
                  padding: '24px',
                  border: `1px solid ${cardAccent}33`,
                  boxShadow: `0 10px 25px -5px ${cardAccent}1a, 0 0 1px ${cardAccent}`,
                  backdropFilter: 'blur(16px)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                {/* Glowing Top Accent Line */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: `linear-gradient(90deg, ${cardAccent}, transparent)`,
                  }}
                />

                {/* Top Row: Icon, Name & Type */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          background: `${cardAccent}20`,
                          border: `1px solid ${cardAccent}40`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.25rem',
                        }}
                      >
                        {getTypeIcon(account.type)}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                          {account.name}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              color: cardAccent,
                              background: `${cardAccent}15`,
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {account.type}
                          </span>
                          {account.isDefault && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                color: '#e2e8f0',
                                background: 'rgba(255, 255, 255, 0.1)',
                                padding: '1px 5px',
                                borderRadius: '4px',
                              }}
                            >
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setEditingAccount(account)}
                        aria-label={`Edit ${account.name}`}
                        title="Edit Account"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          padding: '6px 8px',
                          fontSize: '0.8rem',
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAccount(account._id, account.name)}
                        aria-label={`Delete ${account.name}`}
                        title="Delete Account"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          padding: '6px 8px',
                          fontSize: '0.8rem',
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Masked Account Digits */}
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '16px', letterSpacing: '0.05em' }}>
                    {account.accountNumberLast4 ? `A/C Number: •••• ${account.accountNumberLast4}` : 'Cashflow Wallet'}
                  </div>

                  {/* Balance Display */}
                  <div style={{ margin: '14px 0 20px 0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
                      Current Balance
                    </div>
                    <div
                      style={{
                        fontSize: '1.65rem',
                        fontWeight: 800,
                        color: isNegative ? '#f87171' : '#f8fafc',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {formatCurrency(account.balance, account.currency)}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Quick Actions */}
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    paddingTop: '16px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveAccountForTx(account._id);
                      setShowTxModal(true);
                    }}
                    aria-label={`Add transaction for ${account.name}`}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      background: 'rgba(0, 242, 254, 0.1)',
                      border: '1px solid rgba(0, 242, 254, 0.25)',
                      color: '#00f2fe',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    + Transaction
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingAccount(account)}
                    aria-label={`Adjust balance for ${account.name}`}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#94a3b8',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Adjust
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Account */}
      {showAddModal && (
        <div
          className="account-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-account-modal-title"
          onClick={() => setShowAddModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11, 15, 23, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(8px)',
            padding: '16px',
          }}
        >
          <div
            className="account-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(11, 15, 23, 0.99))',
              borderRadius: '20px',
              padding: '28px',
              width: '100%',
              maxWidth: '460px',
              border: '1px solid rgba(0, 242, 254, 0.3)',
              boxShadow: '0 20px 40px rgba(0, 242, 254, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#00f2fe', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Portfolio Management
                </span>
                <h3 id="add-account-modal-title" style={{ margin: '4px 0 0 0', fontSize: '1.3rem', fontWeight: 700 }}>Add New Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Close dialog"
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAccount} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label htmlFor="add-account-name" style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '5px', fontWeight: 600 }}>
                  Account Name *
                </label>
                <input
                  className="account-field"
                  id="add-account-name"
                  type="text"
                  placeholder="e.g. HDFC Salary, Main Cash Wallet"
                  value={addForm.name}
                  onChange={(e) => {
                    setAddForm({ ...addForm, name: e.target.value });
                    if (formErrors.name) setFormErrors({ ...formErrors, name: undefined });
                  }}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: formErrors.name ? '1px solid #f87171' : '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f8fafc',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                {formErrors.name && (
                  <p style={{ color: '#f87171', fontSize: '0.75rem', margin: '4px 0 0 0' }}>{formErrors.name}</p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label htmlFor="add-account-type" style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '5px', fontWeight: 600 }}>
                    Account Type *
                  </label>
                  <select
                    className="account-field"
                    id="add-account-type"
                    value={addForm.type}
                    onChange={(e) => setAddForm({ ...addForm, type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#f8fafc',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t} value={t} style={{ background: '#0b0f17' }}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="add-account-currency" style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '5px', fontWeight: 600 }}>
                    Currency
                  </label>
                  <select
                    className="account-field"
                    id="add-account-currency"
                    value={addForm.currency}
                    onChange={(e) => setAddForm({ ...addForm, currency: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#f8fafc',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c} style={{ background: '#0b0f17' }}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label htmlFor="add-account-balance" style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '5px', fontWeight: 600 }}>
                    Initial Balance
                  </label>
                  <input
                    className="account-field"
                    id="add-account-balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={addForm.balance}
                    onChange={(e) => {
                      setAddForm({ ...addForm, balance: e.target.value });
                      if (formErrors.balance) setFormErrors({ ...formErrors, balance: undefined });
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: formErrors.balance ? '1px solid #f87171' : '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#f8fafc',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                  {formErrors.balance && (
                    <p style={{ color: '#f87171', fontSize: '0.75rem', margin: '4px 0 0 0' }}>{formErrors.balance}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="add-account-last4" style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '5px', fontWeight: 600 }}>
                    Last 4 Digits
                  </label>
                  <input
                    className="account-field"
                    id="add-account-last4"
                    type="text"
                    maxLength={4}
                    placeholder="4821"
                    value={addForm.accountNumberLast4}
                    onChange={(e) => setAddForm({ ...addForm, accountNumberLast4: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#f8fafc',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Accent Color Picker */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                  Card Accent Color
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Select accent color ${c}`}
                      onClick={() => setAddForm({ ...addForm, color: c })}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: c,
                        border: addForm.color === c ? '2px solid #ffffff' : 'none',
                        cursor: 'pointer',
                        transform: addForm.color === c ? 'scale(1.15)' : 'scale(1)',
                        transition: 'all 0.15s',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="isDefaultAdd"
                  checked={addForm.isDefault}
                  onChange={(e) => setAddForm({ ...addForm, isDefault: e.target.checked })}
                />
                <label htmlFor="isDefaultAdd" style={{ fontSize: '0.82rem', color: '#94a3b8', cursor: 'pointer' }}>
                  Set as primary default account
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={savingAccount}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#94a3b8',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAccount}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #00f2fe 0%, #0d9488 100%)',
                    color: '#0b0f17',
                    border: 'none',
                    fontWeight: 700,
                    cursor: savingAccount ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  {savingAccount ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" aria-hidden="true" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Modal: Edit Account */}
      {editingAccount && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-account-modal-title"
          onClick={() => setEditingAccount(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11, 15, 23, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(8px)',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(11, 15, 23, 0.99))',
              borderRadius: '20px',
              padding: '28px',
              width: '100%',
              maxWidth: '460px',
              border: '1px solid rgba(0, 242, 254, 0.3)',
              boxShadow: '0 20px 40px rgba(0, 242, 254, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#00f2fe', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Account Settings
                </span>
                <h3 id="edit-account-modal-title" style={{ margin: '4px 0 0 0', fontSize: '1.3rem', fontWeight: 700 }}>Modify Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                aria-label="Close dialog"
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateAccount} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label htmlFor="edit-account-name" style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '5px', fontWeight: 600 }}>
                  Account Name
                </label>
                <input
                  id="edit-account-name"
                  type="text"
                  value={editingAccount.name}
                  onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f8fafc',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label htmlFor="edit-account-type" style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '5px', fontWeight: 600 }}>
                    Type
                  </label>
                  <select
                    id="edit-account-type"
                    value={editingAccount.type}
                    onChange={(e) => setEditingAccount({ ...editingAccount, type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#f8fafc',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t} value={t} style={{ background: '#0b0f17' }}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-account-balance" style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '5px', fontWeight: 600 }}>
                    Adjust Balance
                  </label>
                  <input
                    id="edit-account-balance"
                    type="number"
                    step="0.01"
                    value={editingAccount.balance}
                    onChange={(e) => setEditingAccount({ ...editingAccount, balance: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#f8fafc',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Accent Color Picker */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                  Card Accent Color
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Select accent color ${c}`}
                      onClick={() => setEditingAccount({ ...editingAccount, color: c })}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: c,
                        border: editingAccount.color === c ? '2px solid #ffffff' : 'none',
                        cursor: 'pointer',
                        transform: editingAccount.color === c ? 'scale(1.15)' : 'scale(1)',
                        transition: 'all 0.15s',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#94a3b8',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAccount}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #00f2fe 0%, #0d9488 100%)',
                    color: '#0b0f17',
                    border: 'none',
                    fontWeight: 700,
                    cursor: savingAccount ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingAccount ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Modal (with auto-selected account) */}
      <TransactionModal
        open={showTxModal}
        onClose={() => setShowTxModal(false)}
        initialAccountId={activeAccountForTx}
        onSuccess={() => fetchAccounts()}
      />
    </div>
  );
}
