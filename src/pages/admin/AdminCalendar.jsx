import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar as CalendarIcon, Clock, ExternalLink, Video,
  ArrowRight, AlertCircle, Sparkles, X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useScopeFilters } from "../../lib/useScopeFilters";
import {
  getAllCohortsForAdmin,
  getFacilitatorScheduleByDay,
} from "../../lib/cohortAdmin";
import { BELT_COLORS } from "../../lib/mockCohort";
import { useGoogleCalendarConnection } from "../../lib/googleCalendar";
import ScopeFilterBar from "../../components/admin/ScopeFilterBar";
import SegmentedControl from "../../components/admin/SegmentedControl";

// ---------------------------------------------------------------------------
// /admin/calendar — Facilitator availability calendar.
//
// Cross-cohort schedule view. Aggregates live sessions for every cohort the
// signed-in user can see (scoped by ScopeFilterBar) into a per-day timeline.
// Defaults to the next 14 days; togglable to 7 / 14 / 30.
//
// Why: Mike facilitates multiple cohorts. Before this page existed, his only
// way to see what was coming up was to open each cohort one at a time. This
// page is his "what's on my plate this week."
// ---------------------------------------------------------------------------

const HORIZONS = [
  { key: 7,  label: "Next 7 days" },
  { key: 14, label: "Next 14 days" },
  { key: 30, label: "Next 30 days" },
];

export default function AdminCalendar() {
  const { user } = useAuth();
  const scope = useScopeFilters(user, getAllCohortsForAdmin());
  const { cohorts, effectiveCohorts, effectiveSlugs: cohortSlugs, orgs, facilitators } = scope;
  const gcal = useGoogleCalendarConnection(user);

  const [daysAhead, setDaysAhead] = useState(14);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem("brai_gcal_nudge_dismissed") === "1";
    } catch {
      return false;
    }
  });

  function dismissBanner() {
    setBannerDismissed(true);
    try {
      window.sessionStorage.setItem("brai_gcal_nudge_dismissed", "1");
    } catch {
      /* ignore */
    }
  }

  const days = useMemo(
    () => getFacilitatorScheduleByDay(cohortSlugs, daysAhead),
    [cohortSlugs.join(","), daysAhead],
  );

  // Roll-up counts shown in the page subtitle.
  const totalEvents = days.reduce((s, d) => s + d.events.length, 0);
  const todayEvents = days.find((d) => d.isToday)?.events || [];
  const nextEvent = days[0]?.events[0] || null;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <header className="flex items-start gap-3 flex-wrap">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
          <CalendarIcon className="w-5 h-5" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-eyebrow">Admin · Calendar</div>
          <h1 className="font-heading text-[28px] lg:text-[34px] font-extrabold tracking-tight text-ink leading-tight">
            Facilitator schedule
          </h1>
          <p className="text-[14px] text-ink-muted mt-1.5 max-w-2xl">
            {totalEvents} {totalEvents === 1 ? "session" : "sessions"} across{" "}
            {effectiveCohorts.length} of {cohorts.length}{" "}
            {cohorts.length === 1 ? "cohort" : "cohorts"} in the next {daysAhead} days.
          </p>
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <SegmentedControl
          options={HORIZONS.map((h) => ({ key: h.key, label: h.label }))}
          value={daysAhead}
          onChange={setDaysAhead}
        />
        <ScopeFilterBar
          cohorts={cohorts}
          orgs={orgs}
          facilitators={facilitators}
          orgFilter={scope.orgFilter}
          cohortFilter={scope.cohortFilter}
          facilitatorFilter={scope.facilitatorFilter}
          setOrgFilter={scope.setOrgFilter}
          setCohortFilter={scope.setCohortFilter}
          setFacilitatorFilter={scope.setFacilitatorFilter}
        />
      </div>

      {/* Google Calendar nudge banner — only when not connected and not dismissed */}
      {!gcal.connected && !bannerDismissed && (
        <GoogleCalendarNudge onDismiss={dismissBanner} />
      )}

      {/* "Next up" hero — only when there's at least one upcoming session */}
      {nextEvent && (
        <NextUpHero event={nextEvent} dayLabel={days[0].dayLabel} isToday={days[0].isToday} />
      )}

      {/* Today callout — when today has more events beyond the next-up hero */}
      {todayEvents.length > 1 && !days[0].isToday && (
        <div className="rounded-2xl bg-brand-50/40 border border-brand-100 p-5">
          <div className="text-[11px] font-heading font-bold uppercase tracking-wider text-brand-700 mb-2">
            Today
          </div>
          <div className="space-y-2">
            {todayEvents.map((ev) => (
              <EventRow key={`${ev.cohortSlug}-${ev.sessionOrder}`} event={ev} />
            ))}
          </div>
        </div>
      )}

      {/* Day groups */}
      {days.length === 0 ? (
        <EmptyState daysAhead={daysAhead} />
      ) : (
        <div className="space-y-6">
          {days.map((day) => (
            <DayGroup key={day.dayMs} day={day} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NextUpHero — the most prominent surface. Headlines the next live session
// with a Zoom CTA, belt chip, and a "Roster →" deep link.
// ---------------------------------------------------------------------------
function NextUpHero({ event, dayLabel, isToday }) {
  const belt = BELT_COLORS[event.belt];
  const startsIn = relativeFromNow(event.startMs);
  const fac = event.facilitator;
  const facInitials = fac
    ? fac.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "";
  return (
    <section className="rounded-2xl bg-gradient-to-br from-brand-50 to-surface-card border border-brand-100 p-5 lg:p-6">
      <div className="flex items-start gap-4 flex-wrap">
        {belt && (
          <div
            style={{
              background: belt.gradient,
              color: belt.contrast,
              border: belt.needsBorder ? "1px solid #D1D5DB" : "none",
            }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-heading font-extrabold text-[18px] shrink-0"
          >
            {event.sessionOrder}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-600 text-white text-[11px] font-heading font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3" strokeWidth={3} />
            Next up · {startsIn}
          </div>
          {/* Cohort name leads (most prominent) */}
          <h2 className="font-heading text-[22px] font-extrabold text-ink leading-tight">
            {event.cohortName}
          </h2>
          {/* Session info — secondary */}
          <p className="text-[13.5px] font-heading font-semibold text-ink-muted mt-1">
            {event.belt} Belt · Session {event.sessionOrder}
          </p>
          <div className="mt-3 flex items-center gap-x-3 gap-y-1.5 flex-wrap text-[12.5px] text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />
              {isToday ? "Today" : dayLabel} · {formatTime(event.startMs)}–{formatTime(event.endMs)}
            </span>
            <span className="text-ink-subtle">·</span>
            <span className="text-ink-subtle">{event.durationMinutes} min</span>
            {fac && (
              <>
                <span className="text-ink-subtle">·</span>
                <span className="inline-flex items-center gap-1.5">
                  {fac.headshotUrl ? (
                    <img
                      src={fac.headshotUrl}
                      alt=""
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-brand-700 text-white inline-flex items-center justify-center text-[9px] font-heading font-bold">
                      {facInitials}
                    </span>
                  )}
                  <span className="font-heading font-semibold text-ink">{fac.name}</span>
                </span>
              </>
            )}
          </div>
        </div>
        <div className="shrink-0 flex flex-col gap-2 w-full sm:w-auto">
          {event.zoomLink && (
            <a
              href={event.zoomLink}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-[13px] font-heading font-bold hover:bg-brand-700 transition-colors"
            >
              <Video className="w-4 h-4" strokeWidth={2.5} />
              Join Zoom
            </a>
          )}
          <Link
            to={`/admin/cohorts/${event.cohortSlug}`}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-soft text-[13px] font-heading font-semibold text-ink hover:border-brand-500 transition-colors"
          >
            Open cohort
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// DayGroup — header + list of events for a single day.
// ---------------------------------------------------------------------------
function DayGroup({ day }) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-2">
        <h2 className="font-heading text-[15px] font-extrabold text-ink">
          {day.dayLabel}
        </h2>
        {day.isToday && (
          <span className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
            Today
          </span>
        )}
        {day.isTomorrow && (
          <span className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
            Tomorrow
          </span>
        )}
        <span className="text-[11.5px] text-ink-muted">
          {day.events.length} {day.events.length === 1 ? "session" : "sessions"}
        </span>
      </div>
      <div className="space-y-2">
        {day.events.map((ev) => (
          <EventRow key={`${ev.cohortSlug}-${ev.sessionOrder}`} event={ev} />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// EventRow — one row per session in a day group.
// ---------------------------------------------------------------------------
function EventRow({ event }) {
  const belt = BELT_COLORS[event.belt];
  const fac = event.facilitator;
  const facInitials = fac
    ? fac.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "";
  return (
    <div className="rounded-2xl bg-surface-card border border-soft p-4 hover:border-brand-500 hover:shadow-card transition-all duration-200">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Time block */}
        <div className="text-right shrink-0 w-[78px]">
          <div className="font-heading text-[14px] font-extrabold text-ink leading-none">
            {formatTime(event.startMs)}
          </div>
          <div className="text-[10.5px] text-ink-muted mt-0.5">
            {event.durationMinutes} min
          </div>
        </div>

        {/* Belt chip — session number, color-coded */}
        {belt && (
          <span
            style={{
              background: belt.gradient,
              color: belt.contrast,
              border: belt.needsBorder ? "1px solid #D1D5DB" : "none",
            }}
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl font-heading font-extrabold text-[13px] shrink-0"
          >
            {event.sessionOrder}
          </span>
        )}

        {/* Cohort name + session metadata + facilitator */}
        <Link
          to={`/admin/cohorts/${event.cohortSlug}`}
          className="flex-1 min-w-0 group"
        >
          {/* Primary: cohort name (bumped to 15px to lead) */}
          <div className="font-heading text-[15px] font-extrabold text-ink truncate group-hover:text-brand-700 transition-colors">
            {event.cohortName}
          </div>
          {/* Secondary line: session info + facilitator */}
          <div className="flex items-center gap-2 mt-0.5 text-[11.5px] text-ink-muted">
            <span className="font-heading font-semibold">
              {event.belt} Belt · Session {event.sessionOrder}
            </span>
            {fac && (
              <>
                <span className="text-ink-subtle">·</span>
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  {fac.headshotUrl ? (
                    <img
                      src={fac.headshotUrl}
                      alt=""
                      className="w-4 h-4 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-brand-700 text-white inline-flex items-center justify-center text-[8px] font-heading font-bold shrink-0">
                      {facInitials}
                    </span>
                  )}
                  <span className="truncate">{fac.name}</span>
                </span>
              </>
            )}
          </div>
        </Link>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-2">
          {event.zoomLink && (
            <a
              href={event.zoomLink}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 text-[12px] font-heading font-semibold hover:bg-brand-100 transition-colors"
            >
              <Video className="w-3.5 h-3.5" strokeWidth={2.5} />
              Zoom
            </a>
          )}
          <Link
            to={`/admin/cohorts/${event.cohortSlug}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-heading font-semibold text-ink-muted hover:text-ink hover:bg-surface-soft transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" strokeWidth={2.5} />
            Cohort
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GoogleCalendarNudge — amber banner asking the facilitator to connect their
// Google Calendar so sessions sync automatically. Dismissable for the session.
// Hash link drops the user straight into the section on /settings.
// ---------------------------------------------------------------------------
function GoogleCalendarNudge({ onDismiss }) {
  return (
    <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
        <CalendarIcon className="w-4 h-4" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-heading font-bold text-amber-900">
          Sync these sessions to your Google Calendar
        </div>
        <p className="text-[12.5px] text-amber-900/80 leading-relaxed mt-0.5">
          Connect once in Settings and every cohort session you facilitate flows into a calendar called "BRAI Sessions" automatically. Reschedules, cancellations, and new cohorts all sync.
        </p>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <Link
            to="/settings#google-calendar"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink text-white text-[12px] font-heading font-bold hover:bg-brand-700 transition-colors"
          >
            <CalendarIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
            Connect Google Calendar
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="p-1.5 rounded-lg text-amber-700/70 hover:text-amber-900 hover:bg-amber-100/60 transition-colors shrink-0"
      >
        <X className="w-4 h-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function EmptyState({ daysAhead }) {
  return (
    <div className="rounded-2xl border border-dashed border-soft p-10 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-surface-soft flex items-center justify-center">
        <CalendarIcon className="w-5 h-5 text-ink-muted" strokeWidth={2} />
      </div>
      <h3 className="font-heading text-[15px] font-bold text-ink">
        Nothing scheduled in the next {daysAhead} days
      </h3>
      <p className="text-[12.5px] text-ink-muted mt-1 max-w-sm mx-auto">
        Either your cohorts have wrapped up or sessions haven't been scheduled yet. Try a longer horizon or check the cohorts list.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
function formatTime(ms) {
  return new Date(ms).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function relativeFromNow(ms) {
  const diff = ms - Date.now();
  if (diff <= 0) return "right now";
  const min = Math.round(diff / 60_000);
  if (min < 60) return `in ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `in ${hr} hour${hr === 1 ? "" : "s"}`;
  const day = Math.round(hr / 24);
  if (day === 1) return "tomorrow";
  return `in ${day} days`;
}
