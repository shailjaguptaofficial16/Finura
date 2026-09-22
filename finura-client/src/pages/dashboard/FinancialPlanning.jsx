import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import {
  Target,
  Plus,
  Trash2,
  TrendingUp,
  DollarSign,
  Calendar,
  CheckCircle2,
  Sparkles,
  X,
  ArrowRight,
  Shield,
  Layers,
  Award,
  Clock,
} from 'lucide-react';

// ─── Category Config ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { label: 'Emergency Fund', icon: '🛡️', color: '#ef4444', badgeBg: 'bg-rose-50 text-rose-700 border-rose-200' },
  { label: 'Retirement',     icon: '🏖️', color: '#f59e0b', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200' },
  { label: 'Home Purchase',  icon: '🏠', color: '#3b82f6', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Education',      icon: '🎓', color: '#8b5cf6', badgeBg: 'bg-purple-50 text-purple-700 border-purple-200' },
  { label: 'Travel',         icon: '✈️', color: '#06b6d4', badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { label: 'Investment',     icon: '📈', color: '#10b981', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { label: 'Debt Payoff',    icon: '💳', color: '#f97316', badgeBg: 'bg-orange-50 text-orange-700 border-orange-200' },
  { label: 'Other',          icon: '🎯', color: '#64748b', badgeBg: 'bg-slate-100 text-slate-700 border-slate-200' },
];

const getCategoryConfig = (category) =>
  CATEGORIES.find((c) => c.label === category) || CATEGORIES[CATEGORIES.length - 1];

// ─── Goal Card Component ──────────────────────────────────────────────────────
function GoalCard({ goal, onAddFunds, onDelete, onEdit }) {
  const cfg = getCategoryConfig(goal.category);
  const pct = Math.min(100, Math.round(((goal.savedAmount ?? 0) / Math.max(goal.targetAmount, 1)) * 100));
  const achieved = pct >= 100;
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${goal.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    await onDelete(goal._id);
    setDeleting(false);
  };

  const deadlineStr = goal.deadline
    ? new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
   
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5 group">
      <div className="space-y-4">
        {/* Card Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
              {cfg.icon}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight group-hover:text-teal-700 transition-colors">
                {goal.title}
              </h3>
              <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border mt-1 ${cfg.badgeBg}`}>
                {goal.category}
              </span>
            </div>
          </div>

          <span
            className={`text-sm font-extrabold px-3 py-1 rounded-xl font-mono border ${
              achieved
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            {pct}%
          </span>
        </div>

        {/* Amount Metrics */}
        <div className="space-y-2 pt-1">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-slate-500 font-medium">Saved Progress</span>
            <span className="text-lg font-extrabold text-slate-900">
              ${Number(goal.savedAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              <span className="text-xs text-slate-400 font-normal ml-1">
                / ${Number(goal.targetAmount).toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </span>
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                achieved
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : 'bg-gradient-to-r from-teal-600 to-emerald-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium pt-0.5">
            <span>
              ${Math.max(0, goal.targetAmount - (goal.savedAmount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 0 })} remaining
            </span>
            {deadlineStr && (
              <span className="flex items-center gap-1 text-slate-500 font-medium">
                <Clock size={11} />
                Target: {deadlineStr}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card Action Buttons */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onAddFunds(goal)}
          aria-label={`Add funds to ${goal.title}`}
          className="flex-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus size={14} aria-hidden="true" />
          <span>Add Funds</span>
        </button>
        <button
          type="button"
          onClick={() => onEdit(goal)}
          aria-label={`Edit ${goal.title}`}
          className="p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50 text-slate-400 hover:text-teal-600 border border-slate-200 transition cursor-pointer"
          title="Edit goal"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          aria-label={`Delete ${goal.title}`}
          className="p-2.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition cursor-pointer"
          title="Delete milestone"
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Financial Planning Page ─────────────────────────────────────────────
export default function FinancialPlanning() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Goal Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    targetAmount: '',
    deadline: '',
    category: 'Other',
    priority: 'medium',
    status: 'active',
  });

  // Add Funds Modal State
  const [fundsModal, setFundsModal] = useState(null);
  const [fundsAmount, setFundsAmount] = useState('');
  const [addingFunds, setAddingFunds] = useState(false);

  // Fetch Goals
  const fetchGoals = useCallback(async () => {
    try {
      const response = await api.get('/goals');
      if (Array.isArray(response.data)) {
        setGoals(response.data);
      } else {
        setGoals([]);
      }
    } catch (err) {
      console.error('Error loading goals:', err);
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();

    const onUpdate = () => fetchGoals();
    window.addEventListener('finura:goals-updated', onUpdate);
    return () => window.removeEventListener('finura:goals-updated', onUpdate);
  }, [fetchGoals]);

  // Handle Escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showAddModal && !submitting) setShowAddModal(false);
        if (fundsModal && !addingFunds) setFundsModal(null);
      }
    };
    if (showAddModal || fundsModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddModal, fundsModal, submitting, addingFunds]);

  // Handle Add Goal
  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!newGoal.title.trim()) {
      toast.error('Please enter a goal title');
      return;
    }
    const target = Number(newGoal.targetAmount);
    if (!target || target <= 0) {
      toast.error('Target amount must be greater than $0');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: newGoal.title.trim(),
        targetAmount: target,
        deadline: newGoal.deadline || null,
        targetDate: newGoal.deadline || null,
        category: newGoal.category,
        priority: newGoal.priority,
        status: newGoal.status,
      };
      const { data: saved } = editingGoal
        ? await api.put(`/goals/${editingGoal._id}`, payload)
        : await api.post('/goals', payload);

      setGoals((prev) => [saved, ...prev]);
      setShowAddModal(false);
      setNewGoal({ title: '', targetAmount: '', deadline: '', category: 'Other' });
      setEditingGoal(null);
      toast.success(`Goal "${saved.title}" ${editingGoal ? 'updated' : 'created'}! 🎯`);
      window.dispatchEvent(new CustomEvent('finura:goals-updated'));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Add Funds
  // 💰 1. ADD FUNDS FUNCTION
  const handleAddFundsSubmit = async (e) => {
    e.preventDefault();
    if (!fundsAmount || isNaN(fundsAmount) || Number(fundsAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    setAddingFunds(true);
    try {
      const response = await api.put(`/goals/${fundsModal?._id || fundsModal?.id}/add-funds`, {
        amount: Number(fundsAmount)
      });
      const updatedGoal = response.data;
      setGoals(goals.map(g => (g._id || g.id) === (updatedGoal._id || updatedGoal.id) ? updatedGoal : g));
      setFundsModal(null);
      setFundsAmount('');
      toast.success("Funds added successfully! 🎉");
    } catch (error) {
      console.error("Error adding funds:", error);
      toast.error("Failed to add funds.");
    } finally {
      setAddingFunds(false);
    }
  };

  // 🗑️ 2. DELETE GOAL FUNCTION
  const handleDelete = async (goalId) => {
    if (!window.confirm("Are you sure you want to delete this goal?")) return;

    try {
      await api.delete(`/goals/${goalId}`);
      setGoals(goals.filter(g => (g._id || g.id) !== goalId));
      toast.success("Goal deleted successfully! 🗑️");
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast.error("Failed to delete goal.");
    }
    };
    // Summary Metrics
  const totalTarget = goals.reduce((s, g) => s + Number(g.targetAmount ?? 0), 0);
  const totalSaved = goals.reduce((s, g) => s + Number(g.savedAmount ?? 0), 0);
  const overallPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;
  const achievedGoals = goals.filter((g) => (g.savedAmount ?? 0) >= (g.targetAmount ?? 1)).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Loading Wealth Planning Milestones...</p>
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
            Wealth Planning Engine
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Financial Goals & Milestones
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl leading-relaxed">
            Define savings targets, allocate funds progressively, and track every milestone toward financial independence.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer text-sm whitespace-nowrap"
        >
          <Plus size={18} />
          <span>Add New Goal</span>
        </button>
      </div>

      {/* ── 4 SUMMARY METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Goals</span>
            <Target size={16} className="text-teal-600" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{goals.length}</div>
            <p className="text-xs text-slate-500 mt-1">Active planned milestones</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Goals Achieved</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">{achievedGoals}</div>
            <p className="text-xs text-slate-500 mt-1">100% funded milestones</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Saved</span>
            <DollarSign size={16} className="text-teal-600" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-teal-700 tracking-tight">
              ${totalSaved.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-slate-500 mt-1">Dedicated capital reserves</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Overall Progress</span>
            <TrendingUp size={16} className="text-amber-600" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 tracking-tight">{overallPct}%</div>
            <p className="text-xs text-slate-500 mt-1">Aggregate goal fulfillment</p>
          </div>
        </div>
      </div>

      {/* ── GOALS GRID / EMPTY STATE ── */}
      {goals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-teal-50 border border-teal-200 text-3xl flex items-center justify-center mx-auto text-teal-600 shadow-sm">
            🎯
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">No Financial Goals Created Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Set savings targets, track milestone progress, and allocate capital toward your core milestones.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-md transition"
          >
            + Create Your First Milestone
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => (
            <GoalCard
              key={goal._id}
              goal={goal}
              onAddFunds={(g) => { setFundsModal(g); setFundsAmount(''); }}
              onDelete={handleDelete}
              onEdit={(goal) => {
                setEditingGoal(goal);
                setNewGoal({ title: goal.title || '', targetAmount: goal.targetAmount || '', deadline: goal.targetDate ? new Date(goal.targetDate).toISOString().slice(0, 10) : goal.deadline || '', category: goal.category || 'Other', priority: goal.priority || 'medium', status: goal.status || 'active' });
                setShowAddModal(true);
              }}
            />
          ))}
        </div>
      )}

      {/* ── CREATE GOAL MODAL ── */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="financial-planning-modal-title"
          onClick={() => !submitting && setShowAddModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xl text-slate-800 animate-fade-in"
          >
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 id="financial-planning-modal-title" className="text-lg font-bold text-slate-900">{editingGoal ? 'Edit Milestone' : 'Create New Milestone'}</h3>
                <p className="text-xs text-slate-500">Define your target capital and timeline</p>
              </div>
              <button
                type="button"
                onClick={() => !submitting && setShowAddModal(false)}
                aria-label="Close dialog"
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleAddGoal} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="goal-plan-title" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Goal Title *
                </label>
                <input
                  id="goal-plan-title"
                  required
                  type="text"
                  placeholder="e.g. Emergency Fund, Dream Home"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="goal-plan-priority" className="block text-xs font-bold uppercase tracking-wider text-slate-600">Priority</label>
                  <select id="goal-plan-priority" value={newGoal.priority} onChange={(e) => setNewGoal((p) => ({ ...p, priority: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="goal-plan-status" className="block text-xs font-bold uppercase tracking-wider text-slate-600">Status</label>
                  <select id="goal-plan-status" value={newGoal.status} onChange={(e) => setNewGoal((p) => ({ ...p, status: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900">
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="goal-plan-category" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Category
                  </label>
                  <select
                    id="goal-plan-category"
                    value={newGoal.category}
                    onChange={(e) => setNewGoal((p) => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.label} value={c.label}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="goal-plan-target" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Target Amount ($) *
                  </label>
                  <input
                    id="goal-plan-target"
                    required
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="10000"
                    value={newGoal.targetAmount}
                    onChange={(e) => setNewGoal((p) => ({ ...p, targetAmount: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="goal-plan-deadline" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Target Deadline (Optional)
                </label>
                <input
                  id="goal-plan-deadline"
                  type="date"
                  value={newGoal.deadline}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setNewGoal((p) => ({ ...p, deadline: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingGoal ? 'Save Changes' : '🎯 Save Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* --- ADD FUNDS MODAL --- */}
      {fundsModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="funds-modal-title"
          onClick={() => !addingFunds && setFundsModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl text-slate-800 animate-fade-in"
          >
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 id="funds-modal-title" className="text-lg font-bold text-slate-900">Deposit Capital Funds</h3>
                <p className="text-xs text-slate-500">Contribute toward <strong className="text-teal-700">{fundsModal.title}</strong></p>
              </div>
              <button
                type="button"
                onClick={() => !addingFunds && setFundsModal(null)}
                aria-label="Close deposit dialog"
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Goal Mini Progress */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 mb-4">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-500">Current Saved: <strong className="text-teal-700">${Number(fundsModal.savedAmount ?? 0).toLocaleString()}</strong></span>
                <span className="text-slate-500">Target: <strong className="text-slate-900">${Number(fundsModal.targetAmount).toLocaleString()}</strong></span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-600 to-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.round(((fundsModal.savedAmount ?? 0) / Math.max(fundsModal.targetAmount, 1)) * 100))}%` }}
                />
              </div>
            </div>

            <form onSubmit={handleAddFundsSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="funds-deposit-amount" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Deposit Amount ($) *
                </label>
                <input
                  id="funds-deposit-amount"
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="500.00"
                  value={fundsAmount}
                  onChange={(e) => setFundsAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm font-mono"
                  autoFocus
                />
              </div>

              {/* Quick-fill Presets */}
              <div className="flex gap-2 flex-wrap">
                {[100, 250, 500, 1000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFundsAmount(String(preset))}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 border border-slate-200 transition cursor-pointer"
                  >
                    +${preset}
                  </button>
                ))}
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  disabled={addingFunds}
                  onClick={() => setFundsModal(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingFunds}
                  className="flex-1 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {addingFunds ? 'Saving...' : '💰 Confirm Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
