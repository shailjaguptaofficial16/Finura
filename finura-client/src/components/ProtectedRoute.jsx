import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FinuraLogo from './FinuraLogo';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Display a smooth loader while validating JWT session on initial app load
  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#f8fafc',
          color: '#0f766e',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div style={{ display: 'grid', justifyItems: 'center', gap: '16px' }}>
          <FinuraLogo iconOnly className="loading-logo" />
          <div
            style={{
              width: '42px',
              height: '42px',
              border: '4px solid #ccfbf1',
              borderTopColor: '#0f766e',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>
            Authenticating with Finura...
          </span>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Redirect to login if user is not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // If route requires admin role, ensure user is admin, else redirect to /dashboard
  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Render nested routes or children
  return children ? children : <Outlet />;
}
