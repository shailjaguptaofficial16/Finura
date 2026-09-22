import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  Lock,
  Wallet,
  PieChart,
  Target,
  TrendingUp,
  Sparkles,
  Layers,
  Database,
  KeyRound,
  CheckCircle2,
  Eye,
  Activity,
  ChevronRight
} from 'lucide-react';
import './Home.css';
import FinuraLogo from '../components/FinuraLogo';

export default function Home() {
  const features = [
    {
      id: 'money',
      icon: Wallet,
      title: 'Money Management',
      badge: 'Core Ledger',
      description: 'Bring accounts and transactions together in one clear, organized money view.',
      linkLabel: 'Explore Money Management →'
    },
    {
      id: 'budgets',
      icon: PieChart,
      title: 'Smart Budgets',
      badge: 'Discipline',
      description: 'Set category limits and see your spending progress before small costs become surprises.',
      linkLabel: 'Explore Smart Budgets →'
    },
    {
      id: 'goals',
      icon: Target,
      title: 'Financial Goals',
      badge: 'Milestones',
      description: 'Turn meaningful plans into trackable milestones with clear progress toward each target.',
      linkLabel: 'Explore Financial Goals →'
    },
    {
      id: 'investments',
      icon: TrendingUp,
      title: 'Investment Tracking',
      badge: 'Portfolios',
      description: 'Keep holdings, returns, and allocation in view across the investments you follow.',
      linkLabel: 'Explore Investments →'
    },
    {
      id: 'wealth',
      icon: Layers,
      title: 'Wealth Overview',
      badge: 'Net Worth',
      description: 'Understand assets, liabilities, and net worth through one calm, connected overview.',
      linkLabel: 'Explore Wealth Overview →'
    },
    {
      id: 'ai',
      icon: Sparkles,
      title: 'Finura AI Insights',
      badge: 'Intelligence',
      description: 'Ask for helpful context on spending patterns, savings opportunities, and next steps.',
      linkLabel: 'Explore Finura AI →'
    }
  ];

  const howItWorksSteps = [
    {
      step: '01',
      title: 'Connect your financial picture',
      description: 'Add accounts, transactions, and goals to create one clear view of your money.',
      icon: Wallet
    },
    {
      step: '02',
      title: 'Understand your money',
      description: 'View budgets, analytics, wealth, and investments in one organized workspace.',
      icon: Activity
    },
    {
      step: '03',
      title: 'Plan your next move',
      description: 'Use timely insights to make informed decisions and keep your goals moving forward.',
      icon: Target
    },
  ];

  const securityPillars = [
    {
      icon: KeyRound,
      title: 'Secure Authentication',
      description: 'Industry-standard JWT sessions paired with salted cryptographic hashing to ensure impenetrable account credentials.'
    },
    {
      icon: Database,
      title: 'User-Specific Data Access',
      description: 'Strict multi-tenant tenant isolation guarantees that every transaction, goal, and balance is accessible exclusively by you.'
    },
    {
      icon: Lock,
      title: 'Encrypted Sensitive Data',
      description: 'Encrypted communication pipelines (TLS/HTTPS) and protected database fields safeguarding every monetary figure.'
    },
    {
      icon: ShieldCheck,
      title: 'Protected API Routes',
      description: 'Every backend endpoint is fortified behind bearer-token authentication middleware and strict payload validation.'
    },
    {
      icon: Eye,
      title: 'Privacy-Focused Design',
      description: 'Zero third-party data broker sharing, transparent storage mechanisms, and no intrusive tracking cookies.'
    }
  ];

  return (
    <main className="home-page overflow-x-hidden">
      {/* ── 1. HERO SECTION ── */}
      <section className="hero-section" aria-label="Hero">
        <div className="container landing-container">
          <div className="hero-grid">
            <div className="hero-content">
              <div className="hero-badge">
                <span className="badge-pulse"></span>
                <span>FINURA INTELLIGENT FINANCE</span>
              </div>
              <h1 className="hero-title">
                Take Control of Your <span className="text-gradient">Financial Future</span>
              </h1>
              <p className="hero-subtitle">
                A unified, high-security financial platform designed for modern professionals.
                Consolidate your accounts, automate smart budgets, track multi-asset investments,
                and unlock actionable insights with Finura AI.
              </p>

              <div className="hero-cta-group">
                <Link to="/signup" className="btn btn-primary hero-btn">
                  <span>Get Started</span>
                  <ArrowRight size={18} className="btn-icon" />
                </Link>
              </div>

              <div className="hero-trust-indicators">
                <div className="trust-item">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  <span>Secure Authentication</span>
                </div>
                <div className="trust-item">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>Privacy-Focused Design</span>
                </div>
                <div className="trust-item">
                  <Lock size={16} className="text-emerald-500" />
                  <span>Smart Financial Insights</span>
                </div>
              </div>
            </div>

            {/* Hero branded visual */}
            <div className="hero-visual">
              <div className="hero-brand-visual">
                <div className="hero-logo-container">
                  <FinuraLogo iconOnly className="hero-logo-mark" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Finura financial modules">
        <div className="container landing-container trust-strip-inner">
          <div>
            <span className="trust-strip-kicker">One platform for your financial life</span>
            <strong>Clarity across every important money decision.</strong>
          </div>
          <div className="trust-strip-items">
            {['Accounts', 'Budgets', 'Goals', 'Investments', 'Analytics', 'AI Insights'].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. FEATURE SECTION ── */}
      <section id="features" className="features-section" aria-label="Features">
        <div className="container landing-container">
          <div className="section-header text-center">
            <span className="badge badge-primary">Everything In One Platform</span>
            <h2 className="section-title">Designed for Financial Precision</h2>
            <p className="section-subtitle">
              Bring your accounts, budgets, goals, investments and insights together in one intelligent financial workspace.
            </p>
          </div>

          <div className="features-grid">
            {features.map((feat) => {
              const IconComp = feat.icon;
              return (
                <div key={feat.id} className="feature-card">
                  <div className="feature-card-header">
                    <div className="feature-icon-wrapper">
                      <IconComp size={22} className="feature-icon" />
                    </div>
                    <span className="feature-tag">{feat.badge}</span>
                  </div>
                  <h3 className="feature-title">{feat.title}</h3>
                  <p className="feature-desc">{feat.description}</p>
                  <div className="feature-footer">
                    <Link to="/signup" className="feature-link" aria-label={feat.linkLabel}>
                      {feat.linkLabel}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 3. HOW IT WORKS SECTION ── */}
      <section className="how-it-works-section" aria-label="How Finura Works">
        <div className="container landing-container">
          <div className="section-header text-center">
            <span className="badge badge-primary">Streamlined Experience</span>
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">
              Follow three structured steps to transform raw financial transactions into organized, predictable wealth building.
            </p>
          </div>

          <div className="workflow-grid">
            {howItWorksSteps.map((step, idx) => {
              const IconComp = step.icon;
              return (
                <div key={step.step} className="workflow-card">
                  <div className="workflow-step-num">{step.step}</div>
                  <div className="workflow-icon-box">
                    <IconComp size={22} className="workflow-icon" />
                  </div>
                  <h3 className="workflow-step-title">{step.title}</h3>
                  <p className="workflow-step-desc">{step.description}</p>
                  {idx < howItWorksSteps.length - 1 && (
                    <div className="workflow-connector" aria-hidden="true">
                      <span>→</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 4. DASHBOARD PREVIEW SECTION ── */}
      <section className="dashboard-preview-section" aria-label="Product Dashboard Preview">
        <div className="container landing-container">
          <div className="section-header text-center">
            <span className="badge badge-primary">Clean Interface</span>
            <h2 className="section-title">Clean, Intuitive &amp; Clutter-Free</h2>
            <p className="section-subtitle">
              Every detail is tailored to give you maximum financial situational awareness in seconds.
            </p>
          </div>

          <div className="preview-container">
            {/* Mock Dashboard App Container */}
            <div className="preview-app-window">
              {/* App Bar */}
              <div className="preview-app-bar">
                <div className="preview-brand">
                  <div className="preview-logo-dot"></div>
                  <span className="font-bold text-slate-800 tracking-wider text-sm">FINURA WORKSPACE</span>
                </div>
                <div className="preview-search-bar">
                  <span>Search transactions, accounts, budgets (Ctrl + K)</span>
                </div>
                <div className="preview-user-badge">
                  <div className="preview-avatar">AC</div>
                  <div className="preview-user-meta">
                    <span className="font-bold text-xs text-slate-800">Alex Chen</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">Verified Member</span>
                  </div>
                </div>
              </div>

              {/* Inner Dashboard Body */}
              <div className="preview-app-body">
                {/* Metric Summary Cards */}
                <div className="preview-kpi-row">
                  <div className="preview-kpi-box">
                    <span className="kpi-tag">Total Assets</span>
                    <strong className="kpi-number">$214,800</strong>
                    <span className="kpi-change text-emerald-600">3 Bank Accounts • 1 Card</span>
                  </div>
                  <div className="preview-kpi-box">
                    <span className="kpi-tag">Monthly Income</span>
                    <strong className="kpi-number text-emerald-600">$7,250</strong>
                    <span className="kpi-change text-slate-500">2 Active Sources</span>
                  </div>
                  <div className="preview-kpi-box">
                    <span className="kpi-tag">Monthly Expenses</span>
                    <strong className="kpi-number text-rose-500">$3,820</strong>
                    <span className="kpi-change text-slate-500">Within monthly target</span>
                  </div>
                  <div className="preview-kpi-box">
                    <span className="kpi-tag">Active Goals</span>
                    <strong className="kpi-number text-teal-600">2 Goals</strong>
                    <span className="kpi-change text-slate-500">Emergency &amp; Home</span>
                  </div>
                </div>

                {/* Split Row: Account Balances & AI Assistant Preview */}
                <div className="preview-split-row">
                  <div className="preview-subcard">
                    <div className="preview-subcard-header">
                      <span className="font-bold text-sm text-slate-800">Connected Accounts</span>
                      <span className="text-xs text-teal-600 font-semibold cursor-pointer">View All</span>
                    </div>
                    <div className="preview-account-list">
                      <div className="preview-account-item">
                        <div className="account-dot bg-emerald-500"></div>
                        <div className="account-meta">
                          <strong>Main Checking</strong>
                          <span>•••• 4821</span>
                        </div>
                        <span className="account-balance">$42,500</span>
                      </div>
                      <div className="preview-account-item">
                        <div className="account-dot bg-teal-500"></div>
                        <div className="account-meta">
                          <strong>High-Yield Savings</strong>
                          <span>•••• 6310</span>
                        </div>
                        <span className="account-balance">$142,300</span>
                      </div>
                      <div className="preview-account-item">
                        <div className="account-dot bg-blue-500"></div>
                        <div className="account-meta">
                          <strong>Index Portfolio</strong>
                          <span>Brokerage</span>
                        </div>
                        <span className="account-balance">$30,000</span>
                      </div>
                    </div>
                  </div>

                  <div className="preview-subcard">
                    <div className="preview-subcard-header">
                      <span className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                        <Sparkles size={15} className="text-teal-600" />
                        Finura AI Financial Copilot
                      </span>
                      <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-bold">Active</span>
                    </div>
                    <div className="ai-chat-preview">
                      <div className="ai-bubble user-bubble">
                        "How am I tracking against my quarterly savings target?"
                      </div>
                      <div className="ai-bubble assistant-bubble">
                        "You've allocated $4,200 toward your Emergency Fund milestone, which is 68% of your Q3 target. At your current pace, you will reach full completion 14 days ahead of schedule."
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. SECURITY SECTION ── */}
      <section className="security-section" aria-label="Security and Privacy">
        <div className="container landing-container">
          <div className="security-banner">
            <div className="security-header text-center">
                <span className="badge badge-security">
                <Lock size={12} className="inline mr-1" /> Secure by design
              </span>
              <h2 className="security-title">Built with Security as a Foundation</h2>
                <p className="security-subtitle">
                Finura keeps trust visible with straightforward controls for authentication, data ownership, and protected access.
              </p>
            </div>

            <div className="security-pillars-grid">
              {securityPillars.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div key={pillar.title} className="security-card">
                    <div className="security-icon-circle">
                      <Icon size={20} className="security-icon" />
                    </div>
                    <h3 className="security-pillar-title">{pillar.title}</h3>
                    <p className="security-pillar-desc">{pillar.description}</p>
                  </div>
                );
              })}
            </div>

            <div className="security-guarantee">
              <ShieldCheck size={20} className="text-emerald-400 shrink-0" />
              <span>
                <strong>Trust made visible:</strong> Your financial workspace is designed around secure authentication, user-owned data, and protected API access.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. FINAL CALL TO ACTION ── */}
      <section className="final-cta-section" aria-label="Get Started">
        <div className="container landing-container">
          <div className="final-cta-card">
            <div className="cta-shapes"></div>
            <div className="final-cta-content text-center">
              <span className="badge badge-cta">Ready to take control?</span>
              <h2 className="final-cta-title">Start Managing Your Money</h2>
              <p className="final-cta-subtitle">
                Join individuals and professionals who rely on Finura for structured wealth management, smart budgeting, and peace of mind.
              </p>
              <div className="final-cta-actions">
                <Link to="/signup" className="btn btn-primary cta-btn-large">
                  <span>Create Your Free Account</span>
                  <ArrowRight size={18} className="btn-icon" />
                </Link>
              </div>
              <p className="final-cta-footnote">
                No credit card required • Instant workspace setup • 100% data privacy
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. FOOTER ── */}
      <footer className="footer" role="contentinfo">
        <div className="container landing-container footer-grid">
          <div className="footer-col">
            <Link to="/" className="footer-brand" aria-label="Finura Home">
              <FinuraLogo inverse />
            </Link>
            <p className="footer-tagline">
              Modern financial management platform uniting accounts, budgets, goals, and AI-guided intelligence.
            </p>
            <div className="footer-security-tag">
              <Lock size={13} className="text-emerald-400" />
              <span>Privacy-focused financial workspace</span>
            </div>
          </div>

          <div className="footer-col">
            <h3 className="footer-heading">Platform</h3>
            <ul className="footer-links">
              <li><Link to="/features">Features Overview</Link></li>
              <li><Link to="/pricing">Pricing Plans</Link></li>
              <li><Link to="/signup">Register Account</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h3 className="footer-heading">Product Areas</h3>
            <ul className="footer-links">
              <li><Link to="/dashboard/money/accounts">Money &amp; Accounts</Link></li>
              <li><Link to="/dashboard/money/budgets">Smart Budgets</Link></li>
              <li><Link to="/dashboard/planning/goals">Financial Goals</Link></li>
              <li><Link to="/dashboard/ai/assistant">Finura AI Assistant</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h3 className="footer-heading">Company &amp; Legal</h3>
            <ul className="footer-links">
              <li><Link to="/about">About Finura</Link></li>
              <li><Link to="/contact">Support Center</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="container landing-container footer-bottom">
          <p>© {new Date().getFullYear()} Finura Technologies. All rights reserved.</p>
          <div className="footer-bottom-links">
            <Link to="/privacy">Privacy</Link>
            <span>•</span>
            <Link to="/terms">Terms</Link>
            <span>•</span>
            <Link to="/contact">Security Disclosure</Link>
          </div>
        </div>
      </footer>

    </main>
  );
}
