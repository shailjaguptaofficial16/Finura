import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import {
  ShieldCheck,
  Zap,
  Building,
  Home,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  Sparkles,
  CreditCard,
  X,
  FileText,
  Percent,
  TrendingUp,
} from 'lucide-react';

const FACILITY_OPTIONS = [
  {
    type: 'Working Capital Line',
    maxLimit: 250000,
    apr: '4.25% APR',
    term: '12 - 36 Mo Revolving',
    icon: <Zap className="text-teal-400" size={22} />,
    iconBg: 'bg-teal-500/10 border border-teal-500/20',
    statusBadge: 'Pre-Approved',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    desc: 'Flexible revolving credit for operational scale, payroll smoothing, and liquidity buffers.',
  },
  {
    type: 'Home Equity Access',
    maxLimit: 180000,
    apr: '3.85% APR',
    term: 'Up to 120 Months',
    icon: <Home className="text-blue-400" size={22} />,
    iconBg: 'bg-blue-500/10 border border-blue-500/20',
    statusBadge: 'Available',
    badgeClass: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    desc: 'Low-rate credit structure backed by property equity with custom draw schedules and flexible amortization.',
  },
  {
    type: 'Business Credit Facility',
    maxLimit: 400000,
    apr: '5.10% APR',
    term: '24 - 60 Months',
    icon: <Building className="text-amber-400" size={22} />,
    iconBg: 'bg-amber-500/10 border border-amber-500/20',
    statusBadge: 'Pre-Approved',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    desc: 'Institutional borrowing capacity reserved for strategic expansion, capital equipment, and acquisitions.',
  },
];

export default function CreditSolutions() {
  const [eligibility, setEligibility] = useState({
    preApprovedLimit: 75000,
    creditRating: 'Prime (Tier 1)',
    estimatedApr: '3.85% - 5.10%',
    facilities: [],
  });
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState('Working Capital Line');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [annualIncome, setAnnualIncome] = useState('');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch eligibility & existing applications
  const fetchCreditData = useCallback(async () => {
    try {
      const [eligRes, appsRes] = await Promise.allSettled([
        api.get('/credit/eligibility'),
        api.get('/credit/my-applications'),
      ]);

      if (eligRes.status === 'fulfilled' && eligRes.value?.data) {
        setEligibility(eligRes.value.data);
      }

      if (appsRes.status === 'fulfilled' && Array.isArray(appsRes.value?.data)) {
        setApplications(appsRes.value.data);
      } else {
        setApplications([]);
      }
    } catch (err) {
      console.error('Failed to load credit data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCreditData();

    const handleUpdate = () => fetchCreditData();
    window.addEventListener('finura:credit-updated', handleUpdate);
    window.addEventListener('finura:transactions-updated', handleUpdate);

    return () => {
      window.removeEventListener('finura:credit-updated', handleUpdate);
      window.removeEventListener('finura:transactions-updated', handleUpdate);
    };
  }, [fetchCreditData]);

  // Escape key handler for modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showModal && !submitting) {
        setShowModal(false);
      }
    };
    if (showModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal, submitting]);

  // Open modal with pre-selected facility
  const handleOpenApply = (facilityName) => {
    setSelectedFacility(facilityName || 'Working Capital Line');
    setRequestedAmount('');
    setAnnualIncome('');
    setPurpose('');
    setShowModal(true);
  };

  // Submit credit application
  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    const amountNum = Number(requestedAmount);
    const incomeNum = Number(annualIncome);

    if (!amountNum || amountNum < 100) {
      toast.error('Requested amount must be at least $100');
      return;
    }

    if (incomeNum === undefined || incomeNum < 0) {
      toast.error('Please enter a valid annual income');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/credit/apply', {
        facilityType: selectedFacility,
        requestedAmount: amountNum,
        annualIncome: incomeNum,
        purpose: purpose.trim() || selectedFacility,
      });

      toast.success('Credit facility application submitted successfully! 📄');
      setShowModal(false);
      fetchCreditData();
      window.dispatchEvent(new CustomEvent('finura:credit-updated'));
    } catch (err) {
      console.error('Application submission error:', err);
      toast.error(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const formatMoney = (val) => {
    const num = Number(val || 0);
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Calculating Pre-Approved Credit Facilities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
      
      {/* ── 1. PAGE HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-slate-800/80">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase tracking-wider mb-2">
            <Sparkles size={13} />
            Institutional Liquidity
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Institutional Credit Facilities
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl leading-relaxed">
            Instant liquidity backed by cashflow health, balance sheet strength, and preferential member APRs.
          </p>
        </div>

        {/* Pre-Approved Card in Hero */}
        <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-4 sm:p-5 text-center sm:text-right min-w-[240px] w-full sm:w-auto shadow-inner">
          <div className="text-xs font-bold text-teal-200 uppercase tracking-wider">
            Total Pre-Approved Limit
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-white mt-1 tracking-tight">
            {formatMoney(eligibility.preApprovedLimit)}
          </div>
          <div className="text-[11px] text-teal-300 mt-1 flex items-center justify-center sm:justify-end gap-1.5 font-semibold">
            <CheckCircle2 size={13} className="text-emerald-400" />
            <span>{eligibility.creditRating || 'Prime Tier 1'} • Rates from 3.85%</span>
          </div>
        </div>
      </div>

      {/* ── 2. CREDIT FACILITY CARDS WITH STATUS BADGES & APPLY BUTTONS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {FACILITY_OPTIONS.map((facility) => (
          <div
            key={facility.type}
            className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                  {facility.icon}
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  {facility.statusBadge}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">{facility.type}</h3>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
                  Up to {formatMoney(facility.maxLimit)}
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{facility.desc}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-500 font-medium">
                <div className="flex justify-between">
                  <span>Interest Rate:</span>
                  <span className="font-bold text-teal-700">{facility.apr}</span>
                </div>
                <div className="flex justify-between">
                  <span>Draw Terms:</span>
                  <span className="font-bold text-slate-800">{facility.term}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenApply(facility.type)}
              aria-label={`Apply for ${facility.type}`}
              className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <span>Apply Now</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      {/* ── 3. APPLICATION HISTORY & STATUS TABLE ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Application History & Status</h3>
            <p className="text-xs text-slate-500 font-medium">Track underwriting status on submitted credit facilities</p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenApply('Working Capital Line')}
            className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span>+ New Application</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider py-3.5 px-4 text-left border-b border-slate-200/80 font-bold">
                <th className="py-3.5 px-4">Application ID</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Facility Type</th>
                <th className="py-3.5 px-4">Declared Income</th>
                <th className="py-3.5 px-4">Requested Limit</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-400 text-sm">
                    <div className="text-3xl mb-2">📑</div>
                    <p className="font-semibold text-slate-700 text-base">No Credit Applications on File</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      You haven't submitted any credit facility requests yet. Choose a facility above to apply for pre-approved funding.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenApply('Working Capital Line')}
                      className="mt-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-md transition"
                    >
                      + Request Credit Facility
                    </button>
                  </td>
                </tr>
              ) : (
                applications.map((app) => {
                  const status = app.status || 'Pending';
                  const dateStr = app.createdAt
                    ? new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—';

                  let statusBadge = (
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock size={12} /> Pending Review
                    </span>
                  );
                  if (status === 'Approved') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={12} /> Approved
                      </span>
                    );
                  } else if (status === 'Rejected') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle size={12} /> Declined
                      </span>
                    );
                  }

                  return (
                    <tr key={app._id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors text-sm text-slate-800">
                      <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">
                        #{app._id ? app._id.slice(-6).toUpperCase() : 'APP-REQ'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">{dateStr}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{app.facilityType || app.purpose}</td>
                      <td className="py-3.5 px-4 text-slate-600">{formatMoney(app.annualIncome || app.monthlyIncome * 12)} / yr</td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">{formatMoney(app.requestedAmount || app.amount)}</td>
                      <td className="py-3.5 px-4 text-center">{statusBadge}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. APPLY NOW MODAL ── */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="credit-modal-title"
          onClick={() => !submitting && setShowModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xl text-slate-800 animate-fade-in"
          >
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 id="credit-modal-title" className="text-xl font-bold text-slate-900 tracking-tight">Apply for Credit Facility</h3>
                <p className="text-xs text-slate-500">Fast underwriting with automated limit assignment</p>
              </div>
              <button
                type="button"
                onClick={() => !submitting && setShowModal(false)}
                aria-label="Close dialog"
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmitApplication} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="credit-facility-type" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Facility Type
                </label>
                <select
                  id="credit-facility-type"
                  value={selectedFacility}
                  onChange={(e) => setSelectedFacility(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm"
                >
                  <option value="Working Capital Line">Working Capital Line (Up to $250,000)</option>
                  <option value="Home Equity Access">Home Equity Access (Up to $180,000)</option>
                  <option value="Business Credit Facility">Business Credit Facility (Up to $400,000)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="credit-req-amount" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Requested Amount ($) *
                  </label>
                  <input
                    id="credit-req-amount"
                    type="number"
                    min="1000"
                    placeholder="e.g. 50000"
                    value={requestedAmount}
                    onChange={(e) => setRequestedAmount(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="credit-income" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Annual Gross Income ($) *
                  </label>
                  <input
                    id="credit-income"
                    type="number"
                    min="1000"
                    placeholder="e.g. 120000"
                    value={annualIncome}
                    onChange={(e) => setAnnualIncome(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="credit-purpose" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Intended Capital Purpose *
                </label>
                <textarea
                  id="credit-purpose"
                  rows="3"
                  placeholder="Describe your capital usage (e.g. business inventory expansion, short-term bridging, real estate deposit)"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm resize-none"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}