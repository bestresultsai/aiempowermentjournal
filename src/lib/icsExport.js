// ---------------------------------------------------------------------------
// iCalendar (.ics) export — RFC 5545 compliant for Google / Apple / Outlook.
//
// Two builders:
//   buildIcsForSession(session, cohort)  → one VEVENT
//   buildIcsForCohort(cohort, sessions)  → one VCALENDAR with N VEVENTs
//
// Plus a browser helper:
//   downloadIcs(filename, text)          → triggers a file download
//
// Times are emitted in UTC (DTSTART/DTEND with Z suffix). That avoids the
// hassle of bundling a VTIMEZONE block per cohort time zone. Calendar
// clients render in the user's local zone correctly because of the Z.
//
// Line wrapping: RFC 5545 requires no line > 75 octets. We naïvely soft-wrap
// at 75 chars with CRLF + leading space continuation, which is enough for
// the field shapes we emit (no Unicode emoji in summaries).
// ---------------------------------------------------------------------------

const CRLF = "\r\n";

// PRODID identifies the producer in iCalendar metadata — appears in some
// clients but is otherwise harmless. Bump the version if the format changes.
const PRODID = "-//BestResults.AI//Platform 1.0//EN";

// Escape special characters per RFC 5545 §3.3.11.
function escapeText(s) {
  return String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

// "20240115T160000Z" from a Date.
function formatUtc(d) {
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

// Soft-wrap a single content line so it fits inside 75 octets per RFC 5545.
function fold(line) {
  if (line.length <= 75) return line;
  const out = [];
  let i = 0;
  while (i < line.length) {
    const chunk = line.slice(i, i + (i === 0 ? 75 : 74));
    out.push(i === 0 ? chunk : " " + chunk);
    i += chunk.length;
  }
  return out.join(CRLF);
}

function joinLines(lines) {
  return lines.filter(Boolean).map(fold).join(CRLF);
}

// Stable-ish UID per event. UIDs should be globally unique, so we mix the
// cohort slug + session order + the session's start time.
function buildUid(cohort, session, dateObj) {
  const slug = cohort?.slug || "cohort";
  const stamp = dateObj ? formatUtc(dateObj) : Date.now();
  return `${slug}-s${session.order}-${stamp}@bestresults.ai`;
}

// ---------------------------------------------------------------------------
// Single VEVENT block for one session.
// ---------------------------------------------------------------------------
export function buildVeventForSession(session, cohort) {
  const start = session.dateObj || (session.date ? new Date(session.date) : null);
  if (!start || isNaN(start.getTime())) return null;

  const durationMin = Number(session.durationMinutes) || 75;
  const end = new Date(start.getTime() + durationMin * 60 * 1000);

  const beltOrSession = session.belt ? `${session.belt} Belt` : `Session ${session.order}`;
  const summary = `${cohort?.name || "Cohort"} · ${beltOrSession}: ${session.title || ""}`;

  // Body: short summary + Zoom link (where to join) + cohort name.
  const zoom = session.zoomLink || cohort?.zoomLink || "";
  const descParts = [];
  if (session.summary) descParts.push(session.summary);
  if (zoom) descParts.push(`Join: ${zoom}`);
  if (cohort?.facilitator?.name) descParts.push(`Facilitator: ${cohort.facilitator.name}`);
  const description = descParts.join("\n\n");

  // LOCATION carries the Zoom URL for clients that render it as a clickable
  // address (Google Calendar does).
  const location = zoom || "Online";

  return joinLines([
    "BEGIN:VEVENT",
    `UID:${buildUid(cohort, session, start)}`,
    `DTSTAMP:${formatUtc(new Date())}`,
    `DTSTART:${formatUtc(start)}`,
    `DTEND:${formatUtc(end)}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `LOCATION:${escapeText(location)}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
  ]);
}

// ---------------------------------------------------------------------------
// Wrap a list of VEVENTs in a VCALENDAR.
// ---------------------------------------------------------------------------
function wrapCalendar(eventsBlock) {
  return joinLines([
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    eventsBlock,
    "END:VCALENDAR",
  ]) + CRLF;
}

export function buildIcsForSession(session, cohort) {
  const block = buildVeventForSession(session, cohort);
  if (!block) return null;
  return wrapCalendar(block);
}

export function buildIcsForCohort(cohort, sessions) {
  const blocks = (sessions || [])
    .map((s) => buildVeventForSession(s, cohort))
    .filter(Boolean);
  if (blocks.length === 0) return null;
  return wrapCalendar(blocks.join(CRLF));
}

// ---------------------------------------------------------------------------
// Trigger a browser download for the .ics text.
// ---------------------------------------------------------------------------
export function downloadIcs(filename, text) {
  if (typeof window === "undefined" || !text) return;
  const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so Safari can finish the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Convenience filename builder.
export function icsFilenameFor(cohort, session) {
  const slug = cohort?.slug || "cohort";
  if (session) return `${slug}-session-${session.order}.ics`;
  return `${slug}-schedule.ics`;
}
