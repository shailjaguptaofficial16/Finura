import React, { useState } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';
import Overview from './dashboard/Overview';
import Portfolio from './dashboard/Portfolio';
import WealthAdvisory from './dashboard/WealthAdvisory';
import CreditSolutions from './dashboard/CreditSolutions';
import MarketInsights from './dashboard/MarketInsights';
import FinancialPlanning from './dashboard/FinancialPlanning';
import Reports from './dashboard/Reports';
import Settings from './dashboard/Settings';
import Profile from './Profile';
import Accounts from './Accounts';
import Header from '../components/Header';
import FinuraLogo from '../components/FinuraLogo';

// SVGs as small components
const IconSearch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const IconHome = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
const IconPortfolio = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>;
const IconWealth = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;
const IconCredit = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>;
const IconMarket = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>;
const IconPlanning = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>;
const IconReports = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>;
const IconSettings = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
const IconLogOut = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;
const IconHeadset = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>;
const IconShield = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>;
const IconProfile = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"></circle><path d="M20 21a8 8 0 0 0-16 0"></path></svg>;

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const [activeQuickAction, setActiveQuickAction] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const displayName = user?.name || user?.fullName || 'Finura Member';
  const avatarSrc = user?.avatarUrl || user?.avatar || user?.profilePicture;

  const getInitials = (name) => {
    if (!name) return 'FM';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    if (parts.length === 1 && parts[0].length >= 2) return parts[0].substring(0, 2).toUpperCase();
    if (parts.length === 1 && parts[0].length === 1) return parts[0].toUpperCase();
    return 'FM';
  };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const handleSupportClick = () => {
    setActiveQuickAction('advisory');
    navigate('/dashboard/wealth');
  };

  const handleSettingsClick = () => {
    setActiveQuickAction('settings');
    navigate('/dashboard/settings');
  };

  const isActive = (path) => {
    return location?.pathname?.includes(path) ? 'nav-item active' : 'nav-item';
  };

  const getPageTitle = () => {
    const path = location?.pathname || '';
    if (path.includes('portfolio')) return 'Investment Portfolio';
    if (path.includes('wealth')) return 'Wealth Advisory';
    if (path.includes('credit')) return 'Credit Solutions';
    if (path.includes('market')) return 'Market Insights';
    if (path.includes('planning')) return 'Wealth Planning';
    if (path.includes('reports')) return 'Portfolio Reports';
    if (path.includes('settings')) return 'Settings';
    if (path.includes('accounts')) return 'Accounts & Liquidity';
    if (path.includes('profile')) return 'My Profile';
    return 'Wealth Overview';
  };

  return (
    <div className="dashboard-container">
      {/* DESKTOP SIDEBAR - Hidden on mobile/tablet (< 768px) */}
      <aside className="dash-sidebar">
        <div>
          <div className="sidebar-brand">
            <FinuraLogo className="sidebar-logo" />
            <h2>Finura</h2>
          </div>
          
          <div className="search-bar-container">
            <IconSearch />
            <input type="text" placeholder="Search portfolios, credit plans..." className="search-input" />
            <span className="shortcut-key">⌘K</span>
          </div>
          
          <div className="nav-group">
            <p className="nav-group-title">Investments</p>
            <ul className="nav-list">
              <li className={isActive('overview')} onClick={() => navigate('/dashboard/overview')}>
                <IconHome />
                <span>Dashboard</span>
              </li>
              <li className={isActive('portfolio')} onClick={() => navigate('/dashboard/portfolio')}>
                <IconPortfolio />
                <span>Portfolio</span>
              </li>
              <li className={isActive('wealth')} onClick={() => navigate('/dashboard/wealth')}>
                <IconWealth />
                <span>Wealth Advisory</span>
              </li>
              <li className={isActive('credit')} onClick={() => navigate('/dashboard/credit')}>
                <IconCredit />
                <span>Credit Solutions</span>
              </li>
              <li className={isActive('accounts')} onClick={() => navigate('/dashboard/accounts')}>
                <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center', width: '18px', justifyContent: 'center' }}>💳</span>
                <span>Accounts</span>
              </li>
            </ul>
          </div>

          <div className="nav-group">
            <p className="nav-group-title">Analytics & Planning</p>
            <ul className="nav-list">
              <li className={isActive('market')} onClick={() => navigate('/dashboard/market')}>
                <IconMarket />
                <span>Market Insights</span>
              </li>
              <li className={isActive('planning')} onClick={() => navigate('/dashboard/planning')}>
                <IconPlanning />
                <span>Financial Planning <span className="badge-new">New</span></span>
              </li>
              <li className={isActive('reports')} onClick={() => navigate('/dashboard/reports')}>
                <IconReports />
                <span>Reports</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="support-box">
            <div className="support-icon"><IconHeadset /></div>
            <h4>Talk to a Wealth Advisor</h4>
            <p>Get tailored guidance across investments, wealth preservation, and credit solutions.</p>
            <button className="support-btn" onClick={handleSupportClick}>Book a Strategy Call</button>
          </div>

          
          <ul className="nav-list">
            {user?.role === 'admin' && (
              <li
                className="nav-item"
                onClick={() => navigate('/admin')}
                style={{ cursor: 'pointer', color: '#10B981', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', marginBottom: '6px' }}
              >
                <IconShield />
                <span style={{ fontWeight: 700 }}>Admin Console</span>
              </li>
            )}
            <li
              className={isActive('profile')}
              onClick={() => navigate('/dashboard/profile')}
              style={{ cursor: 'pointer' }}
            >
              <IconProfile />
              <span>My Profile</span>
            </li>
            <li className={activeQuickAction === 'settings' ? 'nav-item active' : 'nav-item'} onClick={handleSettingsClick} style={{ cursor: 'pointer' }}>
              <IconSettings />
              <span>Settings</span>
            </li>
            <li className="nav-item" onClick={handleLogout} style={{ cursor: 'pointer' }}>
              <IconLogOut />
              <span>Log Out</span>
            </li>
          </ul>
        </div>
      </aside>

      {/* MOBILE DRAWER BACKDROP - Only visible on mobile when menu is open (< 768px) */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 40,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* MOBILE DRAWER - Slide-over navigation (< 768px) */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 'min(288px, 80vw)',
          background: '#0F172A',
          zIndex: 50,
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowY: 'auto'
        }}
      >
        <div>
          <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '24px', borderBottom: '1px solid rgba(100, 116, 139, 0.2)' }}>
            <FinuraLogo className="sidebar-logo" inverse />
          </div>
          
          <div className="nav-group" style={{ marginTop: '24px' }}>
            <p className="nav-group-title" style={{ fontSize: '0.75rem', textTransform: 'capitalize', color: '#94a3b8', fontWeight: 500, paddingLeft: 0, marginBottom: '12px' }}>Investments</p>
            <ul className="nav-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li className={isActive('overview')} onClick={() => { navigate('/dashboard/overview'); setIsMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', color: '#94a3b8', fontWeight: 500, fontSize: '0.95rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: '4px' }}>
                <IconHome />
                <span>Dashboard</span>
              </li>
              <li className={isActive('portfolio')} onClick={() => { navigate('/dashboard/portfolio'); setIsMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', color: '#94a3b8', fontWeight: 500, fontSize: '0.95rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: '4px' }}>
                <IconPortfolio />
                <span>Portfolio</span>
              </li>
              <li className={isActive('wealth')} onClick={() => { navigate('/dashboard/wealth'); setIsMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', color: '#94a3b8', fontWeight: 500, fontSize: '0.95rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: '4px' }}>
                <IconWealth />
                <span>Wealth Advisory</span>
              </li>
              <li className={isActive('credit')} onClick={() => { navigate('/dashboard/credit'); setIsMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', color: '#94a3b8', fontWeight: 500, fontSize: '0.95rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: '4px' }}>
                <IconCredit />
                <span>Credit Solutions</span>
              </li>
              <li className={isActive('accounts')} onClick={() => { navigate('/dashboard/accounts'); setIsMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', color: '#94a3b8', fontWeight: 500, fontSize: '0.95rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: '4px' }}>
                <span style={{ fontSize: '18px', width: '18px', display: 'flex', justifyContent: 'center' }}>💳</span>
                <span>Accounts</span>
              </li>
            </ul>
          </div>

          <div className="nav-group" style={{ marginTop: '24px' }}>
            <p className="nav-group-title" style={{ fontSize: '0.75rem', textTransform: 'capitalize', color: '#94a3b8', fontWeight: 500, paddingLeft: 0, marginBottom: '12px' }}>Analytics & Planning</p>
            <ul className="nav-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li className={isActive('market')} onClick={() => { navigate('/dashboard/market'); setIsMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', color: '#94a3b8', fontWeight: 500, fontSize: '0.95rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: '4px' }}>
                <IconMarket />
                <span>Market Insights</span>
              </li>
              <li className={isActive('planning')} onClick={() => { navigate('/dashboard/planning'); setIsMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', color: '#94a3b8', fontWeight: 500, fontSize: '0.95rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: '4px' }}>
                <IconPlanning />
                <span>Financial Planning <span className="badge-new">New</span></span>
              </li>
              <li className={isActive('reports')} onClick={() => { navigate('/dashboard/reports'); setIsMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', color: '#94a3b8', fontWeight: 500, fontSize: '0.95rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: '4px' }}>
                <IconReports />
                <span>Reports</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="sidebar-bottom" style={{ marginTop: 'auto', borderTop: '1px solid rgba(100, 116, 139, 0.2)', paddingTop: '24px' }}>
          <div
            className="mobile-user-card"
            onClick={() => { navigate('/dashboard/profile'); setIsMobileMenuOpen(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              marginBottom: '16px',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                overflow: 'hidden',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(20, 184, 166, 0.2)',
                color: '#2dd4bf',
                border: '1px solid rgba(20, 184, 166, 0.4)',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                getInitials(displayName)
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.profession || user?.role || 'Private Member'}
              </div>
            </div>
          </div>

          <ul className="nav-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {user?.role === 'admin' && (
              <li
                className="nav-item"
                onClick={() => { navigate('/admin'); setIsMobileMenuOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', color: '#10B981', fontWeight: 700, fontSize: '0.95rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: '4px', background: 'rgba(16, 185, 129, 0.1)' }}
              >
                <IconShield />
                <span>Admin Console</span>
              </li>
            )}
            <li
              onClick={() => { navigate('/dashboard/profile'); setIsMobileMenuOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', color: '#94a3b8', fontWeight: 500, fontSize: '0.95rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: '4px' }}
            >
              <IconProfile />
              <span>My Profile</span>
            </li>
            <li className={activeQuickAction === 'settings' ? 'nav-item active' : 'nav-item'} onClick={() => { handleSettingsClick(); setIsMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', color: '#94a3b8', fontWeight: 500, fontSize: '0.95rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: '4px' }}>
              <IconSettings />
              <span>Settings</span>
            </li>
            <li className="nav-item" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', color: '#94a3b8', fontWeight: 500, fontSize: '0.95rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
              <IconLogOut />
              <span>Log Out</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 2. MAIN CONTENT */}
      <main className="dash-main-content">
          <header className="dash-top-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="mobile-menu-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#334155',
                  transition: 'all 0.2s ease',
                }}
                aria-label="Toggle menu"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>
              <div className="breadcrumbs flex items-center gap-1.5 text-sm font-medium">
                <span className="bc-inactive">Dashboard</span>
                <span className="bc-separator">/</span>
                <span className="bc-active font-bold text-slate-800 truncate max-w-[180px] sm:max-w-none">{getPageTitle()}</span>
              </div>
            </div>
            <Header />
          </header>

        <Routes>
          <Route path="/" element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="wealth" element={<WealthAdvisory />} />
          <Route path="credit" element={<CreditSolutions />} />
          <Route path="market" element={<MarketInsights />} />
          <Route path="planning" element={<FinancialPlanning />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
          <Route path="accounts" element={<Accounts />} />
        </Routes>
      </main>
    </div>
  );
}
