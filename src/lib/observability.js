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
        // Don't capture noise from extensions / cross-origin iframes.
        ignoreErrors: [
          "ResizeObserver loop limit exceeded",
          "ResizeObserver loop completed with undelivered notifications",
          "Non-Error promise rejection captured",
          "Network request failed",
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
  if (sentryReady) {
    try {
      Sentry.captureException(error, { extra: context || {} });
      return;
    } catch {
      /* fall through to console */
    }
  }
  // Always log so we don't silently drop errors when the SDK is off.
  // eslint-disable-next-line no-console
  console.error("[observability]", error, context || "");
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
