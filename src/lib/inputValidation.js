// ---------------------------------------------------------------------------
// Input validation + sanitization helpers.
//
// This is client-side defense in depth. The server (Netlify Functions +
// Supabase, once we have them) will run its own validation — we can't trust
// anything that comes through the network. But we still want:
//   - hard length caps so a runaway paste doesn't blow up the UI
//   - URL scheme allowlisting so a `javascript:` link can never reach the DOM
//   - file-type and size limits on attachments
//   - simple email + safe-text shape checks
//
// React's JSX escaping already prevents most XSS at render time. These
// helpers complement that by stopping bad input before it ever lands in
// state or persisted storage.
// ---------------------------------------------------------------------------

// Hard caps used across the platform. Tune in one place.
export const LIMITS = {
  shortText: 140,        // names, titles, single-line fields
  mediumText: 280,       // tag-line / one-paragraph fields
  longText: 4000,        // descriptions, journal entries, feedback
  url: 2048,             // URL fields (Zoom, video, deliverable link)
  email: 254,            // RFC 5321 max
  notesText: 2000,       // notes / additional context
  attachmentBytes: 4 * 1024 * 1024, // 4 MB inline attachments
};

// Trim + clamp a string to `max` characters. Returns the safe value.
// Use as: <input onChange={e => set(clampString(e.target.value, LIMITS.shortText))} />
export function clampString(value, max) {
  if (value == null) return "";
  const str = String(value);
  return str.length > max ? str.slice(0, max) : str;
}

// Validate + normalize a URL. Rejects anything that isn't http(s).
// Returns { ok: true, value } or { ok: false, reason }.
// Pass to onBlur / before persisting — not on every keystroke.
const SAFE_URL_SCHEMES = new Set(["http:", "https:"]);
export function sanitizeUrl(value) {
  const raw = (value || "").trim();
  if (!raw) return { ok: true, value: "" };
  if (raw.length > LIMITS.url) {
    return { ok: false, reason: `URL is too long (max ${LIMITS.url} characters).` };
  }
  let url;
  try {
    url = new URL(raw);
  } catch {
    // Accept bare hosts ("example.com/path") — re-parse with https:// prefix.
    try {
      url = new URL(`https://${raw}`);
    } catch {
      return { ok: false, reason: "That doesn't look like a valid URL." };
    }
  }
  if (!SAFE_URL_SCHEMES.has(url.protocol)) {
    return { ok: false, reason: "URLs must start with http:// or https://." };
  }
  return { ok: true, value: url.toString() };
}

// Lightweight email validator. Not strictly RFC-compliant — keeps the
// regex simple. The server will do the authoritative check.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(value) {
  const v = (value || "").trim();
  return v.length > 0 && v.length <= LIMITS.email && EMAIL_RE.test(v);
}

// File-type allowlist for inline attachments. Anything outside this list
// gets bounced before we read it into memory. MIME-type checks are advisory
// (the browser sets these), so we ALSO inspect the extension.
const ATTACHMENT_ALLOWLIST = {
  // Documents
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
  "text/csv": [".csv"],
  // Images
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "image/svg+xml": [".svg"],
};

// Returns { ok, reason } — pass the File before reading it.
export function validateAttachment(file) {
  if (!file) return { ok: false, reason: "No file selected." };
  if (file.size > LIMITS.attachmentBytes) {
    return {
      ok: false,
      reason: `File is too large. Max ${(LIMITS.attachmentBytes / 1024 / 1024).toFixed(0)} MB.`,
    };
  }
  const name = (file.name || "").toLowerCase();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  const allowed = ATTACHMENT_ALLOWLIST[file.type];
  // Either the MIME type is whitelisted AND the extension matches, OR the
  // extension is in any allowlist row (covers some MIME mismatches we've
  // seen from Office variants).
  if (allowed && (!ext || allowed.includes(ext))) return { ok: true };
  const anyExtMatch = Object.values(ATTACHMENT_ALLOWLIST).some((list) => list.includes(ext));
  if (anyExtMatch) return { ok: true };
  return {
    ok: false,
    reason: "That file type isn't supported. Try PDF, Word, Excel, PowerPoint, txt, csv, or an image.",
  };
}

// Human-readable byte size — used in upload chips.
export function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

// Convenience: trim a string and treat empty-after-trim as null. Useful
// when persisting optional text fields — keeps the wire format clean.
export function trimOrNull(value) {
  const v = (value || "").trim();
  return v.length === 0 ? null : v;
}
