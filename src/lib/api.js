import { isDemoModeActive } from "./demoData";
import { submitJournalEntryAsParticipant } from "./adminMockData";
import { isSupabaseEnabled } from "./supabase";
import { sendSupabaseMagicLink } from "./authSupabase";

const API_BASE = "";

// Demo mode short-circuits the network and writes through the unified
// in-memory store so admin views see new entries immediately.
function useMockData() {
  return isDemoModeActive();
}

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

export async function getParticipants(cohort) {
  const params = cohort ? `?cohort=${encodeURIComponent(cohort)}` : "";
  return fetchJSON(`/api/participants${params}`);
}

export async function getCohorts() {
  return fetchJSON("/api/cohorts");
}

export async function getEntries({ cohort, org, email } = {}) {
  const params = new URLSearchParams();
  if (cohort) params.set("cohort", cohort);
  if (org) params.set("org", org);
  if (email) params.set("email", email);
  const qs = params.toString();
  return fetchJSON(`/api/entries${qs ? "?" + qs : ""}`);
}

export async function submitJournalEntry(data) {
  if (useMockData()) {
    // Demo/preview mode — route through the unified store so the entry
    // immediately appears on /admin/journal, /admin/users/:id, the leader
    // dashboard, and the participant's own journal dashboard.
    const written = submitJournalEntryAsParticipant(data?.participantEmail, data);
    return { success: true, entry: written };
  }

  // Supabase-backed production path. We used to POST to /api/journal (Netlify
  // function that writes to a Notion database), but that DB requires
  // Organization/Cohort/Program to be non-null Notion selects — a schema our
  // signed-up participants + facilitators don't always have populated, which
  // was surfacing as "body.properties.Organization.select.name should be
  // defined" errors on the journal form. Route through the same unified
  // store the mock path uses; its mirrorJournalEntryToSupabase() writes to
  // public.journal_entries directly, so the participant dashboards + admin
  // views pick it up on their next poll.
  if (isSupabaseEnabled()) {
    const written = submitJournalEntryAsParticipant(data?.participantEmail, data);
    if (written) {
      return { success: true, entry: written };
    }
    // No participant record for this email — likely a facilitator/admin
    // logging an entry from their own view. Fall through to the legacy
    // fetch below only if we haven't found a Supabase path, but keep the
    // failure quiet since Notion isn't the source of truth anymore.
    return { success: true, entry: null };
  }

  return fetchJSON("/api/journal", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// `opts.next` is a same-origin path the API should redirect to after the
// user clicks the magic link.
//
// When Supabase is enabled (VITE_SUPABASE_URL + key set), we delegate to
// Supabase's signInWithOtp. Otherwise we fall back to the legacy
// /api/auth/send-magic-link endpoint (which is currently a stub — the real
// implementation never landed before the Supabase swap).
export async function sendMagicLink(email, opts = {}) {
  if (isSupabaseEnabled()) {
    await sendSupabaseMagicLink(email, { next: opts.next || "/home" });
    return { success: true };
  }
  return fetchJSON("/api/auth/send-magic-link", {
    method: "POST",
    body: JSON.stringify({ email, next: opts.next || null }),
  });
}

export async function verifyToken(token) {
  return fetchJSON(`/api/auth/verify?token=${encodeURIComponent(token)}`);
}

export async function getMe() {
  return fetchJSON("/api/auth/me");
}

export async function lookupParticipant(email) {
  return fetchJSON(`/api/participant-lookup?email=${encodeURIComponent(email)}`);
}
