import React, { useEffect, useMemo, useState } from 'react';
import { Search, Pencil, Trash2, TrendingUp, TrendingDown, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../services/api';

const money = (value) => {
  const amount = Number(value || 0);
  const sign = amount < 0 ? '-' : '';
  return `${sign}₹${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const percent = (value) => `${Number(value || 0).toFixed(2)}%`;

export default function Stocks() {
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    symbol: '',
    quantity: '',
    buyPrice: '',
    currentPrice: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchStocks = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/investments');
      const payload = response.data || {};
      const items = Array.isArray(payload.holdings) ? payload.holdings : Array.isArray(payload.data) ? payload.data : [];
      const stocks = items.filter((holding) => {
        const type = (holding.type || holding.assetType || '').toLowerCase();
        return type === 'stock';
      });
      setHoldings(stocks);
    } catch (err) {
      console.error('Failed to fetch stock holdings:', err);
      setError(err.response?.data?.message || 'Unable to load stock holdings');
      setHoldings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  const filteredHoldings = useMemo(() => {
    const term = search.trim().toLowerCase();
    return holdings.filter((holding) => {
      const haystack = `${holding.name || ''} ${holding.symbol || ''}`.toLowerCase();
      return !term || haystack.includes(term);
    });
  }, [holdings, search]);

  const totals = useMemo(() => {
    const invested = filteredHoldings.reduce((sum, item) => sum + Number(item.investedAmount ?? ((item.quantity || 0) * (item.buyPrice ?? item.purchasePrice ?? 0))), 0);
    const current = filteredHoldings.reduce((sum, item) => sum + Number(item.currentValue ?? ((item.quantity || 0) * (item.currentPrice ?? item.buyPrice ?? item.purchasePrice ?? 0))), 0);
    const pnl = current - invested;
    return { invested, current, pnl, count: filteredHoldings.length };
  }, [filteredHoldings]);

  const openEditModal = (holding) => {
    setEditingId(holding._id);
    setEditForm({
      name: holding.name || '',
      symbol: holding.symbol || '',
      quantity: String(holding.quantity || 0),
      buyPrice: String(holding.buyPrice ?? holding.purchasePrice ?? 0),
      currentPrice: String(holding.currentPrice ?? holding.buyPrice ?? 0),
    });
  };

  const closeEditModal = () => {
    setEditingId(null);
    setEditForm({ name: '', symbol: '', quantity: '', buyPrice: '', currentPrice: '' });
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editingId) return;

    const quantity = Number(editForm.quantity);
    const buyPrice = Number(editForm.buyPrice);
    const currentPrice = Number(editForm.currentPrice);

    if (!editForm.name.trim() || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(buyPrice) || buyPrice < 0 || !Number.isFinite(currentPrice) || currentPrice < 0) {
      toast.error('Please provide a valid name, quantity, buy price and current price.');
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/investments/${editingId}`, {
        name: editForm.name.trim(),
        symbol: editForm.symbol.trim() || editForm.name.trim(),
        type: 'stock',
        assetType: 'stock',
        quantity,
        buyPrice,
        purchasePrice: buyPrice,
        currentPrice,
      });
      toast.success('Stock holding updated successfully');
      closeEditModal();
      fetchStocks();
    } catch (err) {
      console.error('Failed to update stock holding:', err);
      toast.error(err.response?.data?.message || 'Unable to update stock');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name} from your stock holdings?`)) return;

    try {
      await api.delete(`/investments/${id}`);
      toast.success(`${name} removed from stock holdings`);
      fetchStocks();
    } catch (err) {
      console.error('Failed to delete stock holding:', err);
      toast.error(err.response?.data?.message || 'Unable to delete stock');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Investments</p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Stocks</h1>
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search stock symbol or company"
              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-[0.18em]">
            <span>Invested</span>
            <BarChart3 size={16} className="text-slate-400" />
          </div>
          <div className="mt-4 text-2xl font-extrabold text-slate-900">{money(totals.invested)}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-[0.18em]">
            <span>Current</span>
            <ArrowUpRight size={16} className="text-emerald-500" />
          </div>
          <div className="mt-4 text-2xl font-extrabold text-slate-900">{money(totals.current)}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-[0.18em]">
            <span>P/L</span>
            {totals.pnl >= 0 ? <TrendingUp size={16} className="text-emerald-500" /> : <TrendingDown size={16} className="text-rose-500" />}
          </div>
          <div className={`mt-4 text-2xl font-extrabold ${totals.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {money(totals.pnl)}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-[0.18em]">
            <span>Stocks</span>
            <span className="text-slate-700">{totals.count}</span>
          </div>
          <div className="mt-4 text-2xl font-extrabold text-slate-900">{totals.count}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
              Loading stock holdings...
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20 px-4">
            <div className="max-w-md text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <TrendingDown size={22} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Unable to load stocks</h3>
              <p className="mt-2 text-sm text-slate-500">{error}</p>
              <button
                type="button"
                onClick={fetchStocks}
                className="mt-5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Retry
              </button>
            </div>
          </div>
        ) : filteredHoldings.length === 0 ? (
          <div className="flex items-center justify-center py-20 px-4 text-center">
            <div>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <BarChart3 size={22} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No stock holdings found</h3>
              <p className="mt-2 text-sm text-slate-500">No active stock records match the current selection.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                <tr>
                  <th className="px-4 py-3">Symbol</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Buy Price</th>
                  <th className="px-4 py-3 text-right">Current Price</th>
                  <th className="px-4 py-3 text-right">Invested</th>
                  <th className="px-4 py-3 text-right">Current</th>
                  <th className="px-4 py-3 text-right">P/L</th>
                  <th className="px-4 py-3 text-right">Return</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHoldings.map((stock) => {
                  const invested = Number(stock.investedAmount ?? ((stock.quantity || 0) * (stock.buyPrice ?? stock.purchasePrice ?? 0)));
                  const currentValue = Number(stock.currentValue ?? ((stock.quantity || 0) * (stock.currentPrice ?? stock.buyPrice ?? stock.purchasePrice ?? 0)));
                  const pnl = currentValue - invested;
                  const returnPct = invested > 0 ? (pnl / invested) * 100 : 0;
                  const isPositive = pnl >= 0;

                  return (
                    <tr key={stock._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-4 font-bold text-slate-900">{stock.symbol || '—'}</td>
                      <td className="px-4 py-4 text-slate-700">{stock.name}</td>
                      <td className="px-4 py-4 text-right font-medium text-slate-700">{Number(stock.quantity || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-4 text-right font-medium text-slate-700">{money(stock.buyPrice ?? stock.purchasePrice ?? 0)}</td>
                      <td className="px-4 py-4 text-right font-medium text-slate-700">{money(stock.currentPrice ?? stock.buyPrice ?? stock.purchasePrice ?? 0)}</td>
                      <td className="px-4 py-4 text-right font-semibold text-slate-900">{money(invested)}</td>
                      <td className="px-4 py-4 text-right font-semibold text-slate-900">{money(currentValue)}</td>
                      <td className={`px-4 py-4 text-right font-semibold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {money(pnl)}
                      </td>
                      <td className={`px-4 py-4 text-right font-semibold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {percent(returnPct)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(stock)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                            aria-label={`Edit ${stock.name}`}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(stock._id, stock.name)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            aria-label={`Delete ${stock.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Edit Stock</h3>
                <p className="text-xs text-slate-500">Update the stock holding details.</p>
              </div>
              <button type="button" onClick={closeEditModal} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.18em] text-slate-600">Company</label>
                  <input value={editForm.name} onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.18em] text-slate-600">Symbol</label>
                  <input value={editForm.symbol} onChange={(event) => setEditForm((prev) => ({ ...prev, symbol: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 uppercase" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.18em] text-slate-600">Qty</label>
                  <input type="number" step="any" min="0" value={editForm.quantity} onChange={(event) => setEditForm((prev) => ({ ...prev, quantity: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.18em] text-slate-600">Buy Price</label>
                  <input type="number" step="any" min="0" value={editForm.buyPrice} onChange={(event) => setEditForm((prev) => ({ ...prev, buyPrice: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.18em] text-slate-600">Current</label>
                  <input type="number" step="any" min="0" value={editForm.currentPrice} onChange={(event) => setEditForm((prev) => ({ ...prev, currentPrice: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeEditModal} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70">
                  {submitting ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
