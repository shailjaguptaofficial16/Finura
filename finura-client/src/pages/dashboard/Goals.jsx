import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

const categories = ['Emergency Fund', 'Retirement', 'Home Purchase', 'Education', 'Travel', 'Investment', 'Debt Payoff', 'Other'];
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const dateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');
const initialForm = { title: '', description: '', targetAmount: '', targetDate: '', category: 'Other', priority: 'medium' };

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editing, setEditing] = useState(null);
  const [details, setDetails] = useState(null);
  const [contributionGoal, setContributionGoal] = useState(null);
  const [contribution, setContribution] = useState({ amount: '', accountId: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [goalResponse, accountResponse] = await Promise.all([api.get('/goals'), api.get('/accounts')]);
      setGoals(Array.isArray(goalResponse.data) ? goalResponse.data : []);
      setAccounts(accountResponse.data?.data || accountResponse.data?.accounts || []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load goals');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const openCreate = () => { setEditing(null); setForm(initialForm); setDetails(null); setFormOpen(true); };
  const openEdit = (goal) => { setEditing(goal); setForm({ title: goal.title || '', description: goal.description || '', targetAmount: goal.targetAmount || '', targetDate: dateInput(goal.targetDate || goal.deadline), category: goal.category || 'Other', priority: goal.priority || 'medium' }); setFormOpen(true); };

  const saveGoal = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || Number(form.targetAmount) <= 0 || !form.targetDate) return toast.error('Title, amount, and target date are required');
    setSaving(true);
    try {
      const payload = { ...form, title: form.title.trim(), targetAmount: Number(form.targetAmount), targetDate: new Date(form.targetDate).toISOString() };
      if (editing) await api.put(`/goals/${editing._id}`, payload); else await api.post('/goals', payload);
      toast.success(editing ? 'Goal updated' : 'Goal created'); setEditing(null); setFormOpen(false); await load();
    } catch (requestError) { toast.error(requestError.response?.data?.message || 'Unable to save goal'); }
    finally { setSaving(false); }
  };

  const addContribution = async (event) => {
    event.preventDefault();
    if (Number(contribution.amount) <= 0 || !contribution.accountId) return toast.error('Amount and account are required');
    setSaving(true);
    try {
      await api.post(`/goals/${contributionGoal._id}/contribute`, { amount: Number(contribution.amount), accountId: contribution.accountId });
      toast.success('Contribution added and account balance updated'); setContributionGoal(null); setContribution({ amount: '', accountId: '' }); await load();
    } catch (requestError) { toast.error(requestError.response?.data?.message || 'Unable to add contribution'); }
    finally { setSaving(false); }
  };

  const removeGoal = async (goal) => {
    if (!window.confirm(`Delete ${goal.title}?`)) return;
    try { await api.delete(`/goals/${goal._id}`); toast.success('Goal deleted'); await load(); }
    catch (requestError) { toast.error(requestError.response?.data?.message || 'Unable to delete goal'); }
  };

  const active = goals.filter((goal) => goal.status === 'active').length;
  const completed = goals.filter((goal) => goal.status === 'completed' || goal.isCompleted).length;
  const overall = goals.length ? (goals.reduce((sum, goal) => sum + Number(goal.progressPercentage || 0), 0) / goals.length).toFixed(1) : 0;
  const styles = { input: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a' }, label: { display: 'block', marginBottom: '6px', color: '#475569', fontSize: '.82rem', fontWeight: 700 } };

  return <div style={{ minHeight: '100%', padding: '28px 32px 48px', background: '#f8fafc' }}><div style={{ maxWidth: '1120px', margin: '0 auto' }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}><div><p style={{ margin: 0, color: '#0f766e', fontSize: '.75rem', fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' }}>Planning</p><h1 style={{ margin: '6px 0', color: '#0f172a', fontSize: '1.8rem' }}>Goals</h1><p style={{ margin: 0, color: '#64748b' }}>Track targets and allocate money without double-counting accounts.</p></div><button type="button" onClick={openCreate} style={{ border: 0, borderRadius: '8px', padding: '11px 16px', background: '#2dd4bf', fontWeight: 800 }}>+ Create Goal</button></header>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '20px' }}>{[['Total goals', goals.length], ['Active goals', active], ['Completed', completed], ['Overall progress', `${overall}%`]].map(([label, value]) => <div key={label} style={{ padding: '16px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '10px' }}><span style={{ color: '#64748b', fontSize: '.8rem' }}>{label}</span><strong style={{ display: 'block', marginTop: '7px', fontSize: '1.35rem' }}>{value}</strong></div>)}</div>
    {error ? <div style={{ padding: '24px', background: '#fff1f2', color: '#be123c' }}>{error} <button type="button" onClick={load}>Retry</button></div> : loading ? <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>Loading goals...</div> : goals.length === 0 ? <div style={{ padding: '56px', textAlign: 'center', background: '#fff', borderRadius: '12px', color: '#64748b' }}>No goals yet. Create your first goal.</div> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>{goals.map((goal) => <GoalCard key={goal._id} goal={goal} onDetails={() => setDetails(goal)} onEdit={() => openEdit(goal)} onContribute={() => setContributionGoal(goal)} onDelete={() => removeGoal(goal)} />)}</div>}
    {formOpen ? <GoalForm form={form} setField={setField} save={saveGoal} cancel={() => { setEditing(null); setForm(initialForm); setFormOpen(false); }} saving={saving} styles={styles} editing={Boolean(editing)} /> : null}
    {details && <GoalDetails goal={details} close={() => setDetails(null)} contribute={() => { setDetails(null); setContributionGoal(details); }} />}
    {contributionGoal && <ContributionModal goal={contributionGoal} accounts={accounts} value={contribution} setValue={setContribution} submit={addContribution} close={() => setContributionGoal(null)} saving={saving} styles={styles} />}
  </div></div>;
}

function GoalCard({ goal, onDetails, onEdit, onContribute, onDelete }) {
  const status = goal.progressStatus || 'on-track';
  const percent = Number(goal.progressPercentage || 0);
  const color = status === 'completed' ? '#047857' : status === 'overdue' ? '#b91c1c' : status === 'behind' ? '#b45309' : '#0f766e';
  return <article onClick={onDetails} style={{ padding: '20px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px', cursor: 'pointer' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><div><h2 style={{ margin: 0, fontSize: '1.05rem' }}>{goal.title}</h2><span style={{ color: '#64748b', fontSize: '.8rem' }}>{goal.category} · {goal.priority} priority</span></div><strong style={{ color }}>{percent}%</strong></div><div style={{ marginTop: '18px', fontWeight: 800 }}>{money(goal.currentAmount)} <span style={{ color: '#94a3b8', fontWeight: 500 }}> / {money(goal.targetAmount)}</span></div><div style={{ height: '9px', marginTop: '9px', background: '#e2e8f0', borderRadius: '99px' }}><div style={{ width: `${Math.min(100, percent)}%`, height: '100%', background: color, borderRadius: '99px' }} /></div><div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '9px', color: '#64748b', fontSize: '.8rem' }}><span>{money(goal.remainingAmount)} remaining</span><span style={{ color, fontWeight: 800 }}>{status.replace('-', ' ')}</span></div><div style={{ display: 'flex', gap: '7px', marginTop: '16px' }}><button type="button" onClick={(event) => { event.stopPropagation(); onContribute(); }} disabled={status === 'completed'} style={{ flex: 1, border: 0, borderRadius: '8px', padding: '9px', background: '#0f766e', color: '#fff', fontWeight: 700 }}>+ Add Contribution</button><button type="button" onClick={(event) => { event.stopPropagation(); onEdit(); }} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '9px 12px', background: '#fff' }}>Edit</button><button type="button" onClick={(event) => { event.stopPropagation(); onDelete(); }} style={{ border: '1px solid #fecaca', borderRadius: '8px', padding: '9px 12px', background: '#fff', color: '#b91c1c' }}>Delete</button></div></article>;
}

function Overlay({ children, close }) { return <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: '16px', background: 'rgba(15,23,42,.35)' }}><div onClick={(event) => event.stopPropagation()} style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', background: '#fff', borderRadius: '12px' }}>{children}</div></div>; }
function GoalForm({ form, setField, save, cancel, saving, styles, editing }) { return <Overlay close={cancel}><h2>{editing ? 'Edit Goal' : 'Create Goal'}</h2><form onSubmit={save} style={{ display: 'grid', gap: '13px' }}><label style={styles.label}>Goal Name<input value={form.title} onChange={(event) => setField('title', event.target.value)} required style={styles.input} /></label><label style={styles.label}>Description<textarea value={form.description} onChange={(event) => setField('description', event.target.value)} rows="3" style={styles.input} /></label><label style={styles.label}>Target Amount<input type="number" min="0.01" value={form.targetAmount} onChange={(event) => setField('targetAmount', event.target.value)} required style={styles.input} /></label><label style={styles.label}>Target Date<input type="date" value={form.targetDate} onChange={(event) => setField('targetDate', event.target.value)} required style={styles.input} /></label><label style={styles.label}>Category<select value={form.category} onChange={(event) => setField('category', event.target.value)} style={styles.input}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label style={styles.label}>Priority<select value={form.priority} onChange={(event) => setField('priority', event.target.value)} style={styles.input}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><div><button type="button" onClick={cancel}>Cancel</button><button type="submit" disabled={saving} style={{ marginLeft: '8px', padding: '10px 15px', background: '#2dd4bf', border: 0, borderRadius: '8px', fontWeight: 800 }}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Goal'}</button></div></form></Overlay>; }
function GoalDetails({ goal, close, contribute }) { return <Overlay close={close}><h2>{goal.title}</h2><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '18px' }}>{[['Target', money(goal.targetAmount)], ['Saved', money(goal.currentAmount)], ['Remaining', money(goal.remainingAmount)], ['Progress', `${goal.progressPercentage}%`], ['Days remaining', goal.daysRemaining ?? '—'], ['Monthly saving', money(goal.requiredMonthlySaving)]].map(([label, value]) => <div key={label} style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px' }}><small>{label}</small><strong style={{ display: 'block' }}>{value}</strong></div>)}</div><button type="button" onClick={contribute} disabled={goal.progressStatus === 'completed'} style={{ width: '100%', marginTop: '18px', padding: '11px', background: '#2dd4bf', border: 0, borderRadius: '8px', fontWeight: 800 }}>+ Add Contribution</button></Overlay>; }
function ContributionModal({ goal, accounts, value, setValue, submit, close, saving, styles }) { return <Overlay close={close}><h2>Add Contribution</h2><form onSubmit={submit} style={{ display: 'grid', gap: '13px' }}><label style={styles.label}>Amount<input type="number" min="0.01" value={value.amount} onChange={(event) => setValue({ ...value, amount: event.target.value })} required style={styles.input} /></label><label style={styles.label}>From Account<select value={value.accountId} onChange={(event) => setValue({ ...value, accountId: event.target.value })} required style={styles.input}><option value="">Select account</option>{accounts.map((account) => <option key={account._id} value={account._id}>{account.name} · {money(account.balance)}</option>)}</select></label><button type="button" onClick={close}>Cancel</button><button type="submit" disabled={saving} style={{ padding: '10px', background: '#2dd4bf', border: 0, borderRadius: '8px', fontWeight: 800 }}>{saving ? 'Contributing...' : 'Contribute'}</button></form></Overlay>; }
