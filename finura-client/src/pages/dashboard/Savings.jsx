import React, { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, CalendarDays, Landmark, LoaderCircle, Pencil, PiggyBank, Plus, RefreshCw, Trash2, Wallet, X } from 'lucide-react';
import { toast } from 'react-toastify';
import savingService from '../../services/savingService';
import './Savings.css';

const EMPTY_FORM = { name: '', amount: '', type: 'manual', date: new Date().toISOString().slice(0, 10), description: '', accountId: '' };
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const dateLabel = (value) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

function Metric({ label, value, detail, icon: Icon, tone = 'teal' }) {
  return <article className={`savings-metric savings-metric-${tone}`}><div className="savings-metric-icon"><Icon size={18} /></div><div><p>{label}</p><strong>{value}</strong>{detail && <span>{detail}</span>}</div></article>;
}

function SavingModal({ form, setForm, accounts, editing, submitting, onClose, onSubmit }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, submitting]);

  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  return (
    <div className="savings-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="savings-modal" role="dialog" aria-modal="true" aria-labelledby="saving-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="savings-modal-header">
          <div>
            <span className="savings-eyebrow">Planning</span>
            <h2 id="saving-modal-title">{editing ? 'Edit saving' : 'Add saving'}</h2>
          </div>
          <button type="button" className="savings-icon-button" onClick={onClose} aria-label="Close dialog">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <form className="savings-form" onSubmit={onSubmit}>
          <div>
            <label htmlFor="saving-name" className="block mb-1">Name</label>
            <input id="saving-name" value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="Monthly Saving" required />
          </div>
          <div className="savings-form-grid">
            <div>
              <label htmlFor="saving-amount" className="block mb-1">Amount</label>
              <input id="saving-amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => set('amount', event.target.value)} placeholder="5000" required />
            </div>
            <div>
              <label htmlFor="saving-type" className="block mb-1">Type</label>
              <select id="saving-type" value={form.type} onChange={(event) => set('type', event.target.value)}>
                <option value="manual">Manual</option>
                <option value="automatic">Automatic</option>
                <option value="goal">Goal</option>
              </select>
            </div>
          </div>
          <div className="savings-form-grid">
            <div>
              <label htmlFor="saving-date" className="block mb-1">Date</label>
              <input id="saving-date" type="date" value={form.date} onChange={(event) => set('date', event.target.value)} required />
            </div>
            <div>
              <label htmlFor="saving-account" className="block mb-1">Account <span className="savings-optional">optional contribution</span></label>
              <select id="saving-account" value={form.accountId} onChange={(event) => set('accountId', event.target.value)} disabled={editing}>
                <option value="">No account debit</option>
                {accounts.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.name} · {money(account.balance)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="saving-desc" className="block mb-1">Description</label>
            <textarea id="saving-desc" value={form.description} onChange={(event) => set('description', event.target.value)} rows="3" placeholder="September saving" />
          </div>
          {form.accountId && !editing && (
            <p className="savings-form-note"><Wallet size={15} aria-hidden="true" /> This will debit the selected account and create the saving together.</p>
          )}
          <div className="savings-modal-actions">
            <button type="button" className="savings-button savings-button-muted" onClick={onClose}>Cancel</button>
            <button type="submit" className="savings-button savings-button-primary" disabled={submitting}>
              {submitting ? <><LoaderCircle className="savings-spin" size={16} aria-hidden="true" /> Saving...</> : editing ? 'Save changes' : form.accountId ? 'Contribute' : 'Add saving'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function Savings() {
  const [savings, setSavings] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState({ totalSavings: 0, savingsRate: 0, monthlySavings: 0, previousMonthSavings: 0, changePercentage: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [savingResponse, summaryResponse, accountResponse] = await Promise.all([savingService.list(), savingService.summary(), savingService.accounts()]);
      setSavings(Array.isArray(savingResponse.data) ? savingResponse.data : []);
      setSummary(summaryResponse.data || {});
      setAccounts(accountResponse.data?.data || accountResponse.data?.accounts || []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load your savings right now.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const refresh = () => load(); window.addEventListener('finura:accounts-updated', refresh); return () => window.removeEventListener('finura:accounts-updated', refresh); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (saving) => { setEditing(saving); setForm({ name: saving.name || '', amount: saving.amount || '', type: saving.type || 'manual', date: new Date(saving.date || Date.now()).toISOString().slice(0, 10), description: saving.description || '', accountId: '' }); setModalOpen(true); };
  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || Number(form.amount) <= 0) return toast.error('Name and a positive amount are required');
    setSubmitting(true);
    try {
      const payload = { name: form.name.trim(), amount: Number(form.amount), type: form.type, date: form.date, description: form.description.trim() };
      if (editing) await savingService.update(editing._id, payload);
      else if (form.accountId) await savingService.contribute({ ...payload, accountId: form.accountId });
      else await savingService.create(payload);
      toast.success(editing ? 'Saving updated' : form.accountId ? 'Contribution recorded and account updated' : 'Saving added');
      setModalOpen(false); setEditing(null); await load(); window.dispatchEvent(new CustomEvent('finura:accounts-updated'));
    } catch (requestError) { toast.error(requestError.response?.data?.message || 'Unable to save this entry'); }
    finally { setSubmitting(false); }
  };
  const remove = async (saving) => {
    if (!window.confirm(`Delete "${saving.name}"?`)) return;
    try { await savingService.remove(saving._id); toast.success('Saving deleted'); await load(); window.dispatchEvent(new CustomEvent('finura:accounts-updated')); }
    catch (requestError) { toast.error(requestError.response?.data?.message || 'Unable to delete saving'); }
  };

  if (loading) return <div className="savings-page"><div className="savings-shell"><div className="savings-skeleton savings-skeleton-hero" /><div className="savings-skeleton-grid"><div className="savings-skeleton" /><div className="savings-skeleton" /><div className="savings-skeleton" /></div><div className="savings-skeleton savings-skeleton-list" /></div></div>;
  return <div className="savings-page"><div className="savings-shell">
    <header className="savings-hero"><div><span className="savings-eyebrow">Planning / Savings</span><h1>Savings</h1><p>Move money deliberately, keep account balances honest, and see the progress that compounds.</p></div><button type="button" className="savings-button savings-button-light" onClick={openCreate}><Plus size={17} /> Add saving</button></header>
    {error && <div className="savings-error"><span>{error}</span><button type="button" onClick={load}><RefreshCw size={15} /> Retry</button></div>}
    <section className="savings-metric-grid"><Metric label="Total savings" value={money(summary.totalSavings)} detail="Income less expenses" icon={PiggyBank} /><Metric label="Savings rate" value={`${Number(summary.savingsRate || 0).toFixed(1)}%`} detail="Across all transactions" icon={ArrowUpRight} tone="blue" /><Metric label="This month" value={money(summary.monthlySavings)} detail={`${summary.changePercentage >= 0 ? '↑' : '↓'} ${Math.abs(Number(summary.changePercentage || 0)).toFixed(1)}% vs last month`} icon={CalendarDays} tone="amber" /></section>
    <section className="savings-content-grid"><div className="savings-panel savings-list-panel"><div className="savings-panel-heading"><div><span className="savings-eyebrow">Activity</span><h2>Recent savings</h2></div><button type="button" className="savings-refresh" onClick={load} aria-label="Refresh savings"><RefreshCw size={16} /></button></div>{savings.length === 0 ? <div className="savings-empty"><div><PiggyBank size={25} /></div><h3>No savings yet</h3><p>Start with a contribution from one of your accounts or record a saving milestone.</p><button type="button" className="savings-button savings-button-primary" onClick={openCreate}><Plus size={16} /> Add your first saving</button></div> : <div className="savings-list">{savings.map((saving) => <article className="savings-row" key={saving._id}><div className="savings-row-icon"><PiggyBank size={17} /></div><div className="savings-row-main"><strong>{saving.name}</strong><span>{dateLabel(saving.date)} · {saving.type}{saving.isContribution ? ' · account contribution' : ''}</span>{saving.description && <small>{saving.description}</small>}</div><strong className="savings-row-amount">{money(saving.amount)}</strong><div className="savings-row-actions"><button type="button" onClick={() => openEdit(saving)} aria-label={`Edit ${saving.name}`}><Pencil size={15} /></button><button type="button" onClick={() => remove(saving)} aria-label={`Delete ${saving.name}`}><Trash2 size={15} /></button></div></article>)}</div>}</div>
      <aside className="savings-panel savings-side-panel"><div className="savings-panel-heading"><div><span className="savings-eyebrow">Cash movement</span><h2>Account guardrails</h2></div><Landmark size={20} className="savings-side-icon" /></div><p className="savings-side-copy">Contributions reduce an owned account balance and create the saving record together. Regular savings entries remain tracking-only.</p><div className="savings-account-list">{accounts.slice(0, 4).map((account) => <div className="savings-account-row" key={account._id}><div><strong>{account.name}</strong><span>{account.type}</span></div><b>{money(account.balance)}</b></div>)}</div>{accounts.length === 0 && <p className="savings-muted">No active accounts available.</p>}</aside></section>
    {modalOpen && <SavingModal form={form} setForm={setForm} accounts={accounts} editing={editing} submitting={submitting} onClose={() => !submitting && setModalOpen(false)} onSubmit={submit} />}
  </div></div>;
}
