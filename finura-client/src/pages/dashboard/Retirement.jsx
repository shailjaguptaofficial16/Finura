import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, Edit3, LoaderCircle, RefreshCw, ShieldCheck, Sparkles, Target, Trash2, TrendingUp, Wallet, X } from 'lucide-react';
import { toast } from 'react-toastify';
import retirementService from '../../services/retirementService';
import './Retirement.css';

const EMPTY_FORM = { currentAge: '', retirementAge: '', lifeExpectancy: '', currentMonthlyExpenses: '', currentRetirementSavings: '', monthlyContribution: '', inflationRate: 6, expectedReturn: 10, retirementLifestyle: 'moderate', otherIncome: 0, notes: '' };
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function Metric({ label, value, detail, icon: Icon, tone = 'teal' }) {
  return <article className={`retirement-metric retirement-metric-${tone}`}><div className="retirement-metric-icon"><Icon size={17} /></div><div><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div></article>;
}

function PlanModal({ form, setForm, editing, saving, onClose, onSubmit }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, saving]);

  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  return (
    <div className="retirement-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="retirement-modal" role="dialog" aria-modal="true" aria-labelledby="retirement-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="retirement-modal-header">
          <div>
            <span className="retirement-eyebrow">Long-term planning</span>
            <h2 id="retirement-modal-title">{editing ? 'Edit retirement plan' : 'Create retirement plan'}</h2>
          </div>
          <button type="button" className="retirement-icon-button" onClick={onClose} aria-label="Close dialog">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <form className="retirement-form" onSubmit={onSubmit}>
          <div className="retirement-form-grid">
            <div>
              <label htmlFor="ret-current-age" className="block mb-1">Current age</label>
              <input id="ret-current-age" type="number" min="1" max="100" value={form.currentAge} onChange={(event) => set('currentAge', event.target.value)} required />
            </div>
            <div>
              <label htmlFor="ret-retirement-age" className="block mb-1">Retirement age</label>
              <input id="ret-retirement-age" type="number" min="2" max="100" value={form.retirementAge} onChange={(event) => set('retirementAge', event.target.value)} required />
            </div>
          </div>
          <div className="retirement-form-grid">
            <div>
              <label htmlFor="ret-life-expectancy" className="block mb-1">Life expectancy</label>
              <input id="ret-life-expectancy" type="number" min="3" max="120" value={form.lifeExpectancy} onChange={(event) => set('lifeExpectancy', event.target.value)} required />
            </div>
            <div>
              <label htmlFor="ret-monthly-expenses" className="block mb-1">Monthly expenses</label>
              <input id="ret-monthly-expenses" type="number" min="0.01" step="0.01" value={form.currentMonthlyExpenses} onChange={(event) => set('currentMonthlyExpenses', event.target.value)} required />
            </div>
          </div>
          <div className="retirement-form-grid">
            <div>
              <label htmlFor="ret-savings" className="block mb-1">Current retirement savings</label>
              <input id="ret-savings" type="number" min="0" step="0.01" value={form.currentRetirementSavings} onChange={(event) => set('currentRetirementSavings', event.target.value)} />
            </div>
            <div>
              <label htmlFor="ret-monthly-contribution" className="block mb-1">Monthly contribution</label>
              <input id="ret-monthly-contribution" type="number" min="0" step="0.01" value={form.monthlyContribution} onChange={(event) => set('monthlyContribution', event.target.value)} />
            </div>
          </div>
          <div className="retirement-form-grid">
            <div>
              <label htmlFor="ret-inflation" className="block mb-1">Inflation rate (%)</label>
              <input id="ret-inflation" type="number" min="0" max="50" step="0.1" value={form.inflationRate} onChange={(event) => set('inflationRate', event.target.value)} required />
            </div>
            <div>
              <label htmlFor="ret-expected-return" className="block mb-1">Expected return (%)</label>
              <input id="ret-expected-return" type="number" min="0" max="100" step="0.1" value={form.expectedReturn} onChange={(event) => set('expectedReturn', event.target.value)} required />
            </div>
          </div>
          <div>
            <label htmlFor="ret-lifestyle" className="block mb-1">Retirement lifestyle</label>
            <input id="ret-lifestyle" value={form.retirementLifestyle} onChange={(event) => set('retirementLifestyle', event.target.value)} placeholder="moderate" />
          </div>
          <div>
            <label htmlFor="ret-other-income" className="block mb-1">Other retirement income</label>
            <input id="ret-other-income" type="number" min="0" step="0.01" value={form.otherIncome} onChange={(event) => set('otherIncome', event.target.value)} />
          </div>
          <div>
            <label htmlFor="ret-notes" className="block mb-1">Notes <span>optional</span></label>
            <textarea id="ret-notes" rows="3" value={form.notes} onChange={(event) => set('notes', event.target.value)} />
          </div>
          <div className="retirement-modal-actions">
            <button type="button" className="retirement-button retirement-button-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="retirement-button retirement-button-primary" disabled={saving}>
              {saving ? <><LoaderCircle className="retirement-spin" size={16} aria-hidden="true" /> Saving</> : 'Save plan'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function Retirement() {
  const [plan, setPlan] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await retirementService.get(); setPlan(response.data); setError(''); }
    catch (requestError) { if (requestError.response?.status === 404) { setPlan(null); setError(''); } else setError(requestError.response?.data?.message || 'Unable to load your retirement plan.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const openCreate = () => { setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = () => { setForm({ currentAge: plan.currentAge, retirementAge: plan.retirementAge, lifeExpectancy: plan.lifeExpectancy, currentMonthlyExpenses: plan.currentMonthlyExpenses, currentRetirementSavings: plan.currentRetirementSavings, monthlyContribution: plan.monthlyContribution, inflationRate: plan.inflationRate, expectedReturn: plan.expectedReturn, retirementLifestyle: plan.retirementLifestyle || 'moderate', otherIncome: plan.otherIncome || 0, notes: plan.notes || '' }); setModalOpen(true); };
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const numericFields = ['currentAge', 'retirementAge', 'lifeExpectancy', 'currentMonthlyExpenses', 'currentRetirementSavings', 'monthlyContribution', 'inflationRate', 'expectedReturn', 'otherIncome'];
      const payload = { ...form }; numericFields.forEach((field) => { payload[field] = Number(form[field] || 0); });
      if (plan) await retirementService.update(payload); else await retirementService.create(payload);
      toast.success(plan ? 'Retirement plan updated' : 'Retirement plan created'); setModalOpen(false); await load();
    } catch (requestError) { toast.error(requestError.response?.data?.message || 'Unable to save retirement plan'); }
    finally { setSaving(false); }
  };
  const remove = async () => { if (!window.confirm('Delete your retirement plan?')) return; try { await retirementService.remove(); toast.success('Retirement plan deleted'); await load(); } catch (requestError) { toast.error(requestError.response?.data?.message || 'Unable to delete retirement plan'); } };

  if (loading) return <div className="retirement-page"><div className="retirement-shell"><div className="retirement-skeleton retirement-skeleton-hero" /><div className="retirement-skeleton-grid"><div className="retirement-skeleton" /><div className="retirement-skeleton" /><div className="retirement-skeleton" /></div><div className="retirement-skeleton retirement-skeleton-body" /></div></div>;
  if (error) return <div className="retirement-page"><div className="retirement-shell"><div className="retirement-error"><AlertTriangle size={22} /><div><h2>Retirement plan unavailable</h2><p>{error}</p></div><button type="button" onClick={load}><RefreshCw size={15} /> Retry</button></div></div></div>;
  if (!plan) return <div className="retirement-page"><div className="retirement-shell retirement-empty"><div className="retirement-empty-icon"><ShieldCheck size={30} /></div><span className="retirement-eyebrow">Planning / Retirement</span><h1>Design your retirement runway</h1><p>Set your assumptions once, then explore how savings, inflation, and returns shape the long-term picture.</p><button type="button" className="retirement-button retirement-button-primary" onClick={openCreate}><Target size={16} /> Create retirement plan</button></div></div>;

  const projection = plan.projection || {}; const integration = plan.integration || {}; const gap = Number(projection.surplusOrShortfall || 0); const isSurplus = gap >= 0;
  return <div className="retirement-page"><div className="retirement-shell"><header className="retirement-hero"><div className="retirement-title"><div className="retirement-shield"><ShieldCheck size={24} /></div><div><span className="retirement-eyebrow">Planning / Retirement</span><h1>Retirement Planning</h1><p>A scenario-based view of the corpus your assumptions could build.</p></div></div><div className="retirement-actions"><button type="button" className="retirement-button retirement-button-soft" onClick={openEdit}><Edit3 size={15} /> Edit</button><button type="button" className="retirement-button retirement-button-quiet" onClick={remove} aria-label="Delete retirement plan"><Trash2 size={15} /></button></div></header><div className="retirement-assumptions"><span>Age {plan.currentAge} → {plan.retirementAge}</span><span>Life expectancy {plan.lifeExpectancy}</span><span>Inflation {plan.inflationRate}%</span><span>Expected return {plan.expectedReturn}%</span></div><section className="retirement-metric-grid"><Metric label="Required corpus" value={money(projection.requiredCorpus)} detail={`At ${plan.retirementAge}`} icon={Target} /><Metric label="Projected corpus" value={money(projection.projectedCorpus)} detail={`${projection.yearsToRetirement} years to retirement`} icon={TrendingUp} tone="blue" /><Metric label="Retirement expense" value={money(projection.retirementMonthlyExpense)} detail="Monthly, inflation-adjusted" icon={ArrowUpRight} tone="amber" /><Metric label={isSurplus ? 'Projected surplus' : 'Projected shortfall'} value={money(Math.abs(gap))} detail={projection.status} icon={isSurplus ? CheckCircle2 : ArrowDownRight} tone={isSurplus ? 'green' : 'rose'} /></section><section className="retirement-panel retirement-corpus"><div className="retirement-panel-heading"><div><span className="retirement-eyebrow">Projection breakdown</span><h2>How the corpus gets there</h2></div><Wallet size={19} /></div><div className="retirement-corpus-grid"><div><span>Current savings growth</span><strong>{money(projection.futureValueOfCurrentSavings)}</strong></div><div><span>Contribution growth</span><strong>{money(projection.futureValueOfContributions)}</strong></div><div><span>Retirement duration</span><strong>{projection.retirementYears} years</strong></div><div><span>Monthly contribution</span><strong>{money(plan.monthlyContribution)}</strong></div></div></section><section className="retirement-integration-grid"><div className="retirement-panel"><div className="retirement-panel-heading"><div><span className="retirement-eyebrow">Investment read-through</span><h2>Existing investments</h2></div><TrendingUp size={19} /></div><strong className="retirement-large-value">{money(integration.investmentValue)}</strong><p className="retirement-muted">{integration.investmentIncludedAsCurrentSavings ? 'Included as current retirement savings because no manual savings baseline was provided.' : 'Tracked separately from the manual retirement savings input to avoid double-counting.'}</p></div><div className="retirement-panel"><div className="retirement-panel-heading"><div><span className="retirement-eyebrow">Goal designation</span><h2>Retirement goal</h2></div><Target size={19} /></div>{integration.retirementGoalCount ? <><div className="retirement-goal-line"><strong>{money(integration.retirementGoalCurrentAmount)}</strong><span>of {money(integration.retirementGoalTarget)}</span></div><div className="retirement-goal-progress"><span style={{ width: `${integration.retirementGoalProgress}%` }} /></div><p className="retirement-muted">{integration.retirementGoalProgress}% complete · {money(integration.retirementGoalRemainingAmount)} remaining. Goal allocation is not added to corpus again.</p></> : <p className="retirement-muted">No retirement-specific goal found.</p>}</div></section><section className="retirement-insight"><Sparkles size={18} /><div><strong>Key insight</strong><p>{isSurplus ? `Your assumptions show a projected surplus of ${money(gap)} at retirement.` : `Your assumptions show a projected shortfall of ${money(Math.abs(gap))}. Increasing contributions or adjusting assumptions may improve the gap.`}</p></div></section><p className="retirement-disclaimer">Projection based on selected assumptions. Actual results may vary. This is not guaranteed financial advice.</p>{modalOpen && <PlanModal form={form} setForm={setForm} editing={Boolean(plan)} saving={saving} onClose={() => !saving && setModalOpen(false)} onSubmit={submit} />}</div></div>;
}
