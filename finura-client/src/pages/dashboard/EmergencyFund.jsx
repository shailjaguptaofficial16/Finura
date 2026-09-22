import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, CalendarDays, Edit3, LoaderCircle, LockKeyhole, Plus, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { toast } from 'react-toastify';
import emergencyFundService from '../../services/emergencyFundService';
import './EmergencyFund.css';

const EMPTY_FORM = { monthlyEssentialExpenses: '', targetMonths: 6, monthlyContribution: '', targetDate: '', accountId: '', notes: '' };
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const accountList = (response) => response.data?.data || response.data?.accounts || (Array.isArray(response.data) ? response.data : []);

function Modal({ title, eyebrow, children, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="emergency-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="emergency-modal" role="dialog" aria-modal="true" aria-labelledby="emergency-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="emergency-modal-header">
          <div>
            <span className="emergency-eyebrow">{eyebrow}</span>
            <h2 id="emergency-modal-title">{title}</h2>
          </div>
          <button type="button" className="emergency-icon-button" onClick={onClose} aria-label="Close dialog">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function AccountSelect({ id = 'emergency-account-select', accounts, value, onChange, label }) {
  return (
    <div>
      <label htmlFor={id} className="block mb-1">{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} required>
        <option value="">Select account</option>
        {accounts.map((account) => (
          <option key={account._id} value={account._id}>
            {account.name} · {money(account.balance)}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function EmergencyFund() {
  const [fund, setFund] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fundResult, accountResult] = await Promise.all([
        emergencyFundService.get().catch((requestError) => requestError.response?.status === 404 ? { data: null } : Promise.reject(requestError)),
        emergencyFundService.accounts(),
      ]);
      setFund(fundResult.data || null);
      setAccounts(accountList(accountResult));
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load your Emergency Fund.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const refresh = () => load(); window.addEventListener('finura:accounts-updated', refresh); return () => window.removeEventListener('finura:accounts-updated', refresh); }, [load]);

  const setFormField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const openCreate = () => { setForm(EMPTY_FORM); setModal('form'); };
  const openEdit = () => { setForm({ monthlyEssentialExpenses: fund.monthlyEssentialExpenses, targetMonths: fund.targetMonths, monthlyContribution: fund.monthlyContribution || '', targetDate: fund.targetDate ? new Date(fund.targetDate).toISOString().slice(0, 10) : '', accountId: fund.accountId || '', notes: fund.notes || '' }); setModal('form'); };
  const submitFund = async (event) => {
    event.preventDefault();
    if (Number(form.monthlyEssentialExpenses) <= 0 || Number(form.targetMonths) <= 0) return toast.error('Expenses and target months must be greater than zero');
    setSaving(true);
    try {
      const payload = { ...form, monthlyEssentialExpenses: Number(form.monthlyEssentialExpenses), targetMonths: Number(form.targetMonths), monthlyContribution: form.monthlyContribution === '' ? 0 : Number(form.monthlyContribution), targetDate: form.targetDate || null, accountId: form.accountId || null };
      if (fund) await emergencyFundService.update(payload); else await emergencyFundService.create(payload);
      toast.success(fund ? 'Emergency Fund updated' : 'Emergency Fund created'); setModal(null); await load();
    } catch (requestError) { toast.error(requestError.response?.data?.message || 'Unable to save Emergency Fund'); }
    finally { setSaving(false); }
  };
  const submitMovement = async (event) => {
    event.preventDefault();
    if (Number(amount) <= 0 || !accountId) return toast.error('A positive amount and account are required');
    setSaving(true);
    try {
      const payload = { amount: Number(amount), accountId };
      if (modal === 'withdraw') payload.reason = reason.trim();
      if (modal === 'contribute') await emergencyFundService.contribute(payload); else await emergencyFundService.withdraw(payload);
      toast.success(modal === 'contribute' ? 'Emergency Fund topped up' : 'Emergency Fund withdrawal completed'); setModal(null); setAmount(''); setAccountId(''); setReason(''); await load(); window.dispatchEvent(new CustomEvent('finura:accounts-updated'));
    } catch (requestError) { toast.error(requestError.response?.data?.message || 'Unable to complete this movement'); }
    finally { setSaving(false); }
  };
  const deleteFund = async () => {
    if (!window.confirm('Delete this empty Emergency Fund?')) return;
    try { await emergencyFundService.remove(); toast.success('Emergency Fund deleted'); await load(); }
    catch (requestError) { toast.error(requestError.response?.data?.message || 'Withdraw the fund balance before deleting it'); }
  };

  if (loading) return <div className="emergency-page"><div className="emergency-shell"><div className="emergency-skeleton emergency-skeleton-hero" /><div className="emergency-skeleton emergency-skeleton-card" /></div></div>;
  if (error) return <div className="emergency-page"><div className="emergency-shell"><div className="emergency-error"><ShieldCheck size={22} /><div><h2>Emergency Fund unavailable</h2><p>{error}</p></div><button type="button" onClick={load}><RefreshCw size={15} /> Retry</button></div></div></div>;
  if (!fund) return <div className="emergency-page"><div className="emergency-shell emergency-empty"><div className="emergency-empty-icon"><ShieldCheck size={30} /></div><span className="emergency-eyebrow">Planning / Safety</span><h1>Build your Emergency Fund</h1><p>Set a monthly essentials baseline and a safety horizon. Finura will calculate the target and track coverage without counting the same cash twice.</p><button type="button" className="emergency-button emergency-button-primary" onClick={openCreate}><Plus size={17} /> Create Emergency Fund</button></div></div>;

  const progress = Math.min(100, Number(fund.progressPercentage || 0));
  return <div className="emergency-page"><div className="emergency-shell">
    <header className="emergency-hero"><div className="emergency-title"><div className="emergency-shield"><ShieldCheck size={24} aria-hidden="true" /></div><div><span className="emergency-eyebrow">Planning / Safety</span><h1>Emergency Fund</h1><p>One cash reserve, clearly designated. The money remains part of your account balance.</p></div></div><div className="emergency-actions"><button type="button" className="emergency-button emergency-button-soft" onClick={openEdit}><Edit3 size={15} aria-hidden="true" /> Edit</button><button type="button" className="emergency-button emergency-button-quiet" onClick={deleteFund} title="Delete empty fund" aria-label="Delete empty emergency fund"><X size={15} aria-hidden="true" /></button></div></header>
    <section className="emergency-dashboard-card"><div className="emergency-main-amount"><strong>{money(fund.currentAmount)}</strong><span>of {money(fund.targetAmount)}</span><div className="emergency-progress"><span style={{ width: `${progress}%` }} /></div><div className="emergency-progress-meta"><b>{progress.toFixed(1)}%</b><span className={`emergency-status emergency-status-${fund.status}`}>{fund.status}</span></div></div><div className="emergency-facts"><div><span>Remaining</span><strong>{money(fund.remainingAmount)}</strong></div><div><span>Coverage</span><strong>{Number(fund.coverageMonths || 0).toFixed(1)} months</strong></div><div><span>Target</span><strong>{fund.targetMonths} months</strong></div></div></section>
    <section className="emergency-detail-grid"><div className="emergency-panel"><div className="emergency-panel-heading"><div><span className="emergency-eyebrow">Your baseline</span><h2>Essential monthly expenses</h2></div><CalendarDays size={19} aria-hidden="true" /></div><strong className="emergency-expense-value">{money(fund.monthlyEssentialExpenses)}</strong><p className="emergency-muted">{money(fund.monthlyEssentialExpenses)} × {fund.targetMonths} months = {money(fund.targetAmount)}</p>{fund.notes && <p className="emergency-notes">{fund.notes}</p>}</div><div className="emergency-panel"><div className="emergency-panel-heading"><div><span className="emergency-eyebrow">Internal allocation</span><h2>Move money safely</h2></div><LockKeyhole size={19} aria-hidden="true" /></div><p className="emergency-muted">Contributions and withdrawals move money between your account and this designation. They never become income or expense transactions.</p><div className="emergency-movement-actions"><button type="button" className="emergency-button emergency-button-primary" onClick={() => { setAmount(''); setAccountId(''); setModal('contribute'); }} disabled={fund.status === 'completed'}><ArrowDownToLine size={16} aria-hidden="true" /> Add money</button><button type="button" className="emergency-button emergency-button-outline" onClick={() => { setAmount(''); setAccountId(''); setReason(''); setModal('withdraw'); }}><ArrowUpFromLine size={16} aria-hidden="true" /> Withdraw</button></div></div></section>
    {modal === 'form' && (
      <Modal title={fund ? 'Edit Emergency Fund' : 'Create Emergency Fund'} eyebrow="Safety planning" onClose={() => !saving && setModal(null)}>
        <form className="emergency-form" onSubmit={submitFund}>
          <div>
            <label htmlFor="ef-monthly-expenses" className="block mb-1">Monthly essential expenses</label>
            <input id="ef-monthly-expenses" type="number" min="0.01" step="0.01" value={form.monthlyEssentialExpenses} onChange={(event) => setFormField('monthlyEssentialExpenses', event.target.value)} required />
          </div>
          <div>
            <label htmlFor="ef-target-months" className="block mb-1">Target months</label>
            <input id="ef-target-months" type="number" min="1" step="1" value={form.targetMonths} onChange={(event) => setFormField('targetMonths', event.target.value)} required />
          </div>
          <div>
            <label htmlFor="ef-monthly-allocation" className="block mb-1">Monthly allocation <span>optional planning assumption</span></label>
            <input id="ef-monthly-allocation" type="number" min="0" step="0.01" value={form.monthlyContribution} onChange={(event) => setFormField('monthlyContribution', event.target.value)} />
          </div>
          <p className="emergency-form-calculation">Target: {money(Number(form.monthlyEssentialExpenses || 0) * Number(form.targetMonths || 0))}</p>
          <div>
            <label htmlFor="ef-target-date" className="block mb-1">Target date <span>optional</span></label>
            <input id="ef-target-date" type="date" value={form.targetDate} onChange={(event) => setFormField('targetDate', event.target.value)} />
          </div>
          <AccountSelect id="ef-reference-account" accounts={accounts} value={form.accountId} onChange={(value) => setFormField('accountId', value)} label="Reference account (optional)" />
          <div>
            <label htmlFor="ef-notes" className="block mb-1">Notes <span>optional</span></label>
            <textarea id="ef-notes" rows="3" value={form.notes} onChange={(event) => setFormField('notes', event.target.value)} />
          </div>
          <div className="emergency-modal-actions">
            <button type="button" className="emergency-button emergency-button-outline" onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" className="emergency-button emergency-button-primary" disabled={saving}>
              {saving ? <><LoaderCircle className="emergency-spin" size={16} aria-hidden="true" /> Saving</> : 'Save fund'}
            </button>
          </div>
        </form>
      </Modal>
    )}
    {(modal === 'contribute' || modal === 'withdraw') && (
      <Modal title={modal === 'contribute' ? 'Add money' : 'Withdraw money'} eyebrow="Account movement" onClose={() => !saving && setModal(null)}>
        <form className="emergency-form" onSubmit={submitMovement}>
          <div>
            <label htmlFor="ef-movement-amount" className="block mb-1">Amount</label>
            <input id="ef-movement-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} autoFocus required />
          </div>
          <AccountSelect id="ef-movement-account" accounts={accounts} value={accountId} onChange={setAccountId} label={modal === 'contribute' ? 'From account' : 'Destination account'} />
          {modal === 'withdraw' && (
            <div>
              <label htmlFor="ef-withdraw-reason" className="block mb-1">Reason <span>optional</span></label>
              <textarea id="ef-withdraw-reason" rows="3" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Medical emergency" />
            </div>
          )}
          <div className="emergency-modal-actions">
            <button type="button" className="emergency-button emergency-button-outline" onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" className="emergency-button emergency-button-primary" disabled={saving}>
              {saving ? <><LoaderCircle className="emergency-spin" size={16} aria-hidden="true" /> Processing</> : modal === 'contribute' ? 'Add money' : 'Withdraw'}
            </button>
          </div>
        </form>
      </Modal>
    )}
  </div></div>;
}
