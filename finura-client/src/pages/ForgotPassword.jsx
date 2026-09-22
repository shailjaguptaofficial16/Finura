import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import './Auth.css';
import api from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await api.post('/auth/forgot-password', { email });
      toast.success(response.data.message || 'Reset link sent to your email');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Forgot Password</h1>
        <p className="auth-subtitle">Enter your email address and we'll send you a link to reset your password.</p>
        
        <form className="auth-form" onSubmit={handleForgotPassword}>
          <div className="form-group">
            <label htmlFor="forgot-email">Email Address</label>
            <input id="forgot-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          
          <button type="submit" className="auth-submit-btn" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="auth-toggle" style={{ marginTop: '20px' }}>
          <p>Remembered your password? <Link to="/login">Log In</Link></p>
        </div>
      </div>      
    </div>     
  );           
}
