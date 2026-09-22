import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NAV_CONFIG from "../config/navigationConfig";
import * as LucideIcons from "lucide-react";
import SharedFinuraLogo from './FinuraLogo';

/* ─── Icon resolver ─────────────────────────────────────────────────── */
function Icon({ name, size = 16, className = "" }) {
  const Comp = LucideIcons[name];
  if (!Comp) return <LucideIcons.Circle size={size} className={className} />;
  return <Comp size={size} className={className} />;
}

/* ─── Logo SVG ───────────────────────────────────────────────────────── */
function FinuraLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sidebarLogo" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
      </defs>
      <path d="M24 4 L44 14 L24 24 L4 14 Z" fill="url(#sidebarLogo)" opacity="0.9" />
      <path d="M4 24 L24 34 L44 24" stroke="url(#sidebarLogo)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 34 L24 44 L44 34" stroke="url(#sidebarLogo)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
    </svg>
  );
}

/* ─── Single nav item row ───────────────────────────────────────────── */
function NavItem({ item, isActive, onClick, indent = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 text-sm font-medium group cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none",
        indent ? "ml-2" : "",
        isActive
          ? "bg-emerald-100 text-emerald-700 border-l-2 border-emerald-500 font-semibold"
          : "text-slate-600 hover:bg-emerald-50 hover:text-slate-900 border-l-2 border-transparent",
      ].join(" ")}
    >
      <Icon
        name={item.icon}
        size={14}
        className={isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"}
      />
      <span className="flex-1 truncate">{item.title}</span>
    </button>
  );
}

/* ─── Accordion module group ─────────────────────────────────────────── */
function NavModule({ module, currentPath, navigate, onNavigate }) {
  const hasChildren = module.children.length > 0;
  const isModuleActive =
    currentPath === module.path ||
    currentPath.startsWith(module.basePath) ||
    module.children.some((c) => currentPath === c.path || currentPath.startsWith(c.path + "/"));

  const [open, setOpen] = useState(isModuleActive);

  // Synchronize accordion expansion when route changes
  useEffect(() => {
    if (isModuleActive) {
      setOpen(true);
    }
  }, [isModuleActive]);

  const handleParentClick = () => {
    if (hasChildren) {
      setOpen((o) => !o);
    } else {
      navigate(module.path);
      onNavigate?.();
    }
  };

  const isExactParentActive = currentPath === module.path || (!hasChildren && isModuleActive);

  return (
    <div className="mb-0.5">
      {/* Parent row */}
      <button
        type="button"
        onClick={handleParentClick}
        aria-expanded={hasChildren ? open : undefined}
        aria-controls={hasChildren ? `sub-menu-${module.id}` : undefined}
        className={[
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 text-sm font-medium group cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none",
          isExactParentActive
            ? "bg-emerald-100 text-emerald-700 border-l-4 border-emerald-500 font-semibold shadow-2xs"
            : isModuleActive && hasChildren
            ? "text-slate-800 border-l-4 border-emerald-400 bg-emerald-50 font-semibold"
            : "text-slate-600 hover:bg-emerald-50 hover:text-slate-900 border-l-4 border-transparent",
        ].join(" ")}
      >
        <Icon
          name={module.icon}
          size={16}
          className={isModuleActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"}
        />
        <span className="flex-1 truncate">{module.title}</span>
        {module.badge && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            module.badge === "AI"
              ? "bg-violet-100 text-violet-600"
              : "bg-teal-500 text-white"
          }`}>
            {module.badge}
          </span>
        )}
        {hasChildren && (
          <LucideIcons.ChevronRight
            size={14}
            className={`ml-auto text-slate-400 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          />
        )}
      </button>

      {/* Children */}
      {hasChildren && open && (
        <div id={`sub-menu-${module.id}`} className="mt-0.5 ml-3 border-l-2 border-slate-100 pl-2 space-y-0.5">
          {module.children.map((child) => (
            <NavItem
              key={child.id}
              item={child}
              isActive={currentPath === child.path || currentPath.startsWith(child.path + "/")}
              onClick={() => {
                navigate(child.path);
                onNavigate?.();
              }}
              indent={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Sidebar ───────────────────────────────────────────────────── */
export default function Sidebar({ mobileOpen, onMobileClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const currentPath = location.pathname;
  const [navSearch, setNavSearch] = useState("");

  const displayName = user?.name || user?.fullName || "Finura Member";
  const role = user?.role || "Private Member";
  const avatarSrc = user?.avatarUrl || user?.avatar || user?.profilePicture;

  // Prevent background scrolling and handle Escape when mobile sidebar drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e) => {
        if (e.key === "Escape") onMobileClose?.();
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        document.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen, onMobileClose]);

  const getInitials = (name) => {
    if (!name) return "FM";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0]?.substring(0, 2).toUpperCase() || "FM";
  };

  const handleLogout = () => {
    logout();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  // Filter navigation items if search is active
  const filteredNav = useMemo(() => {
    if (!navSearch.trim()) return NAV_CONFIG;
    const q = navSearch.toLowerCase().trim();
    return NAV_CONFIG.map((mod) => {
      const matchParent = mod.title.toLowerCase().includes(q);
      const matchingChildren = mod.children.filter((c) => c.title.toLowerCase().includes(q));
      if (matchParent || matchingChildren.length > 0) {
        return {
          ...mod,
          children: matchingChildren.length > 0 ? matchingChildren : mod.children,
        };
      }
      return null;
    }).filter(Boolean);
  }, [navSearch]);

  const sidebarContent = (
    <div className="finura-sidebar flex flex-col h-full bg-white border-r border-slate-200">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-100">
        <SharedFinuraLogo className="sidebar-logo" />
        {mobileOpen !== undefined && (
          <button
            type="button"
            onClick={onMobileClose}
            className="ml-auto p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition md:hidden cursor-pointer"
          >
            <LucideIcons.X size={18} />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-400 hover:border-teal-300 transition focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100">
          <LucideIcons.Search size={14} className="shrink-0" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search menu..."
            aria-label="Search navigation menu"
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
            className="flex-1 bg-transparent text-xs sm:text-sm text-slate-700 placeholder-slate-400 outline-none min-w-0"
          />
          {navSearch ? (
            <button
              type="button"
              onClick={() => setNavSearch("")}
              aria-label="Clear navigation search"
              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <LucideIcons.X size={12} />
            </button>
          ) : (
            <span className="text-[10px] bg-slate-200 text-slate-500 font-semibold px-1.5 py-0.5 rounded" aria-hidden="true">⌘K</span>
          )}
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5" aria-label="Main Navigation">
        {filteredNav.map((module) => (
          <NavModule
            key={module.id}
            module={module}
            currentPath={currentPath}
            navigate={navigate}
            onNavigate={onMobileClose}
          />
        ))}

        {filteredNav.length === 0 && (
          <div className="p-4 text-center text-xs text-slate-400">
            No navigation matches found.
          </div>
        )}

        {/* Admin shortcut */}
        {user?.role === "admin" && (
          <button
            type="button"
            onClick={() => {
              navigate("/admin");
              onMobileClose?.();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-l-4 border-emerald-500 transition mt-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            <LucideIcons.Shield size={16} className="text-emerald-600" />
            Admin Console
          </button>
        )}
      </nav>

      {/* User profile */}
      <div className="px-3 py-3 border-t border-slate-100">
        <div
          role="button"
          tabIndex={0}
          aria-label={`View profile for ${displayName}`}
          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:outline-none"
          onClick={() => {
            navigate("/dashboard/settings/profile");
            onMobileClose?.();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate("/dashboard/settings/profile");
              onMobileClose?.();
            }
          }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-teal-100 text-teal-700 font-bold text-xs shrink-0 overflow-hidden border border-teal-200">
            {avatarSrc ? (
              <img src={avatarSrc} alt={`${displayName}'s profile photo`} className="w-full h-full object-cover" />
            ) : (
              getInitials(displayName)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-800 truncate">{displayName}</div>
            <div className="text-[10px] text-teal-600 font-semibold capitalize truncate">{role}</div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleLogout();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition cursor-pointer"
            title="Log out"
            aria-label="Log out"
          >
            <LucideIcons.LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* DESKTOP sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 overflow-hidden z-20">
        {sidebarContent}
      </aside>

      {/* MOBILE drawer backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden animate-fade-in"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* MOBILE drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 z-50 md:hidden transform transition-transform duration-300 ease-in-out shadow-2xl ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Mobile Navigation"
        role="dialog"
        aria-modal={mobileOpen ? "true" : undefined}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
