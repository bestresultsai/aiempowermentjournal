import { useEffect, useState } from "react";
import { renderTemplate } from "./emailTemplates";

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

  await _enqueue(entry, rendered);
  return entry;
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
  // Bind to `version` so callers re-render. Using version in the dep array
  // for the returned value lets React do its thing on each tick.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return getSentLog();
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
