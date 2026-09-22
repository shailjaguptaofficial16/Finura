import React from 'react';

const IconPlus = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

export default function Subscriptions() {
  const subscriptions = [
    { id: 1, name: 'Netflix', plan: 'Premium 4K', cost: 19.99, billingDate: 'Oct 28', status: 'Active', logoBg: '#000', logoColor: '#E50914', letter: 'N' },
    { id: 2, name: 'Spotify', plan: 'Duo Premium', cost: 12.99, billingDate: 'Nov 02', status: 'Active', logoBg: '#1DB954', logoColor: '#FFF', letter: 'S' },
    { id: 3, name: 'Adobe Creative Cloud', plan: 'All Apps', cost: 54.99, billingDate: 'Nov 05', status: 'Active', logoBg: '#FF0000', logoColor: '#FFF', letter: 'A' },
    { id: 4, name: 'Gym Membership', plan: 'Gold Pass', cost: 45.00, billingDate: 'Nov 12', status: 'Active', logoBg: '#1E293B', logoColor: '#38BDF8', letter: 'G' },
    { id: 5, name: 'Amazon Prime', plan: 'Annual', cost: 139.00, billingDate: 'Dec 15', status: 'Yearly', logoBg: '#232F3E', logoColor: '#FF9900', letter: 'a' },
    { id: 6, name: 'Disney+', plan: 'Ad-Free', cost: 10.99, billingDate: 'Oct 30', status: 'Paused', logoBg: '#043673', logoColor: '#FFF', letter: 'D' },
  ];

  const activeSubscriptions = subscriptions?.filter((subscription) => subscription?.status === 'Active') || [];
  const totalMonthly = activeSubscriptions.reduce((sum, subscription) => sum + (subscription?.cost || 0), 0);

  return (
    <div className="dash-scrollable-area animate-fade-in">
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card animation-delay-1" style={{ background: 'var(--color-primary)', color: 'white' }}>
          <div className="kpi-header">
            <div className="kpi-title" style={{ color: 'rgba(255,255,255,0.8)' }}>Monthly Spend</div>
          </div>
          <div className="kpi-body">
            <div>
              <h2 style={{ color: 'white' }}>${totalMonthly.toFixed(2)}</h2>
              <span className="trend-neutral" style={{ color: 'rgba(255,255,255,0.8)' }}>Across {activeSubscriptions?.length || 0} active subs</span>
            </div>
          </div>
        </div>
        
        <div className="white-card animation-delay-2" style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px' }}>
          <div>
            <h3 style={{ margin: '0 0 8px 0' }}>Manage Subscriptions</h3>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Keep track of your recurring payments and cancel unwanted services easily.</p>
          </div>
          <button style={{ background: 'white', color: 'var(--color-text-dark)', border: '1px solid var(--color-border)', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-sm)' }}>
            <IconPlus /> Add Subscription
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {subscriptions.map((sub, i) => (
          <div key={sub.id} className={`white-card hover-lift animation-delay-${(i % 5) + 3}`} style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: sub.logoBg, color: sub.logoColor, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.5rem', fontWeight: 800, fontFamily: 'serif' }}>
                  {sub.letter}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{sub.name}</h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{sub.plan}</span>
                </div>
              </div>
              <span style={{ 
                background: sub.status === 'Active' ? '#ECFDF5' : sub.status === 'Yearly' ? '#EFF6FF' : '#F1F5F9',
                color: sub.status === 'Active' ? '#10B981' : sub.status === 'Yearly' ? '#3B82F6' : '#64748B',
                padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600
              }}>
                {sub.status}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Next Billing</div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{sub.billingDate}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text-dark)' }}>
                  ${sub.cost.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {sub.status === 'Yearly' ? '/year' : '/month'}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button style={{ flex: 1, border: '1px solid var(--color-border)', background: 'white', padding: '8px', borderRadius: '6px', fontWeight: 500, color: 'var(--color-text-dark)', cursor: 'pointer' }}>Manage</button>
              {sub.status === 'Active' && (
                <button style={{ flex: 1, border: '1px solid #FECDD3', background: '#FFF1F2', color: '#E11D48', padding: '8px', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
