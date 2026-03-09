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
  return fetchJSON("/api/journal", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function sendMagicLink(email) {
  return fetchJSON("/api/auth/send-magic-link", {
    method: "POST",
    body: JSON.stringify({ email }),
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
