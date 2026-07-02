// ---------------------------------------------------------------------------
// Observability — error reporting + product analytics.
//
// Single entry point for the rest of the app:
//
//   initObservability()        — call once at app boot
//   captureError(err, context) — runtime/error paths (ErrorBoundary, fetch, mutations)
//   trackEvent(name, props)    — product analytics (page views, key actions)
//   identifyUser(user)         — call after sign-in / from AuthContext
//   resetUser()                — call after sign-out
//
// Both providers activate when their env var is set. Missing env vars → no-op.
//
//   VITE_SENTRY_DSN
//   VITE_POSTHOG_KEY
//   VITE_POSTHOG_HOST  (optional, defaults to https://us.i.posthog.com)
//
// Real static imports so Vite bundles the SDKs into the client. Both are
// tree-shakeable and lazy-init: if the env var is empty, .init() never runs
// and the SDK code paths stay cold.
// ---------------------------------------------------------------------------

import * as Sentry from "@sentry/react";
import posthog from "posthog-js";

let initialized = false;
let sentryReady = false;
let posthogReady = false;

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || "";
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || "";
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";
const ENVIRONMENT = import.meta.env.MODE || "development";
const RELEASE = import.meta.env.VITE_GIT_SHA || "dev";

// ---------------------------------------------------------------------------
// Init — call once at app boot.
// ---------------------------------------------------------------------------

export function initObservability() {
  if (initialized) return;
  initialized = true;

  if (SENTRY_DSN) {
    try {
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: ENVIRONMENT,
        release: RELEASE,
        // Conservative sampling — bump once we have traffic baselines.
        tracesSampleRate: ENVIRONMENT === "production" ? 0.1 : 1.0,
        // Session replay: capture only on error in production, always in dev.
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: ENVIRONMENT === "production" ? 1.0 : 0,
        // Don't capture noise from extensions / cross-origin iframes, or from
        // upstream flakiness that manifests as retryable client-side errors.
        ignoreErrors: [
          "ResizeObserver loop limit exceeded",
          "ResizeObserver loop completed with undelivered notifications",
          "Non-Error promise rejection captured",
          "Network request failed",
          // Supabase Auth throws this when its SMTP relay times out. It's
          // upstream flakiness, not something we can fix in the app, and the
          // user already sees a friendly retry prompt (see humanizeAuthError
          // in Login.jsx).
          "AuthRetryableFetchError",
          "AuthApiError: fetch failed",
          // Supabase Auth's built-in rate limit on repeated OTP/magic-link
          // requests. Fires when a user re-clicks "Send me a link" within
          // ~60s. Expected behavior — the login form catches it and shows
          // the user a friendly countdown — not something to alert on.
          "For security purposes, you can only request this",
          // Safari's phrasing for a network fetch that failed. Same class
          // of transient upstream issue — user retry / hydration re-run
          // covers it. Not worth a Sentry alert every time someone briefly
          // loses connectivity or Supabase burps.
          "TypeError: Load failed",
          "DbError:",
          // Supabase Auth throws this when signups are disabled (the platform
          // is invite-only) and the email isn't already registered. It's a
          // user-facing "you're not invited" case, handled by
          // humanizeAuthError in Login.jsx with a friendly message pointing
          // at help@bestresults.ai. Not a bug.
          "Signups not allowed",
          // Supabase JWT expired mid-session. `autoRefreshToken: true` on
          // the client handles the happy path, but if a tab has been idle
          // long enough that both access + refresh tokens are dead, the
          // next data call throws this. Reload recovers — not worth a
          // Sentry alert every time.
          "JWT expired",
        ],
        integrations: [Sentry.browserTracingIntegration()],
      });
      sentryReady = true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[observability] Sentry init failed:", err?.message || err);
    }
  }

  if (POSTHOG_KEY) {
    try {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        capture_pageview: true,
        autocapture: false, // we send explicit events for the key actions
        // Don't spam PostHog when running local dev.
        opt_out_capturing_by_default: ENVIRONMENT === "development",
        loaded: () => {
          posthogReady = true;
        },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[observability] PostHog init failed:", err?.message || err);
    }
  }
}

// ---------------------------------------------------------------------------
// Error capture
// ---------------------------------------------------------------------------

export function captureError(error, context) {
  // Sentry emits "Object captured as exception with keys: …" when it gets
  // a bare object (e.g. a Supabase error {code, details, hint, message}
  // that db.js hands us on network failures). Wrap those into a real
  // Error so the stacktrace + name land correctly and Sentry stops
  // creating a second issue for the wrapper warning.
  const normalized = toError(error);
  const extras = { ...(context || {}) };
  if (error && typeof error === "object" && !(error instanceof Error)) {
    // Preserve the original shape as extra data so debugging still has
    // the code/details/hint fields.
    extras.__serialized__ = safeSerialize(error);
  }
  if (sentryReady) {
    try {
      Sentry.captureException(normalized, { extra: extras });
      return;
    } catch {
      /* fall through to console */
    }
  }
  // Always log so we don't silently drop errors when the SDK is off.
  // eslint-disable-next-line no-console
  console.error("[observability]", normalized, extras || "");
}

function toError(value) {
  if (value instanceof Error) return value;
  if (value == null) return new Error("Unknown error (null captured)");
  if (typeof value === "string") return new Error(value);
  // Plain object — try to make a useful Error out of the message field.
  const msg =
    (value && (value.message || value.error || value.description)) ||
    "Non-Error value captured";
  const err = new Error(String(msg));
  if (value.name) err.name = String(value.name);
  return err;
}

function safeSerialize(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return { note: "unserializable" };
  }
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export function trackEvent(name, props) {
  if (posthogReady) {
    try {
      posthog.capture(name, props || {});
    } catch {
      /* ignore */
    }
  }
}

export function identifyUser(user) {
  if (!user?.email) return;
  const distinctId = user.userId || user.id || user.email;
  const traits = {
    email: user.email,
    name: user.name || "",
    role: user.role || "",
    capabilities: Array.isArray(user.capabilities) ? user.capabilities.join(",") : "",
  };
  if (posthogReady) {
    try {
      posthog.identify(distinctId, traits);
    } catch { /* ignore */ }
  }
  if (sentryReady) {
    try {
      Sentry.setUser({
        id: distinctId,
        email: user.email,
        username: user.name || undefined,
      });
    } catch { /* ignore */ }
  }
}

export function resetUser() {
  if (posthogReady) {
    try { posthog.reset(); } catch { /* ignore */ }
  }
  if (sentryReady) {
    try { Sentry.setUser(null); } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// Health probe (for /admin diagnostics + tests).
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
