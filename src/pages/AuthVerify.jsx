import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { verifyToken } from "../lib/api";
import { isSupabaseEnabled } from "../lib/supabase";
import Logo from "../components/Logo";
import { safeNext } from "../components/AuthGate";

// ---------------------------------------------------------------------------
// AuthVerify
//
// Landing page for magic-link clicks. Two modes:
//
//   1. Supabase mode (env vars set): the SDK auto-consumes the
//      #access_token=... hash on first client init. We just wait for
//      AuthContext to flip from loading → user present, then navigate.
//
//   2. Legacy mode (no env vars): we extract ?token= from the query, post
//      it to /api/auth/verify, then call login() with the returned token +
//      user object.
// ---------------------------------------------------------------------------

export default function AuthVerify() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying");
  const [errorMsg, setErrorMsg] = useState("");
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const next = safeNext(searchParams.get("next")) || "/home";

  // ---- Supabase mode ------------------------------------------------------
  useEffect(() => {
    if (!isSupabaseEnabled()) return;
    // Wait for AuthContext to hydrate. The Supabase client consumes the
    // #access_token hash automatically on first init; AuthContext picks
    // up the SIGNED_IN event and sets `user`.
    if (loading) return;
    if (user) {
      setStatus("success");
      const t = setTimeout(() => navigate(next, { replace: true }), 600);
      return () => clearTimeout(t);
    }
    // No user, no loading — the hash either didn't contain a valid token
    // or the user has no profile row. Give it ~3s grace then show error.
    const t = setTimeout(() => {
      setStatus("error");
      setErrorMsg("The link didn't sign you in. It may have expired or already been used.");
    }, 3000);
    return () => clearTimeout(t);
  }, [user, loading, next, navigate]);

  // ---- Legacy mode --------------------------------------------------------
  useEffect(() => {
    if (isSupabaseEnabled()) return;
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setErrorMsg("No token provided");
      return;
    }
    verifyToken(token)
      .then(data => {
        login(data.token, data.user);
        setStatus("success");
        setTimeout(() => navigate(next, { replace: true }), 800);
      })
      .catch(err => {
        setStatus("error");
        setErrorMsg(err.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#F8FAFC", padding: 20,
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "40px 32px",
        border: "1px solid #E2E8F0", maxWidth: 400, width: "100%",
        textAlign: "center",
      }}>
        <Logo size="md" />
        <div style={{ marginTop: 24 }}>
          {status === "verifying" && (
            <>
              <div style={{ fontSize: 28, marginBottom: 12 }}>🔐</div>
              <div style={{ fontWeight: 600, color: "#0F172A" }}>Verifying your login...</div>
            </>
          )}
          {status === "success" && (
            <>
              <div style={{ fontSize: 28, marginBottom: 12 }}>✅</div>
              <div style={{ fontWeight: 600, color: "#059669" }}>You're signed in! Redirecting...</div>
            </>
          )}
          {status === "error" && (
            <>
              <div style={{ fontSize: 28, marginBottom: 12 }}>❌</div>
              <div style={{ fontWeight: 600, color: "#DC2626", marginBottom: 8 }}>Login Failed</div>
              <div style={{ fontSize: 13, color: "#64748B" }}>{errorMsg}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
