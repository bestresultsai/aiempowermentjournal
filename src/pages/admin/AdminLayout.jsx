import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, BookCheck, GraduationCap, ArrowLeft,
  Shield, LogOut, ChevronDown, NotebookPen, Plus, User as UserIcon,
  Calendar as CalendarIcon, Building2, Lock, Eye, X, Library, Lightbulb,
  MessageSquare, Quote, Mail,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getRoleLabel,
  canCreateCohorts,
  canManageRoles,
  canAssignRoles,
  canGradeHomework,
} from "../../lib/adminRoles";
import { setupParticipantRealtime } from "../../lib/adminMockData";
import { APP_CONFIG } from "../../lib/appConfig";
import { useViewAs, VIEW_AS_LABELS } from "../../lib/viewAs";
import Logo from "../../components/Logo";
import NotificationBell from "../../components/admin/NotificationBell";

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

// Sidebar nav — see docs/admin-visibility-matrix.md for the canonical role
// → entry mapping. `requires` keys map to permission helpers below.
const NAV = [
  { to: "/admin",              label: "Dashboard",     icon: LayoutDashboard, end: true },
  { to: "/admin/calendar",     label: "Calendar",      icon: CalendarIcon },
  { to: "/admin/cohorts",      label: "Cohorts",       icon: GraduationCap },
  { to: "/admin/journal",      label: "AI Journal",    icon: NotebookPen },
  // Innovations — the cohort-tagged wins worth celebrating. Mirrors the
  // AI Journal scope, but filtered to entries flagged as innovations.
  { to: "/admin/innovations",  label: "Innovations",   icon: Lightbulb },
  // Feedback — facilitator + admin view of per-session participant feedback.
  { to: "/admin/feedback",     label: "Feedback",      icon: MessageSquare },
  // Testimonials — review queue for program-completion testimonials.
  { to: "/admin/testimonials", label: "Testimonials",  icon: Quote },
  // Homework is the facilitator's grading queue — org admins don't grade,
  // so this stays gated to roles that can act on submissions.
  { to: "/admin/homework",     label: "Homework",      icon: BookCheck, requires: "grade" },
  { to: "/admin/participants", label: "Participants",  icon: Users },
  // Platform-level surfaces — super + admin only.
  { to: "/admin/orgs",         label: "Organizations", icon: Building2, requires: "create" },
  { to: "/admin/facilitators", label: "Facilitators",  icon: Users, requires: "create" },
  // Programs catalog — curriculum templates. Same permission gate as orgs:
  // creating a program is a platform-level write, not a per-cohort one.
  { to: "/admin/programs",     label: "Programs",      icon: Library, requires: "create" },
  // Email templates — preview every transactional email the platform sends.
  // Same permission gate as Programs (platform-level write surface).
  { to: "/admin/emails",       label: "Emails",        icon: Mail, requires: "create" },
  // Resources library — curated content (videos, prompts, templates) shown
  // to participants on /resources. Available to anyone who can manage the
  // platform; per-cohort facilitators don't need this surface.
  { to: "/admin/resources",    label: "Resources",     icon: Library, requires: "create" },
  { to: "/admin/users",        label: "Users",         icon: Shield, requires: "assign" },
  // Permissions surface — Super only.
  { to: "/admin/permissions",  label: "Permissions",   icon: Lock, requires: "super" },
];

// Permission gate for sidebar items. Defaults to allow when no `requires`.
function navAllowed(item, user) {
  if (!item.requires) return true;
  if (item.requires === "super") return canManageRoles(user);
  if (item.requires === "create") return canCreateCohorts(user);
  if (item.requires === "assign") return canAssignRoles(user);
  if (item.requires === "grade") return canGradeHomework(user);
  return true;
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const roleLabel = getRoleLabel(user?.role);

  // Live participant sync (task #550). While an admin is inside /admin/*,
  // subscribe to Supabase Realtime on profiles + cohort_participants so
  // roster + user directory refresh automatically as invites land, other
  // admins add rows in a second tab, or Supabase migrations tweak fields.
  // Silent no-op when Supabase isn't wired.
  useEffect(() => {
    const teardown = setupParticipantRealtime();
    return () => teardown?.();
  }, []);

  return (
    <div className="min-h-screen bg-surface-paper flex">
      {/* ---------------- Sidebar (desktop) ----------------
           Sticky to the viewport so it stays visible on long pages.
           `h-screen` + own `overflow-y-auto` lets the sidebar scroll
           independently if its own content overflows. */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-ink text-white sticky top-0 h-screen overflow-y-auto">
        <div className="px-5 py-6 border-b border-white/10">
          <Logo size="md" dark />
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-[10px] font-heading font-bold uppercase tracking-wider">
            <Shield className="w-3 h-3" strokeWidth={3} />
            Admin
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.filter((item) => navAllowed(item, user)).map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}

          {/* Quick create — separated from the main nav with a divider so the
              action reads as distinct from regular nav items. Each link gates
              on its own permission helper. */}
          {(canCreateCohorts(user) || canAssignRoles(user)) && (
            <div className="pt-6 mt-4 border-t border-white/10 space-y-2">
              {canCreateCohorts(user) && (
                <Link
                  to="/admin/cohorts/new"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-heading font-bold transition-all duration-200 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 hover:text-emerald-200 hover:border-emerald-400/40"
                >
                  <Plus className="w-4 h-4" strokeWidth={3} />
                  New cohort
                </Link>
              )}
              {canAssignRoles(user) && (
                <Link
                  to="/admin/users/new"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-heading font-bold transition-all duration-200 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 hover:text-emerald-200 hover:border-emerald-400/40"
                >
                  <Plus className="w-4 h-4" strokeWidth={3} />
                  New user
                </Link>
              )}
            </div>
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

          {/* Notification bell — derives notifications from existing data
              sources (homework, journal, feedback) scoped to the user's
              cohorts. Hidden by useNotifications when scope is empty. */}
          <div className="flex items-center gap-3">
            <NotificationBell />
            {/* Identity chip — opens a small dropdown with Settings + Sign out
                so admins can manage their own profile without leaving /admin. */}
            <AdminUserMenu user={user} roleLabel={roleLabel} onLogout={logout} />
          </div>
        </header>

        {/* Mobile collapse nav */}
        {mobileOpen && (
          <nav className="lg:hidden border-b border-soft bg-surface-card px-3 py-2">
            {NAV.filter((item) => navAllowed(item, user)).map((item) => (
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
            href={`mailto:${APP_CONFIG.emails.support}`}
            className="px-2 py-1 rounded hover:bg-white/5 hover:text-white transition-colors"
          >
            Support
          </a>
        </nav>
      </div>
    </footer>
  );
}

// ---- Admin user menu (top bar avatar dropdown) ----
function AdminUserMenu({ user, roleLabel, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  // View-as switcher — same options as the participant NavBar so an admin
  // can step down to any lower role without leaving /admin.
  const { mode: viewAsMode, set: setViewAs, clear: clearViewAs, availableRoles: viewAsRoles } = useViewAs(user);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const initials = (user?.name || "?")
    .split(" ").filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join("").toUpperCase();
  const hasHeadshot = !!user?.headshotUrl;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 group"
      >
        <div className="hidden sm:flex flex-col items-end leading-tight">
          <span className="text-[13px] font-heading font-bold text-ink">
            {user?.name}
          </span>
          <span className="text-[11px] text-ink-muted">{roleLabel}</span>
        </div>
        {hasHeadshot ? (
          <img
            src={user.headshotUrl}
            alt=""
            className="w-10 h-10 rounded-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-brand-700 text-white flex items-center justify-center text-[12px] font-heading font-bold transition-transform duration-200 group-hover:scale-105">
            {initials}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 min-w-[240px] rounded-xl bg-surface-card border border-soft shadow-lift overflow-hidden z-50 animate-fade-in-up">
          <div className="px-4 py-3 border-b border-soft">
            <div className="text-[13.5px] font-heading font-bold text-ink truncate">{user?.name}</div>
            <div className="text-[11.5px] text-ink-muted truncate mt-0.5">{user?.email}</div>
            <div className="inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-heading font-bold uppercase tracking-wider bg-brand-50 text-brand-700">
              {roleLabel}
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setOpen(false); navigate("/settings"); }}
            className="w-full px-4 py-2.5 text-left text-[13.5px] font-heading font-medium text-ink hover:bg-surface-soft transition-colors inline-flex items-center gap-2.5"
          >
            <UserIcon className="w-4 h-4 text-ink-muted" strokeWidth={2} />
            View profile
          </button>
          {/* Preview onboarding — opens the participant /welcome wizard
              without resetting the admin's own onboarding state. The
              ?preview=1 flag bypasses the OnboardingGate redirect. Useful
              for QA + sales demos. */}
          <button
            type="button"
            onClick={() => { setOpen(false); navigate("/welcome?preview=1"); }}
            className="w-full px-4 py-2.5 text-left text-[13.5px] font-heading font-medium text-ink hover:bg-surface-soft transition-colors inline-flex items-center gap-2.5"
          >
            <Eye className="w-4 h-4 text-ink-muted" strokeWidth={2} />
            Preview onboarding
          </button>
          {/* View as — admin can step down to any lower role to preview the
              platform from that role's perspective. Persists across pages
              via the view-as banner; the existing "Participant view" entry
              from earlier rounds is now part of this switcher. */}
          {viewAsRoles.length > 0 && (
            <>
              <div className="border-t border-soft" />
              <div className="px-4 pt-3 pb-1 text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
                View as
              </div>
              {viewAsRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    // Set the view-as mode FIRST so RoleAwareHome at /home
                    // routes to the participant view instead of bouncing
                    // back to /admin.
                    setViewAs(role);
                    navigate("/home");
                  }}
                  className={`w-full px-4 py-2.5 text-left text-[13.5px] font-heading font-medium hover:bg-surface-soft transition-colors inline-flex items-center gap-2.5 ${
                    viewAsMode === role ? "text-brand-700" : "text-ink"
                  }`}
                >
                  <Eye className={`w-4 h-4 ${viewAsMode === role ? "text-brand-700" : "text-ink-muted"}`} strokeWidth={2} />
                  {VIEW_AS_LABELS[role]}
                  {viewAsMode === role && (
                    <span className="ml-auto text-[10.5px] font-heading font-bold uppercase tracking-wider text-brand-700">
                      Active
                    </span>
                  )}
                </button>
              ))}
              {viewAsMode && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    clearViewAs();
                    navigate("/admin");
                  }}
                  className="w-full px-4 py-2.5 text-left text-[13.5px] font-heading font-medium text-ink-muted hover:text-ink hover:bg-surface-soft transition-colors inline-flex items-center gap-2.5"
                >
                  <X className="w-4 h-4" strokeWidth={2} />
                  Exit view-as
                </button>
              )}
            </>
          )}
          <div className="border-t border-soft" />
          <button
            type="button"
            onClick={() => { setOpen(false); onLogout(); window.location.href = "/"; }}
            className="w-full px-4 py-2.5 text-left text-[13.5px] font-heading font-medium text-ink hover:bg-surface-soft transition-colors inline-flex items-center gap-2.5"
          >
            <LogOut className="w-4 h-4 text-ink-muted" strokeWidth={2} />
            Sign out
          </button>
        </div>
      )}
    </div>
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
    calendar: "Calendar",
    cohorts: "Cohorts",
    journal: "AI Journal",
    homework: "Homework",
    users: "Users",
    participants: "Participants",
    orgs: "Organizations",
    facilitators: "Facilitators",
    permissions: "Permissions",
    super: "Users",
    new: "New",
    edit: "Edit",
  };
  // For unmapped segments (cohort slugs, participant ids), title-case each
  // word so breadcrumbs read consistently rather than dropping in raw slugs.
  function titleCase(s) {
    return s.split(/[-_]/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  }
  const trail = parts.map((p) => labels[p] || titleCase(p));
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
