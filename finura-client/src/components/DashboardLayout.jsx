import React from "react";
import "../pages/Dashboard.css";

/**
 * DashboardLayout — lightweight shell used by pages that still need
 * a standalone layout (e.g. AdminDashboard). The main dashboard now
 * uses DashboardShell from AppRoutes which provides Sidebar + Header.
 */
export default function DashboardLayout({ children, title }) {
  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col">
      <main className="flex-1 w-full bg-slate-50">
        {children}
      </main>
    </div>
  );
}
