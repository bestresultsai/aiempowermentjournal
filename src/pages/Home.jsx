import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

export default function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Logged-in users → /home (the comprehensive cohort overview).
  useEffect(() => {
    if (!loading && user) {
      navigate("/home", { replace: true });
    }
  }, [user, loading, navigate]);

  // Render nothing while we figure out auth (avoids a flash of the public page).
  if (loading || user) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#F8FAFC",
        padding: 20,
        textAlign: "center",
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <Logo size="lg" showTagline />
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0F172A", margin: "20px 0 8px", lineHeight: 1.3 }}>
        BestResults.AI Platform
      </h1>
      <p style={{ fontSize: 15, color: "#64748B", maxWidth: 460, lineHeight: 1.6, margin: "0 0 32px" }}>
        Log an AI Journal entry without signing in, or sign in to access your cohort, materials, and dashboard.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          to="/journal"
          style={{
            textDecoration: "none",
            background: "#2563EB",
            color: "#fff",
            padding: "14px 28px",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
          }}
        >
          Log a Journal Entry
        </Link>
        <Link
          to="/login"
          style={{
            textDecoration: "none",
            background: "#fff",
            color: "#2563EB",
            padding: "14px 28px",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            border: "2px solid #BFDBFE",
          }}
        >
          Sign In
        </Link>
      </div>

      <div style={{ marginTop: 48, display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
        {[
          { icon: "⏱️", label: "Time Saved",       desc: "Track hours saved per project" },
          { icon: "💰", label: "Value Created",    desc: "See annual dollar impact" },
          { icon: "🥋", label: "AI Empowerment",   desc: "Belt-ranked workshop series" },
        ].map((f) => (
          <div
            key={f.label}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "20px 24px",
              border: "1px solid #E2E8F0",
              width: 170,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>{f.label}</div>
            <div style={{ fontSize: 11, color: "#64748B" }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
