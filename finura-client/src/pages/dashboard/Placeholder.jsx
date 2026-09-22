import React from 'react';

export default function Placeholder({ title, subtitle }) {
  return (
    <div className="dash-scrollable-area animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div className="white-card animation-delay-1" style={{ textAlign: 'center', padding: '60px', maxWidth: '500px' }}>
        <div style={{
          width: '64px', height: '64px', backgroundColor: 'var(--color-primary-light)', 
          color: 'var(--color-primary)', borderRadius: '50%', display: 'flex', 
          justifyContent: 'center', alignItems: 'center', margin: '0 auto 24px auto'
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
        </div>
        <h2 style={{ fontSize: '1.8rem', color: 'var(--color-text-dark)', marginBottom: '12px' }}>{title}</h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem', lineHeight: '1.5' }}>
          {subtitle || "This section is currently under development. Real data will be populated here soon."}
        </p>
      </div>
    </div>
  );
}
