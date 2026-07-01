import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { safeNext } from "../components/AuthGate";
import {
  Mail, ArrowRight, GraduationCap, NotebookPen, Trophy, CheckCircle2,
} from "lucide-react";
import Logo from "../components/Logo";
import { sendMagicLink } from "../lib/api";
import { HERO_GRADIENT } from "../lib/mockCohort";

// localStorage flag — set once a user successfully requests a magic link.
// Used to differentiate first-time vs returning visitors in the UI copy.
const HAS_SIGNED_IN_KEY = "brai_has_signed_in";

export default function Login() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState("");
  const [hasVisited, setHasVisited] = useState(false);
  // Where to land after sign-in. Set by AuthGate when an unauthed user
  // tries to visit a protected route. Falls back to /home.
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  useEffect(() => {
    try {
      setHasVisited(localStorage.getItem(HAS_SIGNED_IN_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    try {
      await sendMagicLink(email.trim(), { next });
      setStatus("sent");
      // Mark this device as having signed in so the next visit feels familiar.
      try {
        localStorage.setItem(HAS_SIGNED_IN_KEY, "1");
      } catch {
        /* ignore */
      }
    } catch (err) {
      setErrorMsg(humanizeAuthError(err));
      setStatus("error");
    }
  }

// Turn a raw Supabase auth error into a friendly one-line message. Supabase
// sometimes returns a 504 with an empty JSON body, which used to render as
// literal "{}" in the UI. This function normalizes all the shapes we've seen
// (timeout, rate limit, network, unknown) into human copy.
function humanizeAuthError(err) {
  const status = err?.status ?? err?.statusCode ?? null;
  const rawMsg = typeof err?.message === "string" ? err.message.trim() : "";
  const looksEmpty = !rawMsg || rawMsg === "{}" || rawMsg === "null" || rawMsg === "undefined";

  // Supabase Auth's SMTP relay is slow — this is the "empty {}" case that shows
  // up most often for us right now.
  if (status === 504 || /timeout|deadline/i.test(rawMsg)) {
    return "Our email service is a little slow right now. Please try again in a moment.";
  }
  if (status === 429 || /rate.?limit/i.test(rawMsg)) {
    return "Too many attempts. Wait a minute before trying again.";
  }
  if (status === 400 && /(invalid|not.?found|user.?not.?found)/i.test(rawMsg)) {
    return "We couldn't find an account for that email. Ask your BestResults.AI admin to invite you.";
  }
  if (looksEmpty) {
    return "Something went wrong sending your link. Please try again in a moment.";
  }
  return rawMsg;
}

  return (
    <div className="min-h-screen bg-surface-paper flex flex-col">
      <div className="flex-1 grid lg:grid-cols-[1.05fr_1fr]">
        {/* ---------- LEFT: marketing / brand pane ---------- */}
        <aside
          className="relative overflow-hidden hidden lg:flex flex-col justify-between p-10 xl:p-14 text-white"
          style={{ background: HERO_GRADIENT }}
        >
          <div className="absolute inset-0 grain opacity-40 pointer-events-none" />

          {/* Logo top (larger so it anchors the pane) */}
          <div className="relative flex items-center gap-3">
            <Logo size="lg" dark />
          </div>

          {/* Headline + bullets — copy varies for first-time vs returning visitors */}
          <div className="relative max-w-md">
            <div className="inline-flex items-center gap-2 text-[11px] font-heading font-semibold tracking-[0.18em] uppercase text-white/70 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              BestResults.AI Platform
            </div>
            <h1 className="font-heading text-[42px] xl:text-[52px] leading-[1.04] font-extrabold mb-6">
              {hasVisited ? (
                <>
                  Welcome back.<br />
                  <span className="text-white/65 font-light italic">Pick up where you left off.</span>
                </>
              ) : (
                <>
                  Welcome.<br />
                  <span className="text-white/65 font-light italic">Your AI Empowerment journey starts here.</span>
                </>
              )}
            </h1>
            <p className="text-[15px] leading-relaxed text-white/80 mb-8">
              {hasVisited
                ? "Your cohort, your sessions, and every AI win you've shipped — all in one place."
                : "Live cohort workshops, your AI Journal, and a clear path from your first prompt to your Black Belt."}
            </p>

            <ul className="space-y-3.5">
              <ValueBullet icon={GraduationCap}>
                <strong className="text-white">Live workshops + recordings</strong>
                <span className="text-white/70"> in the AI Empowerment Journey.</span>
              </ValueBullet>
              <ValueBullet icon={NotebookPen}>
                <strong className="text-white">Log AI wins</strong>
                <span className="text-white/70"> and prove the ROI to your team.</span>
              </ValueBullet>
              <ValueBullet icon={Trophy}>
                <strong className="text-white">Earn your belt</strong>
                <span className="text-white/70"> — White through Black.</span>
              </ValueBullet>
            </ul>
          </div>

          {/* Footer attribution */}
          <div className="relative text-[12px] text-white/55">
            © {new Date().getFullYear()} BestResults.AI · Your People. Your Organization.
          </div>
        </aside>

        {/* ---------- RIGHT: sign-in form pane ---------- */}
        <section className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
          <div className="w-full max-w-[420px]">
            {/* Mobile logo (only when left pane is hidden) */}
            <div className="lg:hidden flex justify-center mb-8">
              <Logo size="md" />
            </div>

            {status === "sent" ? (
              <SentState email={email} onReset={() => { setStatus("idle"); setEmail(""); }} />
            ) : (
              <FormState
                email={email}
                setEmail={setEmail}
                status={status}
                errorMsg={errorMsg}
                onSubmit={handleSubmit}
                hasVisited={hasVisited}
              />
            )}

            <div className="mt-8 pt-6 border-t border-soft text-center space-y-3">
              <div className="text-[11.5px] text-ink-subtle">
                By signing in you agree to our{" "}
                <Link to="/terms" className="text-ink-muted hover:text-ink underline underline-offset-2">
                  Terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-ink-muted hover:text-ink underline underline-offset-2">
                  Privacy Policy
                </Link>
                .
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ---- Form state ----

function FormState({ email, setEmail, status, errorMsg, onSubmit, hasVisited }) {
  return (
    <>
      <div className="h-eyebrow mb-2">{hasVisited ? "Sign back in" : "Get started"}</div>
      <h2 className="font-heading text-[30px] font-extrabold tracking-tight text-ink mb-2">
        {hasVisited ? "Welcome back." : "Sign in to the platform."}
      </h2>
      <p className="text-[14px] text-ink-muted mb-8 leading-relaxed">
        Enter your email and we'll send you a one-tap magic link. No passwords to remember.
      </p>

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label htmlFor="login-email" className="block text-[12px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-2">
            Email
          </label>
          <div className="relative">
            <Mail
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle pointer-events-none"
              strokeWidth={2}
            />
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@bestresults.ai"
              required
              autoComplete="email"
              autoFocus
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-soft bg-surface-card text-[15px] font-body text-ink placeholder:text-ink-subtle focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all"
            />
          </div>
        </div>

        {status === "error" && (
          <div className="text-[13px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {errorMsg || "Something went wrong. Try again."}
          </div>
        )}

        <button
          type="submit"
          disabled={status === "sending"}
          className={
            "group w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-[14.5px] font-heading font-semibold transition-all duration-200 " +
            (status === "sending"
              ? "bg-ink/60 text-white cursor-wait"
              : "bg-ink text-white hover:bg-brand-700")
          }
        >
          {status === "sending" ? (
            "Sending magic link…"
          ) : (
            <>
              Send magic link
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.5} />
            </>
          )}
        </button>
      </form>

      <p className="text-[12px] text-ink-subtle mt-4 leading-relaxed">
        We'll email a one-time link. The link expires in 30 days and works on this device only.
      </p>
    </>
  );
}

// ---- Sent confirmation state ----

function SentState({ email, onReset }) {
  return (
    <div className="animate-fade-in-up">
      <div className="inline-flex w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 items-center justify-center mb-5">
        <CheckCircle2 className="w-7 h-7" strokeWidth={2} />
      </div>
      <div className="h-eyebrow !text-emerald-700 mb-2">Check your inbox</div>
      <h2 className="font-heading text-[28px] font-extrabold tracking-tight text-ink mb-3">
        Magic link is on its way.
      </h2>
      <p className="text-[14px] text-ink-muted leading-relaxed mb-2">
        We sent a sign-in link to{" "}
        <strong className="text-ink break-all">{email}</strong>.
      </p>
      <p className="text-[14px] text-ink-muted leading-relaxed mb-6">
        Open it on this device to land back on your cohort. Didn't see it? Check spam, or{" "}
        <button onClick={onReset} className="font-heading font-semibold text-brand-600 hover:text-brand-700 underline-offset-2 hover:underline">
          try a different email
        </button>
        .
      </p>
      <div className="rounded-xl bg-amber-50/60 border border-amber-200 px-4 py-3 text-[13px] text-amber-900 leading-relaxed">
        <strong className="font-heading font-bold">Heads up:</strong>{" "}
        The link works for 30 days and is single-use. If it expires, just come back here for a new one.
      </div>
    </div>
  );
}

function ValueBullet({ icon: Icon, children }) {
  return (
    <li className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
        <Icon className="w-4 h-4 text-white" strokeWidth={2} />
      </div>
      <div className="text-[14px] leading-relaxed pt-1.5">
        {children}
      </div>
    </li>
  );
}
