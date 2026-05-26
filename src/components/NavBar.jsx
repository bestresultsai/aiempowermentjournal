import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MOCK_COHORT } from "../lib/mockCohort";
import Logo from "./Logo";

// Mock-mode: every signed-in user's "My Cohort" link points to the prototype cohort.
// Live mode: derive the slug from the user's first assignedCohorts entry via the Cohorts DB.
function cohortSlugForUser(user) {
  if (!user) return null;
  return MOCK_COHORT.slug;
}

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  const cohortSlug = cohortSlugForUser(user);

  return (
    <nav
      style={{
        background: "#fff",
        borderBottom: "1px solid #E2E8F0",
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Link to={user ? "/dashboard" : "/"} style={{ textDecoration: "none" }}>
          <Logo size="sm" />
        </Link>
        <div style={{ width: 1, height: 28, background: "#E2E8F0" }} />
        <span style={{ color: "#64748B", fontSize: 13, fontWeight: 500 }}>
          BestResults.AI Platform
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {user && cohortSlug && (
          <Link to={`/cohort/${cohortSlug}`} style={navLink}>
            My Cohort
          </Link>
        )}
        {user && (
          <Link to="/dashboard" style={navLink}>
            Dashboard
          </Link>
        )}
        <Link
          to="/journal"
          style={{
            textDecoration: "none",
            color: "#2563EB",
            fontSize: 13,
            fontWeight: 600,
            padding: "6px 14px",
            borderRadius: 8,
            border: "1px solid #BFDBFE",
            background: "#EFF6FF",
          }}
        >
          + New Entry
        </Link>

        {user ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 12px",
              borderRadius: 8,
              background: "#F8FAFC",
              marginLeft: 4,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "#2563EB",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {user.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>
              {user.name?.split(" ")[0]}
            </span>
            <button
              onClick={handleLogout}
              style={{
                background: "none",
                border: "none",
                color: "#94A3B8",
                cursor: "pointer",
                fontSize: 12,
                padding: "2px 4px",
              }}
            >
              Logout
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            style={{
              textDecoration: "none",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              padding: "6px 16px",
              borderRadius: 8,
              background: "#2563EB",
              marginLeft: 4,
            }}
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}

const navLink = {
  textDecoration: "none",
  color: "#0F172A",
  fontSize: 13,
  fontWeight: 600,
  padding: "6px 10px",
  borderRadius: 8,
};
