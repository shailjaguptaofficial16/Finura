import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Settings2, Shield, Bell, Save, Laptop, Smartphone, Monitor, Sparkles, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const tabs = ['preferences', 'security', 'notifications'];

const initialPreferences = {
  currency: typeof window !== 'undefined' ? window.localStorage.getItem('finura-currency') || 'INR' : 'INR',
  riskTolerance: 'Moderate',
};

const initialSecurity = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  twoFactorEnabled: true,
};

const initialNotifications = {
  weeklyDigest: true,
  volatilityAlerts: true,
};

const devices = [
  { device: 'MacBook Pro • Safari', location: 'San Francisco, US', lastSeen: '2 minutes ago', status: 'Active', icon: Laptop },
  { device: 'iPhone 15 • iOS', location: 'Singapore', lastSeen: '1 day ago', status: 'Active', icon: Smartphone },
  { device: 'Windows 11 • Chrome', location: 'London, UK', lastSeen: '4 days ago', status: 'Inactive', icon: Monitor },
];

const tabMeta = {
  preferences: { label: 'Preferences', icon: Settings2 },
  security: { label: 'Security', icon: Shield },
  notifications: { label: 'Notifications', icon: Bell },
};

// Reusable toggle switch
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
        checked ? 'bg-teal-600' : 'bg-slate-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('preferences');
  const [preferences, setPreferences] = useState(initialPreferences);
  const [security, setSecurity] = useState(initialSecurity);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [saving, setSaving] = useState(false);

  const handleRestartOnboarding = () => {
    try {
      const userKey = user?._id || user?.id || user?.email || 'default_user';
      localStorage.removeItem(`finura_onboarding_${userKey}`);
      localStorage.setItem('finura_is_new_user', 'true');
      window.dispatchEvent(new CustomEvent('finura:restart-onboarding'));
      toast.info('Restarting onboarding tour...');
    } catch (e) {
      console.warn('Error restarting onboarding:', e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      window.localStorage.setItem('finura-currency', preferences.currency);
      window.dispatchEvent(new CustomEvent('finura:preferences-updated'));
      await new Promise((resolve) => setTimeout(resolve, 700));
      toast.success('Settings saved successfully.');
    } catch (error) {
      toast.error('Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:bg-white transition text-sm";
  const labelCls = "block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5";

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">

      {/* ── PAGE HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800/80">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase tracking-wider mb-2">
          <Settings2 size={13} />
          Account Configuration
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Settings & Preferences</h1>
        <p className="text-slate-300 text-sm mt-1 max-w-xl leading-relaxed">
          Manage your portfolio preferences, security credentials, and notification alerts.
        </p>
      </div>

      {/* ── MAIN SETTINGS CARD ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 flex gap-1 px-4 pt-3 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tabMeta[tab].icon;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-t-xl border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'border-teal-600 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon size={16} />
                {tabMeta[tab].label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6 sm:p-8">

          {/* ── PREFERENCES TAB ── */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="space-y-5">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-4">Portfolio Preferences</h3>
                    <div className="space-y-4">
                      <div>
                        <label className={labelCls}>Preferred Base Currency</label>
                        <select
                          value={preferences.currency}
                          onChange={(e) => setPreferences((prev) => ({ ...prev, currency: e.target.value }))}
                          className={inputCls}
                        >
                          <option>USD</option>
                          <option>INR</option>
                          <option>EUR</option>
                          <option>GBP</option>
                        </select>
                      </div>

                      <div>
                        <label className={labelCls}>Risk Tolerance Profile</label>
                        <select
                          value={preferences.riskTolerance}
                          onChange={(e) => setPreferences((prev) => ({ ...prev, riskTolerance: e.target.value }))}
                          className={inputCls}
                        >
                          <option>Conservative</option>
                          <option>Moderate</option>
                          <option>Aggressive</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 mb-4">Guidance Summary</h3>
                  {[
                    { title: 'Base Currency', value: preferences.currency },
                    { title: 'Risk Profile', value: preferences.riskTolerance },
                    { title: 'Portfolio Bias', value: 'Balanced growth with downside protection' },
                  ].map((item) => (
                    <div key={item.title} className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                      <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">{item.title}</div>
                      <div className="mt-1.5 text-slate-900 font-bold text-sm">{item.value}</div>
                    </div>
                  ))}
                </section>
              </div>

              {/* ── GETTING STARTED ONBOARDING CARD ── */}
              <div className="pt-6 border-t border-slate-200">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                        <Sparkles size={12} />
                        Product Walkthrough
                      </span>
                      <span className="text-xs font-semibold text-slate-500">Getting Started</span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900">Restart Onboarding Experience</h4>
                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                      Need a guided tour of Finura's core workspace? Revisit the 7-step onboarding flow anytime to review accounts, transactions, budgets, and AI features.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRestartOnboarding}
                    className="px-4 py-2.5 bg-white hover:bg-teal-50 text-teal-700 border border-slate-200 hover:border-teal-300 font-bold rounded-xl transition shadow-sm text-xs sm:text-sm flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    <RotateCcw size={15} />
                    Restart Onboarding Tour
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── SECURITY TAB ── */}
          {activeTab === 'security' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 mb-4">Change Password</h3>
                <div>
                  <label className={labelCls}>Current Password</label>
                  <input
                    type="password"
                    value={security.currentPassword}
                    onChange={(e) => setSecurity((prev) => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Enter current password"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>New Password</label>
                  <input
                    type="password"
                    value={security.newPassword}
                    onChange={(e) => setSecurity((prev) => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter new password"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Confirm New Password</label>
                  <input
                    type="password"
                    value={security.confirmPassword}
                    onChange={(e) => setSecurity((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Re-enter new password"
                    className={inputCls}
                  />
                </div>
              </section>

              <section className="space-y-5">
                <h3 className="text-base font-bold text-slate-900 mb-4">Security Controls</h3>

                {/* 2FA Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">Two-Factor Authentication</div>
                    <div className="text-xs text-slate-500 mt-0.5">Require app-based verification on login</div>
                  </div>
                  <Toggle
                    checked={security.twoFactorEnabled}
                    onChange={() => setSecurity((prev) => ({ ...prev, twoFactorEnabled: !prev.twoFactorEnabled }))}
                  />
                </div>

                {/* Active Devices */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Active Login Devices</div>
                  <div className="space-y-2.5">
                    {devices.map((d) => {
                      const DeviceIcon = d.icon;
                      return (
                        <div key={`${d.device}-${d.location}`} className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm">
                              <DeviceIcon size={15} />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{d.device}</div>
                              <div className="text-xs text-slate-500">{d.location} • {d.lastSeen}</div>
                            </div>
                          </div>
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                            d.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {d.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ── NOTIFICATIONS TAB ── */}
          {activeTab === 'notifications' && (
            <section className="max-w-2xl space-y-4">
              <h3 className="text-base font-bold text-slate-900 mb-4">Alert Preferences</h3>
              {[
                {
                  key: 'weeklyDigest',
                  label: 'Portfolio Weekly Digest',
                  description: 'Receive a summary of gains, losses, and net cash flow every Sunday.',
                },
                {
                  key: 'volatilityAlerts',
                  label: 'Volatility Alerts',
                  description: 'Instant warning when high-risk assets move beyond your configured range.',
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-4 p-4 sm:p-5 border border-slate-200 rounded-xl bg-slate-50"
                >
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{item.label}</div>
                    <div className="text-xs text-slate-500 mt-1 leading-relaxed">{item.description}</div>
                  </div>
                  <Toggle
                    checked={notifications[item.key]}
                    onChange={() => setNotifications((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                  />
                </div>
              ))}
            </section>
          )}
        </div>

        {/* Save Footer */}
        <div className="border-t border-slate-200 px-6 py-4 sm:px-8 flex justify-end bg-slate-50/60">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60 text-sm"
          >
            <Save size={15} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

    </div>
  );
}
