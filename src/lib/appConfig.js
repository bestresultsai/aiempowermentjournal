// ---------------------------------------------------------------------------
// Central app configuration. ONE place to change if the production URL,
// support email, or brand metadata moves.
//
// Everywhere else in the codebase uses relative URLs (e.g. "/home"), so
// changing PRIMARY_URL here only affects places that need an absolute URL —
// OAuth callbacks, shareable links in emails, og:url meta tags, etc.
// ---------------------------------------------------------------------------

// Detect the live host at runtime so absolute-URL helpers work in dev,
// staging, and prod without per-environment config.
function detectOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://app.bestresults.ai";
}

export const APP_CONFIG = {
  // The canonical production URL. Used as the fallback when window isn't
  // available (e.g. inside Netlify Functions). When migrating from
  // tools.bestresults.ai to app.bestresults.ai, this is the line to change.
  primaryUrl: "https://app.bestresults.ai",

  // Brand name shown in titles, email signatures, etc.
  brand: "BestResults.AI",

  // Customer-facing email addresses.
  emails: {
    support: "support@bestresults.ai",
    noReply: "no-reply@bestresults.ai",
    sales: "hello@bestresults.ai",
  },

  // Mapping of email-domain to internal tenancy (used later for org auto-detect).
  internalEmailDomains: ["bestresults.ai"],
};

// Returns the absolute origin to use for sharable links + OAuth callbacks.
// Prefers the live `window.location.origin` so it works on any environment;
// falls back to APP_CONFIG.primaryUrl during SSR / Netlify Functions.
export function getOrigin() {
  return detectOrigin();
}

// Build an absolute URL by appending a path to the detected origin.
export function absoluteUrl(path) {
  const origin = getOrigin();
  if (!path) return origin;
  return origin + (path.startsWith("/") ? path : `/${path}`);
}
