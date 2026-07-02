import { CalendarPlus, CalendarCheck2, PartyPopper, Clock, ArrowRight, Radio } from "lucide-react";
import { BELT_COLORS } from "../../lib/mockCohort";

// Prominent banner for the cohort's next live session.
// Shows belt + title, date + time, countdown, Add-to-Calendar + Join Live Session.
export default function NextLiveSessionCard({ cohort }) {
  if (!cohort?.sessions?.length) return null;

  const today = new Date();
  const upcoming = cohort.sessions
    .filter((s) => s.date && !s.completed)
    .map((s) => ({ ...s, dateObj: parseSessionDateTime(s.date, cohort.meetingTime) }))
    .filter((s) => s.dateObj && s.dateObj.getTime() + 90 * 60 * 1000 >= today.getTime())
    .sort((a, b) => a.dateObj - b.dateObj);

  // Program complete state
  if (upcoming.length === 0) {
    return (
      <section className="mt-6 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-6 py-5 flex items-center justify-between gap-4 flex-wrap animate-fade-in-up delay-200">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
            <PartyPopper className="w-5 h-5" strokeWidth={2} />
          </div>
          <div>
            <div className="h-eyebrow !text-emerald-700 mb-0.5">Program Complete</div>
            <div className="font-heading text-[18px] font-bold text-ink">
              You've finished all live sessions for this cohort.
            </div>
          </div>
        </div>
      </section>
    );
  }

  const next = upcoming[0];
  const belt = next.belt && BELT_COLORS[next.belt] ? BELT_COLORS[next.belt] : null;
  const countdown = formatCountdown(next.dateObj, today);
  const isLiveNow = today >= next.dateObj && today.getTime() <= next.dateObj.getTime() + 90 * 60 * 1000;
  // Zoom link resolution — session-level override wins, cohort default is
  // the fallback. Facilitator's personal default only applies for legacy
  // rows that never got a cohort-level link set.
  const zoomLink =
    next.zoomLink ||
    cohort.zoomLink ||
    cohort.facilitator?.defaultZoomLink ||
    cohort.trainer?.defaultZoomLink ||
    "";
  // The Join button is only useful in the meeting window. Enable it from
  // 60 minutes before the scheduled start through 90 minutes after — matches
  // the isLiveNow tail so it stays clickable through the whole session.
  const msUntilStart = next.dateObj.getTime() - today.getTime();
  const isJoinable =
    (msUntilStart <= 60 * 60 * 1000 && msUntilStart > 0) || isLiveNow;
  const joinLabel = isLiveNow ? "Join Now" : "Join Live Session";
  const dateLine = next.dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeLine = cohort.meetingTime || next.dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const calendarUrl = buildGoogleCalendarUrl({
    title: `${cohort.name} · ${next.belt ? next.belt + " Belt" : "Session " + next.order}: ${next.title}`,
    description: next.summary,
    start: next.dateObj,
    durationMinutes: next.durationMinutes || 75,
  });

  return (
    <section className="mt-6 rounded-2xl border-2 border-brand-500 bg-surface-card overflow-hidden shadow-lift animate-fade-in-up delay-200">
      <div className="flex flex-col lg:flex-row">
        {/* Belt-colored countdown block — uses the belt's gradient for consistency
            with the Next Milestone card and the session number badges. */}
        <div
          className="lg:w-56 flex flex-row lg:flex-col items-center justify-center gap-3 lg:gap-2 px-6 py-5 lg:py-7"
          style={{
            background: belt?.gradient || belt?.hex || "#2563EB",
            color: belt?.contrast || "#fff",
            border: belt?.needsBorder ? "1px solid rgba(15,23,42,0.10)" : "none",
          }}
        >
          <div className="flex items-center gap-2 lg:flex-col lg:gap-1">
            {isLiveNow ? (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
            ) : (
              <Radio className="w-3.5 h-3.5 opacity-80" strokeWidth={2.5} />
            )}
            <span className="text-[10px] font-heading font-bold uppercase tracking-[0.18em] opacity-80">
              {isLiveNow ? "Live Now" : "Next Live"}
            </span>
          </div>
          <div className="font-heading font-extrabold text-[28px] lg:text-[34px] leading-none">
            {countdown.value}
          </div>
          <div className="text-[11px] font-heading font-semibold uppercase tracking-wider opacity-80">
            {countdown.unit}
          </div>
          {/* Ambient pulse — slow breathing dot signals the session is live-ish. */}
          {!isLiveNow && (
            <span
              className="mt-2 inline-block w-1.5 h-1.5 rounded-full bg-current animate-ambient-pulse"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Details + actions */}
        <div className="flex-1 p-6 lg:p-7 flex flex-col lg:flex-row gap-5 lg:items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[11px] font-heading font-semibold tracking-wider uppercase text-brand-600">
                {next.belt ? `${next.belt} Belt` : `Session ${next.order}`}
              </span>
              <span className="w-1 h-1 rounded-full bg-ink-subtle" />
              <span className="text-[11px] font-heading font-semibold text-ink-muted">
                Session {next.order} of {cohort.sessions.length}
              </span>
            </div>
            <h3 className="font-heading text-[20px] lg:text-[22px] font-extrabold tracking-tight text-ink leading-snug mb-2">
              {next.title}
            </h3>
            <div className="flex items-center gap-3 text-[13.5px] text-ink-muted font-heading font-medium flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <CalendarCheck2 className="w-4 h-4 text-ink-subtle" strokeWidth={2} />
                {dateLine}
              </span>
              <span className="text-ink-subtle">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-ink-subtle" strokeWidth={2} />
                {timeLine}
              </span>
              <span className="text-ink-subtle">·</span>
              <span>{next.durationMinutes || 75} min</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <a
              href={calendarUrl}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-soft text-[13.5px] font-heading font-semibold text-ink hover:bg-surface-soft hover:border-brand-500 transition-all duration-200"
            >
              <CalendarPlus className="w-4 h-4 transition-transform duration-200 group-hover:rotate-6" strokeWidth={2} />
              Add to Calendar
            </a>
            {isJoinable && zoomLink ? (
              <a
                href={zoomLink}
                target="_blank"
                rel="noreferrer noopener"
                className="group inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-ink text-white text-[13.5px] font-heading font-semibold hover:bg-brand-700 transition-all duration-200"
              >
                {joinLabel}
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.5} />
              </a>
            ) : (
              <button
                type="button"
                disabled
                title={
                  !zoomLink
                    ? "Zoom link isn't set yet — the facilitator will add it before the session."
                    : "Opens 1 hour before the session starts."
                }
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-ink/25 text-white/80 text-[13.5px] font-heading font-semibold cursor-not-allowed"
              >
                {joinLabel}
                <ArrowRight className="w-4 h-4 opacity-70" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// --- helpers ---

function parseSessionDateTime(isoDate, timeStr) {
  if (!isoDate) return null;
  const dt = new Date(isoDate);
  if (isNaN(dt)) return null;
  if (!timeStr) return dt;
  const m = timeStr.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm)?/i);
  if (!m) return dt;
  let hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2] || "0", 10);
  const ampm = (m[3] || "").toLowerCase();
  if (ampm === "pm" && hours < 12) hours += 12;
  if (ampm === "am" && hours === 12) hours = 0;
  dt.setHours(hours, minutes, 0, 0);
  return dt;
}

function formatCountdown(target, now) {
  const diffMs = target - now;
  if (diffMs <= 0) return { value: "Now", unit: "starting" };
  const diffSec = Math.floor(diffMs / 1000);
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  if (days >= 1) return { value: days, unit: days === 1 ? "day" : "days" };
  if (hours >= 1) return { value: hours, unit: hours === 1 ? "hour" : "hours" };
  return { value: minutes, unit: minutes === 1 ? "minute" : "minutes" };
}

function buildGoogleCalendarUrl({ title, description, start, durationMinutes = 75 }) {
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title || "",
    dates: `${fmt(start)}/${fmt(end)}`,
    details: description || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
