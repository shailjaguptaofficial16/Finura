import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { X, Plus, DollarSign, Target, Calendar } from 'lucide-react';
import api from '../services/api';

export default function SavingsGoalTracker() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Goal Modal State
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [isSubmittingGoal, setIsSubmittingGoal] = useState(false);

  // Add Funds Modal State
  const [showFundsModal, setShowFundsModal] = useState(false);
  const [activeGoal, setActiveGoal] = useState(null);
  const [fundsAmount, setFundsAmount] = useState('');
  const [isSubmittingFunds, setIsSubmittingFunds] = useState(false);

  // Fetch real goals from MongoDB backend
  const fetchGoals = useCallback(async () => {
    try {
      const response = await api.get('/goals');
      setGoals(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to fetch goals:', err);
      // Suppress 401 errors (handled by Axios interceptor) — new users have no goals yet
      const status = err?.response?.status;
      if (status && status !== 401) {
        toast.error(err.response?.data?.message || 'Failed to load savings goals');
      }
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();

    const handleGoalsUpdated = () => fetchGoals();
    window.addEventListener('finura:goals-updated', handleGoalsUpdated);

    return () => {
      window.removeEventListener('finura:goals-updated', handleGoalsUpdated);
    };
  }, [fetchGoals]);

  // Handle Escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showGoalModal) setShowGoalModal(false);
        if (showFundsModal) {
          setShowFundsModal(false);
          setActiveGoal(null);
        }
      }
    };
    if (showGoalModal || showFundsModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showGoalModal, showFundsModal]);

  // Create Goal: POST /api/goals
  const handleCreateGoal = async (e) => {
    e.preventDefault();

    if (!goalTitle.trim() || !goalTarget || !goalDeadline) {
      toast.error('Please fill in all required fields');
      return;
    }

    const numericTarget = Number(goalTarget);
    if (!Number.isFinite(numericTarget) || numericTarget <= 0) {
      toast.error('Target amount must be greater than 0');
      return;
    }

    setIsSubmittingGoal(true);
    try {
      const newGoalData = {
        title: goalTitle.trim(),
        targetAmount: numericTarget,
        deadline: goalDeadline,
      };

      const response = await api.post('/goals', newGoalData);

      // Append new goal to state immediately
      setGoals((prev) => [response.data, ...prev]);

      setShowGoalModal(false);
      setGoalTitle('');
      setGoalTarget('');
      setGoalDeadline('');

      toast.success('Goal Added! 🎯');
      window.dispatchEvent(new CustomEvent('finura:goals-updated'));
    } catch (err) {
      console.error('Failed to create goal:', err);
      toast.error(err.response?.data?.message || 'Failed to create savings goal');
    } finally {
      setIsSubmittingGoal(false);
    }
  };

  // Add Funds: PUT /api/goals/:id/add-funds
  const handleAddFunds = async (e) => {
    e.preventDefault();

    const numericAmount = Number(fundsAmount);
    if (!numericAmount || numericAmount <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    if (!activeGoal?._id) return;

    setIsSubmittingFunds(true);
    try {
      const response = await api.put(`/goals/${activeGoal._id}/add-funds`, {
        amount: numericAmount,
      });

      // Update state with updated goal data from server
      setGoals((prev) =>
        prev.map((g) => (g._id === activeGoal._id ? response.data : g))
      );

      setShowFundsModal(false);
      setFundsAmount('');
      setActiveGoal(null);

      toast.success(`Funds Added! +$${numericAmount.toLocaleString()} 💰`);
      window.dispatchEvent(new CustomEvent('finura:goals-updated'));
    } catch (err) {
      console.error('Failed to add funds:', err);
      toast.error(err.response?.data?.message || 'Failed to add funds to goal');
    } finally {
      setIsSubmittingFunds(false);
    }
  };

  if (loading) {
    return (
      <div
        className="white-card"
        style={{
          marginTop: '30px',
          padding: '40px 24px',
          color: '#64748b',
          textAlign: 'center',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            width: '28px',
            height: '28px',
            border: '3px solid #ccfbf1',
            borderTopColor: '#0f766e',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ margin: '14px 0 0 0', fontWeight: 500, color: '#475569' }}>
          Loading your savings goals...
        </p>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="savings-goal-tracker" style={{ marginTop: '30px' }}>
      {/* Header Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
            Savings & Financial Goals
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Track progress toward your target savings and milestones.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowGoalModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0F766E, #14B8A6)',
            padding: '10px 18px',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(15, 118, 110, 0.2)',
            transition: 'all 0.2s ease',
          }}
        >
          <Plus size={16} />
          <span>Add Goal</span>
        </button>
      </div>

      {/* Dynamic Auto-Responsive Grid Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px',
          width: '100%',
        }}
      >
        {goals.map((goal) => {
          // Calculate dynamic progress from database fields
          const saved = Number(goal?.savedAmount ?? goal?.currentAmount ?? 0);
          const target = Number(goal?.targetAmount ?? 1);
          const progressPercent = Math.min((saved / target) * 100, 100);
          const remaining = Math.max(target - saved, 0);

          return (
            <div
              key={goal._id}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '24px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 600 }}>
                    {goal.title}
                  </h4>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: progressPercent >= 100 ? '#10b981' : '#0f766e',
                      background: progressPercent >= 100 ? '#ecfdf5' : '#f0fdfa',
                      borderRadius: '999px',
                      padding: '4px 10px',
                    }}
                  >
                    {progressPercent.toFixed(0)}%
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginBottom: '10px', fontWeight: 500 }}>
                  <span>Saved: <strong>${saved.toLocaleString()}</strong></span>
                  <span>Target: <strong>${target.toLocaleString()}</strong></span>
                </div>

                {/* Progress Bar */}
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    background: '#f1f5f9',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    marginBottom: '14px',
                  }}
                >
                  <div
                    style={{
                      width: `${progressPercent}%`,
                      height: '100%',
                      borderRadius: '999px',
                      background: progressPercent >= 100 ? '#10b981' : 'linear-gradient(90deg, #0f766e, #14b8a6)',
                      transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                  <span>{remaining === 0 ? 'Goal Completed! 🎉' : `$${remaining.toLocaleString()} remaining`}</span>
                  {goal.deadline && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                      <Calendar size={12} />
                      {new Date(goal.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  type="button"
                  aria-label={`Add funds to ${goal.title}`}
                  onClick={() => {
                    setActiveGoal(goal);
                    setShowFundsModal(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 14px',
                    borderRadius: '10px',
                    border: '1px solid #ccfbf1',
                    background: '#f0fdfa',
                    color: '#0f766e',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <DollarSign size={15} aria-hidden="true" />
                  <span>Add Funds</span>
                </button>
              </div>
            </div>
          );
        })}

        {goals.length === 0 && (
          <div
            style={{
              gridColumn: '1 / -1',
              color: '#64748b',
              padding: '40px 20px',
              background: '#f8fafc',
              borderRadius: '16px',
              textAlign: 'center',
              border: '2px dashed #cbd5e1',
            }}
          >
            <Target size={36} color="#94a3b8" style={{ marginBottom: '8px' }} aria-hidden="true" />
            <h4 style={{ margin: '4px 0', color: '#334155' }}>No Savings Goals Yet</h4>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem' }}>
              Set up your first financial target to start tracking progress automatically.
            </p>
            <button
              type="button"
              onClick={() => setShowGoalModal(true)}
              style={{
                padding: '9px 18px',
                background: '#0F766E',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Create First Goal
            </button>
          </div>
        )}
      </div>

      {/* Add New Goal Modal */}
      {showGoalModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-goal-modal-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '28px',
              borderRadius: '20px',
              width: '400px',
              maxWidth: '90%',
              boxShadow: '0 25px 50px rgba(15, 23, 42, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 id="add-goal-modal-title" style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 700 }}>
                Add New Goal
              </h3>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setShowGoalModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
              >
                <X size={20} color="#64748b" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal}>
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="add-goal-title" style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                  Goal Title
                </label>
                <input
                  id="add-goal-title"
                  type="text"
                  required
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="e.g., Emergency Reserve"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="add-goal-target" style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                  Target Amount ($)
                </label>
                <input
                  id="add-goal-target"
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  placeholder="e.g., 10000"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label htmlFor="add-goal-deadline" style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                  Target Deadline
                </label>
                <input
                  id="add-goal-deadline"
                  type="date"
                  required
                  value={goalDeadline}
                  onChange={(e) => setGoalDeadline(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  style={{ flex: 1, padding: '11px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGoal}
                  style={{ flex: 1, padding: '11px', background: '#0F766E', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}
                >
                  {isSubmittingGoal ? 'Creating...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Funds Modal */}
      {showFundsModal && activeGoal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-funds-modal-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '28px',
              borderRadius: '20px',
              width: '380px',
              maxWidth: '90%',
              boxShadow: '0 25px 50px rgba(15, 23, 42, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 id="add-funds-modal-title" style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 700 }}>
                  Add Funds
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Towards: <strong>{activeGoal.title}</strong>
                </p>
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => {
                  setShowFundsModal(false);
                  setActiveGoal(null);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
              >
                <X size={20} color="#64748b" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleAddFunds}>
              <div style={{ marginBottom: '22px' }}>
                <label htmlFor="add-funds-amount" style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                  Deposit Amount ($)
                </label>
                <input
                  id="add-funds-amount"
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={fundsAmount}
                  onChange={(e) => setFundsAmount(e.target.value)}
                  placeholder="e.g., 500"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowFundsModal(false);
                    setActiveGoal(null);
                  }}
                  style={{ flex: 1, padding: '11px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFunds}
                  style={{ flex: 1, padding: '11px', background: '#0F766E', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}
                >
                  {isSubmittingFunds ? 'Adding...' : 'Deposit Funds'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
