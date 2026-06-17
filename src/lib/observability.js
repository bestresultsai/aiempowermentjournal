// ---------------------------------------------------------------------------
// Observability — error reporting + product analytics scaffolding.
//
// Single entry point for the rest of the app:
//
//   initObservability()        — call once at app boot
//   captureError(err, context) — runtime/error paths (ErrorBoundary, fetch, mutations)
//   trackEvent(name, props)    — product analytics (page views, key actions)
//   identifyUser(user)         — call after sign-in / from AuthContext
//   resetUser()                — call after sign-out
//
// Both providers (Sentry for errors, PostHog for product analytics) are
// activated by env vars:
//
//   VITE_SENTRY_DSN
//   VITE_POSTHOG_KEY
//   VITE_POSTHOG_HOST  (optional, defaults to https://app.posthog.com)
//
// When either env var is absent the corresponding provider no-ops — safe to
// ship this file before keys land. #399 (production-readiness) is where the
// real DSN + project key get wired in via Netlify env vars.
//
// We import providers dynamically + lazily so we don't ship the SDK bundles
// when keys aren't set. With both providers absent this file adds < 1 KB.
// ---------------------------------------------------------------------------

let initialized = false;
let sentryReady = false;
let posthogReady = false;

let _sentry = null;
let _posthog = null;

// We hide the dynamic-import call from Rollup so it doesn't try to resolve
// the SDK packages at build time. Once #399 installs the SDKs, swap this
// helper for a plain `await import(name)` and let Vite chunk it normally.
const _runtimeImport = new Function("m", "return import(m)");

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || "";
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || "";
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://app.posthog.com";
const ENVIRONMENT = import.meta.env.MODE || "development";
const RELEASE = import.meta.env.VITE_GIT_SHA || "dev";

// ---------------------------------------------------------------------------
// Init — call once at app boot.
// ---------------------------------------------------------------------------

export async function initObservability() {
  if (initialized) return;
  initialized = true;

  if (SENTRY_DSN) {
    try {
      // Hidden from Rollup via _runtimeImport so the SDK can be absent at
      // build time. Real install + tree-shaken import lands with #399.
      const Sentry = await _runtimeImport("@sentry/react");
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: ENVIRONMENT,
        release: RELEASE,
        // Conservative sampling — bump in #399 once we have traffic baselines.
        tracesSampleRate: ENVIRONMENT === "production" ? 0.1 : 1.0,
        // Don't capture noise from extensions / cross-origin iframes.
        ignoreErrors: [
          "ResizeObserver loop limit exceeded",
          "Non-Error promise rejection captured",
        ],
      });
      _sentry = Sentry;
      sentryReady = true;
    } catch (err) {
      // Sentry SDK not installed (expected today). No-op until #399.
      // eslint-disable-next-line no-console
      console.debug("[observability] Sentry SDK not present — captureError will no-op.");
    }
  }

  if (POSTHOG_KEY) {
    try {
      // Same runtime-import trick as Sentry above.
      const ph = await _runtimeImport("posthog-js");
      ph.default.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        capture_pageview: true,
        autocapture: false, // we'll send explicit events for the key actions
        loaded: () => {
          posthogReady = true;
        },
      });
      _posthog = ph.default;
    } catch {
      // PostHog SDK not installed (expected today). No-op until #399.
      // eslint-disable-next-line no-console
      console.debug("[observability] PostHog SDK not present — trackEvent will no-op.");
    }
  }
}

// ---------------------------------------------------------------------------
// Error capture
// ---------------------------------------------------------------------------

export function captureError(error, context) {
  if (sentryReady && _sentry) {
    try {
      _sentry.captureException(error, { extra: context || {} });
      return;
    } catch {
      /* fall through to console */
    }
  }
  // Always log in development so we don't silently drop errors when SDKs are
  // off. Production: the SDK takes over.
  // eslint-disable-next-line no-console
  console.error("[observability]", error, context || "");
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export function trackEvent(name, props) {
  if (posthogReady && _posthog) {
    try {
      _posthog.capture(name, props || {});
    } catch {
      /* ignore */
    }
  }
}

export function identifyUser(user) {
  if (!user?.email) return;
  if (posthogReady && _posthog) {
    try {
      _posthog.identify(user.email, {
        name: user.name || "",
        role: user.role || "",
      });
    } catch { /* ignore */ }
  }
  if (sentryReady && _sentry) {
    try {
      _sentry.setUser({
        email: user.email,
        id: user.id || undefined,
        username: user.name || undefined,
      });
    } catch { /* ignore */ }
  }
}

export function resetUser() {
  if (posthogReady && _posthog) {
    try { _posthog.reset(); } catch { /* ignore */ }
  }
  if (sentryReady && _sentry) {
    try { _sentry.setUser(null); } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// Health probe (used by tests + /admin diagnostics in #399).
// ---------------------------------------------------------------------------

export function observabilityStatus() {
  return {
    initialized,
    environment: ENVIRONMENT,
    release: RELEASE,
    sentry: { configured: !!SENTRY_DSN, ready: sentryReady },
    posthog: { configured: !!POSTHOG_KEY, ready: posthogReady },
  };
}
