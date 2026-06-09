// ---------------------------------------------------------------------------
// Cohort admin writes — mock-mode only.
//
// Persists user-created cohorts + organizations to localStorage and exposes
// a tiny in-memory pubsub so admin pages re-render after a write without a
// manual refresh.
//
// When real Notion writes ship, replace getAllCohortsForAdmin /
// getAllOrganizations with /api/admin/cohorts and /api/admin/orgs calls.
// The UI doesn't change.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { DEMO_COHORTS } from "./demoData";
import { MOCK_SESSIONS } from "./mockCohort";
import { getProgramForCohort, getSessionsForProgram } from "./programs";

const COHORTS_KEY = "brai_admin_cohorts";
const ORGS_KEY    = "brai_admin_orgs";

// ---- localStorage helpers ----
function safeLoad(key) {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function safePersist(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

// In-memory overlays.
const cohortOverlays = safeLoad(COHORTS_KEY);
const orgOverlays    = safeLoad(ORGS_KEY);

// ---- Pubsub ----
const listeners = new Set();
export function subscribeCohortChanges(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() {
  for (const fn of listeners) fn();
}

// React hook: increments on every cohort/org write. Use it inside
// components that read cohorts, to force re-render after a save.
export function useCohortVersion() {
  const [v, setV] = useState(0);
  useEffect(() => subscribeCohortChanges(() => setV((x) => x + 1)), []);
  return v;
}

// ---- Slug helper ----
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

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

// Base orgs derived from DEMO_COHORTS, deduplicated by id.
function baseOrgs() {
  const seen = new Map();
  for (const c of DEMO_COHORTS) {
    if (c.organization && !seen.has(c.organization.id)) {
      seen.set(c.organization.id, c.organization);
    }
  }
  return [...seen.values()];
}

// Full list = base + user-created.
export function getAllOrganizations() {
  const base = baseOrgs();
  const baseIds = new Set(base.map((o) => o.id));
  const extras = Object.values(orgOverlays).filter((o) => !baseIds.has(o.id));
  return [...base, ...extras];
}

export function createOrganization({ name, shortName }) {
  const trimmed = (name || "").trim();
  if (!trimmed) throw new Error("Organization name is required.");
  const id = "org-" + slugify(trimmed);
  if (orgOverlays[id] || baseOrgs().some((o) => o.id === id)) {
    throw new Error("An organization with that name already exists.");
  }
  const org = {
    id,
    name: trimmed,
    shortName: (shortName || trimmed).trim().slice(0, 40),
  };
  orgOverlays[id] = org;
  safePersist(ORGS_KEY, orgOverlays);
  emit();
  return org;
}

// ---------------------------------------------------------------------------
// Cohorts
// ---------------------------------------------------------------------------

export function getAllCohortsForAdmin() {
  const baseBySlug = Object.fromEntries(DEMO_COHORTS.map((c) => [c.slug, c]));
  const merged = { ...baseBySlug };
  for (const [slug, overlay] of Object.entries(cohortOverlays)) {
    if (overlay.archivedAt) {
      delete merged[slug];
      continue;
    }
    merged[slug] = { ...(merged[slug] || {}), ...overlay };
  }
  return Object.values(merged);
}

export function getCohortForAdmin(slug) {
  return getAllCohortsForAdmin().find((c) => c.slug === slug) || null;
}

// Return the sessions for a cohort, with cohort-level overrides applied.
//
// Precedence:
//   1. Cohort overlay (admin-edited) — explicit sessions[] from cohortOverlays
//   2. Cohort's program curriculum from programs.js — title/materials/homework
//   3. AIEW3 fallback (MOCK_SESSIONS already has demo dates baked in) for
//      cohorts that pre-date the programs catalog
//
// In all cases the array length matches the program's sessionsCount, so
// callers that iterate get the right number of sessions for THIS cohort.
export function getSessionsForCohort(slug) {
  const overlay = cohortOverlays[slug];
  if (overlay?.sessions) return overlay.sessions;
  // Find the cohort to look up its program. Cohort overlays + base list both
  // live in the merged set we already compute below.
  const cohort = getAllCohortsForAdmin().find((c) => c.slug === slug);
  const program = getProgramForCohort(cohort);
  if (program?.sessions?.length) {
    // Clone so callers can mutate without breaking the program template.
    return getSessionsForProgram(program).map((s) => ({ ...s }));
  }
  // Legacy fallback for any cohort that doesn't resolve to a program.
  return MOCK_SESSIONS.map((s) => ({ ...s }));
}

// ---------------------------------------------------------------------------
// getFacilitatorScheduleByDay
//
// Aggregates LIVE SESSIONS across the given cohort slugs into a per-day
// timeline. Used by /admin/calendar.
//
// Returns an array, one entry per UTC day that has events:
//   [
//     { dayMs, dayLabel, isToday, isTomorrow, events: [...] }
//   ]
//
// Each event:
//   {
//     cohortSlug, cohortName, cohortShortName, programCode,
//     belt, sessionOrder, sessionTitle, durationMinutes,
//     startMs, endMs, zoomLink, isUpcoming
//   }
//
// Filters out events with no `date` field. Past sessions (before now) are
// excluded by default — pass `includePast: true` to keep them.
// ---------------------------------------------------------------------------
export function getFacilitatorScheduleByDay(cohortSlugs, daysAhead = 14, {
  includePast = false,
} = {}) {
  const allCohorts = getAllCohortsForAdmin();
  const slugSet = new Set(cohortSlugs);
  const now = Date.now();
  const cutoff = now + daysAhead * 24 * 60 * 60 * 1000;

  // Flatten every session in scope into a single event array.
  const events = [];
  for (const cohort of allCohorts) {
    if (!slugSet.has(cohort.slug)) continue;
    const sessions = getSessionsForCohort(cohort.slug);
    for (const s of sessions) {
      if (!s.date) continue;
      const startMs = new Date(s.date).getTime();
      if (Number.isNaN(startMs)) continue;
      if (!includePast && startMs < now) continue;
      if (startMs > cutoff) continue;
      const durationMinutes = Number(s.durationMinutes) || 75;
      events.push({
        cohortSlug: cohort.slug,
        cohortName: cohort.name,
        cohortShortName: cohort.organization?.shortName || cohort.programCode,
        organizationName: cohort.organization?.name || "",
        programCode: cohort.programCode,
        belt: s.belt,
        sessionOrder: s.order,
        sessionTitle: s.title,
        durationMinutes,
        startMs,
        endMs: startMs + durationMinutes * 60 * 1000,
        zoomLink:
          s.zoomLink ||
          cohort.zoomLink ||
          cohort.facilitator?.defaultZoomLink ||
          cohort.trainer?.defaultZoomLink ||
          "",
        // Facilitator surfaces who's running the session — essential when
        // super/admin views span multiple facilitators. Cohorts created via
        // the admin form use `cohort.facilitator`; legacy mockCohort entries
        // use `cohort.trainer`. Fall through so both shapes render.
        facilitator: (() => {
          const f = cohort.facilitator || cohort.trainer;
          if (!f) return null;
          return {
            name: f.name,
            title: f.title || "Facilitator",
            email: f.email || null,
            headshotUrl: f.headshotUrl || null,
          };
        })(),
        isUpcoming: startMs >= now,
      });
    }
  }

  // Sort + bucket by local-day midnight.
  events.sort((a, b) => a.startMs - b.startMs);
  const byDay = new Map();
  for (const ev of events) {
    const d = new Date(ev.startMs);
    d.setHours(0, 0, 0, 0);
    const dayMs = d.getTime();
    if (!byDay.has(dayMs)) byDay.set(dayMs, []);
    byDay.get(dayMs).push(ev);
  }

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrowMs = today.getTime() + 24 * 60 * 60 * 1000;

  return Array.from(byDay.entries()).map(([dayMs, dayEvents]) => ({
    dayMs,
    dayLabel: new Date(dayMs).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    }),
    isToday: dayMs === today.getTime(),
    isTomorrow: dayMs === tomorrowMs,
    events: dayEvents,
  }));
}

// Next "Open Cohort N" number — counts existing open cohorts.
export function getNextOpenCohortNumber() {
  const cohorts = getAllCohortsForAdmin();
  const openCount = cohorts.filter((c) => c.cohortType === "open").length;
  return openCount + 1;
}

// Next "{shortName} Cohort N" suffix for a given org + program.
// Returns null for the first cohort (no suffix), 2/3/... for later ones.
export function getNextOrgCohortNumber(orgId, programCode) {
  const cohorts = getAllCohortsForAdmin();
  const matching = cohorts.filter(
    (c) =>
      c.organization?.id === orgId &&
      c.programCode === programCode,
  );
  if (matching.length === 0) return null;
  return matching.length + 1;
}

// Auto-name a cohort.
//   Closed first:  "AIEW3 — IAHE Cohort"
//   Closed second: "AIEW3 — IAHE Cohort 2"
//   Open:          "AIEW3 — Open Cohort 1"
export function cohortNameFor({ cohortType, programCode, organization, sequenceNumber }) {
  if (cohortType === "open") {
    return `${programCode || ""} — Open Cohort ${sequenceNumber || 1}`.trim();
  }
  const short = organization?.shortName || organization?.name || "";
  const suffix = sequenceNumber && sequenceNumber > 1 ? ` ${sequenceNumber}` : "";
  return `${programCode || ""} — ${short} Cohort${suffix}`.trim();
}

// Default 8 weekly session datetimes spaced one week apart from `startIso`
// (datetime-local string like "2026-06-19T16:00").
export function defaultSessionSchedule(startIso, cadenceDays = 7, count = 8) {
  if (!startIso) return Array(count).fill("");
  const start = new Date(startIso);
  if (isNaN(start.getTime())) return Array(count).fill("");
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i * cadenceDays);
    return formatDatetimeLocal(d);
  });
}

// Convert a Date to the YYYY-MM-DDTHH:MM string that <input type="datetime-local"> expects.
export function formatDatetimeLocal(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---- Validation ----
export function validateCohortPayload(payload, { isCreate, slugIsAlreadyTaken } = {}) {
  if (!payload.slug?.trim()) return "Slug is required.";
  if (!/^[a-z0-9-]+$/.test(payload.slug)) {
    return "Slug must be lowercase letters, numbers, and dashes only.";
  }
  if (isCreate && slugIsAlreadyTaken) return "Slug is already taken.";
  if (!payload.programCode?.trim()) return "Pick a program.";
  if (!payload.facilitatorId) return "Pick a facilitator.";
  if (payload.cohortType !== "open" && !payload.organizationId) {
    return "Closed cohorts need an organization.";
  }
  if (!Array.isArray(payload.sessionDates) || payload.sessionDates.length !== 8) {
    return "All 8 sessions are required.";
  }
  if (payload.sessionDates.some((d) => !d)) {
    return "All 8 session datetimes are required.";
  }
  return null;
}

function buildCohort(payload, { orgs, facilitators, program }) {
  const org = payload.cohortType === "open"
    ? null
    : orgs.find((o) => o.id === payload.organizationId) || null;
  const facilitator = facilitators.find((f) => f.id === payload.facilitatorId) || null;
  const sessions = MOCK_SESSIONS.map((s, i) => ({
    ...s,
    date: payload.sessionDates[i],
    // Per-session Zoom override. Empty string means "use cohort default".
    zoomLink: (payload.sessionZoomLinks?.[i] || "").trim() || null,
  }));
  return {
    slug: payload.slug,
    cohortType: payload.cohortType,
    name: payload.name?.trim() || cohortNameFor({
      cohortType: payload.cohortType,
      programCode: payload.programCode,
      organization: org,
      sequenceNumber: payload.sequenceNumber,
    }),
    methodName: program?.methodName || payload.methodName || "AI Empowerment Method",
    programCode: payload.programCode,
    programName: program?.name || null,
    organization: org,
    facilitator,
    timeZone: payload.timeZone || "America/New_York",
    zoomLink: (payload.zoomLink || "").trim() || null,
    sessions,
  };
}

export function createCohort(payload, { orgs, facilitators, program } = {}) {
  const slugTaken = getAllCohortsForAdmin().some((c) => c.slug === payload.slug);
  const err = validateCohortPayload(payload, {
    isCreate: true,
    slugIsAlreadyTaken: slugTaken,
  });
  if (err) throw new Error(err);

  const cohort = buildCohort(payload, { orgs, facilitators, program });
  cohortOverlays[cohort.slug] = {
    ...cohort,
    createdAt: new Date().toISOString(),
  };
  safePersist(COHORTS_KEY, cohortOverlays);
  emit();
  return cohort;
}

export function updateCohort(slug, payload, { orgs, facilitators, program } = {}) {
  const err = validateCohortPayload(payload, { isCreate: false });
  if (err) throw new Error(err);

  const cohort = buildCohort({ ...payload, slug }, { orgs, facilitators, program });
  cohortOverlays[slug] = {
    ...(cohortOverlays[slug] || {}),
    ...cohort,
    updatedAt: new Date().toISOString(),
  };
  safePersist(COHORTS_KEY, cohortOverlays);
  emit();
  return cohort;
}

export function archiveCohort(slug) {
  cohortOverlays[slug] = {
    ...(cohortOverlays[slug] || {}),
    archivedAt: new Date().toISOString(),
  };
  safePersist(COHORTS_KEY, cohortOverlays);
  emit();
}

// Debug-style reset used during demos.
export function clearAllCohortOverlays() {
  for (const key of Object.keys(cohortOverlays)) delete cohortOverlays[key];
  for (const key of Object.keys(orgOverlays))    delete orgOverlays[key];
  safePersist(COHORTS_KEY, cohortOverlays);
  safePersist(ORGS_KEY,    orgOverlays);
  emit();
}
