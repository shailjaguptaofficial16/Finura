import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  DollarSign,
  Target,
  FileCheck2,
  Shield,
  ShieldCheck,
  UserCheck,
  UserX,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  RefreshCw,
  Activity,
  Layers,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'applications'
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTransactionVolume: 0,
    totalTransactionsCount: 0,
    totalGoals: 0,
    totalPortfolioValue: 0,
    totalHoldingsCount: 0,
    totalApplications: 0,
    pendingApplications: 0,
    systemHealth: '100% Operational',
  });
  const [usersList, setUsersList] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Fetch all admin data
  const fetchAdminData = useCallback(async () => {
    try {
      const [statsRes, usersRes, appsRes] = await Promise.allSettled([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/credit-applications'),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
        setStats(statsRes.value.data);
      }
      if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value?.data)) {
        setUsersList(usersRes.value.data);
      }
      if (appsRes.status === 'fulfilled' && Array.isArray(appsRes.value?.data)) {
        setApplications(appsRes.value.data);
      }
    } catch (err) {
      // Promise.allSettled never rejects from API errors — only unexpected runtime errors reach here
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Update user role (Promote / Demote)
  const handleToggleRole = async (targetUser) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    const confirmMsg = `Are you sure you want to change ${targetUser.name || targetUser.email}'s role to ${newRole.toUpperCase()}?`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(targetUser._id);
    try {
      await api.put(`/admin/users/${targetUser._id}/role`, { role: newRole });
      toast.success(`Role updated to ${newRole.toUpperCase()}`);
      setUsersList((prev) =>
        prev.map((u) => (u._id === targetUser._id ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      console.error('Failed to update role:', err);
      toast.error(err.response?.data?.message || 'Failed to update user role');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Update credit application status (Approve / Reject)
  const handleUpdateApplicationStatus = async (applicationId, newStatus) => {
    setActionLoadingId(applicationId);
    try {
      await api.put(`/admin/credit-applications/${applicationId}`, {
        status: newStatus,
      });

      toast.success(`Application marked as ${newStatus}!`);
      setApplications((prev) =>
        prev.map((app) =>
          app._id === applicationId ? { ...app, status: newStatus } : app
        )
      );

      // Refresh stats to reflect pending count changes
      const statsRes = await api.get('/admin/stats');
      if (statsRes.data) setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to update credit application:', err);
      toast.error(err.response?.data?.message || 'Failed to update application');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0F172A', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              border: '4px solid rgba(40, 201, 151, 0.2)',
              borderTopColor: '#28c997',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p style={{ color: '#94A3B8', fontWeight: 600 }}>Loading Finura Administration Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', color: '#F8FAFC', paddingBottom: '60px' }}>
      {/* Top Header Bar */}
      <header
        style={{
          borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
          padding: '16px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(10px)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#94A3B8',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              transition: 'all 0.2s ease',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to App</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #10B981, #0D9488)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
              }}
            >
              <Shield size={18} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC' }}>
                Finura Admin Console
              </h1>
              <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 600 }}>
                ● Verified Superadmin: {user?.email}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={fetchAdminData}
            title="Refresh statistics"
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.06)',
              color: '#F8FAFC',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            <RefreshCw size={14} />
            <span>Sync Stats</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '28px 24px' }}>
        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            background: 'rgba(30, 41, 59, 0.7)',
            padding: '6px',
            borderRadius: '12px',
            width: 'fit-content',
            marginBottom: '28px',
            border: '1px solid rgba(148, 163, 184, 0.15)',
          }}
        >
          {[
            { id: 'overview', label: 'System Overview', icon: Layers },
            { id: 'users', label: `Users Directory (${usersList.length})`, icon: Users },
            {
              id: 'applications',
              label: `Credit Governance (${applications.filter((a) => a.status === 'Pending').length} Pending)`,
              icon: FileCheck2,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? '#0F766E' : 'transparent',
                  color: isActive ? '#ffffff' : '#94A3B8',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: SYSTEM OVERVIEW */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gap: '24px' }}>
            {/* Stat Cards Grid (4 Core Metrics) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '20px',
              }}
            >
              {/* Card 1: Total Registered Users */}
              <div
                style={{
                  background: '#1E293B',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 600 }}>Total Users</span>
                  <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
                    <Users size={20} />
                  </div>
                </div>
                <h3 style={{ fontSize: '2.2rem', margin: '0 0 6px', fontWeight: 800, color: '#F8FAFC' }}>
                  {stats.totalUsers}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 600 }}>
                  ● Registered Active Accounts
                </span>
              </div>

              {/* Card 2: System Transaction Volume */}
              <div
                style={{
                  background: '#1E293B',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 600 }}>Transaction Volume</span>
                  <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
                    <DollarSign size={20} />
                  </div>
                </div>
                <h3 style={{ fontSize: '2.2rem', margin: '0 0 6px', fontWeight: 800, color: '#F8FAFC' }}>
                  ${Number(stats.totalTransactionVolume || 0).toLocaleString()}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                  Across {stats.totalTransactionsCount || 0} ledger transactions
                </span>
              </div>

              {/* Card 3: Active Goals Count */}
              <div
                style={{
                  background: '#1E293B',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 600 }}>Active Goals</span>
                  <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>
                    <Target size={20} />
                  </div>
                </div>
                <h3 style={{ fontSize: '2.2rem', margin: '0 0 6px', fontWeight: 800, color: '#F8FAFC' }}>
                  {stats.totalGoals}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#F59E0B', fontWeight: 600 }}>
                  ● Savings targets in progress
                </span>
              </div>

              {/* Card 4: Applications Pending */}
              <div
                style={{
                  background: '#1E293B',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 600 }}>Pending Loan Reviews</span>
                  <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
                    <FileCheck2 size={20} />
                  </div>
                </div>
                <h3 style={{ fontSize: '2.2rem', margin: '0 0 6px', fontWeight: 800, color: stats.pendingApplications > 0 ? '#EF4444' : '#10B981' }}>
                  {stats.pendingApplications}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                  {stats.totalApplications} total credit requests
                </span>
              </div>
            </div>

            {/* Portfolio Valuation & System Health Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #1E293B 0%, #0F766E 100%)',
                borderRadius: '16px',
                padding: '28px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '20px',
                border: '1px solid rgba(40, 201, 151, 0.2)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.8, color: '#ccfbf1' }}>
                  Platform Asset Valuation
                </span>
                <h2 style={{ margin: '6px 0 8px', fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
                  ${Number(stats.totalPortfolioValue || 0).toLocaleString()}
                </h2>
                <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.9rem' }}>
                  Total securities, cryptocurrencies, and funds tracked across all member portfolios.
                </p>
              </div>

              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <Activity size={24} color="#10B981" />
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Infrastructure Status</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#10B981' }}>100% Operational (API & MongoDB)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USERS DIRECTORY */}
        {activeTab === 'users' && (
          <div
            style={{
              background: '#1E293B',
              borderRadius: '16px',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(148, 163, 184, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC' }}>
                  User Management & Roles
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94A3B8' }}>
                  Inspect registered users and manage superadmin access privileges.
                </p>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(15, 23, 42, 0.6)', borderBottom: '1px solid rgba(148, 163, 184, 0.15)' }}>
                    <th style={{ padding: '14px 24px', fontWeight: 600, color: '#94A3B8', fontSize: '0.82rem' }}>USER</th>
                    <th style={{ padding: '14px 24px', fontWeight: 600, color: '#94A3B8', fontSize: '0.82rem' }}>EMAIL</th>
                    <th style={{ padding: '14px 24px', fontWeight: 600, color: '#94A3B8', fontSize: '0.82rem' }}>ROLE</th>
                    <th style={{ padding: '14px 24px', fontWeight: 600, color: '#94A3B8', fontSize: '0.82rem' }}>JOINED DATE</th>
                    <th style={{ padding: '14px 24px', fontWeight: 600, color: '#94A3B8', fontSize: '0.82rem', textAlign: 'right' }}>ROLE ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => {
                    const isAdmin = u.role === 'admin';
                    const isSelf = u._id === user?._id || u._id === user?.id;
                    return (
                      <tr
                        key={u._id}
                        style={{
                          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                          transition: 'background 0.2s ease',
                        }}
                      >
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: isAdmin ? '#10B981' : '#334155',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                              }}
                            >
                              {(u.name || u.email || 'U')[0].toUpperCase()}
                            </div>
                            <div style={{ fontWeight: 600, color: '#F8FAFC' }}>
                              {u.name || 'Member'} {isSelf && <span style={{ color: '#10B981', fontSize: '0.75rem' }}>(You)</span>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px', color: '#94A3B8', fontSize: '0.9rem' }}>
                          {u.email}
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: isAdmin ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                              color: isAdmin ? '#10B981' : '#94A3B8',
                              border: isAdmin ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(148, 163, 184, 0.2)',
                            }}
                          >
                            {u.role || 'user'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px', color: '#94A3B8', fontSize: '0.85rem' }}>
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleRole(u)}
                            disabled={isSelf || actionLoadingId === u._id}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              background: isAdmin ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: isAdmin ? '#EF4444' : '#10B981',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: isSelf ? 'not-allowed' : 'pointer',
                              opacity: isSelf ? 0.5 : 1,
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {isAdmin ? 'Demote to User' : 'Promote to Admin'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CREDIT APPLICATIONS GOVERNANCE */}
        {activeTab === 'applications' && (
          <div
            style={{
              background: '#1E293B',
              borderRadius: '16px',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(148, 163, 184, 0.15)' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC' }}>
                Credit Applications Governance
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94A3B8' }}>
                Review underwriting requests and approve or decline financing facilities.
              </p>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(15, 23, 42, 0.6)', borderBottom: '1px solid rgba(148, 163, 184, 0.15)' }}>
                    <th style={{ padding: '14px 24px', fontWeight: 600, color: '#94A3B8', fontSize: '0.82rem' }}>APPLICANT</th>
                    <th style={{ padding: '14px 24px', fontWeight: 600, color: '#94A3B8', fontSize: '0.82rem' }}>AMOUNT</th>
                    <th style={{ padding: '14px 24px', fontWeight: 600, color: '#94A3B8', fontSize: '0.82rem' }}>FACILITY PURPOSE</th>
                    <th style={{ padding: '14px 24px', fontWeight: 600, color: '#94A3B8', fontSize: '0.82rem' }}>CREDIT SCORE</th>
                    <th style={{ padding: '14px 24px', fontWeight: 600, color: '#94A3B8', fontSize: '0.82rem' }}>STATUS</th>
                    <th style={{ padding: '14px 24px', fontWeight: 600, color: '#94A3B8', fontSize: '0.82rem', textAlign: 'center' }}>DECISION</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => {
                    const isPending = app.status === 'Pending';
                    const isApproved = app.status === 'Approved';
                    const isRejected = app.status === 'Rejected';

                    return (
                      <tr
                        key={app._id}
                        style={{
                          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                          transition: 'background 0.2s ease',
                        }}
                      >
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ fontWeight: 700, color: '#F8FAFC' }}>{app.applicantName}</div>
                          <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{app.applicantEmail}</div>
                        </td>
                        <td style={{ padding: '16px 24px', fontWeight: 700, color: '#F8FAFC', fontSize: '1rem' }}>
                          ${Number(app.amount).toLocaleString()}
                        </td>
                        <td style={{ padding: '16px 24px', color: '#94A3B8', fontSize: '0.88rem' }}>
                          {app.purpose}
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: app.creditScore >= 740 ? '#10B981' : app.creditScore >= 670 ? '#F59E0B' : '#EF4444',
                            }}
                          >
                            {app.creditScore} FICO
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <span
                            style={{
                              padding: '4px 12px',
                              borderRadius: '999px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              background: isApproved
                                ? 'rgba(16, 185, 129, 0.15)'
                                : isRejected
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)',
                              color: isApproved ? '#10B981' : isRejected ? '#EF4444' : '#F59E0B',
                              border: isApproved
                                ? '1px solid rgba(16, 185, 129, 0.3)'
                                : isRejected
                                ? '1px solid rgba(239, 68, 68, 0.3)'
                                : '1px solid rgba(245, 158, 11, 0.3)',
                            }}
                          >
                            {app.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => handleUpdateApplicationStatus(app._id, 'Approved')}
                              disabled={isApproved || actionLoadingId === app._id}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                background: isApproved ? '#0F766E' : 'rgba(16, 185, 129, 0.2)',
                                color: isApproved ? '#FFFFFF' : '#10B981',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                cursor: isApproved ? 'default' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <CheckCircle2 size={14} />
                              <span>Approve</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUpdateApplicationStatus(app._id, 'Rejected')}
                              disabled={isRejected || actionLoadingId === app._id}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                background: isRejected ? '#991B1B' : 'rgba(239, 68, 68, 0.2)',
                                color: isRejected ? '#FFFFFF' : '#EF4444',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                cursor: isRejected ? 'default' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <XCircle size={14} />
                              <span>Reject</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {applications.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ padding: '40px 24px', textAlign: 'center', color: '#94A3B8' }}>
                        No loan or credit applications found in the review queue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
