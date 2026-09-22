import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PATH_LABEL_MAP } from "../config/navigationConfig";
import {
  ChevronDown, LogOut, Mail, Settings, Shield, UserRound,
  Bell, Search, ChevronRight
} from "lucide-react";

/* ─── Helpers ────────────────────────────────────────────────────────── */
const getInitials = (name) => {
  if (!name) return "FM";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0]?.substring(0, 2).toUpperCase() || "FM";
};

/** Generate breadcrumb segments from pathname */
function useBreadcrumbs() {
  const location = useLocation();
  const path = location.pathname;

  return useMemo(() => {
    const segments = [];
    const parts = path.split("/").filter(Boolean); // ["dashboard", "money", "accounts"]

    let built = "";
    parts.forEach((part, i) => {
      built += "/" + part;
      const label = PATH_LABEL_MAP[built];
      // Always show "Dashboard" root as first crumb
      if (i === 0 && part === "dashboard") {
        segments.push({ label: "Dashboard", path: "/dashboard/overview" });
        return;
      }
      if (label) {
        segments.push({ label, path: built });
      }
    });

    return segments;
  }, [path]);
}

/* ─── Header ─────────────────────────────────────────────────────────── */
export default function Header({ onMobileMenuToggle }) {
  const navigate = useNavigate();
  const { userName, userEmail, logout, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const breadcrumbs = useBreadcrumbs();

  const displayName = user?.name || user?.fullName || userName || "Finura Member";
  const role = user?.role || "Private Member";
  const avatarSrc = user?.avatarUrl || user?.avatar || user?.profilePicture;

  useEffect(() => {
    const handlePointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setIsMenuOpen(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const menuItems = useMemo(() => {
    const items = [
      { label: "My Profile",        icon: UserRound, action: () => navigate("/dashboard/settings/profile") },
      { label: "Account Settings",  icon: Settings,  action: () => navigate("/dashboard/settings") },
    ];
    if (user?.role === "admin") {
      items.unshift({ label: "Admin Console", icon: Shield, action: () => navigate("/admin"), highlight: true });
    }
    return items;
  }, [navigate, user?.role]);

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6 py-3 bg-white border-b border-slate-200 min-h-[60px]">
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={onMobileMenuToggle}
        className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
        aria-label="Toggle navigation"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={crumb.path}>
            {i > 0 && <ChevronRight size={13} className="text-slate-300 flex-shrink-0" />}
            {i < breadcrumbs.length - 1 ? (
              <button
                type="button"
                onClick={() => navigate(crumb.path)}
                className="text-xs text-slate-400 hover:text-teal-600 font-medium transition truncate max-w-[100px]"
              >
                {crumb.label}
              </button>
            ) : (
              <span className="text-xs font-semibold text-slate-800 truncate max-w-[160px]">{crumb.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-2 ml-auto flex-shrink-0">
        {/* Search (desktop only) */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-400 hover:border-teal-300 transition w-44 focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100">
          <Search size={13} aria-hidden="true" />
          <input
            type="text"
            placeholder="Search..."
            aria-label="Search dashboard"
            className="flex-1 bg-transparent text-xs text-slate-700 placeholder-slate-400 outline-none min-w-0"
          />
        </div>

        {/* Notifications bell */}
        <button
          type="button"
          onClick={() => navigate("/dashboard/notifications")}
          className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
          aria-label="Notifications"
        >
          <Bell size={16} aria-hidden="true" />
          {/* Unread dot */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" aria-hidden="true" />
          <span className="sr-only">Unread notifications</span>
        </button>

        {/* Profile dropdown */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen((p) => !p)}
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            aria-label="Open profile menu"
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 p-1 pr-3 transition shadow-sm cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center bg-teal-100 text-teal-700 border border-teal-200 text-xs font-bold flex-shrink-0 overflow-hidden">
              {avatarSrc ? (
                <img src={avatarSrc} alt={`${displayName}'s profile photo`} className="w-full h-full object-cover" />
              ) : (
                getInitials(displayName)
              )}
            </div>
            <div className="text-left leading-tight hidden sm:block">
              <div className="text-xs font-bold text-slate-800 tracking-tight">{displayName}</div>
              <div className="text-[10px] text-teal-600 font-semibold capitalize">{role}</div>
            </div>
            <ChevronDown
              size={13}
              aria-hidden="true"
              className={`hidden sm:block text-slate-400 transition-transform ${isMenuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isMenuOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl animate-fade-in text-slate-800"
              role="menu"
              aria-label="User account menu"
            >
              <div className="p-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-teal-100 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-sm shrink-0">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt={`${displayName}'s profile photo`} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(displayName)
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-bold text-slate-900 text-sm truncate">{displayName}</div>
                    <div className="flex items-center gap-1 text-xs text-teal-700 font-medium truncate">
                      <Mail size={10} />
                      <span className="truncate">{userEmail || "Verified Member"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-1 space-y-1 mt-1">
                {menuItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => { item.action(); setIsMenuOpen(false); }}
                    role="menuitem"
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition text-left cursor-pointer ${
                      item.highlight
                        ? "bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200"
                        : "text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <item.icon size={14} />
                    <span>{item.label}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleLogout}
                  role="menuitem"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer mt-1"
                >
                  <LogOut size={14} />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
