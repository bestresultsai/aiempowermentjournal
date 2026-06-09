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
import { DEMO_COHORTS } from "./demoData";
import {
  getParticipantByEmail,
  submitHomeworkAsParticipant,
  markSessionCompleteForParticipant,
} from "./adminMockData";
import { getProgramByCode } from "./programs";

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

function currentUserKey() {
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
    // Multi-cohort demo: every demo cohort slug serves MOCK_COHORT's content
    // with the demo cohort's identity overlaid (name, slug, organization).
    const demoCohort = DEMO_COHORTS.find((c) => c.slug === slug);
    const isKnownSlug = slug === MOCK_COHORT.slug || !!demoCohort;
    if (!isKnownSlug) {
      throw new Error(`Cohort "${slug}" not found (mock mode).`);
    }

    const key = currentUserKey();

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

export async function getSession(slug, order) {
  const cohort = await getCohortBySlug(slug);
  const session = cohort.sessions.find((s) => String(s.order) === String(order));
  if (!session) throw new Error(`Session ${order} not found in cohort ${slug}`);
  return { cohort, session };
}

export async function markSessionComplete(slug, order, completed = true) {
  if (USE_MOCK_DATA) {
    const key = currentUserKey();
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
    const key = currentUserKey();
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
