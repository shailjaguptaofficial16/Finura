import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { X, RefreshCw, ArrowRightLeft, TrendingUp, TrendingDown } from 'lucide-react';

const initialForm = (accountId = '', type = 'expense') => ({
  type,
  title: '',
  amount: '',
  category: 'Other',
  date: new Date().toISOString().split('T')[0],
  accountId,
  toAccount: '',
});

const CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Housing & Rent',
  'Transportation',
  'Utilities & Bills',
  'Healthcare',
  'Entertainment',
  'Education',
  'Investment',
  'Salary',
  'Freelance',
  'Other',
];

export default function AddTransactionModal({
  open,
  onClose,
  onSave,
  onSuccess,
  initialAccountId = '',
  defaultType = 'expense',
}) {
  const [form, setForm] = useState(initialForm(initialAccountId, defaultType));
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Reset form when modal opens
  useEffect(() => {
    if (!open) return;

    setForm(initialForm(initialAccountId, defaultType));
    setErrors({});

    const fetchAccounts = async () => {
      setLoadingAccounts(true);
      try {
        const response = await api.get('/accounts');
        const list = response.data?.data || response.data?.accounts || (Array.isArray(response.data) ? response.data : []);
        setAccounts(list);
        if (list.length > 0) {
          const defaultAccount =
            list.find((account) => account._id === initialAccountId) ||
            list.find((account) => account.isDefault) ||
            list[0];
          setForm((current) => ({ ...current, accountId: defaultAccount._id }));
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load accounts');
      } finally {
        setLoadingAccounts(false);
      }
    };

    fetchAccounts();
  }, [open, initialAccountId, defaultType]);

  // Escape key handler
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    },
    [onClose, submitting]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  const updateField = (field) => (event) => {
    const val = event.target.value;
    setForm((current) => ({ ...current, [field]: val }));
    // Clear inline error when field is updated
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = () => {
    const errs = {};
    const amount = Number(form.amount);

    if (!form.amount || isNaN(amount) || amount <= 0) {
      errs.amount = 'Please enter a valid amount greater than 0';
    }

    if (!form.accountId) {
      errs.accountId = form.type === 'transfer' ? 'Please select a source account' : 'Please select an account';
    }

    if (form.type === 'transfer') {
      if (!form.toAccount) {
        errs.toAccount = 'Please select a destination account';
      } else if (form.toAccount === form.accountId) {
        errs.toAccount = 'Source and destination accounts must be different';
      }
    }

    if (form.type !== 'transfer' && !form.title.trim()) {
      errs.title = 'Please provide a title or description';
    }

    if (!form.date) {
      errs.date = 'Please select a valid date';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    if (!validate()) {
      toast.error('Please resolve the highlighted form errors.');
      return;
    }

    const amount = Number(form.amount);
    const payload =
      form.type === 'transfer'
        ? {
            fromAccount: form.accountId,
            toAccount: form.toAccount,
            amount,
            date: new Date(form.date).toISOString(),
            notes: form.title.trim() || 'Account Transfer',
          }
        : {
            title: form.title.trim(),
            description: form.title.trim(),
            amount,
            type: form.type,
            category: form.category || 'Other',
            date: new Date(form.date).toISOString(),
            accountId: form.accountId,
          };

    if (onSave) return onSave(payload);

    setSubmitting(true);
    try {
      const response = await api.post(
        form.type === 'transfer' ? '/transactions/transfer' : '/transactions',
        payload
      );

      toast.success(form.type === 'transfer' ? 'Transfer completed successfully!' : 'Transaction recorded successfully! 🎉');
      window.dispatchEvent(new CustomEvent('finura:transactions-updated'));
      window.dispatchEvent(new CustomEvent('finura:accounts-updated'));
      onSuccess?.(response.data);
      onClose();
    } catch (error) {
      // Safe error extraction without stack traces
      const msg = error.response?.data?.message || 'Failed to record transaction. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatBalance = (balance, currency = 'INR') =>
    `${currency === 'INR' ? '₹' : '$'}${Number(balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return (
    <div
      onClick={() => !submitting && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-2xl border border-slate-200/80 shadow-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto text-slate-800"
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div>
            <h3 id="modal-title" className="text-lg font-bold text-slate-900 tracking-tight font-heading">
              {form.type === 'transfer' ? 'Transfer Capital' : 'Record Transaction'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Log verified cash inflows, expenditures, or cross-account movements.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close modal"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transaction Type Segmented Toggle */}
          <div>
            <label id="tx-type-label" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Transaction Type <span className="text-rose-500">*</span>
            </label>
            <div role="radiogroup" aria-labelledby="tx-type-label" className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/60">
              <button
                type="button"
                role="radio"
                aria-checked={form.type === 'income'}
                onClick={() => setForm((c) => ({ ...c, type: 'income' }))}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  form.type === 'income'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <TrendingUp size={14} aria-hidden="true" />
                <span>Income</span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={form.type === 'expense'}
                onClick={() => setForm((c) => ({ ...c, type: 'expense' }))}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  form.type === 'expense'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <TrendingDown size={14} aria-hidden="true" />
                <span>Expense</span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={form.type === 'transfer'}
                onClick={() => setForm((c) => ({ ...c, type: 'transfer' }))}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  form.type === 'transfer'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <ArrowRightLeft size={14} aria-hidden="true" />
                <span>Transfer</span>
              </button>
            </div>
          </div>

          {/* Account Selection */}
          {form.type === 'transfer' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="from-account" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Source Account <span className="text-rose-500">*</span>
                </label>
                <select
                  id="from-account"
                  value={form.accountId}
                  onChange={updateField('accountId')}
                  disabled={loadingAccounts || submitting}
                  aria-invalid={Boolean(errors.accountId)}
                  aria-describedby={errors.accountId ? 'from-account-error' : undefined}
                  className={`w-full h-11 px-3 py-2 text-sm bg-slate-50 border rounded-xl outline-none transition ${
                    errors.accountId
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-100'
                      : 'border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100'
                  }`}
                >
                  <option value="">Select source account</option>
                  {accounts.map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.name} ({formatBalance(acc.balance, acc.currency)})
                    </option>
                  ))}
                </select>
                {errors.accountId && (
                  <p id="from-account-error" role="alert" className="text-xs text-rose-500 mt-1 font-medium">
                    {errors.accountId}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="to-account" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Destination Account <span className="text-rose-500">*</span>
                </label>
                <select
                  id="to-account"
                  value={form.toAccount}
                  onChange={updateField('toAccount')}
                  disabled={loadingAccounts || submitting}
                  aria-invalid={Boolean(errors.toAccount)}
                  aria-describedby={errors.toAccount ? 'to-account-error' : undefined}
                  className={`w-full h-11 px-3 py-2 text-sm bg-slate-50 border rounded-xl outline-none transition ${
                    errors.toAccount
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-100'
                      : 'border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100'
                  }`}
                >
                  <option value="">Select destination account</option>
                  {accounts
                    .filter((acc) => acc._id !== form.accountId)
                    .map((acc) => (
                      <option key={acc._id} value={acc._id}>
                        {acc.name} ({formatBalance(acc.balance, acc.currency)})
                      </option>
                    ))}
                </select>
                {errors.toAccount && (
                  <p id="to-account-error" role="alert" className="text-xs text-rose-500 mt-1 font-medium">
                    {errors.toAccount}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="transaction-account" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Account <span className="text-rose-500">*</span>
              </label>
              <select
                id="transaction-account"
                value={form.accountId}
                onChange={updateField('accountId')}
                disabled={loadingAccounts || submitting}
                aria-invalid={Boolean(errors.accountId)}
                aria-describedby={errors.accountId ? 'tx-account-error' : undefined}
                className={`w-full h-11 px-3 py-2 text-sm bg-slate-50 border rounded-xl outline-none transition ${
                  errors.accountId
                    ? 'border-rose-400 focus:ring-2 focus:ring-rose-100'
                    : 'border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100'
                }`}
              >
                <option value="">Select account</option>
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {acc.name} ({formatBalance(acc.balance, acc.currency)})
                  </option>
                ))}
              </select>
              {errors.accountId && (
                <p id="tx-account-error" role="alert" className="text-xs text-rose-500 mt-1 font-medium">
                  {errors.accountId}
                </p>
              )}
            </div>
          )}

          {/* Amount Field */}
          <div>
            <label htmlFor="transaction-amount" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Amount ($ / ₹) <span className="text-rose-500">*</span>
            </label>
            <input
              id="transaction-amount"
              type="number"
              min="0.01"
              step="any"
              placeholder="0.00"
              value={form.amount}
              onChange={updateField('amount')}
              disabled={submitting}
              aria-invalid={Boolean(errors.amount)}
              aria-describedby={errors.amount ? 'amount-error' : undefined}
              className={`w-full h-11 px-3.5 py-2 text-sm bg-slate-50 border rounded-xl outline-none transition font-medium ${
                errors.amount
                  ? 'border-rose-400 focus:ring-2 focus:ring-rose-100'
                  : 'border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100'
              }`}
            />
            {errors.amount && (
              <p id="amount-error" role="alert" className="text-xs text-rose-500 mt-1 font-medium">
                {errors.amount}
              </p>
            )}
          </div>

          {/* Category Selection (Non-transfer) */}
          {form.type !== 'transfer' && (
            <div>
              <label htmlFor="transaction-category" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                id="transaction-category"
                value={form.category}
                onChange={updateField('category')}
                disabled={submitting}
                className="w-full h-11 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Field */}
          <div>
            <label htmlFor="transaction-date" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Date <span className="text-rose-500">*</span>
            </label>
            <input
              id="transaction-date"
              type="date"
              value={form.date}
              onChange={updateField('date')}
              disabled={submitting}
              className={`w-full h-11 px-3.5 py-2 text-sm bg-slate-50 border rounded-xl outline-none transition ${
                errors.date
                  ? 'border-rose-400 focus:ring-2 focus:ring-rose-100'
                  : 'border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100'
              }`}
            />
            {errors.date && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.date}</p>}
          </div>

          {/* Description / Notes */}
          <div>
            <label htmlFor="transaction-notes" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              {form.type === 'transfer' ? 'Transfer Note (Optional)' : 'Title / Description'} {form.type !== 'transfer' && <span className="text-rose-500">*</span>}
            </label>
            <input
              id="transaction-notes"
              type="text"
              placeholder={form.type === 'transfer' ? 'e.g. Monthly Savings Allocation' : 'e.g. Client Payment, Groceries'}
              value={form.title}
              onChange={updateField('title')}
              disabled={submitting}
              maxLength={120}
              className={`w-full h-11 px-3.5 py-2 text-sm bg-slate-50 border rounded-xl outline-none transition ${
                errors.title
                  ? 'border-rose-400 focus:ring-2 focus:ring-rose-100'
                  : 'border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100'
              }`}
            />
            {errors.title && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.title}</p>}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 h-11 px-4 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-semibold text-sm rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loadingAccounts}
              className="flex-1 h-11 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              {submitting ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Recording...</span>
                </>
              ) : form.type === 'transfer' ? (
                'Execute Transfer'
              ) : (
                'Save Transaction'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { AddTransactionModal };
