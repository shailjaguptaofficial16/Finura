/**
 * Finura Navigation Configuration
 * 10 dashboard modules with sub-routes, display titles, URL paths, Lucide icon names.
 */

export const NAV_CONFIG = [
  {
    id: "dashboard",
    title: "Dashboard",
    path: "/dashboard/overview",
    basePath: "/dashboard/overview",
    icon: "LayoutDashboard",
    badge: null,
    children: [],
  },
  {
    id: "getting-started",
    title: "Getting Started",
    path: "/dashboard/getting-started",
    basePath: "/dashboard/getting-started",
    icon: "Sparkles",
    badge: null,
    children: [],
  },
  {
    id: "money",
    title: "Money",
    path: "/dashboard/money",
    basePath: "/dashboard/money",
    icon: "Wallet",
    badge: null,
    children: [
      { id: "money-accounts",     title: "Accounts",     path: "/dashboard/money/accounts",     icon: "CreditCard" },
      { id: "money-transactions", title: "Transactions", path: "/dashboard/money/transactions",  icon: "ArrowLeftRight" },
      { id: "money-recurring",    title: "Recurring",    path: "/dashboard/money/recurring",     icon: "RefreshCw" },
      { id: "money-budgets",      title: "Budgets",      path: "/dashboard/money/budgets",       icon: "PiggyBank" },
    ],
  },
  {
    id: "analytics",
    title: "Analytics",
    path: "/dashboard/analytics",
    basePath: "/dashboard/analytics",
    icon: "BarChart2",
    badge: null,
    children: [
      { id: "analytics-overview",  title: "Overview",    path: "/dashboard/analytics/overview",  icon: "LayoutDashboard" },
      { id: "analytics-spending",   title: "Spending",    path: "/dashboard/analytics/spending",   icon: "TrendingDown" },
      { id: "analytics-expenses",   title: "Expenses",    path: "/dashboard/analytics/expenses",   icon: "Receipt" },
      { id: "analytics-income",     title: "Income",      path: "/dashboard/analytics/income",     icon: "TrendingUp" },
      { id: "analytics-cashflow",   title: "Cash Flow",   path: "/dashboard/analytics/cashflow",   icon: "Activity" },
      { id: "analytics-categories", title: "Categories",  path: "/dashboard/analytics/categories", icon: "Tag" },
      { id: "analytics-trends",     title: "Trends",      path: "/dashboard/analytics/trends",     icon: "LineChart" },
      { id: "analytics-reports",    title: "Reports",     path: "/dashboard/analytics/reports",    icon: "FileBarChart" },
    ],
  },
  {
    id: "investments",
    title: "Investments",
    path: "/dashboard/investments",
    basePath: "/dashboard/investments",
    icon: "TrendingUp",
    badge: null,
    children: [
      { id: "inv-portfolio",   title: "Portfolio",     path: "/dashboard/investments/portfolio",    icon: "BriefcaseBusiness" },
      { id: "inv-holdings",    title: "Holdings",      path: "/dashboard/investments/holdings",     icon: "Layers" },
      { id: "inv-stocks",      title: "Stocks",        path: "/dashboard/investments/stocks",       icon: "CandlestickChart" },
      { id: "inv-mutualfunds", title: "Mutual Funds",  path: "/dashboard/investments/mutual-funds", icon: "BarChart3" },
      { id: "inv-crypto",      title: "Crypto",        path: "/dashboard/investments/crypto",       icon: "Bitcoin" },
      { id: "inv-sips",        title: "SIPs",          path: "/dashboard/investments/sips",         icon: "Repeat" },
    ],
  },
  {
    id: "planning",
    title: "Planning",
    path: "/dashboard/planning",
    basePath: "/dashboard/planning",
    icon: "Target",
    badge: "New",
    children: [
      { id: "plan-goals",      title: "Goals",          path: "/dashboard/planning/goals",          icon: "Flag" },
      { id: "plan-savings",    title: "Savings",        path: "/dashboard/planning/savings",        icon: "PiggyBank" },
      { id: "plan-emergency",  title: "Emergency Fund", path: "/dashboard/planning/emergency-fund", icon: "ShieldCheck" },
      { id: "plan-forecast",   title: "Forecast",       path: "/dashboard/planning/forecast",       icon: "CloudSun" },
      { id: "plan-retirement", title: "Retirement",     path: "/dashboard/planning/retirement",     icon: "Sunset" },
    ],
  },
  {
    id: "wealth",
    title: "Wealth",
    path: "/dashboard/wealth",
    basePath: "/dashboard/wealth",
    icon: "Gem",
    badge: null,
    children: [
      { id: "wealth-networth",    title: "Net Worth",   path: "/dashboard/wealth/net-worth",   icon: "DollarSign" },
      { id: "wealth-assets",      title: "Assets",      path: "/dashboard/wealth/assets",      icon: "Landmark" },
      { id: "wealth-liabilities", title: "Liabilities", path: "/dashboard/wealth/liabilities", icon: "AlertCircle" },
      { id: "wealth-growth",      title: "Growth",      path: "/dashboard/wealth/growth",      icon: "TrendingUp" },
      { id: "wealth-allocation",  title: "Allocation",  path: "/dashboard/wealth/allocation",  icon: "PieChart" },
    ],
  },
  {
    id: "credit",
    title: "Credit",
    path: "/dashboard/credit",
    basePath: "/dashboard/credit",
    icon: "CreditCard",
    badge: null,
    children: [
      { id: "credit-overview", title: "Overview",      path: "/dashboard/credit/overview",     icon: "LayoutDashboard" },
      { id: "credit-cards",    title: "Cards",         path: "/dashboard/credit/cards",        icon: "CreditCard" },
      { id: "credit-score",    title: "Score",         path: "/dashboard/credit/score",        icon: "Star" },
      { id: "credit-loans",    title: "Loans",         path: "/dashboard/credit/loans",        icon: "Banknote" },
      { id: "credit-apps",     title: "Applications",  path: "/dashboard/credit/applications", icon: "FilePlus" },
    ],
  },
  {
    id: "ai",
    title: "Finura AI",
    path: "/dashboard/ai",
    basePath: "/dashboard/ai",
    icon: "Sparkles",
    badge: "AI",
    children: [
      { id: "ai-assistant",   title: "Assistant",   path: "/dashboard/ai/assistant",   icon: "Bot" },
      { id: "ai-insights",    title: "Insights",    path: "/dashboard/ai/insights",    icon: "Lightbulb" },
      { id: "ai-suggestions", title: "Suggestions", path: "/dashboard/ai/suggestions", icon: "Wand2" },
      { id: "ai-qa",          title: "Q&A",         path: "/dashboard/ai/qa",          icon: "MessageCircleQuestion" },
    ],
  },
  {
    id: "notifications",
    title: "Notifications",
    path: "/dashboard/notifications",
    basePath: "/dashboard/notifications",
    icon: "Bell",
    badge: null,
    children: [],
  },
  {
    id: "settings",
    title: "Settings",
    path: "/dashboard/settings",
    basePath: "/dashboard/settings",
    icon: "Settings",
    badge: null,
    children: [
      { id: "settings-profile",       title: "Profile",       path: "/dashboard/settings/profile",       icon: "UserRound" },
      { id: "settings-preferences",   title: "Preferences",   path: "/dashboard/settings/preferences",   icon: "SlidersHorizontal" },
      { id: "settings-security",      title: "Security",      path: "/dashboard/settings/security",      icon: "Lock" },
      { id: "settings-notifs",        title: "Notifications", path: "/dashboard/settings/notifications", icon: "BellRing" },
      { id: "settings-currency",      title: "Currency",      path: "/dashboard/settings/currency",      icon: "IndianRupee" },
    ],
  },
];

/** Flat path -> label map for breadcrumb generation */
export const PATH_LABEL_MAP = NAV_CONFIG.reduce((acc, mod) => {
  acc[mod.basePath] = mod.title;
  mod.children.forEach((child) => { acc[child.path] = child.title; });
  return acc;
}, {});

export default NAV_CONFIG;
