import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';

const formatDate = (value) => new Date(value).toLocaleDateString('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const response = await api.get('/notifications');
          setNotifications(response.data?.data || []);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load notifications');
      } finally {
        setLoading(false);
      }
    };
    loadNotifications();
  }, []);

  const markRead = async (id) => { await api.patch(`/notifications/${id}/read`); setNotifications((items) => items.map((item) => item._id === id ? { ...item, isRead: true } : item)); };
  const markAllRead = async () => { await api.patch('/notifications/read-all'); setNotifications((items) => items.map((item) => ({ ...item, isRead: true }))); };
  const remove = async (id) => { await api.delete(`/notifications/${id}`); setNotifications((items) => items.filter((item) => item._id !== id)); };
  return (
    <div style={{ minHeight: '100%', padding: '28px 32px 48px', background: '#f8fafc' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <p style={{ margin: 0, color: '#0f766e', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Notifications</p>
          <h1 style={{ margin: '6px 0', color: '#0f172a', fontSize: '1.8rem' }}>Your notifications</h1>
          <p style={{ margin: 0, color: '#64748b' }}>Financial alerts, reminders, and account updates.</p>
          <button type="button" onClick={markAllRead} style={{ marginTop: '12px', border: 0, borderRadius: '7px', padding: '8px 12px', background: '#0f766e', color: '#fff', fontWeight: 700 }}>Mark all as read</button>
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          {loading ? <div style={{ padding: '40px', textAlign: 'center', background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '12px', color: '#64748b' }}>Loading notifications...</div> : notifications.length === 0 ? <div style={{ padding: '48px', textAlign: 'center', background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '12px', color: '#64748b' }}>You are all caught up.</div> : notifications.map((notification) => (
            <article key={notification._id} style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%', padding: '18px', textAlign: 'left', background: notification.isRead ? '#ffffff' : '#f0fdfa', border: '1px solid #f1f5f9', borderRadius: '12px', boxShadow: '0 6px 18px rgba(15, 23, 42, 0.04)' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: '42px', height: '42px', flexShrink: 0, borderRadius: '10px', background: '#ccfbf1', fontSize: '1.25rem' }}>!</span>
              <span style={{ flex: 1 }}><strong style={{ display: 'block', color: '#0f172a', fontSize: '0.98rem' }}>{notification.title}</strong><span style={{ display: 'block', marginTop: '4px', color: '#64748b', fontSize: '0.82rem' }}>{notification.message} · {formatDate(notification.createdAt)}</span></span>
              {!notification.isRead && <button type="button" onClick={() => markRead(notification._id)} style={{ border: 0, background: 'transparent', color: '#0f766e', fontWeight: 700 }}>Read</button>}
              <button type="button" onClick={() => remove(notification._id)} style={{ border: 0, background: 'transparent', color: '#b91c1c', fontWeight: 700 }}>Delete</button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
