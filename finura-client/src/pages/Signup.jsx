import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../services/api';
import './Auth.css';
import FinuraLogo from '../components/FinuraLogo';

const planOptions = ['Basic', 'Pro', 'Enterprise'];

export default function Signup() {
  const [searchParams] = useSearchParams();
  const initialPlan = searchParams.get('plan');
  const normalizedPlan = initialPlan ? initialPlan.charAt(0).toUpperCase() + initialPlan.slice(1).toLowerCase() : 'Pro';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(
    planOptions.includes(normalizedPlan) ? normalizedPlan : 'Pro'
  );
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
      const msg = googleError.response?.data?.message || googleError.message || 'Google sign-up failed. Please try again.';
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
      setError('Google sign-up was cancelled or failed.');
      toast.error('Google sign-up was cancelled or failed.');
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

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await api.post('/auth/signup', { name: fullName, email, password, plan: selectedPlan });
      const data = response.data;

      localStorage.setItem('finura_is_new_user', 'true');
      login({
        token: data.token,
        name: fullName || 'Finura Member',
        email,
        user: { email, _id: data.user?._id || data.user?.id }
      });
      toast.success(`Welcome to Finura, ${fullName || 'Member'}!`);
      navigate('/dashboard');
    } catch (err) {
      const errorMsg = err.response?.data?.message || (err.response ? 'Error creating account.' : 'Server is offline. Please check your connection.');
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <FinuraLogo className="auth-logo" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Create an Account</h1>
        <p className="auth-subtitle">Start your wealth-building journey with Finura today.</p>

        <div style={{ marginBottom: '20px' }}>
          <div
            role="radiogroup"
            aria-label="Select Finura subscription plan"
            style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}
          >
            {planOptions.map((plan) => (
              <button
                key={plan}
                type="button"
                role="radio"
                aria-checked={selectedPlan === plan}
                onClick={() => setSelectedPlan(plan)}
                style={{
                  flex: 1,
                  minWidth: '110px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: selectedPlan === plan ? '1px solid #14b8a6' : '1px solid #e2e8f0',
                  background: selectedPlan === plan ? '#ecfdf5' : '#fff',
                  color: selectedPlan === plan ? '#0f766e' : '#334155',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {plan}
              </button>
            ))}
          </div>
          <small style={{ color: '#64748b' }}>Selected plan: <strong>{selectedPlan}</strong></small>
        </div>

        {error && (
          <div
            id="signup-error"
            role="alert"
            style={{color: '#ef4444', marginBottom: '15px', padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #f87171', fontSize: '0.9rem'}}
          >
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSignup}>
          <div className="form-group">
            <label htmlFor="signup-name">Full Name</label>
            <input
              id="signup-name"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="signup-email">Email Address</label>
            <input
              id="signup-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-describedby={error ? "signup-error" : undefined}
              aria-invalid={!!error}
            />
          </div>

          <div className="form-group">
            <label htmlFor="signup-password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-describedby={error ? "signup-error" : undefined}
                aria-invalid={!!error}
              />
              <button
                type="button"
                className="password-toggle-icon"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide Password' : 'Show Password'}
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

          <div className="terms-group">
            <input type="checkbox" id="terms" required />
            <label htmlFor="terms">I agree to the <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link></label>
          </div>

          <button type="submit" className="auth-submit-btn">Sign Up</button>
        </form>

        <div className="auth-divider"><span>OR</span></div>
        <button type="button" className="google-btn" onClick={handleGoogleClick} disabled={googleLoading}>
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="" aria-hidden="true" width="18" /> Continue with Google
        </button>

        <div className="auth-toggle">
          <p>Already have an account? <Link to="/login">Log In</Link></p>
        </div>
      </div>
    </div>
  );
}
