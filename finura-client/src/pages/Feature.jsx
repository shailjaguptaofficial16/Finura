import React from 'react';
import './Pages.css'; /* Nayi CSS file link ki gayi hai */

export default function Features() {
  return (
    <div className="page-container landing-container">
      <span className="badge badge-green">Core Features</span>
      <h1 className="page-title break-words">Manage Finances Simpler than Ever</h1>
      <p className="page-subtitle">
        We combine digital asset managers, traditional savings structures, and automated routines to simplify your money growth effortlessly.
      </p>

      <div className="features-grid">
        
        {/* Feature 1 */}
        <div className="feature-card relative z-10 bg-white border border-slate-200/80 rounded-2xl p-6 transition-all duration-300 ease-in-out hover:border-emerald-500/60 hover:ring-2 hover:ring-emerald-500/20 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:-translate-y-0.5">
          <div className="icon-wrapper">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <h3 className="break-words">Private Banking</h3>
          <p>Comprehensive investment and wealth solutions built on localized, bank-grade security parameters.</p>
        </div>

        {/* Feature 2 */}
        <div className="feature-card relative z-10 bg-white border border-slate-200/80 rounded-2xl p-6 transition-all duration-300 ease-in-out hover:border-emerald-500/60 hover:ring-2 hover:ring-emerald-500/20 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:-translate-y-0.5">
          <div className="icon-wrapper">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </div>
          <h3 className="break-words">Top-up E-Wallet Easily</h3>
          <p>Add balances immediately from linked credit or bank accounts without fees or delayed verification queues.</p>
        </div>

        {/* Feature 3 */}
        <div className="feature-card relative z-10 bg-white border border-slate-200/80 rounded-2xl p-6 transition-all duration-300 ease-in-out hover:border-emerald-500/60 hover:ring-2 hover:ring-emerald-500/20 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:-translate-y-0.5">
          <div className="icon-wrapper">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
              <polyline points="16 7 22 7 22 13"></polyline>
            </svg>
          </div>
          <h3 className="break-words">High-Yield Savings</h3>
          <p>Access interest rates exceeding traditional accounts, automatically compounding interest deposits every single day.</p>
        </div>

      </div>
    </div>
  );
}