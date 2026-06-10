import { useEffect, useRef, useState } from "react";
import { Calendar, Download, ExternalLink, ChevronDown } from "lucide-react";
import {
  buildIcsForSession,
  buildIcsForCohort,
  downloadIcs,
  icsFilenameFor,
} from "../lib/icsExport";

// ---------------------------------------------------------------------------
// AddToCalendar — small dropdown button for participants to put cohort
// sessions on their personal calendar.
//
// Modes:
//   mode="session" + session prop → single-event .ics + Google Calendar link
//   mode="cohort"  + sessions prop → multi-event .ics for the whole cohort
//
// Both modes also offer:
//   - Google Calendar quick-add (single events only — Google doesn't have a
//     batch quick-add URL, so for cohort mode we hide it)
//
// Variants: pass `variant="light"` on dark backgrounds; default is dark
// (ink) trigger on light surfaces.
// ---------------------------------------------------------------------------

export default function AddToCalendar({
  cohort,
  session = null,
  sessions = null,
  mode = "session",
  variant = "dark",
  size = "md",
  label,
}) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (!ref.current?.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Render guard: need a cohort + either a session or sessions[].
  if (!cohort) return null;
  if (mode === "session" && !session) return null;
  if (mode === "cohort" && (!sessions || sessions.length === 0)) return null;

  function handleDownloadIcs() {
    setOpen(false);
    if (mode === "session") {
      const text = buildIcsForSession(session, cohort);
      if (text) downloadIcs(icsFilenameFor(cohort, session), text);
    } else {
      const text = buildIcsForCohort(cohort, sessions);
      if (text) downloadIcs(icsFilenameFor(cohort), text);
    }
  }

  function handleGoogle() {
    setOpen(false);
    if (mode !== "session") return;
    const url = buildGoogleCalendarUrl({
      title: `${cohort.name} · ${session.belt ? session.belt + " Belt" : "Session " + session.order}: ${session.title}`,
      description: session.summary,
      start: session.dateObj || (session.date ? new Date(session.date) : null),
      durationMinutes: session.durationMinutes || 75,
      location: session.zoomLink || cohort.zoomLink || "",
    });
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  // Style maps.
  const triggerClass =
    variant === "light"
      ? "bg-white/15 text-white border border-white/20 hover:bg-white/25"
      : "bg-ink text-white hover:bg-brand-700";
  const sizing =
    size === "sm"
      ? "px-2.5 py-1.5 text-[11.5px]"
      : "px-3 py-2 text-[12.5px]";
  const triggerLabel =
    label ||
    (mode === "cohort" ? "Add all to calendar" : "Add to calendar");

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-lg font-heading font-bold transition-colors ${sizing} ${triggerClass}`}
      >
        <Calendar className="w-3.5 h-3.5" strokeWidth={2.5} />
        {triggerLabel}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={2.5}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-60 rounded-xl bg-white border border-soft shadow-lift z-20 overflow-hidden animate-fade-in-up">
          <MenuItem icon={Download} onClick={handleDownloadIcs}>
            <div>
              <div className="font-heading font-bold text-[12.5px] text-ink">
                Download .ics
              </div>
              <div className="text-[11px] text-ink-muted">
                Apple Calendar, Outlook, Google
              </div>
            </div>
          </MenuItem>
          {mode === "session" && (
            <MenuItem icon={ExternalLink} onClick={handleGoogle}>
              <div>
                <div className="font-heading font-bold text-[12.5px] text-ink">
                  Open in Google Calendar
                </div>
                <div className="text-[11px] text-ink-muted">Quick add a single event</div>
              </div>
            </MenuItem>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-start gap-2.5 px-3 py-2.5 hover:bg-surface-soft transition-colors"
    >
      <Icon className="w-3.5 h-3.5 text-ink-muted mt-0.5 shrink-0" strokeWidth={2.5} />
      {children}
    </button>
  );
}

// Google Calendar template URL — single event.
function buildGoogleCalendarUrl({ title, description, start, durationMinutes = 75, location }) {
  if (!start || isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const fmt = (d) =>
    d.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title || "",
    dates: `${fmt(start)}/${fmt(end)}`,
    details: description || "",
    location: location || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
