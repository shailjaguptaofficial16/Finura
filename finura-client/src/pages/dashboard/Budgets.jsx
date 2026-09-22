import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { EmptyState, ErrorState, CardSkeleton } from '../../components/common';
import { PiggyBank, Plus, RefreshCw, X, AlertTriangle } from 'lucide-react';

const BUDGET_CATEGORY_OPTIONS = [
  { label: 'Food & Dining', value: 'Food' },
  { label: 'Shopping', value: 'Shopping' },
  { label: 'Housing & Rent', value: 'Housing' },
  { label: 'Transportation', value: 'Transport' },
  { label: 'Utilities & Bills', value: 'Bills' },
  { label: 'Healthcare', value: 'Healthcare' },
  { label: 'Entertainment', value: 'Entertainment' },
  { label: 'Education', value: 'Education' },
  { label: 'Travel', value: 'Travel' },
  { label: 'Other', value: 'Other' },
];

const monthStart = () => {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().split('T')[0];
};

const monthEnd = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1, 0);
  return date.toISOString().split('T')[0];
};

const initialForm = () => ({
  category: 'Food',
  amount: '',
  period: 'monthly',
  startDate: monthStart(),
  endDate: monthEnd(),
});

const dateValue = (value) => (value ? new Date(value).toISOString().split('T')[0] : '');

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm());
  const [formErrors, setFormErrors] = useState({});

  const loadBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/budgets');
      setBudgets(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to load budgets:', err);
      const msg = err.response?.data?.message || 'Unable to load budgets. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  // Escape key handler for modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && formOpen && !saving) {
        setFormOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [formOpen, saving]);

  const update = (field) => (event) => {
    const val = event.target.value;
    setForm((current) => ({ ...current, [field]: val }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm());
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (budget) => {
    setEditing(budget);
    setForm({
      category: budget.category,
      amount: budget.amount,
      period: budget.period,
      startDate: dateValue(budget.startDate),
      endDate: dateValue(budget.endDate),
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const validate = () => {
    const errs = {};
    const amount = Number(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      errs.amount = 'Please enter a valid budget amount greater than 0';
    }
    if (!form.category || !BUDGET_CATEGORY_OPTIONS.some((option) => option.value === form.category)) {
      errs.category = 'Please select a category';
    }
    if (!form.startDate) {
      errs.startDate = 'Start date is required';
    }
    if (!form.endDate) {
      errs.endDate = 'End date is required';
    }
    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
      errs.endDate = 'End date must be on or after start date';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;

    if (!validate()) {
      toast.error('Please resolve the highlighted errors.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
      };

      if (editing) {
        await api.put(`/budgets/${editing._id}`, payload);
        toast.success(`Budget for "${form.category}" updated successfully!`);
      } else {
        await api.post('/budgets', payload);
        toast.success(`Budget for "${form.category}" created successfully! 🎉`);
      }
      setFormOpen(false);
      await loadBudgets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to save budget. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (budget) => {
    if (!window.confirm(`Delete the ${budget.category} budget?`)) return;
    try {
      await api.delete(`/budgets/${budget._id}`);
      toast.success('Budget deleted successfully');
      await loadBudgets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to delete budget');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in text-slate-800">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm">
        <div>
          <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-teal-200">
            Spending Telemetry
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1.5 font-heading">
            Category Budgets
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Compare category limits with verified expense activity to prevent overspending.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
        >
          <Plus size={16} />
          <span>Create Budget</span>
        </button>
      </div>

      {/* Main Content Area */}
      {error ? (
        <ErrorState
          title="Failed to Load Budgets"
          message={error}
          onRetry={loadBudgets}
        />
      ) : loading ? (
        <CardSkeleton count={3} />
      ) : budgets.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="No budgets set yet"
          description="Establish monthly spending caps across key categories like Food, Shopping, or Travel to keep your cashflow balanced."
          actionText="Create Your First Budget"
          onAction={openCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {budgets.map((budget) => {
            const usage = Math.min(budget.usage || 0, 100);
            const exceeded = budget.isExceeded;
            const warning = budget.budgetStatus === 'warning';

            return (
              <div
                key={budget._id}
                className={`bg-white rounded-2xl border p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                  exceeded ? 'border-rose-300' : warning ? 'border-amber-300' : 'border-slate-200/80'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-heading">{budget.category}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5 capitalize">
                        {budget.period} · {dateValue(budget.startDate)} to {dateValue(budget.endDate)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEdit(budget)}
                      aria-label={`Edit ${budget.category} budget`}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="flex justify-between items-baseline mt-4">
                    <span className="text-xl font-extrabold text-slate-900 font-heading">
                      ₹{Number(budget.spent || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      of ₹{Number(budget.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        exceeded ? 'bg-rose-500' : warning ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${usage}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs font-bold mt-2">
                    <span className={exceeded ? 'text-rose-600 flex items-center gap-1' : warning ? 'text-amber-600' : 'text-teal-700'}>
                      {exceeded && <AlertTriangle size={12} aria-hidden="true" />}
                      {exceeded
                        ? `₹${Math.abs(budget.remaining || 0).toLocaleString('en-IN')} over budget`
                        : `₹${Number(budget.remaining || 0).toLocaleString('en-IN')} remaining`}
                    </span>
                    <span className="text-slate-500">{budget.usage || 0}%</span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => remove(budget)}
                    aria-label={`Delete ${budget.category} budget`}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Budget Modal */}
      {formOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="budget-modal-title"
          onClick={() => !saving && setFormOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto text-slate-800"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 id="budget-modal-title" className="text-base font-bold text-slate-900 font-heading">
                {editing ? 'Modify Category Budget' : 'Set Category Budget'}
              </h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                disabled={saving}
                aria-label="Close budget dialog"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label htmlFor="budget-category" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  id="budget-category"
                  value={form.category}
                  onChange={update('category')}
                  disabled={saving}
                  aria-invalid={!!formErrors.category}
                  aria-describedby={formErrors.category ? "budget-category-error" : undefined}
                  className="w-full h-11 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition"
                >
                  {BUDGET_CATEGORY_OPTIONS.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
                {formErrors.category && (
                  <p id="budget-category-error" role="alert" className="text-xs text-rose-500 mt-1 font-medium">{formErrors.category}</p>
                )}
              </div>

              <div>
                <label htmlFor="budget-amount" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Spending Limit (₹ / $) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="budget-amount"
                  type="number"
                  min="0.01"
                  step="any"
                  placeholder="5000"
                  value={form.amount}
                  onChange={update('amount')}
                  disabled={saving}
                  aria-invalid={!!formErrors.amount}
                  aria-describedby={formErrors.amount ? "budget-amount-error" : undefined}
                  className={`w-full h-11 px-3.5 py-2 text-sm bg-slate-50 border rounded-xl outline-none transition ${
                    formErrors.amount
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-100'
                      : 'border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100'
                  }`}
                />
                {formErrors.amount && (
                  <p id="budget-amount-error" role="alert" className="text-xs text-rose-500 mt-1 font-medium">{formErrors.amount}</p>
                )}
              </div>

              <div>
                <label htmlFor="budget-period" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Cycle Period
                </label>
                <select
                  id="budget-period"
                  value={form.period}
                  onChange={update('period')}
                  disabled={saving}
                  className="w-full h-11 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition"
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="budget-start-date" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="budget-start-date"
                    type="date"
                    value={form.startDate}
                    onChange={update('startDate')}
                    disabled={saving}
                    aria-invalid={!!formErrors.startDate}
                    aria-describedby={formErrors.startDate ? "budget-start-date-error" : undefined}
                    className="w-full h-11 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition"
                  />
                  {formErrors.startDate && (
                    <p id="budget-start-date-error" role="alert" className="text-xs text-rose-500 mt-1 font-medium">{formErrors.startDate}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="budget-end-date" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="budget-end-date"
                    type="date"
                    value={form.endDate}
                    onChange={update('endDate')}
                    disabled={saving}
                    aria-invalid={!!formErrors.endDate}
                    aria-describedby={formErrors.endDate ? "budget-end-date-error" : undefined}
                    className="w-full h-11 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition"
                  />
                  {formErrors.endDate && (
                    <p id="budget-end-date-error" role="alert" className="text-xs text-rose-500 mt-1 font-medium">{formErrors.endDate}</p>
                  )}
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  disabled={saving}
                  className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-11 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" aria-hidden="true" />
                      <span>Saving...</span>
                    </>
                  ) : editing ? (
                    'Save Changes'
                  ) : (
                    'Create Budget'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
