import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const CATEGORIES = [
  'Salary', 'Freelance', 'Business', 'Investment', 'Rental', 'Other Income',
  'Food', 'Housing', 'Transport', 'Utilities', 'Healthcare', 'Shopping',
  'Entertainment', 'Education', 'Travel', 'Insurance', 'Savings', 'Other',
];

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  color: '#0f172a',
  fontSize: '0.9rem',
  outline: 'none',
};
const labelStyle = {
  display: 'block',
  marginBottom: '6px',
  color: '#475569',
  fontSize: '0.82rem',
  fontWeight: 600,
};

/**
 * EditTransactionModal
 *
 * Props:
 *   open         — boolean, controls visibility
 *   transaction  — the transaction object to edit (populated from GET /api/transactions)
 *   onClose      — called when modal should close
 *   onSuccess    — called after a successful PUT, receives updated transaction
 */
export default function EditTransactionModal({ open, transaction, onClose, onSuccess }) {
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state — seeded from the transaction prop
  const [form, setForm] = useState({
    title: '',
    amount: '',
    type: 'expense',
    category: 'Other',
    date: new Date().toISOString().split('T')[0],
    accountId: '',
    // Transfer-specific
    fromAccount: '',
    toAccount: '',
    notes: '',
  });

  const isTransfer = transaction?.type === 'transfer';

  // Seed form whenever modal opens with new transaction
  useEffect(() => {
    if (!open || !transaction) return;

    const txDate = transaction.date
      ? new Date(transaction.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    if (isTransfer) {
      setForm({
        title: transaction.title || '',
        amount: transaction.amount || '',
        type: 'transfer',
        category: 'Transfer',
        date: txDate,
        accountId: transaction.accountId?._id || transaction.accountId || '',
        fromAccount: transaction.accountId?._id || transaction.accountId || '',
        toAccount: transaction.toAccount?._id || transaction.toAccount || transaction.toAccountId?._id || transaction.toAccountId || '',
        notes: transaction.description || transaction.title || '',
      });
    } else {
      setForm({
        title: transaction.title || '',
        amount: transaction.amount || '',
        type: transaction.type || 'expense',
        category: transaction.category || 'Other',
        date: txDate,
        accountId: transaction.accountId?._id || transaction.accountId || '',
        fromAccount: '',
        toAccount: '',
        notes: '',
      });
    }
  }, [open, transaction]);

  // Load accounts when modal opens
  useEffect(() => {
    if (!open) return;
    setLoadingAccounts(true);
    api.get('/accounts')
      .then((res) => {
        const list = res.data?.data || res.data?.accounts || [];
        setAccounts(list);
      })
      .catch(() => toast.error('Could not load accounts'))
      .finally(() => setLoadingAccounts(false));
  }, [open]);

  // Escape key handler
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, submitting]);

  if (!open || !transaction) return null;

  const updateField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    const numAmount = Number(form.amount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    let payload;

    if (isTransfer) {
      if (form.fromAccount === form.toAccount) {
        toast.error('Source and destination accounts must be different');
        return;
      }
      payload = {
        fromAccount: form.fromAccount,
        toAccount: form.toAccount,
        amount: numAmount,
        date: new Date(form.date).toISOString(),
        notes: form.notes.trim(),
      };
    } else {
      payload = {
        title: form.title.trim(),
        description: form.title.trim(),
        amount: numAmount,
        type: form.type,
        category: form.category,
        date: new Date(form.date).toISOString(),
        accountId: form.accountId,
      };
    }

    setSubmitting(true);
    try {
      const res = await api.put(`/transactions/${transaction._id}`, payload);
      toast.success(isTransfer ? 'Transfer updated successfully' : 'Transaction updated successfully');
      window.dispatchEvent(new CustomEvent('finura:transactions-updated'));
      window.dispatchEvent(new CustomEvent('finura:accounts-updated'));
      onSuccess?.(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const formatBalance = (bal, currency = 'INR') =>
    `${currency === 'INR' ? '₹' : '$'}${Number(bal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <div
      onClick={() => !submitting && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-transaction-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'grid',
        placeItems: 'center',
        padding: '16px',
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '500px',
          background: '#ffffff',
          borderRadius: '14px',
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.18)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 id="edit-transaction-modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
              {isTransfer ? 'Edit Transfer' : 'Edit Transaction'}
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              {isTransfer
                ? 'Update transfer amount, accounts, or date'
                : 'Modify amount, type, category, or account'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              border: 0,
              background: '#f1f5f9',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              color: '#64748b',
              fontSize: '1.1rem',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'grid', gap: '14px' }}>

          {isTransfer ? (
            /* ── Transfer edit fields ─────────────────────────── */
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label htmlFor="edit-from-account" style={labelStyle}>From Account</label>
                  <select
                    id="edit-from-account"
                    value={form.fromAccount}
                    onChange={updateField('fromAccount')}
                    disabled={loadingAccounts}
                    style={inputStyle}
                  >
                    <option value="">Select source</option>
                    {accounts.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.name} ({formatBalance(a.balance, a.currency)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-to-account" style={labelStyle}>To Account</label>
                  <select
                    id="edit-to-account"
                    value={form.toAccount}
                    onChange={updateField('toAccount')}
                    disabled={loadingAccounts}
                    style={inputStyle}
                  >
                    <option value="">Select destination</option>
                    {accounts
                      .filter((a) => a._id !== form.fromAccount)
                      .map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="edit-amount" style={labelStyle}>Amount</label>
                <input
                  id="edit-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={updateField('amount')}
                  placeholder="0.00"
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label htmlFor="edit-date" style={labelStyle}>Date</label>
                <input
                  id="edit-date"
                  type="date"
                  value={form.date}
                  onChange={updateField('date')}
                  style={inputStyle}
                />
              </div>

              <div>
                <label htmlFor="edit-notes" style={labelStyle}>Notes (optional)</label>
                <input
                  id="edit-notes"
                  type="text"
                  value={form.notes}
                  onChange={updateField('notes')}
                  placeholder="Brief note about this transfer"
                  maxLength={150}
                  style={inputStyle}
                />
              </div>
            </>
          ) : (
            /* ── Standard transaction edit fields ────────────── */
            <>
              {/* Type toggle */}
              <div>
                <label id="edit-type-label" style={labelStyle}>Type</label>
                <div
                  role="radiogroup"
                  aria-labelledby="edit-type-label"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '6px',
                    padding: '4px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                >
                  {['income', 'expense', 'investment'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={form.type === t}
                      onClick={() => setForm((prev) => ({ ...prev, type: t }))}
                      style={{
                        border: 0,
                        borderRadius: '6px',
                        padding: '8px 4px',
                        background:
                          form.type === t
                            ? t === 'income'
                              ? '#d1fae5'
                              : t === 'expense'
                              ? '#fee2e2'
                              : '#ede9fe'
                            : 'transparent',
                        color:
                          form.type === t
                            ? t === 'income'
                              ? '#065f46'
                              : t === 'expense'
                              ? '#991b1b'
                              : '#4c1d95'
                            : '#64748b',
                        fontWeight: form.type === t ? 700 : 500,
                        fontSize: '0.82rem',
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="edit-tx-account" style={labelStyle}>Account</label>
                <select
                  id="edit-tx-account"
                  value={form.accountId}
                  onChange={updateField('accountId')}
                  disabled={loadingAccounts}
                  style={inputStyle}
                >
                  <option value="">Select account</option>
                  {accounts.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.name} ({formatBalance(a.balance, a.currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label htmlFor="edit-tx-amount" style={labelStyle}>Amount</label>
                  <input
                    id="edit-tx-amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={updateField('amount')}
                    placeholder="0.00"
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor="edit-tx-date" style={labelStyle}>Date</label>
                  <input
                    id="edit-tx-date"
                    type="date"
                    value={form.date}
                    onChange={updateField('date')}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-tx-category" style={labelStyle}>Category</label>
                <select id="edit-tx-category" value={form.category} onChange={updateField('category')} style={inputStyle}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  {/* Keep existing category if not in list */}
                  {form.category && !CATEGORIES.includes(form.category) && (
                    <option value={form.category}>{form.category}</option>
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="edit-tx-title" style={labelStyle}>Title / Description</label>
                <input
                  id="edit-tx-title"
                  type="text"
                  value={form.title}
                  onChange={updateField('title')}
                  placeholder="Optional description"
                  maxLength={150}
                  style={inputStyle}
                />
              </div>
            </>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                flex: 1,
                padding: '11px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                color: '#475569',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loadingAccounts}
              style={{
                flex: 2,
                padding: '11px',
                background: submitting ? '#99f6e4' : '#0f766e',
                border: 0,
                borderRadius: '8px',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Saving…' : isTransfer ? 'Update Transfer' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
