// ---------------------------------------------------------------------------
// Cohort admin writes — mock-mode only.
//
// Persists user-created cohorts + per-cohort overrides to localStorage. On
// module load, hydrates the in-memory DEMO_COHORTS list with whatever the
// user has saved so demos survive a refresh.
//
// When real Notion writes ship, replace getAllCohortsForAdmin() with a
// /api/admin/cohorts call and have create/update/archive POST to /api/admin.
// The component layer doesn't change.
// ---------------------------------------------------------------------------

import { DEMO_COHORTS } from "./demoData";
import { MOCK_SESSIONS } from "./mockCohort";

const STORAGE_KEY = "brai_admin_cohorts";

// In-memory store of user-created or edited cohorts, keyed by slug.
//   { slug: { ...cohort, sessions?: [...], archivedAt?: ISO } }
const overlays = loadOverlays();

function loadOverlays() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistOverlays() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overlays));
  } catch {
    /* ignore — quota / private mode */
  }
}

// Generate a URL-safe slug from a cohort name. Used in the create form when
// the user hasn't customized the slug yet.
export function slugify(input) {
  return (input || "")
    .toString()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Default 8 weekly session dates spaced one week apart, starting next Wednesday.
export function defaultSessionDates() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dayOfWeek = d.getDay();
  // Move to next Wednesday (day index 3). If today is Wed, go to next week.
  const offset = ((3 - dayOfWeek + 7) % 7) || 7;
  d.setDate(d.getDate() + offset);
  return Array.from({ length: 8 }, (_, i) => {
    const x = new Date(d);
    x.setDate(x.getDate() + i * 7);
    return x.toISOString().slice(0, 10);
  });
}

// Returns the canonical list of cohorts an admin can see: DEMO_COHORTS merged
// with persisted overlays. Newly-created cohorts appear in this list.
export function getAllCohortsForAdmin() {
  const baseBySlug = Object.fromEntries(DEMO_COHORTS.map((c) => [c.slug, c]));
  const merged = { ...baseBySlug };
  for (const [slug, overlay] of Object.entries(overlays)) {
    if (overlay.archivedAt) continue;
    merged[slug] = { ...(merged[slug] || {}), ...overlay };
  }
  return Object.values(merged);
}

// Look up a single cohort (merged with overlay if present).
export function getCohortForAdmin(slug) {
  const list = getAllCohortsForAdmin();
  return list.find((c) => c.slug === slug) || null;
}

// Per-cohort session schedule. Falls back to MOCK_SESSIONS if the cohort
// doesn't override session dates.
export function getSessionsForCohort(slug) {
  const overlay = overlays[slug];
  if (overlay?.sessions) {
    return overlay.sessions;
  }
  return MOCK_SESSIONS.map((s) => ({ ...s }));
}

// Validate the payload before persisting. Returns null if OK, or a string
// describing the first problem. Pages display this as inline error.
export function validateCohortPayload(payload, { isCreate, slugIsAlreadyTaken } = {}) {
  if (!payload.name?.trim()) return "Cohort name is required.";
  if (!payload.slug?.trim()) return "Slug is required.";
  if (!/^[a-z0-9-]+$/.test(payload.slug)) {
    return "Slug must be lowercase letters, numbers, and dashes only.";
  }
  if (isCreate && slugIsAlreadyTaken) return "Slug is already taken.";
  if (!payload.programCode?.trim()) return "Program code is required.";
  if (!payload.organizationId) return "Pick an organization.";
  if (!payload.facilitatorId) return "Pick a facilitator.";
  if (!Array.isArray(payload.sessionDates) || payload.sessionDates.length !== 8) {
    return "All 8 session dates are required.";
  }
  if (payload.sessionDates.some((d) => !d)) {
    return "All 8 session dates are required.";
  }
  return null;
}

// Build a full cohort object from the form payload + the org/facilitator pickers.
function buildCohort(payload, { orgs, facilitators }) {
  const org = orgs.find((o) => o.id === payload.organizationId) || null;
  const facilitator = facilitators.find((f) => f.id === payload.facilitatorId) || null;
  const sessions = MOCK_SESSIONS.map((s, i) => ({
    ...s,
    date: payload.sessionDates[i],
  }));
  return {
    slug: payload.slug,
    name: payload.name.trim(),
    methodName: payload.methodName?.trim() || "AI Empowerment Method",
    programCode: payload.programCode.trim(),
    organization: org,
    facilitator,
    sessions,
  };
}

export function createCohort(payload, { orgs, facilitators } = {}) {
  const slugTaken = getAllCohortsForAdmin().some((c) => c.slug === payload.slug);
  const err = validateCohortPayload(payload, {
    isCreate: true,
    slugIsAlreadyTaken: slugTaken,
  });
  if (err) throw new Error(err);

  const cohort = buildCohort(payload, { orgs, facilitators });
  overlays[cohort.slug] = {
    ...cohort,
    createdAt: new Date().toISOString(),
  };
  persistOverlays();
  return cohort;
}

export function updateCohort(slug, payload, { orgs, facilitators } = {}) {
  const err = validateCohortPayload(payload, { isCreate: false });
  if (err) throw new Error(err);

  const cohort = buildCohort({ ...payload, slug }, { orgs, facilitators });
  overlays[slug] = {
    ...(overlays[slug] || {}),
    ...cohort,
    updatedAt: new Date().toISOString(),
  };
  persistOverlays();
  return cohort;
}

export function archiveCohort(slug) {
  overlays[slug] = {
    ...(overlays[slug] || {}),
    archivedAt: new Date().toISOString(),
  };
  persistOverlays();
}

// Useful for debug-style resets in the demo.
export function clearAllCohortOverlays() {
  for (const key of Object.keys(overlays)) delete overlays[key];
  persistOverlays();
}
