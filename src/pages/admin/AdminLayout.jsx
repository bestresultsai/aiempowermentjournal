import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, BookCheck, GraduationCap, ArrowLeft,
  Shield, LogOut, ChevronDown, NotebookPen, Plus,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getRoleLabel, canCreateCohorts } from "../../lib/adminRoles";
import Logo from "../../components/Logo";

// ---------------------------------------------------------------------------
// AdminLayout — the shell every /admin/* page lives inside.
//
// Visually distinct from the participant app:
//   - Dark slate sidebar on the left (vs the warm paper bg of participant pages)
//   - Top bar showing the role chip + a Back-to-app exit
//   - <Outlet /> for the active child route
//
// Sidebar collapses to icons-only at md and below — mobile gets a top-bar
// menu instead.
// ---------------------------------------------------------------------------

const NAV = [
  { to: "/admin",            label: "Dashboard",    icon: LayoutDashboard, end: true },
  { to: "/admin/cohorts",    label: "Cohorts",      icon: GraduationCap },
  { to: "/admin/journal",    label: "AI Journal",   icon: NotebookPen },
  { to: "/admin/homework",   label: "Homework",     icon: BookCheck },
  { to: "/admin/users",      label: "Participants", icon: Users },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const roleLabel = getRoleLabel(user?.role);

  return (
    <div className="min-h-screen bg-surface-paper flex">
      {/* ---------------- Sidebar (desktop) ---------------- */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-ink text-white">
        <div className="px-5 py-6 border-b border-white/10">
          <Logo size="md" dark />
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-[10px] font-heading font-bold uppercase tracking-wider">
            <Shield className="w-3 h-3" strokeWidth={3} />
            Admin
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}

          {/* Quick create — separated from the main nav with a divider so the
              action reads as distinct from regular nav items. Only visible to
              roles that can create cohorts. */}
          {canCreateCohorts(user) && (
            <>
              <div className="mx-3 my-4 border-t border-white/10" />
              <Link
                to="/admin/cohorts/new"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-heading font-bold transition-all duration-200 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 hover:text-emerald-200 hover:border-emerald-400/40"
              >
                <Plus className="w-4 h-4" strokeWidth={3} />
                New cohort
              </Link>
            </>
          )}
        </nav>

        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <Link
            to="/home"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-heading font-semibold text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
            Back to app
          </Link>
          <button
            onClick={() => { logout(); window.location.href = "/"; }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-heading font-semibold text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-4 h-4" strokeWidth={2.5} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ---------------- Main area ---------------- */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="bg-surface-card border-b border-soft px-5 lg:px-8 py-4 flex items-center justify-between gap-4">
          {/* Mobile: logo + menu button */}
          <div className="lg:hidden flex items-center gap-3">
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="p-2 rounded-lg border border-soft text-ink-muted hover:bg-surface-soft"
              aria-label="Toggle navigation"
            >
              <ChevronDown className={"w-4 h-4 transition-transform " + (mobileOpen ? "rotate-180" : "")} strokeWidth={2.5} />
            </button>
            <Logo size="sm" />
          </div>

          {/* Crumb / title */}
          <div className="hidden lg:block min-w-0 flex-1">
            <BreadCrumb path={pathname} />
          </div>

          {/* Identity chip */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-[13px] font-heading font-bold text-ink">
                {user?.name}
              </span>
              <span className="text-[11px] text-ink-muted">{roleLabel}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-brand-700 text-white flex items-center justify-center text-[12px] font-heading font-bold">
              {(user?.name || "?").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
            </div>
          </div>
        </header>

        {/* Mobile collapse nav */}
        {mobileOpen && (
          <nav className="lg:hidden border-b border-soft bg-surface-card px-3 py-2">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-heading font-semibold transition-colors " +
                  (isActive
                    ? "bg-ink/5 text-ink"
                    : "text-ink-muted hover:bg-ink/5 hover:text-ink")
                }
              >
                <item.icon className="w-4 h-4" strokeWidth={2.25} />
                {item.label}
              </NavLink>
            ))}
            <Link
              to="/home"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-heading font-semibold text-ink-muted hover:bg-ink/5 hover:text-ink"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
              Back to app
            </Link>
          </nav>
        )}

        {/* Page content */}
        <main className="flex-1 px-5 lg:px-8 py-6 lg:py-8 max-w-[1280px] w-full mx-auto">
          <Outlet />
        </main>

        {/* Admin footer — matches the sidebar so the dark shell wraps the
            entire admin area. Kept minimal to not compete with page content. */}
        <AdminFooter />
      </div>
    </div>
  );
}

function AdminFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-ink text-white/70 border-t border-white/10 mt-8">
      <div className="max-w-[1280px] mx-auto px-5 lg:px-8 py-5 flex items-center justify-between gap-4 flex-wrap text-[11.5px] font-heading">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-white/50" strokeWidth={2.5} />
          <span>© {year} BestResults.AI · Admin panel</span>
        </div>
        <nav className="flex items-center gap-1.5">
          <Link to="/home" className="px-2 py-1 rounded hover:bg-white/5 hover:text-white transition-colors">
            Back to app
          </Link>
          <span className="text-white/20">·</span>
          <a
            href="mailto:support@bestresults.ai"
            className="px-2 py-1 rounded hover:bg-white/5 hover:text-white transition-colors"
          >
            Support
          </a>
        </nav>
      </div>
    </footer>
  );
}

// ---- Sidebar link ----
function SidebarLink({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-heading font-semibold transition-colors duration-150 " +
        (isActive
          ? "bg-white/10 text-white"
          : "text-white/65 hover:text-white hover:bg-white/5")
      }
    >
      <Icon className="w-4 h-4" strokeWidth={2.25} />
      {label}
    </NavLink>
  );
}

// ---- Breadcrumb ----
function BreadCrumb({ path }) {
  const parts = path.split("/").filter(Boolean); // ["admin", "cohorts", ":slug"]
  const labels = {
    admin: "Admin",
    cohorts: "Cohorts",
    journal: "AI Journal",
    homework: "Homework",
    users: "Participants",
  };
  const trail = parts.map((p, i) => labels[p] || p);
  return (
    <div className="text-[13px] text-ink-muted font-heading">
      {trail.map((label, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-1.5 text-ink-subtle">/</span>}
          <span className={i === trail.length - 1 ? "text-ink font-semibold" : ""}>
            {label}
          </span>
        </span>
      ))}
    </div>
  );
}
