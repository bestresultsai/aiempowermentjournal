import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Plus, LayoutDashboard, GraduationCap, NotebookPen, LogOut, ChevronDown, Check,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getUserCohorts, STORAGE_KEY } from "../lib/cohortResolution";
import Logo from "./Logo";

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Available cohorts for the user (used by the switcher).
  const userCohorts = getUserCohorts(user);
  const showSwitcher = userCohorts.length > 1;

  function handleLogout() {
    logout();
    navigate("/");
  }

  const initials = (user?.name || "?")
    .split(" ").filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-surface-paper/90 border-b border-soft">
      <div className="max-w-[1180px] mx-auto px-6 lg:px-8 h-36 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link to={user ? "/journey" : "/"} className="flex items-center transition-transform duration-200 hover:scale-[1.02]">
            <Logo size="lg" />
          </Link>
          {user && (
            <nav className="hidden md:flex items-center gap-1 text-[15px]">
              <NavLink
                to="/journey"
                active={pathname === "/journey" || pathname.startsWith("/cohort")}
                icon={GraduationCap}
              >
                Journey
              </NavLink>
              {showSwitcher && <CohortSwitcher cohorts={userCohorts} />}
              <NavLink
                to="/journal"
                active={pathname === "/journal" || pathname === "/journal/result"}
                icon={LayoutDashboard}
              >
                Journal
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
            <div className="flex items-center gap-3 pl-4 border-l border-soft">
              <div className="w-11 h-11 rounded-full bg-brand-700 text-white flex items-center justify-center text-[14px] font-heading font-bold transition-transform duration-200 hover:scale-105 cursor-pointer">
                {initials}
              </div>
              <div className="hidden sm:flex flex-col leading-tight">
                <span className="text-[14px] font-heading font-semibold text-ink">
                  {user.name?.split(" ")[0]}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-[11px] text-ink-subtle hover:text-ink transition-colors text-left inline-flex items-center gap-1"
                >
                  <LogOut className="w-2.5 h-2.5" /> Sign out
                </button>
              </div>
            </div>
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
// Cohort switcher — only renders when the user has 2+ cohorts. Lets them
// jump between cohorts without leaving the Journey page. Updates the
// `STORAGE_KEY` localStorage so /journey resolves to the picked cohort next
// time too.
// ---------------------------------------------------------------------------
function CohortSwitcher({ cohorts }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);

  // Click-outside to close.
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
    try {
      window.localStorage.setItem(STORAGE_KEY, slug);
    } catch {
      /* ignore */
    }
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
              className="w-full text-left px-4 py-3 hover:bg-surface-soft transition-colors flex items-start gap-3 group"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-heading font-bold text-ink truncate">
                  {c.name}
                </div>
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
