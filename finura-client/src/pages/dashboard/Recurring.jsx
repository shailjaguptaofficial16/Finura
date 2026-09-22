import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

const today = () => new Date().toISOString().split('T')[0];
const toInputDate = (value) => (value ? new Date(value).toISOString().split('T')[0] : '');

const emptyForm = () => ({
  account: '',
  title: '',
  description: '',
  amount: '',
  type: 'expense',
  category: 'Other',
  frequency: 'monthly',
  startDate: today(),
  nextRunDate: today(),
  endDate: '',
});

const getAccountId = (account) => account?._id || account || '';

export default function Recurring() {
  const [rules, setRules] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const loadData = async () => {
    setLoading(true);
    try {
      const [rulesResponse, accountsResponse] = await Promise.all([
        api.get('/recurring'),
        api.get('/accounts'),
      ]);
      const accountList = accountsResponse.data?.data || accountsResponse.data?.accounts || [];
      setRules(Array.isArray(rulesResponse.data) ? rulesResponse.data : []);
      setAccounts(accountList);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load recurring rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const openCreate = () => {
    const defaultAccount = accounts.find((account) => account.isDefault) || accounts[0];
    setEditingRule(null);
    setForm({ ...emptyForm(), account: defaultAccount?._id || '' });
    setEditorOpen(true);
  };

  const openEdit = (rule) => {
    setEditingRule(rule);
    setForm({
      account: getAccountId(rule.account),
      title: rule.title || '',
      description: rule.description || '',
      amount: rule.amount || '',
      type: rule.type || 'expense',
      category: rule.category || 'Other',
      frequency: rule.frequency || 'monthly',
      startDate: toInputDate(rule.startDate),
      nextRunDate: toInputDate(rule.nextRunDate),
      endDate: toInputDate(rule.endDate),
    });
    setEditorOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.account || !form.title.trim() || !Number(form.amount) || Number(form.amount) <= 0) {
      toast.error('Account, title, and a positive amount are required');
      return;
    }

    const payload = {
      ...form,
      amount: Number(form.amount),
      startDate: new Date(form.startDate).toISOString(),
      nextRunDate: new Date(form.nextRunDate).toISOString(),
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
    };

    setSaving(true);
    try {
      if (editingRule) {
        await api.put(`/recurring/${editingRule._id}`, payload);
        toast.success('Recurring rule updated');
      } else {
        await api.post('/recurring', payload);
        toast.success('Recurring rule created');
      }
      setEditorOpen(false);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to save recurring rule');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (rule) => {
    const action = rule.status === 'paused' ? 'resume' : 'pause';
    try {
      await api.post(`/recurring/${rule._id}/${action}`);
      toast.success(action === 'pause' ? 'Recurring rule paused' : 'Recurring rule resumed');
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || `Unable to ${action} recurring rule`);
    }
  };

  const deleteRule = async (rule) => {
    if (!window.confirm(`Delete recurring rule "${rule.title}"? Existing transactions will remain.`)) return;
    try {
      await api.delete(`/recurring/${rule._id}`);
      toast.success('Recurring rule deleted; historical transactions were kept');
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to delete recurring rule');
    }
  };

  const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', color: '#0f172a' };
  const labelStyle = { display: 'block', marginBottom: '6px', color: '#475569', fontSize: '0.82rem', fontWeight: 700 };
  const buttonStyle = { border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 11px', background: '#ffffff', color: '#475569', cursor: 'pointer', fontWeight: 700 };

  return (
    <div style={{ minHeight: '100%', padding: '28px 32px 48px', background: '#f8fafc' }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
          <div>
            <p style={{ margin: 0, color: '#0f766e', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Automation</p>
            <h1 style={{ margin: '6px 0', color: '#0f172a', fontSize: '1.8rem' }}>Recurring transactions</h1>
            <p style={{ margin: 0, color: '#64748b' }}>Manage rules that create future transactions automatically.</p>
          </div>
          <button type="button" onClick={openCreate} style={{ border: 0, borderRadius: '8px', padding: '11px 16px', background: '#2dd4bf', color: '#0f172a', cursor: 'pointer', fontWeight: 800 }}>+ New rule</button>
        </div>

        <div style={{ overflowX: 'auto', background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '12px', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)' }}>
          <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '14px 18px' }}>Rule</th><th style={{ padding: '14px 18px' }}>Account</th><th style={{ padding: '14px 18px' }}>Schedule</th><th style={{ padding: '14px 18px' }}>Next run</th><th style={{ padding: '14px 18px' }}>Status</th><th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading recurring rules...</td></tr> : rules.length === 0 ? <tr><td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>No recurring rules yet.</td></tr> : rules.map((rule) => (
                <tr key={rule._id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 18px' }}><strong style={{ color: '#0f172a' }}>{rule.title}</strong><div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '3px' }}>{rule.type} · ₹{Number(rule.amount).toLocaleString('en-IN')}</div></td>
                  <td style={{ padding: '16px 18px', color: '#475569' }}>{rule.account?.name || 'Account'}</td>
                  <td style={{ padding: '16px 18px', color: '#475569', textTransform: 'capitalize' }}>{rule.frequency}</td>
                  <td style={{ padding: '16px 18px', color: '#475569' }}>{toInputDate(rule.nextRunDate) || '—'}</td>
                  <td style={{ padding: '16px 18px' }}><span style={{ padding: '4px 9px', borderRadius: '999px', background: rule.status === 'active' ? '#ccfbf1' : '#f1f5f9', color: rule.status === 'active' ? '#0f766e' : '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'capitalize' }}>{rule.status}</span></td>
                  <td style={{ padding: '16px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}><button type="button" onClick={() => openEdit(rule)} style={buttonStyle}>Edit</button>{['active', 'paused'].includes(rule.status) && <button type="button" onClick={() => changeStatus(rule)} style={{ ...buttonStyle, marginLeft: '6px' }}>{rule.status === 'paused' ? 'Resume' : 'Pause'}</button>}<button type="button" onClick={() => deleteRule(rule)} style={{ ...buttonStyle, marginLeft: '6px', color: '#b91c1c' }}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editorOpen && <div onClick={() => setEditorOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: '16px', background: 'rgba(15, 23, 42, 0.35)' }}><div onClick={(event) => event.stopPropagation()} style={{ width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '12px', boxShadow: '0 24px 60px rgba(15, 23, 42, 0.16)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}><h2 style={{ margin: 0, color: '#0f172a' }}>{editingRule ? 'Edit recurring rule' : 'New recurring rule'}</h2><button type="button" onClick={() => setEditorOpen(false)} style={{ border: 0, background: 'transparent', color: '#64748b', fontSize: '1.3rem', cursor: 'pointer' }}>×</button></div>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
          <div><label style={labelStyle}>Account</label><select value={form.account} onChange={updateField('account')} required style={inputStyle}><option value="">Select account</option>{accounts.map((account) => <option key={account._id} value={account._id}>{account.name}</option>)}</select></div>
          <div><label style={labelStyle}>Title</label><input value={form.title} onChange={updateField('title')} required style={inputStyle} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}><div><label style={labelStyle}>Amount</label><input type="number" min="0.01" step="0.01" value={form.amount} onChange={updateField('amount')} required style={inputStyle} /></div><div><label style={labelStyle}>Type</label><select value={form.type} onChange={updateField('type')} style={inputStyle}><option value="income">Income</option><option value="expense">Expense</option><option value="investment">Investment</option></select></div></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}><div><label style={labelStyle}>Category</label><input value={form.category} onChange={updateField('category')} required style={inputStyle} /></div><div><label style={labelStyle}>Frequency</label><select value={form.frequency} onChange={updateField('frequency')} style={inputStyle}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></div></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}><div><label style={labelStyle}>Start date</label><input type="date" value={form.startDate} onChange={updateField('startDate')} required style={inputStyle} /></div><div><label style={labelStyle}>Next run date</label><input type="date" value={form.nextRunDate} onChange={updateField('nextRunDate')} required style={inputStyle} /></div></div>
          <div><label style={labelStyle}>End date (optional)</label><input type="date" value={form.endDate} onChange={updateField('endDate')} style={inputStyle} /></div>
          <div><label style={labelStyle}>Description</label><textarea value={form.description} onChange={updateField('description')} rows="3" style={{ ...inputStyle, resize: 'vertical' }} /></div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}><button type="button" onClick={() => setEditorOpen(false)} style={buttonStyle}>Cancel</button><button type="submit" disabled={saving} style={{ border: 0, borderRadius: '8px', padding: '10px 16px', background: saving ? '#99f6e4' : '#2dd4bf', color: '#0f172a', fontWeight: 800, cursor: 'pointer' }}>{saving ? 'Saving...' : editingRule ? 'Save changes' : 'Create rule'}</button></div>
        </form>
      </div></div>}
    </div>
  );
}
