import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import NotFound from "../pages/NotFound";

/* ─── Existing full-featured pages ───────────────────────────────────── */
import Overview          from "../pages/dashboard/Overview";
import Transactions      from "../pages/dashboard/Transactions";
import Settings          from "../pages/dashboard/Settings";
import Reports           from "../pages/dashboard/Reports";
import WealthAdvisory    from "../pages/dashboard/WealthAdvisory";
import CreditSolutions   from "../pages/dashboard/CreditSolutions";
import MarketInsights    from "../pages/dashboard/MarketInsights";
import Spending          from "../pages/dashboard/Spending";
import Accounts          from "../pages/Accounts";
import Profile           from "../pages/Profile";
import Recurring        from "../pages/dashboard/Recurring";
import Notifications    from "../pages/dashboard/Notifications";
import Budgets          from "../pages/dashboard/Budgets";
import Money            from "../pages/dashboard/Money";
import Goals             from "../pages/dashboard/Goals";
import Savings           from "../pages/dashboard/Savings";
import EmergencyFund     from "../pages/dashboard/EmergencyFund";
import Forecast           from "../pages/dashboard/Forecast";
import Retirement         from "../pages/dashboard/Retirement";
import PlanningDashboard  from "../pages/dashboard/PlanningDashboard";
import Investment         from "../pages/dashboard/Investment";
import Holdings           from "../pages/dashboard/Holdings";
import Stocks             from "../pages/dashboard/Stocks";
import AnalyticsPage      from "../pages/dashboard/AnalyticsPage";
import CreditDashboard    from "../pages/dashboard/CreditDashboard";
import AIAssistant        from "../pages/dashboard/AIAssistant";
import AISuggestions      from "../pages/dashboard/AISuggestions";
import AssetsPage         from "../pages/dashboard/AssetsPage";
import LiabilitiesPage    from "../pages/dashboard/LiabilitiesPage";
import GrowthPage         from "../pages/dashboard/GrowthPage";
import GettingStarted     from "../pages/GettingStarted";
import OnboardingModal    from "../components/OnboardingModal";

/* ─── Stub page factory ─────────────────────────────────────────────── */
function PageStub({ title, icon }) {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-2xl mx-auto p-8 mt-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
          <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-5 text-2xl">
            {icon || "🏗️"}
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            This section is under active development. Real data and full functionality will be available soon.
          </p>
          <span className="inline-block mt-5 bg-teal-50 text-teal-600 text-xs font-semibold px-4 py-1.5 rounded-full border border-teal-100">
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Nested route table ─────────────────────────────────────────────── */
function DashboardRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="overview" replace />} />

      {/* Overview */}
      <Route path="overview" element={<Overview />} />
      <Route path="getting-started" element={<GettingStarted />} />

      {/* Money */}
      <Route path="money" element={<Money />} />
      <Route path="money/accounts"     element={<Accounts />} />
      <Route path="money/transactions" element={<Transactions />} />
      <Route path="money/recurring"    element={<Recurring />} />
      <Route path="money/budgets"      element={<Budgets />} />

      {/* Analytics */}
      <Route path="analytics" element={<Navigate to="analytics/overview" replace />} />
      <Route path="analytics/overview"    element={<AnalyticsPage kind="overview" />} />
      <Route path="analytics/spending"   element={<Spending />} />
      <Route path="analytics/income"     element={<AnalyticsPage kind="income" />} />
      <Route path="analytics/cashflow"   element={<AnalyticsPage kind="cash-flow" />} />
      <Route path="analytics/categories" element={<AnalyticsPage kind="categories" />} />
      <Route path="analytics/trends"     element={<AnalyticsPage kind="trends" />} />
      <Route path="analytics/expenses"   element={<AnalyticsPage kind="expenses" />} />
      <Route path="analytics/reports"    element={<Reports />} />

      {/* Investments */}
      <Route path="investments" element={<Navigate to="investments/portfolio" replace />} />
      <Route path="investments/portfolio"    element={<Investment />} />
      <Route path="investments/holdings"     element={<Holdings />} />
      <Route path="investments/stocks"       element={<Stocks />} />
      <Route path="investments/mutual-funds" element={<PageStub title="Mutual Funds" icon="🏦" />} />
      <Route path="investments/crypto"       element={<PageStub title="Crypto" icon="₿" />} />
      <Route path="investments/sips"         element={<PageStub title="SIPs" icon="🔄" />} />
      <Route path="portfolio" element={<Navigate to="/dashboard/investments/portfolio" replace />} />

      {/* Planning */}
      <Route path="planning" element={<PlanningDashboard />} />
      <Route path="planning/goals"          element={<Goals />} />
      <Route path="planning/savings"        element={<Savings />} />
      <Route path="planning/emergency-fund" element={<EmergencyFund />} />
      <Route path="planning/forecast"       element={<Forecast />} />
      <Route path="planning/retirement"     element={<Retirement />} />

      {/* Wealth */}
      <Route path="wealth" element={<WealthAdvisory />} />
      <Route path="wealth/net-worth"   element={<PageStub title="Net Worth" icon="💎" />} />
      <Route path="wealth/assets"      element={<AssetsPage />} />
      <Route path="wealth/liabilities" element={<LiabilitiesPage />} />
      <Route path="wealth/growth"      element={<GrowthPage />} />
      <Route path="wealth/allocation"  element={<PageStub title="Asset Allocation" icon="🥧" />} />

      {/* Credit */}
      <Route path="credit" element={<Navigate to="credit/overview" replace />} />
      <Route path="credit/overview"     element={<CreditDashboard view="overview" />} />
      <Route path="credit/cards"        element={<CreditDashboard view="cards" />} />
      <Route path="credit/score"        element={<CreditDashboard view="score" />} />
      <Route path="credit/loans"        element={<CreditDashboard view="loans" />} />
      <Route path="credit/applications" element={<CreditDashboard view="applications" />} />

      {/* Finura AI */}
      <Route path="ai" element={<Navigate to="ai/assistant" replace />} />
      <Route path="ai/assistant"   element={<AIAssistant />} />
      <Route path="ai/insights"    element={<PageStub title="AI Insights" icon="💡" />} />
      <Route path="ai/suggestions" element={<AISuggestions />} />
      <Route path="ai/qa"          element={<AIAssistant />} />

      {/* Market (legacy) */}
      <Route path="market" element={<MarketInsights />} />

      {/* Notifications */}
      <Route path="notifications" element={<Notifications />} />

      {/* Settings */}
      <Route path="settings" element={<Settings />} />
      <Route path="settings/profile"       element={<Profile />} />
      <Route path="settings/preferences"   element={<PageStub title="Preferences" icon="⚙️" />} />
      <Route path="settings/security"      element={<PageStub title="Security" icon="🔒" />} />
      <Route path="settings/notifications" element={<PageStub title="Notification Settings" icon="🔔" />} />
      <Route path="settings/currency"      element={<PageStub title="Currency Settings" icon="₹" />} />

      {/* Profile legacy */}
      <Route path="profile" element={<Navigate to="/dashboard/settings/profile" replace />} />

      {/* Accounts legacy */}
      <Route path="accounts" element={<Navigate to="/dashboard/money/accounts" replace />} />

      {/* Catch-all Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

/* ─── Dashboard shell (Sidebar + Header + outlet) ────────────────────── */
export default function DashboardShell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMobileMenuToggle={() => setMobileOpen((o) => !o)} />
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <DashboardRoutes />
        </main>
      </div>
      <OnboardingModal />
    </div>
  );
}
