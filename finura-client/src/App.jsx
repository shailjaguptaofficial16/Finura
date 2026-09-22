import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Features from "./pages/Feature";
import About from "./pages/About";
import Pricing from "./pages/Pricing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DashboardShell from "./routes/AppRoutes";
import NotFound from "./pages/NotFound";
import Contact from "./pages/Contact";
import Legal from "./pages/Legal";

class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: "32px" }}>
        <section style={{ maxWidth: "480px", width: "100%", padding: "32px", borderRadius: "16px", background: "#ffffff", boxShadow: "0 12px 35px rgba(15, 23, 42, 0.12)", textAlign: "center" }}>
          <h1 style={{ marginTop: 0, color: "#0f172a" }}>Something went wrong</h1>
          <p style={{ color: "#64748b", lineHeight: 1.6 }}>This page could not be displayed. Return home and try again.</p>
          <button type="button" className="btn btn-primary" onClick={() => { window.location.href = "/"; }}>Back to Home</button>
        </section>
      </main>
    );
  }
}

function Layout() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith("/dashboard") || location.pathname === "/planning" || location.pathname === "/wealth" || location.pathname === "/investments" || location.pathname === "/admin";

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {!isDashboard && <Navbar />}
      <div id="main-content" tabIndex={-1} style={{ outline: 'none', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <RouteErrorBoundary>
          <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/features" element={<Features />} />
          <Route path="/about" element={<About />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Legal />} />
          <Route path="/terms" element={<Legal />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Protected dashboard — handled entirely by DashboardShell */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard/*" element={<DashboardShell />} />
            
            {/* Direct module route aliases */}
            <Route path="/overview"                 element={<Navigate to="/dashboard/overview" replace />} />
            <Route path="/money"                    element={<Navigate to="/dashboard/money" replace />} />
            <Route path="/money/accounts"           element={<Navigate to="/dashboard/money/accounts" replace />} />
            <Route path="/money/transactions"       element={<Navigate to="/dashboard/money/transactions" replace />} />
            <Route path="/money/budgets"            element={<Navigate to="/dashboard/money/budgets" replace />} />
            <Route path="/money/recurring"          element={<Navigate to="/dashboard/money/recurring" replace />} />
            <Route path="/analytics"                element={<Navigate to="/dashboard/analytics/overview" replace />} />
            <Route path="/analytics/*"              element={<Navigate to="/dashboard/analytics" replace />} />
            <Route path="/investments"              element={<Navigate to="/dashboard/investments/portfolio" replace />} />
            <Route path="/investments/*"            element={<Navigate to="/dashboard/investments" replace />} />
            <Route path="/portfolio"                element={<Navigate to="/dashboard/investments/portfolio" replace />} />
            <Route path="/planning"                 element={<Navigate to="/dashboard/planning" replace />} />
            <Route path="/planning/*"               element={<Navigate to="/dashboard/planning" replace />} />
            <Route path="/wealth"                   element={<Navigate to="/dashboard/wealth" replace />} />
            <Route path="/wealth/*"                 element={<Navigate to="/dashboard/wealth" replace />} />
            <Route path="/credit"                   element={<Navigate to="/dashboard/credit/overview" replace />} />
            <Route path="/credit/*"                 element={<Navigate to="/dashboard/credit" replace />} />
            <Route path="/finura-ai"                element={<Navigate to="/dashboard/ai/assistant" replace />} />
            <Route path="/ai"                       element={<Navigate to="/dashboard/ai/assistant" replace />} />
            <Route path="/ai/*"                     element={<Navigate to="/dashboard/ai" replace />} />
            <Route path="/notifications"            element={<Navigate to="/dashboard/notifications" replace />} />
            <Route path="/settings"                 element={<Navigate to="/dashboard/settings" replace />} />
            <Route path="/settings/*"               element={<Navigate to="/dashboard/settings" replace />} />

            {/* Legacy shortcuts */}
            <Route path="/wealth-advisory"          element={<Navigate to="/dashboard/wealth" replace />} />
            <Route path="/credit-solutions"         element={<Navigate to="/dashboard/credit" replace />} />
            <Route path="/market-insights"          element={<Navigate to="/dashboard/market" replace />} />
            <Route path="/financial-planning"       element={<Navigate to="/dashboard/planning" replace />} />
            <Route path="/reports"                  element={<Navigate to="/dashboard/analytics/reports" replace />} />
            <Route path="/profile"                  element={<Navigate to="/dashboard/settings/profile" replace />} />
            <Route path="/accounts"                 element={<Navigate to="/dashboard/money/accounts" replace />} />
          </Route>

          {/* Admin */}
          <Route element={<ProtectedRoute requireAdmin={true} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>

          {/* Catch-all 404 Page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </RouteErrorBoundary>
      </div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout />
        <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      </Router>
    </AuthProvider>
  );
}
