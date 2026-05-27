import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MOCK_COHORT } from "../lib/mockCohort";
import Logo from "./Logo";

// Mock mode: every signed-in user's "My Cohort" link points to the prototype cohort.
// Live mode: derive the slug from the user's first assignedCohorts entry.
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
    <header className="sticky top-0 z-40 backdrop-blur-md bg-surface-paper/85 border-b border-soft">
      <div className="max-w-[1180px] mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to={user ? "/dashboard" : "/"} className="flex items-center">
            <Logo size="sm" />
          </Link>
          {user && (
            <nav className="hidden md:flex items-center gap-1 text-[14px]">
              <NavLink to={cohortSlug ? `/cohort/${cohortSlug}` : "/dashboard"} active={pathname.startsWith("/cohort")}>
                My Cohort
              </NavLink>
              <NavLink to="/dashboard" active={pathname === "/dashboard"}>
                Dashboard
              </NavLink>
              <NavLink to="/journal" active={pathname.startsWith("/journal")}>
                Journal
              </NavLink>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/journal"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-soft text-[13px] font-medium text-ink hover:bg-surface-soft transition"
          >
            <span className="text-brand-600 font-bold">+</span> New Entry
          </Link>

          {user ? (
            <div className="flex items-center gap-2.5 pl-3 border-l border-soft">
              <div className="w-8 h-8 rounded-full bg-brand-700 text-white flex items-center justify-center text-[12px] font-semibold font-heading">
                {initials}
              </div>
              <span className="hidden sm:block text-[13px] font-medium text-ink">
                {user.name?.split(" ")[0]}
              </span>
              <button
                onClick={handleLogout}
                className="text-[12px] text-ink-subtle hover:text-ink px-1 transition"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center px-4 py-1.5 rounded-lg bg-ink text-white text-[13px] font-semibold hover:bg-brand-700 transition"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={
        "px-3 py-1.5 rounded-lg font-heading font-medium transition " +
        (active ? "text-ink bg-ink/5" : "text-ink-muted hover:bg-ink/5 hover:text-ink")
      }
    >
      {children}
    </Link>
  );
}
