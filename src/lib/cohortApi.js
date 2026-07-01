// ---------------------------------------------------------------------------
// API client for the Cohort / Sessions / Homework module.
// Mirrors the pattern of src/lib/api.js (the Journal module).
// Toggle USE_MOCK_DATA to swap between the in-memory mock and live Notion.
// ---------------------------------------------------------------------------

import {
  MOCK_COHORT,
  MOCK_SESSIONS,
  MOCK_PROGRESS,
  MOCK_HOMEWORK,
  isSessionUnlocked,
} from "./mockCohort";
import { DEMO_COHORTS, isDemoModeActive, shouldUseSeedData } from "./demoData";
import {
  getParticipantByEmail,
  submitHomeworkAsParticipant,
  markSessionCompleteForParticipant,
} from "./adminMockData";
import { getProgramByCode } from "./programs";
import { getCohortForAdmin, getSessionsForCohort, getAllFacilitators } from "./cohortAdmin";
import { initSupabase, isSupabaseEnabled } from "./supabase";

export const USE_MOCK_DATA = true; // flip to false once Notion DBs + functions are live

const API_BASE = "";

function getToken() {
  return localStorage.getItem("auth_token");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// In-memory stores (mock mode only).
const inMemoryProgress = { ...MOCK_PROGRESS };
const inMemoryHomework = { ...MOCK_HOMEWORK };

// Resolve the current participant's email. Prefers the Supabase auth
// session (which is what real users hit), falls back to the legacy JWT
// stored in localStorage (from the pre-Supabase era). Returns "guest"
// when nothing resolves — which used to happen silently on every
// homework/session-complete write for signed-in Supabase users, because
// the legacy auth_token key hasn't been used since Phase 3. That was
// causing participant writes to skip the mirror path entirely and never
// reach the admin views.
async function currentUserKey() {
  if (isSupabaseEnabled()) {
    try {
      const client = await initSupabase();
      if (client) {
        const { data } = await client.auth.getSession();
        const email = data?.session?.user?.email;
        if (email) return email;
      }
    } catch { /* fall through to legacy path */ }
  }
  try {
    const token = getToken();
    if (!token) return "guest";
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.email || "guest";
  } catch {
    return "guest";
  }
}

function decorateSessions(sessions, completed, homeworkByOrder) {
  const today = new Date();
  return sessions.map((s) => ({
    ...s,
    unlocked: isSessionUnlocked(s, today),
    completed: completed.includes(s.order),
    homeworkSubmission: homeworkByOrder[s.order] || null,
    homeworkSubmitted: !!homeworkByOrder[s.order],
  }));
}

// ---- Public API ----------------------------------------------------------

export async function getCohortBySlug(slug) {
  if (USE_MOCK_DATA) {
    // ----- Real (Supabase) cohort path -----
    // If the slug matches a cohort in the admin overlay store (i.e. a real
    // Supabase-hydrated cohort), build a participant-facing view of it. This
    // used to fall through to MOCK_COHORT and show "IAHE" + Purple belt to
    // every real participant regardless of their actual cohort.
    if (!shouldUseSeedData()) {
      const realCohort = getCohortForAdmin(slug);
      if (realCohort) {
        return await buildParticipantCohortView(realCohort, slug);
      }
    }

    // Multi-cohort demo: every demo cohort slug serves MOCK_COHORT's content
    // with the demo cohort's identity overlaid (name, slug, organization).
    const demoCohort = DEMO_COHORTS.find((c) => c.slug === slug);
    const isKnownSlug = slug === MOCK_COHORT.slug || !!demoCohort;
    if (!isKnownSlug) {
      throw new Error(`Cohort "${slug}" not found.`);
    }

    const key = await currentUserKey();

    // Prefer the unified ADMIN_MOCK_PARTICIPANTS record when one exists for
    // the current email — that way submissions + admin reviews flow both
    // directions through the same store. Fall back to the legacy in-memory
    // map for unknown users.
    const adminParticipant = getParticipantByEmail(key);
    let completed;
    let homework;
    if (adminParticipant) {
      completed = adminParticipant.progress || [];
      homework = {};
      for (const [orderStr, sub] of Object.entries(adminParticipant.submissions || {})) {
        if (!sub.submittedAt) continue;
        homework[Number(orderStr)] = sub;
      }
    } else {
      completed = inMemoryProgress[key] || [];
      homework = inMemoryHomework[key] || {};
    }

    // Pull the matching program's sessions count so /journey, /home, and the
    // CohortStats card show 10/10 for an APFW cohort and 8/8 for AIEW3.
    const programCode = demoCohort?.programCode || MOCK_COHORT.programCode;
    const program = getProgramByCode(programCode);
    const totalSessions = program?.sessionsCount || MOCK_SESSIONS.length;

    return {
      ...MOCK_COHORT,
      // Overlay the requested demo cohort's identity, if applicable.
      ...(demoCohort ? {
        slug: demoCohort.slug,
        name: demoCohort.name,
        methodName: demoCohort.methodName,
        programCode: demoCohort.programCode,
        organization: demoCohort.organization,
      } : {}),
      sessions: decorateSessions(MOCK_SESSIONS, completed, homework),
      progress: {
        completed: completed.length,
        total: totalSessions,
        percent: Math.round((completed.length / totalSessions) * 100),
      },
      homeworkProgress: {
        submitted: Object.keys(homework).length,
        total: totalSessions,
      },
    };
  }
  return fetchJSON(`/api/cohort/${encodeURIComponent(slug)}`);
}

// ---------------------------------------------------------------------------
// Build a participant-facing cohort view from a real (Supabase-hydrated)
// admin cohort record. This is what real users see on /journey — the cohort's
// actual name/org/facilitator/sessions instead of the MOCK_COHORT (IAHE +
// Purple belt seed data).
// ---------------------------------------------------------------------------
async function buildParticipantCohortView(realCohort, slug) {
  const sessions = getSessionsForCohort(slug) || MOCK_SESSIONS;
  const key = await currentUserKey();
  const adminParticipant = getParticipantByEmail(key);
  const completed = adminParticipant?.progress || inMemoryProgress[key] || [];
  const homework = {};
  if (adminParticipant) {
    for (const [orderStr, sub] of Object.entries(adminParticipant.submissions || {})) {
      if (!sub.submittedAt) continue;
      homework[Number(orderStr)] = sub;
    }
  } else {
    Object.assign(homework, inMemoryHomework[key] || {});
  }

  // Facilitator lookup — realCohort.facilitator can be an id string, an
  // object with headshotUrl, or missing. Try to resolve to the richer record.
  let trainer = null;
  const rawFac = realCohort.facilitator;
  if (rawFac && typeof rawFac === "object" && rawFac.name) {
    trainer = {
      name: rawFac.name,
      title: rawFac.title || "Facilitator, BestResults.AI",
      email: rawFac.email || "",
      headshotUrl: rawFac.headshotUrl || null,
      coachingHeadline: "Feeling stuck?",
      calendlyUrl: rawFac.calendlyUrl || rawFac.calendly || "",
    };
  } else if (rawFac) {
    const facId = typeof rawFac === "string" ? rawFac : rawFac.id;
    const facRecord = (getAllFacilitators() || []).find((f) => f.id === facId);
    if (facRecord) {
      trainer = {
        name: facRecord.name,
        title: facRecord.title || "Facilitator, BestResults.AI",
        email: facRecord.email || "",
        headshotUrl: facRecord.headshotUrl || null,
        coachingHeadline: "Feeling stuck?",
        calendlyUrl: facRecord.calendlyUrl || "",
      };
    }
  }

  // Deeper Supabase-direct fallback. If in-memory resolution didn't give us
  // a facilitator, query the cohort row + profile directly. Handles the
  // stale-overlay case (participant loaded before facilitator profile was
  // hydrated, so getAllFacilitators() didn't have them yet) and the
  // fresh-session case (in-memory maps are cold, but the DB row has a
  // valid facilitator_id). Mirrors the participant-by-email direct-query
  // pattern used elsewhere. Silent on failure — we just fall through to
  // no card, which is better than a mock leak.
  if (!trainer && isSupabaseEnabled()) {
    try {
      const client = await initSupabase();
      if (client) {
        // 1. Find the cohort row and its facilitator_id.
        const { data: cohortRows } = await client
          .from("cohorts")
          .select("facilitator_id")
          .eq("slug", slug)
          .limit(1);
        const facUuid = cohortRows?.[0]?.facilitator_id || null;
        if (facUuid) {
          // 2. Fetch the profile.
          const { data: profileRow } = await client
            .from("profiles")
            .select("id,name,email,avatar_url,preferences")
            .eq("id", facUuid)
            .single();
          if (profileRow?.name) {
            trainer = {
              name: profileRow.name,
              title: profileRow.preferences?.title || "Facilitator, BestResults.AI",
              email: profileRow.email || "",
              headshotUrl: profileRow.avatar_url || null,
              coachingHeadline: "Feeling stuck?",
              calendlyUrl: profileRow.preferences?.calendlyUrl || "",
            };
          }
        }
      }
    } catch { /* swallow — non-fatal, card just won't render */ }
  }

  const program = getProgramByCode(realCohort.programCode);
  const totalSessions = program?.sessionsCount || sessions.length || MOCK_SESSIONS.length;

  return {
    id: realCohort.id || `cohort-${realCohort.slug}`,
    slug: realCohort.slug,
    name: realCohort.name,
    // The Journal Entries store filters by this string in the demo path.
    // For real cohorts, we mirror the cohort name so filtering stays consistent.
    journalCohortName: realCohort.name,
    methodName: program?.methodName || "AI Empowerment Method",
    programCode: realCohort.programCode || "AIEW3",
    programName: program?.name || "AI Empowerment Workshop Series 3.0",
    organization: realCohort.organization || null,
    // No fallback to MOCK_COHORT.trainer — that path leaked Mike Burkesmith
    // as the "Your Facilitator" card for any real cohort whose facilitator
    // reference couldn't resolve (missing, deleted, or an id that no longer
    // matches a profile). Return null instead; FacilitatorCard renders
    // nothing when name is missing, which is the correct behavior.
    trainer: trainer || null,
    // Time / schedule fields — pull from the cohort overlay where present.
    meetingDay: realCohort.meetingDay || null,
    meetingTime: realCohort.meetingTime || null,
    timeZone: realCohort.timeZone || null,
    startDate: realCohort.startDate || null,
    endDate: realCohort.endDate || null,
    sessions: decorateSessions(sessions, completed, homework),
    progress: {
      completed: completed.length,
      total: totalSessions,
      percent: totalSessions ? Math.round((completed.length / totalSessions) * 100) : 0,
    },
    homeworkProgress: {
      submitted: Object.keys(homework).length,
      total: totalSessions,
    },
    _source: "supabase",
  };
}

export async function getSession(slug, order) {
  const cohort = await getCohortBySlug(slug);
  const session = cohort.sessions.find((s) => String(s.order) === String(order));
  if (!session) throw new Error(`Session ${order} not found in cohort ${slug}`);
  return { cohort, session };
}

export async function markSessionComplete(slug, order, completed = true) {
  if (USE_MOCK_DATA) {
    const key = await currentUserKey();
    // Prefer the unified participant record so admin views reflect progress.
    const updated = markSessionCompleteForParticipant(key, order, completed);
    if (updated) {
      return { success: true, completed: updated };
    }
    const list = new Set(inMemoryProgress[key] || []);
    if (completed) list.add(Number(order));
    else list.delete(Number(order));
    inMemoryProgress[key] = Array.from(list).sort((a, b) => a - b);
    return { success: true, completed: inMemoryProgress[key] };
  }
  return fetchJSON("/api/progress", {
    method: "POST",
    body: JSON.stringify({ cohortSlug: slug, sessionOrder: Number(order), completed }),
  });
}

export async function submitHomework(slug, order, { response, link }) {
  if (USE_MOCK_DATA) {
    const key = await currentUserKey();
    // Route through the unified store when the user matches a known
    // participant — that way admin homework queue + participant submission
    // share one record + reviews flow back to /session/:order.
    const adminWrite = submitHomeworkAsParticipant(key, order, { response, link });
    if (adminWrite) {
      return { success: true, submission: adminWrite };
    }
    if (!inMemoryHomework[key]) inMemoryHomework[key] = {};
    inMemoryHomework[key][order] = {
      response: response || "",
      link: link || "",
      submittedAt: new Date().toISOString(),
    };
    return { success: true, submission: inMemoryHomework[key][order] };
  }
  return fetchJSON("/api/homework", {
    method: "POST",
    body: JSON.stringify({
      cohortSlug: slug,
      sessionOrder: Number(order),
      response: response || "",
      link: link || "",
    }),
  });
}
