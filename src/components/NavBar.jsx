import { Link, useLocation, useNavigate } from "react-router-dom";
import { Plus, LayoutDashboard, GraduationCap, NotebookPen, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { MOCK_COHORT } from "../lib/mockCohort";
import Logo from "./Logo";

function cohortSlugForUser(user) {
  if (!user) return null;
  return MOCK_COHORT.slug;
}

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const cohortSlug = cohortSlugForUser(user);

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
          <Link to={user ? "/dashboard" : "/"} className="flex items-center transition-transform duration-200 hover:scale-[1.02]">
            <Logo size="lg" />
          </Link>
          {user && (
            <nav className="hidden md:flex items-center gap-1 text-[15px]">
              <NavLink to={cohortSlug ? `/cohort/${cohortSlug}` : "/dashboard"} active={pathname.startsWith("/cohort")} icon={GraduationCap}>
                My Cohort
              </NavLink>
              <NavLink to="/dashboard" active={pathname === "/dashboard"} icon={LayoutDashboard}>
                Dashboard
              </NavLink>
              <NavLink to="/journal" active={pathname.startsWith("/journal")} icon={NotebookPen}>
                Journal
              </NavLink>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/journal"
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
