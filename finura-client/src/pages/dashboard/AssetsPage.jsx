import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowUpRight, Building2, Landmark, Pencil, Plus, RefreshCw, Search, Trash2, Wallet } from 'lucide-react';
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

const supportedAssetEnums = ['Cash', 'Real Estate', 'Gold', 'Vehicle', 'Business', 'Other'];

const groupAssetCategory = (category) => {
  switch (category) {
    case 'Cash':
      return 'Cash';
    case 'Real Estate':
      return 'Property';
    case 'Vehicle':
      return 'Vehicles';
    case 'Gold':
    case 'Business':
    case 'Other':
      return 'Other assets';
    default:
      return 'Other assets';
  }
};

const categoryLabel = (category) => {
  if (category === 'Bank accounts') return 'Bank accounts';
  if (category === 'Real Estate') return 'Property';
  if (category === 'Vehicle') return 'Vehicles';
  if (category === 'Gold' || category === 'Business' || category === 'Other') return 'Other assets';
  return category;
};

const COLORS = ['#0f766e', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#64748b'];

export default function AssetsPage() {
  const [assets, setAssets] = useState([]);
  const [netWorth, setNetWorth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('value-desc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: 'Cash',
    currentValue: '',
    purchaseValue: '',
    purchaseDate: '',
    notes: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [assetsRes, wealthRes] = await Promise.all([
        api.get('/assets'),
        api.get('/wealth/net-worth'),
      ]);

      const assetList = Array.isArray(assetsRes.data?.data)
        ? assetsRes.data.data
        : Array.isArray(assetsRes.data)
          ? assetsRes.data
          : [];

      setAssets(assetList);
      setNetWorth(wealthRes.data?.data || wealthRes.data || null);
    } catch (requestError) {
      console.error('Failed to load assets:', requestError);
      setError(requestError.response?.data?.message || 'Unable to load assets right now.');
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
    const detail = netWorth?.assetBreakdown || {};
    const bankAccounts = Number(detail.accounts || 0);
    const investments = Number(detail.investments || 0);
    const manualAssets = Number(detail.manualAssets || 0);
    const cash = assets.filter((asset) => asset.category === 'Cash').reduce((sum, asset) => sum + Number(asset.currentValue || 0), 0);
    const property = assets.filter((asset) => asset.category === 'Real Estate').reduce((sum, asset) => sum + Number(asset.currentValue || 0), 0);
    const vehicles = assets.filter((asset) => asset.category === 'Vehicle').reduce((sum, asset) => sum + Number(asset.currentValue || 0), 0);
    const other = assets.filter((asset) => ['Gold', 'Business', 'Other'].includes(asset.category)).reduce((sum, asset) => sum + Number(asset.currentValue || 0), 0);

    const items = [
      { name: 'Bank accounts', value: bankAccounts, color: '#0f766e' },
      { name: 'Cash', value: cash, color: '#10b981' },
      { name: 'Investments', value: investments, color: '#3b82f6' },
      { name: 'Property', value: property, color: '#f59e0b' },
      { name: 'Vehicles', value: vehicles, color: '#8b5cf6' },
      { name: 'Other assets', value: other || manualAssets - (cash + property + vehicles), color: '#64748b' },
    ];

    return items.filter((item) => item.value > 0);
  }, [assets, netWorth]);

  const filteredAssets = useMemo(() => {
    const queryText = query.trim().toLowerCase();
    return [...assets]
      .filter((asset) => {
        const valueCategory = groupAssetCategory(asset.category);
        const matchesCategory = categoryFilter === 'All' || categoryFilter === valueCategory || (categoryFilter === 'Bank accounts' && valueCategory === 'Bank accounts');
        const matchesSearch = !queryText || `${asset.name || ''} ${asset.category || ''} ${asset.notes || ''}`.toLowerCase().includes(queryText);
        return matchesCategory && matchesSearch;
      })
      .sort((left, right) => {
        const leftValue = Number(left.currentValue || 0);
        const rightValue = Number(right.currentValue || 0);
        if (sortBy === 'value-asc') return leftValue - rightValue;
        if (sortBy === 'name-asc') return String(left.name || '').localeCompare(String(right.name || ''));
        return rightValue - leftValue;
      });
  }, [assets, categoryFilter, query, sortBy]);

  const totalAssets = Number(netWorth?.totalAssets || 0);
  const totalManualValue = assets.reduce((sum, asset) => sum + Number(asset.currentValue || 0), 0);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ name: '', category: 'Cash', currentValue: '', purchaseValue: '', purchaseDate: '', notes: '' });
    setShowAddModal(true);
  };

  const openEditModal = (asset) => {
    setEditingId(asset._id);
    setForm({
      name: asset.name || '',
      category: asset.category || 'Cash',
      currentValue: String(asset.currentValue ?? ''),
      purchaseValue: String(asset.purchaseValue ?? ''),
      purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().slice(0, 10) : '',
      notes: asset.notes || '',
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingId(null);
    setForm({ name: '', category: 'Cash', currentValue: '', purchaseValue: '', purchaseDate: '', notes: '' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const cleanedName = form.name.trim();
    const currentValue = Number(form.currentValue);
    if (!cleanedName) {
      return;
    }
    if (!Number.isFinite(currentValue) || currentValue < 0) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: cleanedName,
        category: form.category,
        currentValue,
        purchaseValue: form.purchaseValue === '' ? 0 : Number(form.purchaseValue),
        purchaseDate: form.purchaseDate || null,
        notes: form.notes?.trim() || '',
      };

      if (editingId) {
        await api.put(`/assets/${editingId}`, payload);
      } else {
        await api.post('/assets', payload);
      }

      window.dispatchEvent(new CustomEvent('finura:wealth-updated'));
      closeModal();
      await fetchData();
    } catch (requestError) {
      console.error('Failed to save asset:', requestError);
      alert(requestError.response?.data?.message || 'Unable to save asset. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (asset) => {
    if (!window.confirm(`Delete ${asset.name}?`)) return;
    try {
      await api.delete(`/assets/${asset._id}`);
      window.dispatchEvent(new CustomEvent('finura:wealth-updated'));
      await fetchData();
    } catch (requestError) {
      console.error('Failed to delete asset:', requestError);
      alert(requestError.response?.data?.message || 'Unable to delete asset.');
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
          <h1 className="mt-3 text-xl font-bold text-slate-900">Assets are unavailable</h1>
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
        <header className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-6 text-white shadow-lg md:flex-row md:items-end md:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-[.18em] text-emerald-300">Finura Wealth</span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Assets</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">Manual assets, cash holdings, and classified wealth categories backed by your real data.</p>
          </div>
          <button type="button" onClick={openCreateModal} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-emerald-50">
            <Plus size={15} /> Add asset
          </button>
        </header>

        <section className="grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Wallet size={16} className="text-emerald-600" /> Total assets
            </div>
            <strong className="mt-3 block text-2xl font-extrabold tracking-tight text-slate-900">{formatMoney(totalAssets)}</strong>
            <span className="mt-1 block text-xs text-slate-500">Net worth asset total</span>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Building2 size={16} className="text-emerald-600" /> Manual assets
            </div>
            <strong className="mt-3 block text-2xl font-extrabold tracking-tight text-slate-900">{formatMoney(totalManualValue)}</strong>
            <span className="mt-1 block text-xs text-slate-500">Self-added asset records</span>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Landmark size={16} className="text-emerald-600" /> Accounts + investments
            </div>
            <strong className="mt-3 block text-2xl font-extrabold tracking-tight text-slate-900">{formatMoney((Number(netWorth?.assetBreakdown?.accounts || 0) + Number(netWorth?.assetBreakdown?.investments || 0)))}</strong>
            <span className="mt-1 block text-xs text-slate-500">Real account and investment totals</span>
          </article>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Asset breakdown</h2>
                <p className="mt-1 text-xs text-slate-500">Real backend totals by asset category</p>
              </div>
              <ArrowUpRight className="text-emerald-600" size={20} />
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
                <div className="grid h-44 place-items-center rounded-full border-[22px] border-slate-100 text-center text-xs text-slate-400">No asset data</div>
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
                <h2 className="text-lg font-bold text-slate-900">Asset categories</h2>
                <p className="mt-1 text-xs text-slate-500">Filtered record view</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {['Bank accounts', 'Cash', 'Investments', 'Property', 'Vehicles', 'Other assets'].map((item) => {
                const value = chartData.find((entry) => entry.name === item)?.value || 0;
                return (
                  <div key={item} className="rounded-xl bg-slate-50 p-3">
                    <span className="text-xs text-slate-500">{item}</span>
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
              <p className="mt-1 text-xs text-slate-500">Manual asset entries only</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative block">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search asset" className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white sm:w-52" />
              </label>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white">
                <option value="All">All categories</option>
                <option value="Bank accounts">Bank accounts</option>
                <option value="Cash">Cash</option>
                <option value="Investments">Investments</option>
                <option value="Property">Property</option>
                <option value="Vehicles">Vehicles</option>
                <option value="Other assets">Other assets</option>
              </select>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white">
                <option value="value-desc">Sort: Highest value</option>
                <option value="value-asc">Sort: Lowest value</option>
                <option value="name-asc">Sort: Name</option>
              </select>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            {filteredAssets.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No matching assets found. Add your first manual asset to track it here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Asset</th>
                      <th className="px-4 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 font-semibold">Current value</th>
                      <th className="px-4 py-3 font-semibold">Source</th>
                      <th className="px-4 py-3 font-semibold">Added</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredAssets.map((asset) => (
                      <tr key={asset._id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-900">{asset.name}</div>
                          {asset.notes ? <div className="mt-1 text-xs text-slate-500">{asset.notes}</div> : null}
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            {categoryLabel(asset.category)}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-semibold text-emerald-700">{formatMoney(asset.currentValue)}</td>
                        <td className="px-4 py-4 text-slate-600">{asset.source || 'Manual entry'}</td>
                        <td className="px-4 py-4 text-slate-600">{formatDate(asset.createdAt || asset.purchaseDate)}</td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => openEditModal(asset)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50" aria-label={`Edit ${asset.name}`}>
                              <Pencil size={15} />
                            </button>
                            <button type="button" onClick={() => handleDelete(asset)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50" aria-label={`Delete ${asset.name}`}>
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

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{editingId ? 'Edit asset' : 'Add asset'}</h3>
                <p className="mt-1 text-sm text-slate-500">Use only supported asset categories.</p>
              </div>
              <button type="button" onClick={closeModal} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-500 hover:bg-slate-50">Close</button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Asset name</span>
                  <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white" required />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Category</span>
                  <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white"> 
                    {supportedAssetEnums.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Current value</span>
                  <input type="number" min="0" step="0.01" value={form.currentValue} onChange={(event) => setForm({ ...form, currentValue: event.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white" required />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Purchase value</span>
                  <input type="number" min="0" step="0.01" value={form.purchaseValue} onChange={(event) => setForm({ ...form, purchaseValue: event.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white" />
                </label>

                <label className="space-y-2 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Purchase date</span>
                  <input type="date" value={form.purchaseDate} onChange={(event) => setForm({ ...form, purchaseDate: event.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white" />
                </label>

                <label className="space-y-2 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Notes</span>
                  <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white" placeholder="Optional notes about this asset" />
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70">
                  {saving ? 'Saving...' : editingId ? 'Update asset' : 'Add asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
