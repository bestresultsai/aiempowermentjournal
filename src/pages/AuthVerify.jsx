import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
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
//
// Styling matches the Login page: warm beige background, white card,
// brand fonts, Lucide icons. No inline styles, no emojis.
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
    if (loading) return;
    if (user) {
      setStatus("success");
      const t = setTimeout(() => navigate(next, { replace: true }), 600);
      return () => clearTimeout(t);
    }
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
      .then((data) => {
        login(data.token, data.user);
        setStatus("success");
        setTimeout(() => navigate(next, { replace: true }), 800);
      })
      .catch((err) => {
        setStatus("error");
        setErrorMsg(err.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-[420px] bg-surface-card border border-soft rounded-2xl p-8 sm:p-10 text-center shadow-sm animate-fade-in-up">
        <div className="flex justify-center mb-6">
          <Logo size="md" />
        </div>

        {status === "verifying" && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" strokeWidth={2.25} />
            </div>
            <h1 className="font-heading text-[22px] font-extrabold tracking-tight text-ink leading-tight mb-1.5">
              Signing you in…
            </h1>
            <p className="text-[14px] text-ink-muted leading-relaxed">
              Hang tight — verifying your magic link.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" strokeWidth={2.25} />
            </div>
            <h1 className="font-heading text-[22px] font-extrabold tracking-tight text-ink leading-tight mb-1.5">
              You're signed in
            </h1>
            <p className="text-[14px] text-ink-muted leading-relaxed">
              Redirecting you now…
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <XCircle className="w-6 h-6" strokeWidth={2.25} />
            </div>
            <h1 className="font-heading text-[22px] font-extrabold tracking-tight text-ink leading-tight mb-1.5">
              We couldn't sign you in
            </h1>
            <p className="text-[14px] text-ink-muted leading-relaxed mb-6">
              {errorMsg}
            </p>
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="inline-flex items-center justify-center bg-ink text-white font-heading font-bold text-[14px] px-5 py-2.5 rounded-xl hover:bg-ink/90 transition-colors"
            >
              Back to sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
