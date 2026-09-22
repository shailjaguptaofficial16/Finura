import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';
import { useAuth } from '../context/AuthContext';
import { Menu, X } from 'lucide-react';
import FinuraLogo from './FinuraLogo';

const Navbar = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const goTo = (path) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    navigate('/', { replace: true });
  };

  React.useEffect(() => {
    if (!isMenuOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  return (
    <nav className="navbar" aria-label="Primary navigation">
      <button type="button" className="navbar-logo" onClick={() => goTo('/')} aria-label="Finura home">
        <FinuraLogo />
      </button>

      <div id="primary-navigation" className={`navbar-menu ${isMenuOpen ? 'is-open fixed inset-x-0 top-[64px] bg-white opacity-100 z-[100] shadow-2xl border-b border-slate-200 p-6 space-y-4' : ''}`}>
        <ul className="navbar-links">
          <li><button type="button" onClick={() => goTo('/')}>Home</button></li>
          <li><button type="button" onClick={() => goTo('/features')}>Features</button></li>
          <li><button type="button" onClick={() => goTo('/about')}>About</button></li>
          <li><button type="button" onClick={() => goTo('/pricing')}>Pricing</button></li>
        </ul>
        <div className="navbar-actions">
          {isAuthenticated ? (
            <>
              <button type="button" className="btn btn-primary" onClick={() => goTo('/dashboard')}>Go to Dashboard</button>
              <button type="button" className="login-btn" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="login-btn" onClick={() => setIsMenuOpen(false)}>Login</Link>
              <Link to="/signup" className="btn btn-primary" onClick={() => setIsMenuOpen(false)}>Get Started</Link>
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        className="navbar-toggle p-2 rounded-lg hover:bg-slate-100 focus:outline-none"
        onClick={() => setIsMenuOpen((open) => !open)}
        aria-expanded={isMenuOpen}
        aria-controls="primary-navigation"
        aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
      >
        {isMenuOpen ? (
          <X aria-hidden="true" className="w-6 h-6 text-slate-700 hover:text-emerald-600 transition-colors" />
        ) : (
          <Menu aria-hidden="true" className="w-6 h-6 text-slate-700 hover:text-emerald-600 transition-colors" />
        )}
      </button>
    </nav>
  );
};

export default Navbar;
