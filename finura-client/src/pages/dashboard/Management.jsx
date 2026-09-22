import React from 'react';

const IconLink = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>;

export default function Management() {
  const accounts = [
    { id: 1, name: 'Chase Checking', type: 'Bank Account', balance: 14500.20, mask: '**** 4291', status: 'Synced just now', color: '#117ACA' },
    { id: 2, name: 'Amex Platinum', type: 'Credit Card', balance: -2450.00, mask: '**** 8832', status: 'Synced 2 hours ago', color: '#006FCF' },
    { id: 3, name: 'Vanguard 401k', type: 'Investment', balance: 125400.00, mask: '**** 9921', status: 'Synced 1 day ago', color: '#9B1C2E' },
    { id: 4, name: 'PayPal Balance', type: 'Digital Wallet', balance: 350.50, mask: 'user@email.com', status: 'Needs Re-auth', color: '#00457C' },
  ];

  return (
    <div className="dash-scrollable-area animate-fade-in">
      <div className="white-card animation-delay-1" style={{ marginBottom: '24px', padding: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem' }}>Connected Accounts</h2>
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>Manage your linked bank accounts, credit cards, and investments.</p>
        </div>
        <button style={{ background: 'var(--color-primary)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}>
          <IconLink /> Link New Account
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
        {accounts.map((acc, i) => (
          <div key={acc.id} className={`white-card hover-lift animation-delay-${i + 2}`} style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: acc.color, color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', fontWeight: 700 }}>
                {acc.name[0]}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{acc.name}</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{acc.type} • {acc.mask}</span>
              </div>
              <div style={{ cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
              </div>
            </div>
            <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', background: '#F8FAFC' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Current Balance</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: acc.balance < 0 ? '#EF4444' : 'var(--color-text-dark)' }}>
                  ${Math.abs(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: acc.status.includes('Needs') ? '#F59E0B' : '#10B981', fontWeight: 500 }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: acc.status.includes('Needs') ? '#F59E0B' : '#10B981' }}></div>
                {acc.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
