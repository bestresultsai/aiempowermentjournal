import { useEffect, useState } from "react";
import { renderTemplate } from "./emailTemplates";
import { initSupabase, isSupabaseEnabled } from "./supabase";
import { captureError } from "./observability";

// ---------------------------------------------------------------------------
// Mailer — the single send surface every feature calls.
//
// In v1 (this file) sendEmail() logs the rendered email + caches the last
// 25 sends in localStorage so admins can inspect what would have gone out.
// The shape — sendEmail({ template, to, data }) — is the production API; the
// provider swap in #399 replaces the internal _enqueue() call with a real
// SendGrid/Postmark/Resend call without changing call sites.
//
// Real sending also depends on per-recipient preferences (transactional vs.
// digest vs. marketing). Preferences live on the user record; getMailable()
// returns true/false for the recipient + template combination.
// ---------------------------------------------------------------------------

const SENT_KEY = "brai_email_sent_log";
const PREFS_KEY = "brai_email_preferences";
const CHANGE_EVENT = "brai-email-log-changed";
const MAX_LOG = 25;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Render + "send" an email. Returns the rendered message so callers can
// stash details (e.g. for an audit log). Pass `to` as an email string or
// { name, email } object.
export async function sendEmail({ template, to, data, sender }) {
  if (!template) throw new Error("sendEmail: template id is required.");
  if (!to) throw new Error("sendEmail: 'to' is required.");
  const recipient = typeof to === "string" ? { email: to } : to;
  if (!recipient.email) throw new Error("sendEmail: 'to.email' is required.");

  const rendered = renderTemplate(template, data);
  const entry = {
    id: `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    template,
    to: recipient,
    sender: sender || null,
    subject: rendered.subject,
    preview: rendered.preview,
    sentAt: new Date().toISOString(),
    // We don't keep full HTML in localStorage (size) — text is enough for
    // an inspection log.
    text: rendered.text,
  };

  // When Supabase is wired up, route the send through the Netlify Function
  // that posts to Resend + logs to email_sends. The localStorage log keeps
  // running in parallel so /admin/emails still shows a preview history.
  // Failures fall through to the local log so the UI stays usable.
  if (isSupabaseEnabled()) {
    try {
      await _postToSendFunction({ template, to: recipient, data, cohortSlug: data?.cohortSlug });
    } catch (err) {
      captureError(err, { source: "sendEmail.netlifyFunction", template });
    }
  }

  await _enqueue(entry, rendered);
  return entry;
}

// Calls the /.netlify/functions/send-email endpoint. The function requires
// an admin-authenticated caller; the access token is pulled from the live
// Supabase session.
async function _postToSendFunction({ template, to, data, cohortSlug }) {
  const client = await initSupabase();
  if (!client) return;
  const { data: sessionData } = await client.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) return; // not signed in — caller wouldn't be authorized anyway
  const res = await fetch("/.netlify/functions/send-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      template,
      to,
      data,
      cohortSlug: cohortSlug || null,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `send-email returned ${res.status}`);
  }
}

// Check whether a recipient should receive a template, given preferences.
// All transactional templates default to ON. Digests are explicit opt-in.
export function getMailable(userOrEmail, templateId) {
  const email = typeof userOrEmail === "string" ? userOrEmail : userOrEmail?.email;
  if (!email) return false;
  const prefs = _readPrefs(email);
  if (templateId === "weekly-digest" || templateId === "org-weekly-report") {
    return prefs?.digest !== false; // default on but explicit opt-out possible
  }
  // Transactional default-on.
  return prefs?.transactional !== false;
}

export function setEmailPreference(email, patch) {
  if (!email) return;
  const prefs = _readPrefs(email);
  const next = { ...prefs, ...patch };
  if (typeof window === "undefined") return;
  try {
    const all = _readAll();
    all[email.toLowerCase()] = next;
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Sent log
// ---------------------------------------------------------------------------

export function getSentLog() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function clearSentLog() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SENT_KEY);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch { /* ignore */ }
}

export function useSentLog() {
  const [version, setVersion] = useState(0);
  const [supabaseRows, setSupabaseRows] = useState(null);

  // Local-log listeners (drives demo / offline)
  useEffect(() => {
    function onChange() { setVersion((v) => v + 1); }
    window.addEventListener(CHANGE_EVENT, onChange);
    function onStorage(e) {
      if (!e.key || e.key === SENT_KEY) onChange();
    }
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Supabase-backed log — poll every 15s so recently-sent emails appear.
  // Falls silently to null when Supabase isn't wired; the render path
  // uses the local log as a fallback in that case.
  useEffect(() => {
    if (!isSupabaseEnabled()) return;
    let cancelled = false;
    async function pull() {
      try {
        const client = await initSupabase();
        if (!client || cancelled) return;
        const { data, error } = await client
          .from("email_sends")
          .select("id, template, to_email, subject, status, error_message, sent_at, created_at, provider_message_id")
          .order("created_at", { ascending: false })
          .limit(25);
        if (cancelled) return;
        if (error) {
          // Log but don't crash — non-fatal for the admin surface
          // eslint-disable-next-line no-console
          console.warn("[mailer] email_sends poll failed:", error.message);
          return;
        }
        setSupabaseRows((data || []).map(_normalizeEmailSendRow));
      } catch { /* ignore */ }
    }
    pull();
    const t = setInterval(pull, 15000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Prefer Supabase log when we have rows. Local log stays as fallback for
  // demo mode + as a safety net if Supabase is briefly unreachable.
  if (supabaseRows) return supabaseRows;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return getSentLog();
}

// Convert an email_sends row into the shape AdminEmails renders:
//   { id, template, subject, to: { email }, sentAt, status, error, providerId }
function _normalizeEmailSendRow(row) {
  return {
    id: row.id,
    template: row.template,
    subject: row.subject || "(no subject)",
    to: { email: row.to_email || "" },
    // Prefer the sent_at timestamp (the moment the provider accepted the
    // message) with created_at as a fallback for rows that failed before
    // the provider round-trip.
    sentAt: row.sent_at || row.created_at,
    status: row.status || "unknown",
    error: row.error_message || null,
    providerId: row.provider_message_id || null,
    _source: "supabase",
  };
}

// ---------------------------------------------------------------------------
// Internal — log + prefs helpers
// ---------------------------------------------------------------------------

async function _enqueue(entry, rendered) {
  // v1: console + localStorage log. Production swap → SendGrid send + audit.
  // eslint-disable-next-line no-console
  console.info(`[mailer] would send "${entry.template}" to ${entry.to.email}`);
  // eslint-disable-next-line no-console
  console.debug("[mailer]", { subject: rendered.subject, text: rendered.text });

  if (typeof window === "undefined") return;
  try {
    const log = getSentLog();
    log.unshift(entry);
    const trimmed = log.slice(0, MAX_LOG);
    window.localStorage.setItem(SENT_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch { /* ignore */ }
}

function _readAll() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function _readPrefs(email) {
  const all = _readAll();
  return all[email.toLowerCase()] || {};
}
