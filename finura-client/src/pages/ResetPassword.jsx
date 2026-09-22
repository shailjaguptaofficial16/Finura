import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import './Auth.css';
import api from '../services/api';

export default function ResetPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast.error('Passwords do not match');
    }

    setLoading(true);
    
    try {
      const response = await api.post(`/auth/reset-password/${token}`, { password });
      toast.success(response.data.message || 'Password reset successful. Please login.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password. Token may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Reset Password</h1>
        <p className="auth-subtitle">Enter your new password below.</p>
        
        <form className="auth-form" onSubmit={handleResetPassword}>
          <div className="form-group">
            <label htmlFor="reset-new-password">New Password</label>
            <input id="reset-new-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>

          <div className="form-group">
            <label htmlFor="reset-confirm-password">Confirm Password</label>
            <input id="reset-confirm-password" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
          </div>
          
          <button type="submit" className="auth-submit-btn" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="auth-toggle" style={{ marginTop: '20px' }}>
          <p><Link to="/login">Back to Login</Link></p>
        </div>
      </div>      
    </div>     
  );           
}
