import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Plus, Home as HomeIcon, GraduationCap, NotebookPen, Library,
  ChevronDown, Check, Settings as SettingsIcon, LogOut, User,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getUserCohorts, STORAGE_KEY } from "../lib/cohortResolution";
import Logo from "./Logo";

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const userCohorts = getUserCohorts(user);
  const showSwitcher = userCohorts.length > 1;

  // Shrink-on-scroll: compress the header height + logo size once the user
  // scrolls past a small threshold so the page content gets more room.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll(); // initialize for cases where the page loads scrolled
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header
      className={
        "sticky top-0 z-40 backdrop-blur-md bg-surface-paper/90 border-b border-soft " +
        "transition-shadow duration-300 " +
        (scrolled ? "shadow-card" : "shadow-none")
      }
    >
      <div
        className={
          "max-w-[1180px] mx-auto px-6 lg:px-8 flex items-center justify-between " +
          "transition-[height] duration-300 ease-out " +
          (scrolled ? "h-20" : "h-36")
        }
      >
        <div className="flex items-center gap-8">
          <Link
            to={user ? "/home" : "/"}
            className="flex items-center transition-transform duration-200 hover:scale-[1.02]"
          >
            <Logo size={scrolled ? "md" : "lg"} />
          </Link>
          {user && (
            <nav className="hidden md:flex items-center gap-1 text-[15px]">
              <NavLink
                to="/home"
                active={pathname === "/home" || pathname.startsWith("/cohort")}
                icon={HomeIcon}
              >
                Home
              </NavLink>
              {showSwitcher && <CohortSwitcher cohorts={userCohorts} />}
              <NavLink to="/journey" active={pathname === "/journey"} icon={GraduationCap}>
                Journey
              </NavLink>
              <NavLink
                to="/journal"
                active={pathname === "/journal" || pathname === "/journal/result"}
                icon={NotebookPen}
              >
                Journal
              </NavLink>
              <NavLink to="/resources" active={pathname.startsWith("/resources")} icon={Library}>
                Resources
              </NavLink>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/journal/new"
            className="group hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-soft text-[14px] font-heading font-semibold text-ink hover:bg-surface-soft hover:border-brand-500 transition-all duration-200"
          >
            <Plus className="w-4 h-4 text-brand-600 transition-transform duration-200 group-hover:rotate-90" strokeWidth={2.5} />
            New Entry
          </Link>

          {user ? (
            <UserMenu user={user} onLogout={handleLogout} />
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-ink text-white text-[14px] font-heading font-semibold hover:bg-brand-700 transition-colors duration-200"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, active, icon: Icon, children }) {
  return (
    <Link
      to={to}
      className={
        "px-4 py-2 rounded-xl font-heading font-semibold transition-all duration-200 inline-flex items-center gap-2 " +
        (active
          ? "text-ink bg-ink/5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]"
          : "text-ink-muted hover:bg-ink/5 hover:text-ink")
      }
    >
      {Icon && <Icon className={"w-4 h-4 transition-colors " + (active ? "text-brand-600" : "")} strokeWidth={2} />}
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// User menu — avatar dropdown with Settings + Sign out.
// ---------------------------------------------------------------------------

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const initials = (user.name || "?")
    .split(" ").filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join("").toUpperCase();

  return (
    <div ref={ref} className="relative pl-4 border-l border-soft">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 group"
      >
        <div className="w-11 h-11 rounded-full bg-brand-700 text-white flex items-center justify-center text-[14px] font-heading font-bold transition-transform duration-200 group-hover:scale-105">
          {initials}
        </div>
        <div className="hidden sm:flex flex-col items-start leading-tight">
          <span className="text-[14px] font-heading font-semibold text-ink">
            {user.name?.split(" ")[0]}
          </span>
          <span className="text-[11px] text-ink-subtle inline-flex items-center gap-0.5">
            Menu <ChevronDown className={"w-3 h-3 transition-transform duration-200 " + (open ? "rotate-180" : "")} strokeWidth={2.5} />
          </span>
        </div>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 min-w-[240px] rounded-xl bg-surface-card border border-soft shadow-lift overflow-hidden z-50 animate-fade-in-up">
          <div className="px-4 py-3 border-b border-soft">
            <div className="text-[13.5px] font-heading font-bold text-ink truncate">{user.name}</div>
            <div className="text-[11.5px] text-ink-muted truncate mt-0.5">{user.email}</div>
          </div>
          <button
            onClick={() => { setOpen(false); navigate("/settings"); }}
            className="w-full px-4 py-2.5 text-left text-[13.5px] font-heading font-medium text-ink hover:bg-surface-soft transition-colors inline-flex items-center gap-2.5"
          >
            <User className="w-4 h-4 text-ink-muted" strokeWidth={2} />
            View profile
          </button>
          <button
            onClick={() => { setOpen(false); navigate("/settings"); }}
            className="w-full px-4 py-2.5 text-left text-[13.5px] font-heading font-medium text-ink hover:bg-surface-soft transition-colors inline-flex items-center gap-2.5"
          >
            <SettingsIcon className="w-4 h-4 text-ink-muted" strokeWidth={2} />
            Settings
          </button>
          <div className="border-t border-soft" />
          <button
            onClick={() => { setOpen(false); onLogout(); }}
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

// ---------------------------------------------------------------------------
// Cohort switcher — visible only for users with 2+ cohorts.
// ---------------------------------------------------------------------------

function CohortSwitcher({ cohorts }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const currentSlug = (() => {
    try {
      return typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;
    } catch {
      return null;
    }
  })();

  function selectCohort(slug) {
    try { window.localStorage.setItem(STORAGE_KEY, slug); } catch {}
    setOpen(false);
    navigate(`/cohort/${slug}`);
  }

  const current = cohorts.find((c) => c.slug === currentSlug) || cohorts[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="ml-1 px-2.5 py-1.5 rounded-lg text-[12px] font-heading font-semibold text-ink-muted hover:bg-ink/5 hover:text-ink transition-all duration-200 inline-flex items-center gap-1.5"
      >
        <span className="text-ink-subtle">{current?.programCode || "·"}</span>
        <ChevronDown className={"w-3 h-3 transition-transform duration-200 " + (open ? "rotate-180" : "")} strokeWidth={2.5} />
      </button>
      {open && (
        <div className="absolute top-full mt-2 left-0 min-w-[260px] rounded-xl bg-surface-card border border-soft shadow-lift overflow-hidden z-50 animate-fade-in-up">
          <div className="px-4 py-2.5 text-[10px] font-heading font-bold uppercase tracking-wider text-ink-subtle border-b border-soft">
            Switch cohort
          </div>
          {cohorts.map((c) => (
            <button
              key={c.slug}
              onClick={() => selectCohort(c.slug)}
              className="w-full text-left px-4 py-3 hover:bg-surface-soft transition-colors flex items-start gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-heading font-bold text-ink truncate">{c.name}</div>
                <div className="text-[11.5px] text-ink-muted mt-0.5">
                  {c.methodName} · {c.programCode}
                </div>
              </div>
              {c.slug === current?.slug && (
                <Check className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" strokeWidth={2.5} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
