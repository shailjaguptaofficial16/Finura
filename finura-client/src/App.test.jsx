import { render, screen } from '@testing-library/react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  window.history.pushState({}, '', '/');
});

describe('Finura app shell', () => {
  it('renders the landing page and login CTA', () => {
    render(
      <GoogleOAuthProvider clientId="test-client-id">
        <App />
      </GoogleOAuthProvider>
    );

    expect(screen.getByText(/Take Control of Your/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Get Started/i }).length).toBeGreaterThan(0);
  });

  it('redirects unauthenticated dashboard access to login', () => {
    window.history.pushState({}, '', '/dashboard/overview');
    render(
      <GoogleOAuthProvider clientId="test-client-id">
        <App />
      </GoogleOAuthProvider>
    );

    expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
  });
});
