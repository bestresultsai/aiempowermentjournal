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
import { useQuery } from "@tanstack/react-query";
import { DEMO_COHORTS, shouldUseSeedData } from "./demoData";
import { MOCK_SESSIONS } from "./mockCohort";
import { getProgramForCohort, getSessionsForProgram, getAllProgramsForAdmin } from "./programs";
import { initSupabase, isSupabaseEnabled } from "./supabase";
import { db, SupabaseNotReady } from "./db";
import { captureError } from "./observability";

const COHORTS_KEY       = "brai_admin_cohorts";
const ORGS_KEY          = "brai_admin_orgs";
const FACILITATORS_KEY  = "brai_admin_facilitators";

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
const cohortOverlays       = safeLoad(COHORTS_KEY);
const orgOverlays          = safeLoad(ORGS_KEY);
const facilitatorOverlays  = safeLoad(FACILITATORS_KEY);

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

// Base orgs derived from DEMO_COHORTS, deduplicated by id. Returns empty
// when Supabase is wired up and demo mode isn't active — real admins start
// from a clean Supabase slate, not the in-code demo data.
function baseOrgs() {
  if (!shouldUseSeedData()) return [];
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

// Edit an org's name + shortName. Pass {} to clear shortName.
export function updateOrganization(id, { name, shortName }) {
  const existing = getAllOrganizations().find((o) => o.id === id);
  if (!existing) throw new Error("Organization not found.");
  const next = {
    ...existing,
    name: (name ?? existing.name).trim() || existing.name,
    shortName: (shortName ?? existing.shortName).trim().slice(0, 40),
  };
  orgOverlays[id] = next;
  safePersist(ORGS_KEY, orgOverlays);
  emit();
  return next;
}

// ---------------------------------------------------------------------------
// Facilitators
// ---------------------------------------------------------------------------

// Base facilitators derived from DEMO_COHORTS, deduplicated by id. Returns
// empty in clean-slate mode (Supabase wired up, demo mode off) so real
// admins see only the facilitators they / Supabase have explicitly added.
function baseFacilitators() {
  if (!shouldUseSeedData()) return [];
  const seen = new Map();
  for (const c of DEMO_COHORTS) {
    if (c.facilitator && !seen.has(c.facilitator.id)) {
      seen.set(c.facilitator.id, c.facilitator);
    }
  }
  return [...seen.values()];
}

// Full list = base (from cohort assignments) merged with overlay edits +
// user-created facilitators that don't have a cohort yet.
//
// Two cleanup passes on top of that:
//   1. When Supabase is wired, drop legacy overlays that never bound to
//      a real profile — those are stale localStorage entries from prior
//      test sessions that would otherwise appear in the picker with
//      names that don't match anyone in the current users list.
//   2. Dedupe by email. Mike could show up twice — once from an old
//      overlay with a legacy id (`fac-<timestamp>`) and once from the
//      current Supabase hydrate (`fac-<uuid>`) — because Map keys are
//      the id, not the email. Prefer the Supabase-backed entry but
//      keep the richer profile fields (headshot, zoom link) from
//      whichever side has them.
export function getAllFacilitators() {
  const base = baseFacilitators();
  const merged = new Map(base.map((f) => [f.id, f]));
  for (const [id, overlay] of Object.entries(facilitatorOverlays)) {
    merged.set(id, { ...(merged.get(id) || {}), ...overlay });
  }
  let list = [...merged.values()];

  // Filter stale overlays in clean-slate mode. A locally admin-created
  // facilitator has `createdAt`; a Supabase-hydrated one has
  // `_supabaseProfileId`. Anything else is orphaned demo residue.
  if (!shouldUseSeedData()) {
    list = list.filter((f) => f._supabaseProfileId || f.createdAt);
  }

  return dedupeFacilitatorsByEmail(list);
}

function dedupeFacilitatorsByEmail(list) {
  const byEmail = new Map();
  for (const f of list) {
    const email = (f.email || "").toLowerCase();
    // No email? Keep as-is, keyed by id so we still see it in the picker.
    if (!email) {
      byEmail.set(f.id || Math.random(), f);
      continue;
    }
    const existing = byEmail.get(email);
    if (!existing) {
      byEmail.set(email, f);
      continue;
    }
    // Collision — prefer the Supabase-backed identity, but preserve
    // richer profile fields (headshotUrl, defaultZoomLink, title) from
    // whichever side has them.
    const supBacked = f._supabaseProfileId ? f : existing;
    const other = supBacked === f ? existing : f;
    byEmail.set(email, {
      ...other,
      ...supBacked,
      headshotUrl: supBacked.headshotUrl || other.headshotUrl || null,
      defaultZoomLink: supBacked.defaultZoomLink || other.defaultZoomLink || null,
      title: supBacked.title || other.title || "",
    });
  }
  return [...byEmail.values()];
}

export function getFacilitatorById(id) {
  return getAllFacilitators().find((f) => f.id === id) || null;
}

// ---------------------------------------------------------------------------
// useFacilitatorsFromSupabase — Supabase-first source for pickers/lists.
//
// The overlay-based getAllFacilitators() can retain stale entries when the
// localStorage cache was populated before a Supabase profile was demoted
// or deleted. Consumers that need "who exists RIGHT NOW" should use this
// hook instead — it queries public.profiles directly (facilitator / admin
// / super capability), so the list is always exactly what's in the DB.
//
// Falls back gracefully to the overlay when Supabase isn't wired (demo
// mode / no env). Returns the same shape as getAllFacilitators() so the
// picker components don't need to know the difference.
// ---------------------------------------------------------------------------
export function useFacilitatorsFromSupabase() {
  const overlayList = getAllFacilitators();
  const query = useQuery({
    queryKey: ["facilitators-supabase"],
    enabled: isSupabaseEnabled() && !shouldUseSeedData(),
    staleTime: 60 * 1000,
    queryFn: async () => {
      const client = await initSupabase();
      if (!client) return null;
      const { data, error } = await client
        .from("profiles")
        .select("id, name, email, avatar_url, preferences, time_zone, capabilities")
        .not("email", "is", null);
      if (error) throw error;
      return (data || [])
        .filter((row) => {
          const caps = Array.isArray(row.capabilities) ? row.capabilities : [];
          return (
            caps.includes("facilitator") ||
            caps.includes("admin") ||
            caps.includes("super")
          );
        })
        .map(profileToFacilitator);
    },
  });
  // Prefer the live Supabase list; fall through to the overlay only when
  // the query hasn't returned yet (initial mount) or Supabase is off.
  const list = query.data ?? overlayList;
  return { data: list, isLoading: query.isLoading };
}

// Return the cohorts a given facilitator is assigned to. Used by the
// facilitators management page to show how many cohorts each runs.
export function getCohortsForFacilitator(facilitatorId) {
  return getAllCohortsForAdmin().filter(
    (c) => c.facilitator?.id === facilitatorId || c.trainer?.id === facilitatorId,
  );
}

export function createFacilitator({ name, email, title, headshotUrl, defaultZoomLink, defaultTimeZone }) {
  const trimmedName = (name || "").trim();
  const trimmedEmail = (email || "").trim().toLowerCase();
  if (!trimmedName) throw new Error("Facilitator name is required.");
  if (!trimmedEmail) throw new Error("Facilitator email is required.");
  const id = "fac-" + slugify(trimmedName);
  if (facilitatorOverlays[id] || baseFacilitators().some((f) => f.id === id || f.email?.toLowerCase() === trimmedEmail)) {
    throw new Error("A facilitator with that name or email already exists.");
  }
  const fac = {
    id,
    name: trimmedName,
    email: trimmedEmail,
    title: (title || "").trim() || "Facilitator",
    headshotUrl: headshotUrl || null,
    defaultZoomLink: (defaultZoomLink || "").trim() || null,
    defaultTimeZone: defaultTimeZone || "America/New_York",
    createdAt: new Date().toISOString(),
  };
  facilitatorOverlays[id] = fac;
  safePersist(FACILITATORS_KEY, facilitatorOverlays);
  emit();
  return fac;
}

export function updateFacilitator(id, patch) {
  const existing = getFacilitatorById(id);
  if (!existing) throw new Error("Facilitator not found.");
  const next = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  facilitatorOverlays[id] = next;
  safePersist(FACILITATORS_KEY, facilitatorOverlays);
  emit();
  return next;
}

// Restore a previously archived cohort (admin can recover from accidental
// archive). Removes the archivedAt flag.
export function restoreCohort(slug) {
  const overlay = cohortOverlays[slug];
  if (!overlay) return null;
  delete overlay.archivedAt;
  cohortOverlays[slug] = overlay;
  safePersist(COHORTS_KEY, cohortOverlays);
  emit();
  mirrorCohortArchiveToSupabase(slug, false);
  return overlay;
}

// Return the list of archived cohorts. Today: just overlays with archivedAt.
export function getArchivedCohorts() {
  return Object.entries(cohortOverlays)
    .filter(([, overlay]) => overlay.archivedAt)
    .map(([slug, overlay]) => ({ slug, ...overlay }));
}

// ---------------------------------------------------------------------------
// Cohorts
// ---------------------------------------------------------------------------

export function getAllCohortsForAdmin() {
  // Seed cohorts (DEMO_COHORTS) only contribute when we're in legacy
  // localStorage-demo mode OR demo mode is explicitly active. Real admins
  // signed into a Supabase-wired platform start from a clean slate —
  // cohorts come from Supabase hydration alone.
  const baseBySlug = shouldUseSeedData()
    ? Object.fromEntries(DEMO_COHORTS.map((c) => [c.slug, c]))
    : {};
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

// Returns a flat, date-ascending list of upcoming sessions across the given
// cohort slugs. Each entry is shaped to drop straight into the dashboard's
// "Upcoming live sessions" cards: { date, order, belt, cohortSlug, cohortName,
// shortName }.
//
// This replaces the older pattern of feeding the global `MOCK_SESSIONS` list
// into `getUpcomingSessions(daysAhead)` — that bypasses the user's cohort
// scope. Pages should always pass their `cohortSlugs` here instead.
export function getUpcomingSessionsInScope(cohortSlugs, daysAhead = 14) {
  const slugSet = new Set(cohortSlugs);
  const allCohorts = getAllCohortsForAdmin();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayMs = now.getTime();
  const cutoffMs = todayMs + daysAhead * 86400000;

  const out = [];
  for (const cohort of allCohorts) {
    if (!slugSet.has(cohort.slug)) continue;
    const sessions = getSessionsForCohort(cohort.slug);
    for (const s of sessions) {
      if (!s.date) continue;
      const ts = new Date(s.date).getTime();
      if (Number.isNaN(ts)) continue;
      if (ts < todayMs || ts > cutoffMs) continue;
      out.push({
        ...s,
        cohortSlug: cohort.slug,
        cohortName: cohort.name,
        cohortShortName: cohort.organization?.shortName || cohort.programCode,
      });
    }
  }
  return out.sort((a, b) => new Date(a.date) - new Date(b.date));
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
    // methodName + programName are denormalized from the program at create
    // time so cohort lists can display them without a join. The component
    // tree still prefers the live program lookup; these are fallbacks for
    // older cohorts or list-view contexts where reading the full program
    // is overkill.
    methodName: program?.methodName || payload.methodName || null,
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
  mirrorCohortToSupabase(cohortOverlays[cohort.slug]);
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
  mirrorCohortToSupabase(cohortOverlays[slug]);
  return cohort;
}

export function archiveCohort(slug) {
  cohortOverlays[slug] = {
    ...(cohortOverlays[slug] || {}),
    archivedAt: new Date().toISOString(),
  };
  safePersist(COHORTS_KEY, cohortOverlays);
  emit();
  mirrorCohortArchiveToSupabase(slug, true);
}

// ---------------------------------------------------------------------------
// Per-session overlay write API for a specific cohort.
//
// setSessionOverride(slug, order, patch) — general-purpose. Accepts any
// override fields the cohort might want to apply on top of the program
// template:
//   - customSummary      — replaces the program's session summary in the UI
//   - customMaterials    — array of strings; ADDITIONAL items appended to
//                          the program's materials list
//   - facilitatorNotes   — paragraph shown to participants on /session/:order
//                          (separate from facilitatorNotes-private which is
//                          internal-only and lives on the participant record)
//   - customHomework     — replaces the program's homework prompt
//   - videoUrl           — recording URL once a session is done
//
// We write into the cohort's session overlay (cohortOverlays[slug]) so
// getSessionsForCohort returns the merged shape. Fields are nullable; pass
// null/empty to clear that one override.
// ---------------------------------------------------------------------------
export function setSessionOverride(slug, sessionOrder, patch) {
  const overlay = cohortOverlays[slug] || {};
  const baseSessions = getSessionsForCohort(slug);
  const overlaySessions = baseSessions.map((s) => {
    if (s.order !== Number(sessionOrder)) return s;
    return applySessionPatch(s, patch);
  });
  cohortOverlays[slug] = {
    ...overlay,
    sessions: overlaySessions,
    updatedAt: new Date().toISOString(),
  };
  safePersist(COHORTS_KEY, cohortOverlays);
  emit();
  // Persist to Supabase too — otherwise the override only lives in the
  // acting admin's localStorage and any other admin's / participant's
  // session hydrates from Postgres and never sees the change. This was
  // the "I picked Open early on Yellow Belt but the participant still
  // sees it locked, and even I lose the change on reload" bug.
  mirrorCohortToSupabase(cohortOverlays[slug]);
  return overlaySessions.find((s) => s.order === Number(sessionOrder));
}

// Coerces patch values into the canonical session shape — trims strings,
// nulls empty fields, normalizes the materials array.
function applySessionPatch(session, patch = {}) {
  const next = { ...session };
  if ("customSummary" in patch) {
    const v = (patch.customSummary || "").trim();
    next.customSummary = v || null;
  }
  if ("customMaterials" in patch) {
    // customMaterials supports two legacy shapes (strings, {label,type,url})
    // plus the new {title,type,url,fileName?}. Coerce to the new shape so
    // downstream consumers can render uniformly.
    const arr = Array.isArray(patch.customMaterials)
      ? patch.customMaterials
          .map((m) => {
            if (!m) return null;
            if (typeof m === "string") {
              const t = m.trim();
              return t ? { title: t, type: "link", url: "" } : null;
            }
            return {
              title: (m.title || m.label || "").trim(),
              type: m.type || "link",
              url: (m.url || "").trim(),
              fileName: m.fileName || null,
            };
          })
          .filter((m) => m && (m.title || m.url))
      : [];
    next.customMaterials = arr.length ? arr : null;
  }
  if ("facilitatorNotes" in patch) {
    const v = (patch.facilitatorNotes || "").trim();
    next.facilitatorNotes = v || null;
  }
  if ("customHomework" in patch) {
    const v = (patch.customHomework || "").trim();
    next.customHomework = v || null;
  }
  if ("videoUrl" in patch) {
    const v = (patch.videoUrl || "").trim();
    next.videoUrl = v || null;
  }
  // Manual availability override — "locked", "unlocked", or null (default
  // 3-day-before-date rule). Without this branch the LockControl saved
  // silently and the override was dropped, so participants never saw the
  // change.
  if ("manualLockState" in patch) {
    const v = patch.manualLockState;
    next.manualLockState = v === "locked" || v === "unlocked" ? v : null;
  }
  return next;
}

// Backwards-compatible wrapper for the recording upload UI (Round 3E). New
// callers should use setSessionOverride directly.
export function setSessionRecording(slug, sessionOrder, videoUrl) {
  return setSessionOverride(slug, sessionOrder, { videoUrl });
}

// Read a single session from the cohort's overlay-merged session list.
// Returns null if the order doesn't exist.
export function getSessionForCohort(slug, sessionOrder) {
  const sessions = getSessionsForCohort(slug);
  return sessions.find((s) => s.order === Number(sessionOrder)) || null;
}

// Debug-style reset used during demos.
export function clearAllCohortOverlays() {
  for (const key of Object.keys(cohortOverlays)) delete cohortOverlays[key];
  for (const key of Object.keys(orgOverlays))    delete orgOverlays[key];
  safePersist(COHORTS_KEY, cohortOverlays);
  safePersist(ORGS_KEY,    orgOverlays);
  emit();
}

// ---------------------------------------------------------------------------
// Supabase hydration — Phase 2 of #399.
//
// On boot, fetch organizations + cohorts + facilitator profiles from
// Supabase and merge them into the local overlays. Same pattern as
// programs.js: conservative on rich seed content, additive for
// Supabase-only rows.
//
// IDs in Supabase are UUIDs; the legacy demo data uses string slugs/keys.
// We build lookup maps at hydration time so cohort.organization /
// cohort.facilitator land in the legacy shape the UI already knows how
// to render.
// ---------------------------------------------------------------------------

let cohortsHydrated = false;
let cohortHydratePromise = null;

// Reshape a Supabase profiles row (with facilitator capability) into the
// legacy facilitator object the cohort UI consumes.
function profileToFacilitator(row) {
  if (!row) return null;
  return {
    id: "fac-" + (row.id || ""),
    _supabaseProfileId: row.id,
    name: row.name || row.email || "",
    email: row.email || "",
    title: row.preferences?.title || "Facilitator",
    headshotUrl: row.avatar_url || null,
    defaultZoomLink: row.preferences?.defaultZoomLink || null,
    defaultTimeZone: row.time_zone || "America/New_York",
  };
}

// Reshape a Supabase organizations row into the legacy org object.
function organizationRowToOverlay(row) {
  if (!row) return null;
  return {
    id: "org-" + (row.slug || row.id),
    _supabaseId: row.id,
    slug: row.slug,
    name: row.name || "",
    shortName: row.name?.split(" ")[0] || row.slug || "",
    primaryColor: row.primary_color || null,
    archivedAt: row.archived_at || null,
  };
}

// Reshape a Supabase cohorts row into the legacy cohort object. Uses lookup
// maps for program/org/facilitator resolution.
function cohortRowToOverlay(row, { programsByUuid, orgsByUuid, profilesByUuid }) {
  if (!row) return null;
  const program = programsByUuid[row.program_id] || null;
  const org = orgsByUuid[row.org_id] || null;
  const facilitator = profilesByUuid[row.facilitator_id] || null;

  // Build sessions array. Supabase stores session_overrides as JSONB but
  // base session content is on the program — apply overrides to program
  // sessions to get the per-cohort list. If no program is resolvable, fall
  // back to MOCK_SESSIONS so the UI doesn't break.
  let sessions = [];
  if (program?.sessions?.length) {
    sessions = program.sessions.map((s) => ({ ...s }));
    // Apply schedule from session_overrides (admin-edited per-cohort dates).
    const overrides = Array.isArray(row.session_overrides) ? row.session_overrides : [];
    for (const ov of overrides) {
      const idx = sessions.findIndex((s) => s.order === ov.order);
      if (idx >= 0) sessions[idx] = { ...sessions[idx], ...ov };
    }
  }

  return {
    slug: row.slug,
    _supabaseId: row.id,
    name: row.name || "",
    cohortType: org ? "closed" : "open",
    programCode: program?.code || null,
    programName: program?.name || null,
    methodName: program?.methodName || null,
    organization: org,
    facilitator,
    timeZone: row.time_zone || "America/New_York",
    zoomLink: row.meeting_zoom_url || null,
    startDate: row.start_date || null,
    endDate: row.end_date || null,
    meetingDay: row.meeting_day || null,
    meetingTime: row.meeting_time || null,
    participantCount: row.participant_count || 0,
    sessions: sessions.length ? sessions : undefined,
    archivedAt: row.archived_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    _source: "supabase",
  };
}

/**
 * Hydrate cohorts + organizations + facilitator profiles from Supabase.
 * Idempotent. No-op when Supabase isn't enabled.
 */
export async function hydrateCohortsFromSupabase({ force = false } = {}) {
  if (!isSupabaseEnabled()) return;
  if (cohortHydratePromise && !force) return cohortHydratePromise;

  cohortHydratePromise = (async () => {
    try {
      // Pull the three reference sets in parallel. We need them all before
      // we can resolve cohort references.
      const [cohortRows, orgRows, facilitatorRows, programs] = await Promise.all([
        db.list("cohorts", { order: { column: "start_date", ascending: true } }),
        db.list("organizations"),
        // Facilitator profiles = anyone with 'facilitator' OR 'admin' in
        // capabilities. We pull all profiles since the set is tiny; filter
        // client-side to avoid a complex .contains() query.
        db.list("profiles", { includeArchived: false }),
        Promise.resolve(getAllProgramsForAdmin()),
      ]);

      // Build lookup maps keyed by Supabase UUID.
      const programsByUuid = {};
      for (const p of programs || []) {
        if (p._supabaseId) programsByUuid[p._supabaseId] = p;
      }
      const orgsByUuid = {};
      for (const row of orgRows || []) {
        orgsByUuid[row.id] = organizationRowToOverlay(row);
      }
      const profilesByUuid = {};
      for (const row of facilitatorRows || []) {
        const caps = Array.isArray(row.capabilities) ? row.capabilities : [];
        if (caps.includes("facilitator") || caps.includes("admin") || caps.includes("super")) {
          profilesByUuid[row.id] = profileToFacilitator(row);
        }
      }

      // Merge organizations into the overlay. Use legacy-shape id ("org-xxx")
      // so the UI's existing org lookups continue working.
      const orgAdditions = {};
      for (const overlay of Object.values(orgsByUuid)) {
        if (!overlay?.id) continue;
        const existing = orgOverlays[overlay.id] || {};
        orgAdditions[overlay.id] = { ...existing, ...overlay };
      }
      Object.assign(orgOverlays, orgAdditions);
      safePersist(ORGS_KEY, orgOverlays);

      // Merge facilitator profiles into the facilitator overlay. This is
      // authoritative: the resulting overlay should mirror what's actually
      // in Supabase right now (plus any locally-created facilitators that
      // haven't been mirrored yet). Anything else is stale.
      //
      // Purge stale entries first, then layer in the fresh Supabase data:
      //   - Drop entries with a _supabaseProfileId that no longer exists
      //     in profilesByUuid — those were deleted / demoted in Supabase.
      //   - Drop entries with NO _supabaseProfileId AND no createdAt —
      //     that's demo/seed residue with no legitimate origin.
      //   - Drop entries with no email — usually the same residue in a
      //     shape old enough it never had one, and they can't be safely
      //     deduped against email-carrying rows.
      //
      // Result: no more ghost "Jess Lee / Carlos Mendez / Jordan Park"
      // hangovers from previous seed states, and no more Mike-twice.
      const liveProfileIds = new Set(
        Object.values(profilesByUuid)
          .map((p) => p?._supabaseProfileId)
          .filter(Boolean),
      );
      for (const [id, entry] of Object.entries(facilitatorOverlays)) {
        const sid = entry?._supabaseProfileId;
        const hasEmail = !!(entry?.email && String(entry.email).trim());
        const localOnly = !sid && !!entry?.createdAt;
        if (sid && !liveProfileIds.has(sid)) {
          delete facilitatorOverlays[id];
          continue;
        }
        if (!sid && !localOnly) {
          delete facilitatorOverlays[id];
          continue;
        }
        if (!hasEmail && !localOnly) {
          delete facilitatorOverlays[id];
        }
      }
      const facAdditions = {};
      for (const overlay of Object.values(profilesByUuid)) {
        if (!overlay?.id) continue;
        const existing = facilitatorOverlays[overlay.id] || {};
        facAdditions[overlay.id] = { ...existing, ...overlay };
      }
      Object.assign(facilitatorOverlays, facAdditions);
      safePersist(FACILITATORS_KEY, facilitatorOverlays);

      // Merge cohorts. Cohorts whose slug already appears in DEMO_COHORTS
      // get their Supabase id attached but defer to seed for content.
      const demoSlugs = new Set(DEMO_COHORTS.map((c) => c.slug));
      const cohortAdditions = {};
      for (const row of cohortRows || []) {
        const overlay = cohortRowToOverlay(row, { programsByUuid, orgsByUuid, profilesByUuid });
        if (!overlay?.slug) continue;
        if (demoSlugs.has(overlay.slug)) {
          // Seed-cohort: only attach IDs + Supabase metadata, leave content
          // to the seed.
          cohortAdditions[overlay.slug] = {
            ...(cohortOverlays[overlay.slug] || {}),
            _supabaseId: overlay._supabaseId,
            _source: "supabase",
            archivedAt: overlay.archivedAt,
          };
        } else {
          // Supabase-only cohort: hydrate from DB, but never let null
          // Supabase columns clobber locally-set fields. This guards the
          // facilitator/organization/programCode round-trip: when the
          // mirror couldn't resolve facilitator_id at write time (fresh
          // session, no hydrated facilitator overlay yet), the DB row
          // has facilitator_id=null, and a naive spread erased the
          // client-side cohort.facilitator that createCohort set.
          const localOverlay = cohortOverlays[overlay.slug] || {};
          const merged = { ...localOverlay, ...overlay };
          const preserveIfNull = ["facilitator", "organization", "programCode", "zoomLink", "timeZone"];
          for (const key of preserveIfNull) {
            if (merged[key] == null && localOverlay[key] != null) {
              merged[key] = localOverlay[key];
            }
          }
          cohortAdditions[overlay.slug] = merged;
        }
      }
      Object.assign(cohortOverlays, cohortAdditions);
      safePersist(COHORTS_KEY, cohortOverlays);

      cohortsHydrated = true;
      emit();
    } catch (err) {
      if (!(err instanceof SupabaseNotReady)) {
        captureError(err, { source: "hydrateCohortsFromSupabase" });
      }
    }
  })();

  return cohortHydratePromise;
}

/**
 * Best-effort mirror — push a cohort overlay change to Supabase. Doesn't
 * block or throw; local overlay is the source of truth.
 */
async function mirrorCohortToSupabase(cohort) {
  if (!isSupabaseEnabled() || !cohort?.slug) return;
  try {
    // Resolve program code → Supabase program UUID.
    const program = getAllProgramsForAdmin().find((p) => p.code === cohort.programCode);
    if (!program?._supabaseId) return; // can't mirror without a valid FK

    // Resolve org legacy id → Supabase org UUID via the orgOverlays lookup.
    const orgOverlay = cohort.organization?.id ? orgOverlays[cohort.organization.id] : null;
    const orgUuid = orgOverlay?._supabaseId || null;

    // Resolve facilitator legacy id → Supabase profile UUID.
    //
    // Three-tier lookup:
    //   1) overlay._supabaseProfileId (set when we already hydrated the fac)
    //   2) the facilitator record already carries _supabaseProfileId
    //   3) email lookup via a fresh db.list('profiles') filter
    //
    // Without #3, an admin creating a cohort in a fresh session (before
    // hydrate has attached IDs) would silently save facilitator_id=null.
    // On the next hydrate the empty facilitator_id would clobber the
    // client-side cohort.facilitator field — the "test cohort has no
    // facilitator" bug Mike reported.
    let facUuid = null;
    const fac = cohort.facilitator || null;
    if (fac) {
      const overlay = fac.id ? facilitatorOverlays[fac.id] : null;
      facUuid = overlay?._supabaseProfileId || fac._supabaseProfileId || null;
      if (!facUuid && fac.email) {
        try {
          const rows = await db.list("profiles", { includeArchived: false });
          const match = (rows || []).find(
            (r) => (r.email || "").toLowerCase() === fac.email.toLowerCase(),
          );
          if (match?.id) {
            facUuid = match.id;
            // Cache on the local overlay so subsequent writes short-circuit.
            if (fac.id && facilitatorOverlays[fac.id]) {
              facilitatorOverlays[fac.id]._supabaseProfileId = match.id;
              safePersist(FACILITATORS_KEY, facilitatorOverlays);
            }
          }
        } catch { /* swallow — non-fatal, we'll try again next mirror */ }
      }
    }

    // Date strings: cohort.sessions[0]?.date is "YYYY-MM-DDTHH:MM" datetime-local.
    // Postgres `date` column wants YYYY-MM-DD only. Best-effort coerce.
    const startDate = cohort.sessions?.[0]?.date?.slice(0, 10) || null;
    const lastDate = cohort.sessions?.length
      ? cohort.sessions[cohort.sessions.length - 1].date?.slice(0, 10)
      : null;

    const row = {
      id: cohort._supabaseId || undefined,
      slug: cohort.slug,
      program_id: program._supabaseId,
      org_id: orgUuid,
      name: cohort.name || "",
      start_date: startDate,
      end_date: lastDate,
      meeting_day: cohort.meetingDay || null,
      meeting_time: cohort.meetingTime || null,
      meeting_zoom_url: cohort.zoomLink || null,
      participant_count: cohort.participantCount || 0,
      session_overrides: cohort.sessions || [],
      facilitator_id: facUuid,
    };

    // Diagnostic: if a facilitator was picked client-side but none of the
    // three resolution tiers found a UUID, we're about to write
    // facilitator_id: null and the participant view will render no card.
    // Surface it loudly so we catch it at write time instead of finding
    // out from a blank card later. Fires to devtools console + Sentry.
    if (fac && !facUuid) {
      const msg =
        `[mirrorCohortToSupabase] Could not resolve facilitator_id for cohort "${cohort.slug}". ` +
        `Client had facilitator { id:${fac.id}, email:${fac.email}, name:${fac.name}, _supabaseProfileId:${fac._supabaseProfileId || "MISSING"} } ` +
        `but no matching profiles row. Writing facilitator_id=NULL.`;
      // eslint-disable-next-line no-console
      console.warn(msg);
      try {
        captureError(new Error(msg), {
          source: "mirrorCohortToSupabase.facilitator-unresolved",
          slug: cohort.slug,
          facEmail: fac.email,
          facId: fac.id,
        });
      } catch { /* ignore */ }
    }

    const conflictKey = row.id ? "id" : "program_id,slug";
    await db.upsert("cohorts", row, { onConflict: conflictKey });
  } catch (err) {
    if (!(err instanceof SupabaseNotReady)) {
      captureError(err, { source: "mirrorCohortToSupabase", slug: cohort?.slug });
    }
  }
}

/**
 * Best-effort soft-delete mirror.
 */
async function mirrorCohortArchiveToSupabase(slug, archived) {
  if (!isSupabaseEnabled() || !slug) return;
  try {
    const rows = await db.list("cohorts", { eq: { slug }, includeArchived: true });
    const row = rows && rows[0];
    if (!row) return;
    await db.update("cohorts", row.id, {
      archived_at: archived ? new Date().toISOString() : null,
    });
  } catch (err) {
    captureError(err, { source: "mirrorCohortArchiveToSupabase", slug });
  }
}
