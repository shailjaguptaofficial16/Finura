import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../services/api';
import './Auth.css';
import FinuraLogo from '../components/FinuraLogo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleGoogleSuccess = async (googleToken) => {
    try {
      const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${googleToken.access_token}` },
      });
      if (!profileResponse.ok) throw new Error('Unable to read Google profile');
      const profile = await profileResponse.json();
      const { data } = await api.post('/auth/google', { accessToken: googleToken.access_token, profile });

      login({ token: data.token, name: data.name, email: data.user?.email, user: data.user });
      toast.success(`Welcome, ${data.name || 'Finura Member'}!`);
      navigate('/dashboard');
    } catch (googleError) {
      const msg = googleError.response?.data?.message || googleError.message || 'Google sign-in failed. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const startGoogleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => {
      setGoogleLoading(false);
      setError('Google sign-in was cancelled or failed.');
      toast.error('Google sign-in was cancelled or failed.');
    },
    flow: 'implicit',
  });

  const handleGoogleClick = () => {
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      setError('Google sign-in is not configured. Add VITE_GOOGLE_CLIENT_ID to the client environment.');
      return;
    }
    setError('');
    setGoogleLoading(true);
    startGoogleLogin();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/login', { email, password });
      const data = response.data;
      
      login(
        data.token,
        {
          name: data.user.name,
          email: data.user.email,
          id: data.user.id
        }
      );

      toast.success(`Welcome back, ${data.user.name || 'Finura Member'}!`);
      navigate('/dashboard');
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || (error.response ? 'Invalid email or password.' : 'Server is offline. Please check your connection.');
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <FinuraLogo className="auth-logo" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h1>
        <p className="auth-subtitle">Enter your details to access your Finura dashboard.</p>

        {error && (
          <div
            id="login-error"
            role="alert"
            style={{color: '#ef4444', marginBottom: '15px', padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #f87171', fontSize: '0.9rem'}}
          >
            {error}
          </div>
        )}
        
        <form className="auth-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-describedby={error ? "login-error" : undefined}
              aria-invalid={!!error}
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <div className="password-input-wrapper">
              <input 
                id="login-password"
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-describedby={error ? "login-error" : undefined}
                aria-invalid={!!error}
              />
              <button
                type="button"
                className="password-toggle-icon"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide Password" : "Show Password"}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {showPassword ? (
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
          </div>

          <div className="forgot-password">
            <Link to="/forgot-password" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>Forgot password?</Link>
          </div>
          
          <button type="submit" className="auth-submit-btn">Log In</button>
        </form>

        <div className="auth-divider"><span>OR</span></div>
        <button type="button" className="google-btn" onClick={handleGoogleClick} disabled={googleLoading}>
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="" aria-hidden="true" width="18" /> Continue with Google
        </button>
        <div className="auth-toggle">
          <p>Don't have an account? <Link to="/signup">Sign Up</Link></p>
        </div>
      </div>      
    </div>     
  );           
}                 
       
