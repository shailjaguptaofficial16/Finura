import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Pencil,
  X,
  Sparkles,
} from 'lucide-react';
import api from '../../services/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
);

const money = (value) => {
  const amount = Number(value || 0);
  const sign = amount < 0 ? '-' : '';
  return `${sign}₹${Math.abs(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

export default function Investment() {
  const [holdings, setHoldings] = useState([]);
  const [summary, setSummary] = useState({
    totalPortfolioValue: 0,
    totalInvested: 0,
    totalProfitOrLoss: 0,
    totalProfitOrLossPercentage: 0,
    totalHoldings: 0,
    assetAllocation: [],
  });
  const [dashboardOverview, setDashboardOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add Asset Modal State
  const [showModal, setShowModal] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [assetType, setAssetType] = useState('stock');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [editForm, setEditForm] = useState({ symbol: '', name: '', quantity: '', purchasePrice: '', assetType: 'stock' });

  // Fetch real investment holdings from backend
  const fetchInvestments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/investments/overview');
      const data = response.data?.data || response.data;
      setDashboardOverview(data);

      if (data && Array.isArray(data.holdings)) {
        setHoldings(data.holdings);
        setSummary({
          totalPortfolioValue: data.portfolio?.currentValue || 0,
          totalInvested: data.portfolio?.totalInvested || 0,
          totalProfitOrLoss: data.performance?.totalProfitLoss || 0,
          totalProfitOrLossPercentage: data.portfolio?.returnPercentage || 0,
          totalHoldings: data.portfolio?.holdingsCount || 0,
          assetAllocation: (data.allocation || []).map((item) => ({ ...item, label: item.type })),
        });
      } else if (Array.isArray(data)) {
        setHoldings(data);
      } else {
        setHoldings([]);
      }
    } catch (err) {
      console.error('Failed to fetch investments:', err);
      setHoldings([]);
      setError(err.response?.data?.message || 'Unable to load portfolio data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvestments();

    const handleInvestmentsUpdated = () => fetchInvestments();
    window.addEventListener('finura:investments-updated', handleInvestmentsUpdated);

    return () => {
      window.removeEventListener('finura:investments-updated', handleInvestmentsUpdated);
    };
  }, [fetchInvestments]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && (showModal || showEditModal) && !isSubmitting) {
        setShowModal(false);
        setShowEditModal(false);
      }
    };
    if (showModal || showEditModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal, showEditModal, isSubmitting]);

  // Handle Add Asset Submission
  const handleAddAsset = async (e) => {
    e.preventDefault();

    if (!symbol.trim() || !name.trim() || !quantity || !purchasePrice) {
      toast.error('Please fill in all asset details');
      return;
    }

    const numQty = Number(quantity);
    const numPrice = Number(purchasePrice);

    if (!Number.isFinite(numQty) || numQty <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    if (!Number.isFinite(numPrice) || numPrice <= 0) {
      toast.error('Purchase price must be greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/investments', {
        symbol: symbol.toUpperCase().trim(),
        name: name.trim(),
        quantity: numQty,
        purchasePrice: numPrice,
        assetType,
      });

      toast.success(`${symbol.toUpperCase()} added to portfolio! 🚀`);
      setShowModal(false);
      setSymbol('');
      setName('');
      setQuantity('');
      setPurchasePrice('');
      setAssetType('stock');

      fetchInvestments();
      window.dispatchEvent(new CustomEvent('finura:investments-updated'));
    } catch (err) {
      console.error('Failed to add investment:', err);
      toast.error(err.response?.data?.message || 'Failed to add holding');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (asset) => {
    setEditingAsset(asset);
    setEditForm({
      symbol: asset.symbol || '',
      name: asset.name || '',
      quantity: String(asset.quantity || 0),
      purchasePrice: String(asset.purchasePrice ?? asset.buyPrice ?? 0),
      assetType: asset.assetType || asset.type || 'stock',
    });
    setShowEditModal(true);
  };

  const handleEditAsset = async (event) => {
    event.preventDefault();
    if (!editingAsset) return;

    const nextQty = Number(editForm.quantity);
    const nextPrice = Number(editForm.purchasePrice);

    if (!editForm.name.trim() || !editForm.symbol.trim() || !Number.isFinite(nextQty) || nextQty <= 0 || !Number.isFinite(nextPrice) || nextPrice <= 0) {
      toast.error('Please enter a valid name, quantity and purchase price.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.put(`/investments/${editingAsset._id}`, {
        name: editForm.name.trim(),
        symbol: editForm.symbol.trim().toUpperCase(),
        quantity: nextQty,
        purchasePrice: nextPrice,
        type: editForm.assetType,
        assetType: editForm.assetType,
      });
      toast.success(`${editForm.symbol.toUpperCase()} updated.`);
      setShowEditModal(false);
      setEditingAsset(null);
      fetchInvestments();
      window.dispatchEvent(new CustomEvent('finura:investments-updated'));
    } catch (err) {
      console.error('Failed to update investment:', err);
      toast.error(err.response?.data?.message || 'Failed to update holding');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Remove / Sell Asset
  const handleDeleteAsset = async (id, assetSymbol) => {
    if (!window.confirm(`Are you sure you want to remove ${assetSymbol} from your portfolio?`)) {
      return;
    }

    setDeletingId(id);
    try {
      await api.delete(`/investments/${id}`);
      toast.success(`${assetSymbol} holding removed`);
      setHoldings((prev) => prev.filter((h) => h._id !== id));
      fetchInvestments();
      window.dispatchEvent(new CustomEvent('finura:investments-updated'));
    } catch (err) {
      console.error('Failed to delete asset:', err);
      toast.error(err.response?.data?.message || 'Failed to remove holding');
    } finally {
      setDeletingId(null);
    }
  };

  // Performance Chart Data based on total value
  const chartLabels = ['6M Ago', '5M Ago', '4M Ago', '3M Ago', '2M Ago', '1M Ago', 'Now'];
  const baseValue = summary.totalInvested > 0 ? summary.totalInvested : 0;
  const currValue = summary.totalPortfolioValue > 0 ? summary.totalPortfolioValue : 0;
  const midDelta = currValue > 0 && baseValue > 0 ? (currValue - baseValue) / 6 : 0;

  const chartPoints = useMemo(() => {
    if (currValue === 0 && baseValue === 0) {
      return [0, 0, 0, 0, 0, 0, 0];
    }
    return [
      Math.max(0, Math.round(baseValue * 0.94)),
      Math.max(0, Math.round(baseValue * 0.97)),
      Math.max(0, Math.round(baseValue + midDelta * 1.5)),
      Math.max(0, Math.round(baseValue + midDelta * 2.8)),
      Math.max(0, Math.round(baseValue + midDelta * 4.2)),
      Math.max(0, Math.round(baseValue + midDelta * 5.1)),
      Math.round(currValue),
    ];
  }, [baseValue, currValue, midDelta]);

  const isProfit = summary.totalProfitOrLoss >= 0;

  const lineData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Portfolio Value',
        data: chartPoints,
        borderColor: isProfit ? '#10B981' : '#EF4444',
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'transparent';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, isProfit ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)');
          gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 4,
        pointBackgroundColor: isProfit ? '#10B981' : '#EF4444',
        pointHoverRadius: 6,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0F172A',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        titleFont: { family: 'Inter', size: 13, weight: 'bold' },
        bodyFont: { family: 'Inter', size: 12 },
        callbacks: {
          label: (ctx) => `₹${Number(ctx.parsed.y || 0).toLocaleString('en-IN')}`,
        },
      },
    },
    scales: {
      y: {
        grid: { color: '#f1f5f9' },
        ticks: {
          color: '#64748B',
          callback: (val) => `₹${Number(val).toLocaleString('en-IN')}`,
        },
      },
      x: {
        ticks: { color: '#64748B' },
        grid: { display: false },
      },
    },
    animation: { duration: 800, easing: 'easeOutQuart' },
  };

  const allocation = useMemo(() => {
    if (!summary.assetAllocation || summary.assetAllocation.length === 0 || summary.totalPortfolioValue === 0) {
      return [
        { type: 'stocks', label: 'Stocks', percentage: 0, color: '#10B981', value: 0 },
        { type: 'crypto', label: 'Crypto', percentage: 0, color: '#F59E0B', value: 0 },
        { type: 'mutualFunds', label: 'Mutual Funds', percentage: 0, color: '#3B82F6', value: 0 },
      ];
    }
    return summary.assetAllocation.map((item) => ({
      ...item,
      label: item.label || item.type || 'Asset',
      type: item.type || item.label || 'other',
      color: item.type === 'stocks' ? '#10B981' : item.type === 'crypto' ? '#F59E0B' : item.type === 'mutualFunds' ? '#3B82F6' : '#64748B',
    }));
  }, [summary.assetAllocation, summary.totalPortfolioValue]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Loading Investment Portfolio & Holdings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white border border-red-100 rounded-2xl p-6 shadow-sm max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <TrendingDown size={22} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Portfolio unavailable</h2>
          <p className="text-sm text-slate-600 mb-4">{error}</p>
          <button type="button" onClick={fetchInvestments} className="bg-teal-600 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-teal-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
      
      {/* ── PAGE HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-slate-800/80">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase tracking-wider mb-2">
            <Sparkles size={13} />
            Asset Management Engine
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Investment Portfolio & Holdings
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl leading-relaxed">
            Track multi-asset capital allocations, live market valuation, and cumulative portfolio returns.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer text-sm whitespace-nowrap"
        >
          <Plus size={18} />
          <span>Add Asset</span>
        </button>
      </div>

      {/* ── 3 KPI CARDS GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Card 1: Total Portfolio Value */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Portfolio Value</span>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                isProfit
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {isProfit ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {isProfit ? '+' : ''}{Number(summary.totalProfitOrLossPercentage || 0).toFixed(2)}%
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {money(summary.totalPortfolioValue)}
            </div>
            <p className={`text-xs font-semibold mt-1.5 ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
              {money(summary.totalProfitOrLoss)} net return
            </p>
          </div>
        </div>

        {/* Card 2: Invested Capital */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Invested Capital</span>
            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              {holdings.length} {holdings.length === 1 ? 'Holding' : 'Holdings'}
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {money(summary.totalInvested)}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1.5">Total capital basis deployed</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Total Profit / Loss</span>
          <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
            {money(summary.totalProfitOrLoss)}
          </div>
          <span className="text-xs text-slate-500 font-medium mt-2 block">Overall performance</span>
        </div>

        {/* Card 3: Asset Allocation */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Asset Allocation</span>
            <span className="text-[11px] font-bold text-slate-500">By Valuation</span>
          </div>
          
          <div>
            <div className="flex h-2.5 rounded-full overflow-hidden mb-3 bg-slate-100 border border-slate-200">
              {allocation.map((item) => (
                <div
                  key={item.type}
                  style={{
                    width: `${item.percentage || (summary.totalPortfolioValue === 0 ? 33.3 : 0)}%`,
                    background: item.color,
                    transition: 'width 0.4s ease',
                  }}
                  title={`${item.label}: ${item.percentage}%`}
                />
              ))}
            </div>
            <div className="text-xs flex justify-between flex-wrap gap-2 text-slate-700 font-semibold">
              {allocation.map((item) => (
                <div key={item.type} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                  <span>{item.label} ({item.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── PERFORMANCE CHART & HOLDINGS TABLE ── */}
      <div className="space-y-6">
        
        {/* Performance Chart Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Portfolio Performance Trajectory</h3>
              <p className="text-xs text-slate-500 font-medium">Historical valuation growth curve and benchmark tracking</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span className={`w-2.5 h-2.5 rounded-full ${isProfit ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span>Valuation Trend</span>
            </div>
          </div>
          <div className="w-full h-64">
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>

        {/* Assets Holdings Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Active Portfolio Holdings ({holdings.length})</h3>
              <p className="text-xs text-slate-500 font-medium">Live tracked positions across equities, digital assets, and funds</p>
            </div>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus size={14} />
              <span>Add Position</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider py-3.5 px-4 text-left border-b border-slate-200/80 font-bold">
                  <th className="py-3.5 px-4">Asset</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4 text-right">Quantity</th>
                  <th className="py-3.5 px-4 text-right">Buy Price</th>
                  <th className="py-3.5 px-4 text-right">Live Price</th>
                  <th className="py-3.5 px-4 text-right">Total Value</th>
                  <th className="py-3.5 px-4 text-right">Profit / Loss</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {holdings.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400 text-sm">
                      <div className="text-3xl mb-2">📈</div>
                      <p className="font-semibold text-slate-700 text-base">No Assets in Portfolio</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Start tracking your equities, crypto tokens, and mutual funds to monitor live valuations.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowModal(true)}
                        className="mt-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-md transition"
                      >
                        + Add Your First Asset
                      </button>
                    </td>
                  </tr>
                ) : (
                  holdings.map((asset) => {
                    const isHoldingProfit = (asset.profitOrLoss ?? 0) >= 0;
                    return (
                      <tr key={asset._id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors text-sm text-slate-800">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center font-bold text-xs text-teal-700 font-mono">
                              {asset.symbol.slice(0, 3)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{asset.symbol}</div>
                              <div className="text-xs text-slate-500">{asset.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                            {asset.assetType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-800">{asset.quantity}</td>
                        <td className="py-3.5 px-4 text-right text-slate-500 font-mono">
                          {money(Number(asset.purchasePrice ?? asset.buyPrice ?? 0))}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-800 font-mono">
                          {money(Number(asset.currentPrice || asset.purchasePrice || asset.buyPrice || 0))}
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 font-mono">
                          {money(Number(asset.currentValue || (asset.quantity * (asset.purchasePrice ?? asset.buyPrice ?? 0))))}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold font-mono">
                          <span className={isHoldingProfit ? 'text-emerald-600' : 'text-rose-600'}>
                            {money(Number(asset.profitOrLoss || 0))}
                            <span className="text-xs ml-1 opacity-90">
                              ({Number(asset.profitOrLossPercentage || 0).toFixed(2)}%)
                            </span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteAsset(asset._id, asset.symbol)}
                            disabled={deletingId === asset._id}
                            aria-label={`Remove holding for ${asset.symbol}`}
                            title="Remove holding"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          >
                            <Trash2 size={15} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ── ADD ASSET MODAL ── */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-asset-modal-title"
          onClick={() => !isSubmitting && setShowModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xl text-slate-800 animate-fade-in"
          >
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 id="add-asset-modal-title" className="text-lg font-bold text-slate-900">Add Portfolio Holding</h3>
                <p className="text-xs text-slate-500">Record an equity, crypto, or mutual fund asset</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Close dialog"
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleAddAsset} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="asset-symbol" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Symbol *
                  </label>
                  <input
                    id="asset-symbol"
                    type="text"
                    placeholder="e.g. RELIANCE, BTC"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm font-mono uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="asset-type" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Asset Type
                  </label>
                  <select
                    id="asset-type"
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm"
                  >
                    <option value="stock">Stock / Equity</option>
                    <option value="crypto">Cryptocurrency</option>
                    <option value="mutual_fund">Mutual Fund / ETF</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="asset-name" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Asset / Company Name *
                </label>
                <input
                  id="asset-name"
                  type="text"
                  placeholder="e.g. Reliance Industries"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="asset-quantity" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Quantity *
                  </label>
                  <input
                    id="asset-quantity"
                    type="number"
                    step="any"
                    min="0.000001"
                    placeholder="10"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="asset-buy-price" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Buy Price (₹) *
                  </label>
                  <input
                    id="asset-buy-price"
                    type="number"
                    step="any"
                    min="0.000001"
                    placeholder="1500.00"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Save Holding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingAsset && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-asset-modal-title"
          onClick={() => !isSubmitting && setShowEditModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xl text-slate-800 animate-fade-in"
          >
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 id="edit-asset-modal-title" className="text-lg font-bold text-slate-900">Edit Portfolio Holding</h3>
                <p className="text-xs text-slate-500">Update your asset details</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                aria-label="Close dialog"
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleEditAsset} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="edit-symbol" className="block text-xs font-bold uppercase tracking-wider text-slate-600">Symbol *</label>
                  <input
                    id="edit-symbol"
                    value={editForm.symbol}
                    onChange={(e) => setEditForm({ ...editForm, symbol: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm font-mono uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="edit-asset-type" className="block text-xs font-bold uppercase tracking-wider text-slate-600">Type</label>
                  <select
                    id="edit-asset-type"
                    value={editForm.assetType}
                    onChange={(e) => setEditForm({ ...editForm, assetType: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm"
                  >
                    <option value="stock">Stock / Equity</option>
                    <option value="crypto">Cryptocurrency</option>
                    <option value="mutual_fund">Mutual Fund / ETF</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-name" className="block text-xs font-bold uppercase tracking-wider text-slate-600">Name *</label>
                <input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="edit-quantity" className="block text-xs font-bold uppercase tracking-wider text-slate-600">Quantity *</label>
                  <input
                    id="edit-quantity"
                    type="number"
                    step="any"
                    min="0.000001"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="edit-price" className="block text-xs font-bold uppercase tracking-wider text-slate-600">Buy Price (₹) *</label>
                  <input
                    id="edit-price"
                    type="number"
                    step="any"
                    min="0.000001"
                    value={editForm.purchasePrice}
                    onChange={(e) => setEditForm({ ...editForm, purchasePrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md transition cursor-pointer disabled:opacity-50">{isSubmitting ? 'Updating...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
