import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowDownRight, CreditCard, Landmark, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../../services/api';

const formatMoney = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const supportedLiabilityEnums = ['Credit Card', 'Personal Loan', 'Home Loan', 'Education Loan', 'Car Loan', 'Other'];
const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#fb7185', '#8b5cf6', '#64748b'];

export default function LiabilitiesPage() {
  const [liabilities, setLiabilities] = useState([]);
  const [netWorth, setNetWorth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sortBy, setSortBy] = useState('amount-desc');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: 'Credit Card',
    principalAmount: '',
    outstandingAmount: '',
    interestRate: '',
    minimumPayment: '',
    dueDate: '',
    notes: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [liabilitiesRes, wealthRes] = await Promise.all([
        api.get('/liabilities'),
        api.get('/wealth/net-worth'),
      ]);

      const liabilityList = Array.isArray(liabilitiesRes.data?.data)
        ? liabilitiesRes.data.data
        : Array.isArray(liabilitiesRes.data)
          ? liabilitiesRes.data
          : [];

      setLiabilities(liabilityList);
      setNetWorth(wealthRes.data?.data || wealthRes.data || null);
    } catch (requestError) {
      console.error('Failed to load liabilities:', requestError);
      setError(requestError.response?.data?.message || 'Unable to load liabilities right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const refreshHandler = () => fetchData();
    window.addEventListener('finura:wealth-updated', refreshHandler);
    return () => window.removeEventListener('finura:wealth-updated', refreshHandler);
  }, [fetchData]);

  const chartData = useMemo(() => {
    const totals = supportedLiabilityEnums.map((type) => ({
      name: type,
      value: liabilities.filter((item) => item.category === type).reduce((sum, item) => sum + Number(item.outstandingAmount || 0), 0),
      color: COLORS[supportedLiabilityEnums.indexOf(type) % COLORS.length],
    })).filter((item) => item.value > 0);
    return totals;
  }, [liabilities]);

  const filteredLiabilities = useMemo(() => {
    const queryText = query.trim().toLowerCase();
    return [...liabilities]
      .filter((liability) => {
        const matchesType = typeFilter === 'All' || liability.category === typeFilter;
        const matchesSearch = !queryText || `${liability.name || ''} ${liability.category || ''} ${liability.notes || ''}`.toLowerCase().includes(queryText);
        return matchesType && matchesSearch;
      })
      .sort((left, right) => {
        const leftValue = Number(left.outstandingAmount || 0);
        const rightValue = Number(right.outstandingAmount || 0);
        if (sortBy === 'amount-asc') return leftValue - rightValue;
        if (sortBy === 'name-asc') return String(left.name || '').localeCompare(String(right.name || ''));
        if (sortBy === 'due-date') {
          const leftDate = new Date(left.dueDate || left.startDate || 0).getTime();
          const rightDate = new Date(right.dueDate || right.startDate || 0).getTime();
          return leftDate - rightDate;
        }
        return rightValue - leftValue;
      });
  }, [liabilities, query, sortBy, typeFilter]);

  const totalLiabilities = Number(netWorth?.totalLiabilities || 0);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ name: '', category: 'Credit Card', principalAmount: '', outstandingAmount: '', interestRate: '', minimumPayment: '', dueDate: '', notes: '' });
    setShowModal(true);
  };

  const openEditModal = (liability) => {
    setEditingId(liability._id);
    setForm({
      name: liability.name || '',
      category: liability.category || 'Credit Card',
      principalAmount: String(liability.principalAmount ?? ''),
      outstandingAmount: String(liability.outstandingAmount ?? ''),
      interestRate: String(liability.interestRate ?? ''),
      minimumPayment: String(liability.minimumPayment ?? ''),
      dueDate: liability.dueDate ? new Date(liability.dueDate).toISOString().slice(0, 10) : '',
      notes: liability.notes || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm({ name: '', category: 'Credit Card', principalAmount: '', outstandingAmount: '', interestRate: '', minimumPayment: '', dueDate: '', notes: '' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const cleanedName = form.name.trim();
    const outstandingAmount = Number(form.outstandingAmount);
    if (!cleanedName || !Number.isFinite(outstandingAmount) || outstandingAmount < 0) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: cleanedName,
        category: form.category,
        principalAmount: form.principalAmount === '' ? outstandingAmount : Number(form.principalAmount),
        outstandingAmount,
        interestRate: form.interestRate === '' ? 0 : Number(form.interestRate),
        minimumPayment: form.minimumPayment === '' ? 0 : Number(form.minimumPayment),
        dueDate: form.dueDate || null,
        notes: form.notes?.trim() || '',
      };

      if (editingId) {
        await api.put(`/liabilities/${editingId}`, payload);
      } else {
        await api.post('/liabilities', payload);
      }

      window.dispatchEvent(new CustomEvent('finura:wealth-updated'));
      closeModal();
      await fetchData();
    } catch (requestError) {
      console.error('Failed to save liability:', requestError);
      alert(requestError.response?.data?.message || 'Unable to save liability. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (liability) => {
    if (!window.confirm(`Delete ${liability.name}?`)) return;
    try {
      await api.delete(`/liabilities/${liability._id}`);
      window.dispatchEvent(new CustomEvent('finura:wealth-updated'));
      await fetchData();
    } catch (requestError) {
      console.error('Failed to delete liability:', requestError);
      alert(requestError.response?.data?.message || 'Unable to delete liability.');
    }
  };

  if (loading) {
    return (
      <main className="min-h-full bg-slate-50 p-4 sm:p-6">
        <div className="mx-auto max-w-7xl space-y-5 animate-pulse">
          <div className="h-28 rounded-2xl bg-slate-200" />
          <div className="grid gap-5 md:grid-cols-3">
            <div className="h-28 rounded-2xl bg-slate-200" />
            <div className="h-28 rounded-2xl bg-slate-200" />
            <div className="h-28 rounded-2xl bg-slate-200" />
          </div>
          <div className="h-80 rounded-2xl bg-slate-200" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="grid min-h-full place-items-center bg-slate-50 p-6">
        <section className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto text-red-600" size={28} />
          <h1 className="mt-3 text-xl font-bold text-slate-900">Liabilities are unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <button type="button" onClick={fetchData} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            <RefreshCw size={15} /> Retry
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 p-6 text-white shadow-lg md:flex-row md:items-end md:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-[.18em] text-orange-300">Finura Wealth</span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Liabilities</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">Outstanding obligations, credit balances, and debt obligations tracked against your net worth.</p>
          </div>
          <button type="button" onClick={openCreateModal} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-orange-50">
            <Plus size={15} /> Add liability
          </button>
        </header>

        <section className="grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Landmark size={16} className="text-orange-600" /> Total liabilities
            </div>
            <strong className="mt-3 block text-2xl font-extrabold tracking-tight text-slate-900">{formatMoney(totalLiabilities)}</strong>
            <span className="mt-1 block text-xs text-slate-500">Net worth liability total</span>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <CreditCard size={16} className="text-orange-600" /> Outstanding amount
            </div>
            <strong className="mt-3 block text-2xl font-extrabold tracking-tight text-slate-900">{formatMoney(liabilities.reduce((sum, item) => sum + Number(item.outstandingAmount || 0), 0))}</strong>
            <span className="mt-1 block text-xs text-slate-500">Current total across all liabilities</span>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <ArrowDownRight size={16} className="text-orange-600" /> Monthly payment
            </div>
            <strong className="mt-3 block text-2xl font-extrabold tracking-tight text-slate-900">{formatMoney(liabilities.reduce((sum, item) => sum + Number(item.minimumPayment || 0), 0))}</strong>
            <span className="mt-1 block text-xs text-slate-500">Combined minimum due</span>
          </article>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Liability breakdown</h2>
                <p className="mt-1 text-xs text-slate-500">Outstanding balances by liability type</p>
              </div>
              <ArrowDownRight className="text-orange-600" size={20} />
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-[180px_1fr] sm:items-center">
              {chartData.length ? (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={4}>
                      {chartData.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatMoney(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-44 place-items-center rounded-full border-[22px] border-slate-100 text-center text-xs text-slate-400">No liabilities</div>
              )}

              <div className="space-y-3">
                {chartData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 text-slate-600">
                      <i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-semibold text-slate-900">{formatMoney(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Quick summary</h2>
                <p className="mt-1 text-xs text-slate-500">Debt health snapshot</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {supportedLiabilityEnums.map((type) => {
                const value = liabilities.filter((item) => item.category === type).reduce((sum, item) => sum + Number(item.outstandingAmount || 0), 0);
                return (
                  <div key={type} className="rounded-xl bg-slate-50 p-3">
                    <span className="text-xs text-slate-500">{type}</span>
                    <strong className="mt-2 block text-base font-bold text-slate-900">{formatMoney(value)}</strong>
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Records</h2>
              <p className="mt-1 text-xs text-slate-500">Backend-supported debt entries</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative block">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search liability" className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-orange-500 focus:bg-white sm:w-52" />
              </label>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-orange-500 focus:bg-white">
                <option value="All">All types</option>
                {supportedLiabilityEnums.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-orange-500 focus:bg-white">
                <option value="amount-desc">Sort: Highest balance</option>
                <option value="amount-asc">Sort: Lowest balance</option>
                <option value="due-date">Sort: Due date</option>
                <option value="name-asc">Sort: Name</option>
              </select>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            {filteredLiabilities.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No matching liabilities found. Add a liability to track your debt here.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Liability</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Outstanding</th>
                      <th className="px-4 py-3 font-semibold">Interest</th>
                      <th className="px-4 py-3 font-semibold">Due / EMI</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredLiabilities.map((liability) => (
                      <tr key={liability._id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-900">{liability.name}</div>
                          {liability.notes ? <div className="mt-1 text-xs text-slate-500">{liability.notes}</div> : null}
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">{liability.category}</span>
                        </td>
                        <td className="px-4 py-4 font-semibold text-orange-700">{formatMoney(liability.outstandingAmount)}</td>
                        <td className="px-4 py-4 text-slate-600">{Number(liability.interestRate || 0).toFixed(2)}%</td>
                        <td className="px-4 py-4 text-slate-600">
                          <div>{liability.dueDate ? formatDate(liability.dueDate) : '—'}</div>
                          {Number(liability.minimumPayment || 0) > 0 ? <div className="mt-1 text-xs text-slate-500">EMI {formatMoney(liability.minimumPayment)}</div> : null}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => openEditModal(liability)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50" aria-label={`Edit ${liability.name}`}>
                              <Pencil size={15} />
                            </button>
                            <button type="button" onClick={() => handleDelete(liability)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50" aria-label={`Delete ${liability.name}`}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{editingId ? 'Edit liability' : 'Add liability'}</h3>
                <p className="mt-1 text-sm text-slate-500">Use supported liability types and fields only.</p>
              </div>
              <button type="button" onClick={closeModal} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-500 hover:bg-slate-50">Close</button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Liability name</span>
                  <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-800 outline-none transition focus:border-orange-500 focus:bg-white" required />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Type</span>
                  <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-800 outline-none transition focus:border-orange-500 focus:bg-white">
                    {supportedLiabilityEnums.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Outstanding amount</span>
                  <input type="number" min="0" step="0.01" value={form.outstandingAmount} onChange={(event) => setForm({ ...form, outstandingAmount: event.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-800 outline-none transition focus:border-orange-500 focus:bg-white" required />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Principal amount</span>
                  <input type="number" min="0" step="0.01" value={form.principalAmount} onChange={(event) => setForm({ ...form, principalAmount: event.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-800 outline-none transition focus:border-orange-500 focus:bg-white" />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Interest rate %</span>
                  <input type="number" min="0" step="0.01" value={form.interestRate} onChange={(event) => setForm({ ...form, interestRate: event.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-800 outline-none transition focus:border-orange-500 focus:bg-white" />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Minimum payment</span>
                  <input type="number" min="0" step="0.01" value={form.minimumPayment} onChange={(event) => setForm({ ...form, minimumPayment: event.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-800 outline-none transition focus:border-orange-500 focus:bg-white" />
                </label>

                <label className="space-y-2 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Due date</span>
                  <input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-800 outline-none transition focus:border-orange-500 focus:bg-white" />
                </label>

                <label className="space-y-2 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Notes</span>
                  <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 outline-none transition focus:border-orange-500 focus:bg-white" placeholder="Optional notes for this liability" />
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-70">
                  {saving ? 'Saving...' : editingId ? 'Update liability' : 'Add liability'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
