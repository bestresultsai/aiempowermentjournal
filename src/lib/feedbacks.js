import { useEffect, useState } from "react";
import { isSupabaseEnabled } from "./supabase";
import { db, SupabaseNotReady } from "./db";
import { captureError } from "./observability";
import { getAllCohortsForAdmin } from "./cohortAdmin";

// ---------------------------------------------------------------------------
// Feedbacks — per-session participant feedback.
//
// After a session lands (LIVE / AWAITING_RECORDING / COMPLETED), participants
// can leave a star rating + free-text comment. Facilitators and admins see
// aggregated feedback on /admin/feedback.
//
// Shape:
//   {
//     id,
//     participantId, participantName, participantEmail,
//     cohortSlug,
//     sessionOrder,            // 1-based session order within the cohort
//     rating,                  // 1..5 integer
//     comment,                 // free text, may be empty
//     submittedAt, updatedAt?
//   }
//
// Persistence: localStorage overlay + pubsub, matching resources.js and
// cohortAdmin.js. Real persistence swaps to Supabase under the same shape.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "brai_feedback_overlays";

// ---------------------------------------------------------------------------
// Seed feedbacks — gives /admin/feedback content to render against the
// Summit + PHS demo participants. Mix of high/middle/low ratings so the
// admin view has signal to display.
// ---------------------------------------------------------------------------

function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 30, 0, 0);
  return d.toISOString();
}

export const SEED_FEEDBACKS = [
  // Summit (AIEW3) — session 1 (White Belt)
  {
    id: "seed-fb-summit-1-brett",
    participantId: "user-summit-1",
    participantName: "Brett Wilson",
    participantEmail: "brett.wilson@summithealth.com",
    cohortSlug: "summit-aiew3-2026q3",
    sessionOrder: 1,
    rating: 5,
    comment: "Best workshop I've been to in years. The Role Matrix exercise alone justified the whole program for me.",
    submittedAt: daysAgoISO(25),
  },
  {
    id: "seed-fb-summit-1-priya",
    participantId: "user-summit-2",
    participantName: "Priya Sharma",
    participantEmail: "priya.sharma@summithealth.com",
    cohortSlug: "summit-aiew3-2026q3",
    sessionOrder: 1,
    rating: 4,
    comment: "Strong content. Wished we had more time on the data-analyst-specific use cases.",
    submittedAt: daysAgoISO(25),
  },
  {
    id: "seed-fb-summit-1-james",
    participantId: "user-summit-3",
    participantName: "James Chen",
    participantEmail: "james.chen@summithealth.com",
    cohortSlug: "summit-aiew3-2026q3",
    sessionOrder: 1,
    rating: 5,
    comment: "The change-management framework is gold. Already shared it internally.",
    submittedAt: daysAgoISO(25),
  },
  // Summit — session 2 (Yellow Belt)
  {
    id: "seed-fb-summit-2-brett",
    participantId: "user-summit-1",
    participantName: "Brett Wilson",
    participantEmail: "brett.wilson@summithealth.com",
    cohortSlug: "summit-aiew3-2026q3",
    sessionOrder: 2,
    rating: 5,
    comment: "Self-enhancement accelerator changed how my team thinks about prompts.",
    submittedAt: daysAgoISO(18),
  },
  {
    id: "seed-fb-summit-2-alex",
    participantId: "user-summit-6",
    participantName: "Alex Rivera",
    participantEmail: "alex.rivera@summithealth.com",
    cohortSlug: "summit-aiew3-2026q3",
    sessionOrder: 2,
    rating: 4,
    comment: "Could have been more concrete with code examples but conceptually strong.",
    submittedAt: daysAgoISO(18),
  },
  // PHS (APFW) — session 1
  {
    id: "seed-fb-phs-1-diane",
    participantId: "user-phs-1",
    participantName: "Diane Park",
    participantEmail: "diane.park@pacifichealth.org",
    cohortSlug: "phs-apfw-2026q2",
    sessionOrder: 1,
    rating: 5,
    comment: "Exactly the kickoff we needed. The maturity model is now our internal language.",
    submittedAt: daysAgoISO(27),
  },
  {
    id: "seed-fb-phs-1-carlos",
    participantId: "user-phs-2",
    participantName: "Carlos Mendez",
    participantEmail: "carlos.mendez@pacifichealth.org",
    cohortSlug: "phs-apfw-2026q2",
    sessionOrder: 1,
    rating: 3,
    comment: "Good intro but the pace was a bit slow for the engineers in the room.",
    submittedAt: daysAgoISO(27),
  },
  // PHS — session 2
  {
    id: "seed-fb-phs-2-robert",
    participantId: "user-phs-4",
    participantName: "Robert Davis",
    participantEmail: "robert.davis@pacifichealth.org",
    cohortSlug: "phs-apfw-2026q2",
    sessionOrder: 2,
    rating: 5,
    comment: "Comprehensive Context workflow is going to be on every IT prompt from here on out.",
    submittedAt: daysAgoISO(20),
  },
  {
    id: "seed-fb-phs-2-lin",
    participantId: "user-phs-3",
    participantName: "Lin Wang",
    participantEmail: "lin.wang@pacifichealth.org",
    cohortSlug: "phs-apfw-2026q2",
    sessionOrder: 2,
    rating: 4,
    comment: "Loved the live workflow demo. Mike has a knack for showing not telling.",
    submittedAt: daysAgoISO(20),
  },
];

// ---------------------------------------------------------------------------
// Overlay store
// ---------------------------------------------------------------------------

function readOverlays() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeOverlays(overlays) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overlays));
  } catch {
    /* ignore */
  }
}

let feedbackOverlays = readOverlays();

const listeners = new Set();
function emit() {
  for (const fn of listeners) {
    try { fn(); } catch { /* ignore */ }
  }
}
export function subscribeFeedbackChanges(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useFeedbackVersion() {
  const [v, setV] = useState(0);
  useEffect(() => subscribeFeedbackChanges(() => setV((x) => x + 1)), []);
  return v;
}

// ---------------------------------------------------------------------------
// Readers
// ---------------------------------------------------------------------------

function getAllFeedbacks() {
  // Merge seed + overlays. Overlays win on duplicate id.
  const byId = Object.fromEntries(SEED_FEEDBACKS.map((f) => [f.id, f]));
  for (const [id, overlay] of Object.entries(feedbackOverlays)) {
    if (overlay?.deletedAt) {
      delete byId[id];
      continue;
    }
    byId[id] = { ...(byId[id] || {}), ...overlay };
  }
  return Object.values(byId).sort(
    (a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0),
  );
}

// All feedback within the given cohort slugs (and optional time window).
// sinceMs = epoch ms; null means "all time".
export function getFeedbacksInScope(cohortSlugs, sinceMs = null) {
  const allowed = new Set(cohortSlugs || []);
  return getAllFeedbacks().filter((f) => {
    if (!allowed.has(f.cohortSlug)) return false;
    if (sinceMs && new Date(f.submittedAt).getTime() < sinceMs) return false;
    return true;
  });
}

// One participant + one session = at most one feedback row. Returns null if
// they haven't submitted yet.
export function getFeedbackForParticipantSession(participantEmail, cohortSlug, sessionOrder) {
  const email = (participantEmail || "").toLowerCase();
  return getAllFeedbacks().find(
    (f) =>
      (f.participantEmail || "").toLowerCase() === email &&
      f.cohortSlug === cohortSlug &&
      Number(f.sessionOrder) === Number(sessionOrder),
  ) || null;
}

// Returns { count, avg, distribution: {1..5: count}, comments: [feedback] }
// for one cohort + one session. Used on the admin per-session view.
export function getSessionFeedbackStats(cohortSlug, sessionOrder) {
  const list = getAllFeedbacks().filter(
    (f) => f.cohortSlug === cohortSlug && Number(f.sessionOrder) === Number(sessionOrder),
  );
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const f of list) {
    const r = Math.max(1, Math.min(5, Math.round(Number(f.rating) || 0)));
    distribution[r] += 1;
    sum += r;
  }
  return {
    count: list.length,
    avg: list.length ? sum / list.length : 0,
    distribution,
    comments: list,
  };
}

// Cross-session summary for an entire scope — used on /admin/feedback header
// + dashboard widget. Returns one row per (cohort, sessionOrder).
export function getFeedbacksBySessionInScope(cohortSlugs, sinceMs = null) {
  const list = getFeedbacksInScope(cohortSlugs, sinceMs);
  const map = new Map();
  for (const f of list) {
    const key = `${f.cohortSlug}::${f.sessionOrder}`;
    if (!map.has(key)) {
      map.set(key, {
        cohortSlug: f.cohortSlug,
        sessionOrder: Number(f.sessionOrder),
        count: 0,
        sum: 0,
        comments: [],
      });
    }
    const row = map.get(key);
    row.count += 1;
    row.sum += Math.max(1, Math.min(5, Math.round(Number(f.rating) || 0)));
    row.comments.push(f);
  }
  return Array.from(map.values())
    .map((r) => ({ ...r, avg: r.count ? r.sum / r.count : 0 }))
    .sort((a, b) =>
      a.cohortSlug === b.cohortSlug
        ? a.sessionOrder - b.sessionOrder
        : a.cohortSlug.localeCompare(b.cohortSlug),
    );
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

function genId() {
  return `fb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// Create or update — feedback is keyed by (participant, cohort, session).
// If a feedback already exists, we patch it (so users can edit).
export function submitFeedback(payload) {
  if (!payload?.participantEmail) {
    throw new Error("submitFeedback: participantEmail is required.");
  }
  if (!payload?.cohortSlug) {
    throw new Error("submitFeedback: cohortSlug is required.");
  }
  if (!payload?.sessionOrder) {
    throw new Error("submitFeedback: sessionOrder is required.");
  }
  const rating = Math.max(1, Math.min(5, Math.round(Number(payload.rating) || 0)));
  if (rating < 1) {
    throw new Error("submitFeedback: rating must be 1-5.");
  }

  const existing = getFeedbackForParticipantSession(
    payload.participantEmail,
    payload.cohortSlug,
    payload.sessionOrder,
  );
  const now = new Date().toISOString();

  if (existing) {
    const next = {
      ...existing,
      rating,
      comment: (payload.comment || "").trim(),
      updatedAt: now,
    };
    feedbackOverlays = { ...feedbackOverlays, [existing.id]: next };
    writeOverlays(feedbackOverlays);
    emit();
    mirrorFeedbackToSupabase(next);
    return next;
  }

  const id = genId();
  const fb = {
    id,
    participantId: payload.participantId || null,
    participantName: (payload.participantName || "").trim(),
    participantEmail: payload.participantEmail.trim(),
    cohortSlug: payload.cohortSlug,
    sessionOrder: Number(payload.sessionOrder),
    rating,
    comment: (payload.comment || "").trim(),
    submittedAt: now,
  };
  feedbackOverlays = { ...feedbackOverlays, [id]: fb };
  writeOverlays(feedbackOverlays);
  emit();
  mirrorFeedbackToSupabase(fb);
  return fb;
}

// Soft-delete. Seed feedback can be deleted too (overlay shadows it).
export function deleteFeedback(id) {
  const existing = feedbackOverlays[id] || getAllFeedbacks().find((f) => f.id === id);
  if (!existing) return;
  feedbackOverlays = {
    ...feedbackOverlays,
    [id]: { ...existing, deletedAt: new Date().toISOString() },
  };
  writeOverlays(feedbackOverlays);
  emit();
  // Best-effort: archive the row in Supabase if we have a UUID for it.
  if (existing._supabaseId) {
    mirrorFeedbackArchiveToSupabase(existing._supabaseId);
  }
}

// ---------------------------------------------------------------------------
// Supabase hydration — Phase 2 of #399.
//
// Feedback rows reference cohort_id (FK to cohorts) and profile_id (FK to
// profiles). Cohort UUID resolution reuses the map built by cohorts
// hydration. Profile UUID resolution is per-email — we keep an
// emails-to-profile-UUID cache that's rebuilt at hydration time AND on
// every write that fails to find a profile (in case a new participant just
// signed in for the first time).
//
// IMPORTANT: participant profiles aren't seeded yet — only staff
// (josue@bestresults.ai, mike@bestresults.ai, jordan@summithealth.example).
// So today, only feedback FROM those three would mirror to Supabase.
// Regular participant feedback stays in localStorage until the participant
// migration round seeds their profile rows.
// ---------------------------------------------------------------------------

let feedbacksHydrated = false;
let feedbackHydratePromise = null;

// Email → Supabase profile UUID. Populated at hydration time; consulted by
// the write mirror.
let profilesByEmail = new Map();

// Map a Supabase feedbacks row to the legacy overlay shape.
function feedbackRowToOverlay(row, { cohortsByUuid, profilesByUuid }) {
  if (!row) return null;
  const cohort = row.cohort_id ? cohortsByUuid[row.cohort_id] : null;
  const profile = row.profile_id ? profilesByUuid[row.profile_id] : null;
  return {
    id: row.id,
    _supabaseId: row.id,
    participantId: profile?.legacyParticipantId || null,
    participantName: profile?.name || "",
    participantEmail: profile?.email || "",
    cohortSlug: cohort?.slug || null,
    sessionOrder: row.session_number,
    rating: row.rating,
    comment: row.comment || "",
    submittedAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.archived_at || null,
    _source: "supabase",
  };
}

/**
 * Hydrate feedbacks from Supabase. Requires cohorts to be hydrated first
 * for cohort_id UUID resolution.
 */
export async function hydrateFeedbacksFromSupabase({ force = false } = {}) {
  if (!isSupabaseEnabled()) return;
  if (feedbackHydratePromise && !force) return feedbackHydratePromise;

  feedbackHydratePromise = (async () => {
    try {
      const [rows, profiles, cohorts] = await Promise.all([
        db.list("feedbacks", { order: { column: "created_at", ascending: false } }),
        db.list("profiles", { includeArchived: false }),
        Promise.resolve(getAllCohortsForAdmin()),
      ]);

      const cohortsByUuid = {};
      for (const c of cohorts || []) {
        if (c._supabaseId) cohortsByUuid[c._supabaseId] = c;
      }
      const profilesByUuid = {};
      const nextProfilesByEmail = new Map();
      for (const p of profiles || []) {
        profilesByUuid[p.id] = { name: p.name, email: p.email, legacyParticipantId: null };
        if (p.email) nextProfilesByEmail.set(p.email.toLowerCase(), p.id);
      }
      profilesByEmail = nextProfilesByEmail;

      const seedIds = new Set(SEED_FEEDBACKS.map((f) => f.id));
      const additions = {};
      for (const row of rows || []) {
        const overlay = feedbackRowToOverlay(row, { cohortsByUuid, profilesByUuid });
        if (!overlay?.id) continue;
        if (seedIds.has(overlay.id)) {
          // Seed feedback: only attach Supabase id + deletion state.
          additions[overlay.id] = {
            ...(feedbackOverlays[overlay.id] || {}),
            _supabaseId: overlay._supabaseId,
            _source: "supabase",
            deletedAt: overlay.deletedAt,
          };
        } else {
          // Supabase-only feedback: full hydration.
          additions[overlay.id] = {
            ...(feedbackOverlays[overlay.id] || {}),
            ...overlay,
          };
        }
      }
      feedbackOverlays = { ...feedbackOverlays, ...additions };
      writeOverlays(feedbackOverlays);
      feedbacksHydrated = true;
      emit();
    } catch (err) {
      if (!(err instanceof SupabaseNotReady)) {
        captureError(err, { source: "hydrateFeedbacksFromSupabase" });
      }
    }
  })();

  return feedbackHydratePromise;
}

// ---------------------------------------------------------------------------
// Write mirror
// ---------------------------------------------------------------------------

// On-demand profile-by-email lookup. Falls back to a fresh Supabase query
// if the email isn't in the cached map (e.g. a participant who signed in
// for the first time after hydration ran).
async function resolveProfileUuidByEmail(email) {
  if (!email) return null;
  const key = email.toLowerCase();
  if (profilesByEmail.has(key)) return profilesByEmail.get(key);
  try {
    const rows = await db.list("profiles", { eq: { email }, limit: 1 });
    const uuid = rows && rows[0] && rows[0].id;
    if (uuid) profilesByEmail.set(key, uuid);
    return uuid || null;
  } catch {
    return null;
  }
}

// Resolve cohortSlug → Supabase cohort UUID via the already-hydrated cohort
// overlay map. Returns null if not found.
function resolveCohortUuidBySlug(slug) {
  if (!slug) return null;
  const cohort = getAllCohortsForAdmin().find((c) => c.slug === slug);
  return cohort?._supabaseId || null;
}

async function mirrorFeedbackToSupabase(feedback) {
  if (!isSupabaseEnabled() || !feedback) return;
  try {
    const cohortUuid = resolveCohortUuidBySlug(feedback.cohortSlug);
    const profileUuid = await resolveProfileUuidByEmail(feedback.participantEmail);
    if (!cohortUuid || !profileUuid) return; // can't satisfy FKs — skip

    const row = {
      id: feedback._supabaseId || undefined,
      profile_id: profileUuid,
      cohort_id: cohortUuid,
      session_number: Number(feedback.sessionOrder) || 0,
      rating: Math.max(1, Math.min(5, Math.round(Number(feedback.rating) || 0))),
      comment: feedback.comment || "",
    };

    if (!row.id) {
      // Conflict on the unique (profile_id, cohort_id, session_number)
      // index so re-submits update instead of duplicate.
      const inserted = await db.upsert("feedbacks", row, {
        onConflict: "profile_id,cohort_id,session_number",
      });
      if (inserted?.id) {
        const merged = { ...feedback, _supabaseId: inserted.id };
        feedbackOverlays = { ...feedbackOverlays, [feedback.id]: merged };
        writeOverlays(feedbackOverlays);
      }
    } else {
      await db.upsert("feedbacks", row, { onConflict: "id" });
    }
  } catch (err) {
    if (!(err instanceof SupabaseNotReady)) {
      captureError(err, { source: "mirrorFeedbackToSupabase", id: feedback?.id });
    }
  }
}

async function mirrorFeedbackArchiveToSupabase(supabaseId) {
  if (!isSupabaseEnabled() || !supabaseId) return;
  try {
    await db.update("feedbacks", supabaseId, {
      archived_at: new Date().toISOString(),
    });
  } catch (err) {
    captureError(err, { source: "mirrorFeedbackArchiveToSupabase", supabaseId });
  }
}
