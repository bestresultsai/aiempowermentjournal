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
    if (slug !== MOCK_COHORT.slug) {
      throw new Error(`Cohort "${slug}" not found (mock mode).`);
    }
    const key = currentUserKey();
    const completed = inMemoryProgress[key] || [];
    const homework = inMemoryHomework[key] || {};
    return {
      ...MOCK_COHORT,
      sessions: decorateSessions(MOCK_SESSIONS, completed, homework),
      progress: {
        completed: completed.length,
        total: MOCK_SESSIONS.length,
        percent: Math.round((completed.length / MOCK_SESSIONS.length) * 100),
      },
      homeworkProgress: {
        submitted: Object.keys(homework).length,
        total: MOCK_SESSIONS.length,
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
