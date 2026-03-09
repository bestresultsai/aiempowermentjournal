import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <nav style={{
      background: "#fff", borderBottom: "1px solid #E2E8F0",
      padding: "10px 20px", display: "flex", alignItems: "center",
      justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Link to="/" style={{ textDecoration: "none" }}>
          <Logo size="sm" />
        </Link>
        <div style={{ width: 1, height: 28, background: "#E2E8F0" }} />
        <span style={{
          color: "#64748B", fontSize: 13, fontWeight: 500,
        }}>
          AI Empowerment Journal
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link to="/journal" style={{
          textDecoration: "none", color: "#2563EB", fontSize: 13,
          fontWeight: 600, padding: "6px 14px", borderRadius: 8,
          border: "1px solid #BFDBFE", background: "#EFF6FF",
        }}>
          + New Entry
        </Link>

        {user ? (
          <>
            <Link to="/dashboard" style={{
              textDecoration: "none", color: "#0F172A", fontSize: 13,
              fontWeight: 500,
            }}>
              Dashboard
            </Link>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "4px 12px", borderRadius: 8, background: "#F8FAFC",
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", background: "#2563EB",
                color: "#fff", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 12, fontWeight: 700,
              }}>
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>
                {user.name?.split(" ")[0]}
              </span>
              <button onClick={handleLogout} style={{
                background: "none", border: "none", color: "#94A3B8",
                cursor: "pointer", fontSize: 12, padding: "2px 4px",
              }}>
                Logout
              </button>
            </div>
          </>
        ) : (
          <Link to="/login" style={{
            textDecoration: "none", color: "#fff", fontSize: 13,
            fontWeight: 600, padding: "6px 16px", borderRadius: 8,
            background: "#2563EB",
          }}>
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
