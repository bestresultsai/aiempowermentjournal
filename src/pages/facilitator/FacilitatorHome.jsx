import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  GraduationCap, Calendar as CalendarIcon, BookCheck, AlertTriangle, Users,
  ArrowRight, Zap, Video, Clock, ExternalLink, ChevronRight,
} from "lucide-react";
import NavBar from "../../components/NavBar";
import { useAuth } from "../../context/AuthContext";
import { getAccessibleCohorts } from "../../lib/adminRoles";
import { getAllCohortsForAdmin, useCohortVersion } from "../../lib/cohortAdmin";
import {
  ADMIN_MOCK_PARTICIPANTS,
  getHomeworkRows,
  getParticipantHomeworkStats,
} from "../../lib/adminMockData";
import { getSessionsCountForCohort } from "../../lib/programs";
import { getSessionState, SESSION_STATES } from "../../lib/sessionState";
import { useGoogleCalendarConnection } from "../../lib/googleCalendar";
import { primaryEffectiveRole, useViewAs } from "../../lib/viewAs";

// ---------------------------------------------------------------------------
// /facilitator/home — the facilitator's morning view.
//
// Scope: getAccessibleCohorts(user) — the user's assignedCohorts. Cards:
//   - My cohorts (one per accessible cohort)
//   - Up next: next live session across cohorts
//   - Homework awaiting review
//   - At-risk participants
//   - Calendar connect nudge if not connected
// ---------------------------------------------------------------------------

export default function FacilitatorHome() {
  // All hooks must run in the same order every render — even when the user
  // is about to be redirected. Compute everything first, then decide if we
  // redirect.
  const { user } = useAuth();
  const version = useCohortVersion();
  const gcal = useGoogleCalendarConnection(user);
  // Honor view-as: an admin previewing-as-facilitator should NOT be bounced
  // away by the role guard below (otherwise /home re-routes them back here
  // and we ping-pong forever).
  const { mode: viewAsMode } = useViewAs(user);

  const cohorts = useMemo(
    () => getAccessibleCohorts(user, getAllCohortsForAdmin()),
    [user, version],
  );
  const cohortSlugs = useMemo(() => cohorts.map((c) => c.slug), [cohorts]);
  const upNext = useMemo(() => findNextSession(cohorts), [cohorts]);
  const homeworkPending = useMemo(() => {
    // getHomeworkRows is positional: (cohortSlugs, status).
    return getHomeworkRows(cohortSlugs, "pending");
  }, [cohortSlugs, version]);
  const oldestPendingDays = useMemo(() => {
    return homeworkPending.reduce((max, r) => {
      if (!r.submittedAt) return max;
      const days = Math.floor(
        (Date.now() - new Date(r.submittedAt).getTime()) / (1000 * 60 * 60 * 24),
      );
      return Math.max(max, days);
    }, 0);
  }, [homeworkPending]);
  const atRisk = useMemo(() => {
    return ADMIN_MOCK_PARTICIPANTS
      .filter((p) => cohortSlugs.includes(p.cohortSlug))
      .filter((p) => isAtRisk(p))
      .slice(0, 4);
  }, [cohortSlugs, version]);

  const role = primaryEffectiveRole(user);
  // Three ways to be "allowed here":
  //   1. Your primary role is facilitator
  //   2. Your capabilities list includes facilitator
  //   3. You're an elevated user previewing-as-facilitator (view-as mode)
  // Without #3, an admin in view-as mode lands here, gets bounced to /home,
  // /home sees their effective role is "facilitator" and bounces back —
  // ping-pong forever.
  const allowed =
    role === "facilitator" ||
    !!user?.capabilities?.includes?.("facilitator") ||
    viewAsMode === "facilitator";
  if (!allowed) {
    return <Navigate to="/home" replace />;
  }

  const firstName = (user?.name || "").trim().split(/\s+/)[0] || "Facilitator";

  return (
    <>
      <NavBar />
      <main className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-8 lg:py-12 space-y-8">
        <header className="space-y-1.5 animate-fade-in-up">
          <div className="h-eyebrow text-emerald-700">Facilitator · Home</div>
          <h1 className="font-heading text-[32px] lg:text-[40px] font-extrabold text-ink leading-tight">
            Hey {firstName}.
          </h1>
          <p className="text-[14px] text-ink-muted max-w-xl">
            Your cohorts at a glance — what's coming up, what needs review,
            who needs a check-in.
          </p>
        </header>

        {/* Calendar nudge */}
        {!gcal.connected && (
          <Link
            to="/settings"
            className="rounded-2xl border-2 border-amber-300 bg-amber-50/60 p-4 flex items-start gap-3 hover:bg-amber-50 transition-colors animate-fade-in-up"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-5 h-5" strokeWidth={2.25} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-heading font-bold text-[14px] text-amber-900">
                Sessions aren't syncing to your calendar yet
              </div>
              <div className="text-[12.5px] text-amber-900/80 mt-0.5">
                Connect Google Calendar so every cohort session lands on your
                schedule automatically.
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-800 shrink-0 mt-1" strokeWidth={2.5} />
          </Link>
        )}

        {/* Up next */}
        {upNext && <UpNextCard upNext={upNext} />}

        {/* Action row — homework + at-risk side by side */}
        <section className="grid md:grid-cols-2 gap-4 animate-fade-in-up">
          <HomeworkCard count={homeworkPending.length} oldestDays={oldestPendingDays} />
          <AtRiskCard atRisk={atRisk} cohorts={cohorts} />
        </section>

        {/* My cohorts grid */}
        <section className="space-y-3 animate-fade-in-up">
          <h2 className="font-heading text-[18px] font-extrabold text-ink inline-flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-700" strokeWidth={2.25} />
            My cohorts · {cohorts.length}
          </h2>
          {cohorts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-soft p-6 text-center text-[13px] text-ink-muted">
              No cohorts assigned to you yet. Reach out to an admin if you
              expected one.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {cohorts.map((c) => (
                <CohortCard key={c.slug} cohort={c} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

// ---------------------------------------------------------------------------
// Up next — next live session card across all assigned cohorts.
// ---------------------------------------------------------------------------
function UpNextCard({ upNext }) {
  const { cohort, session } = upNext;
  const start = new Date(session.date);
  const minsAway = Math.round((start.getTime() - Date.now()) / 60000);
  const dayLabel = start.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const timeLabel = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const isWithinHour = minsAway >= -60 && minsAway <= 60;
  const zoom = session.zoomLink || cohort.zoomLink;

  return (
    <section className="rounded-2xl bg-ink text-white p-6 lg:p-8 flex flex-col lg:flex-row gap-6 items-start lg:items-center animate-fade-in-up">
      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
        <Clock className="w-6 h-6 text-emerald-300" strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-emerald-300 mb-1">
          Up next · {cohort.name}
        </div>
        <h3 className="font-heading text-[22px] font-extrabold text-white leading-tight">
          {session.belt ? `${session.belt} Belt — ` : ""}{session.title}
        </h3>
        <div className="text-[13px] text-white/70 mt-1.5 inline-flex items-center gap-2 flex-wrap">
          <span>{dayLabel} · {timeLabel}</span>
          {isWithinHour && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-200 text-[10.5px] font-heading font-bold uppercase tracking-wider">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-400" />
              </span>
              Soon
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {zoom && (
          <a
            href={zoom}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500 text-white text-[13px] font-heading font-bold hover:bg-emerald-600 transition-colors"
          >
            <Video className="w-4 h-4" strokeWidth={2.5} />
            Open Zoom
          </a>
        )}
        <Link
          to={`/admin/cohorts/${cohort.slug}`}
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 text-white text-[13px] font-heading font-bold hover:bg-white/15 transition-colors"
        >
          Open cohort
          <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
        </Link>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Homework card.
// ---------------------------------------------------------------------------
function HomeworkCard({ count, oldestDays }) {
  const stale = oldestDays >= 7;
  return (
    <Link
      to="/admin/homework"
      className="rounded-2xl bg-surface-card border border-soft p-5 hover:border-ink/20 hover:shadow-lift transition-all flex items-start gap-4 group"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${stale ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
        <BookCheck className="w-5 h-5" strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
          Homework
        </div>
        <div className="font-heading text-[24px] font-extrabold text-ink leading-none mt-1">
          {count}
          <span className="text-[13px] text-ink-muted font-medium ml-1.5">awaiting review</span>
        </div>
        {stale && (
          <div className="text-[12px] text-rose-700 font-heading font-semibold mt-1.5 inline-flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.5} />
            Oldest is {oldestDays} days old
          </div>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-ink-muted mt-1 group-hover:text-ink transition-colors" strokeWidth={2.5} />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// At-risk participants card.
// ---------------------------------------------------------------------------
function AtRiskCard({ atRisk, cohorts }) {
  const cohortBySlug = Object.fromEntries(cohorts.map((c) => [c.slug, c]));
  return (
    <div className="rounded-2xl bg-surface-card border border-soft p-5">
      <div className="flex items-start gap-4 mb-3">
        <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
            At risk
          </div>
          <div className="font-heading text-[24px] font-extrabold text-ink leading-none mt-1">
            {atRisk.length}
            <span className="text-[13px] text-ink-muted font-medium ml-1.5">participants</span>
          </div>
        </div>
      </div>
      {atRisk.length === 0 ? (
        <div className="text-[12.5px] text-emerald-700 font-heading font-semibold inline-flex items-center gap-1">
          <Zap className="w-3.5 h-3.5" strokeWidth={2.5} />
          Everyone is on track.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {atRisk.map((p) => (
            <li key={p.id}>
              <Link
                to={`/admin/participants/${p.id}`}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-soft transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-ink-muted shrink-0" strokeWidth={2.5} />
                <span className="flex-1 min-w-0 text-[13px] font-heading font-semibold text-ink truncate">
                  {p.name}
                </span>
                <span className="text-[11px] text-ink-muted truncate">
                  {cohortBySlug[p.cohortSlug]?.organization?.shortName || ""}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-ink-muted shrink-0" strokeWidth={2.5} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-cohort card in the grid.
// ---------------------------------------------------------------------------
function CohortCard({ cohort }) {
  const totalSessions = getSessionsCountForCohort(cohort) || cohort.sessions?.length || 8;
  const completedSessions = cohort.sessions?.filter((s) => s.completed).length || 0;
  const pct = Math.round((completedSessions / totalSessions) * 100);
  const nextSession = cohort.sessions?.find(
    (s) => s.date && new Date(s.date).getTime() >= Date.now(),
  );
  const nextLabel = nextSession
    ? new Date(nextSession.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "—";

  return (
    <Link
      to={`/admin/cohorts/${cohort.slug}`}
      className="rounded-2xl bg-surface-card border border-soft p-4 hover:border-ink/20 hover:shadow-lift transition-all space-y-3 group"
    >
      <div>
        <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
          {cohort.organization?.shortName || cohort.programCode}
        </div>
        <h3 className="font-heading text-[15px] font-extrabold text-ink leading-tight mt-0.5 truncate">
          {cohort.name}
        </h3>
      </div>
      <div>
        <div className="h-1.5 rounded-full bg-ink/10 overflow-hidden">
          <div
            className="h-full bg-emerald-600 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11.5px] text-ink-muted mt-1.5">
          <span>{completedSessions}/{totalSessions} sessions · {pct}%</span>
          <span className="inline-flex items-center gap-1">
            <CalendarIcon className="w-3 h-3" strokeWidth={2.5} />
            Next {nextLabel}
          </span>
        </div>
      </div>
      <div className="inline-flex items-center gap-1 text-[11.5px] font-heading font-bold text-brand-700 group-hover:text-brand-800">
        Open cohort
        <ExternalLink className="w-3 h-3" strokeWidth={2.5} />
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------
function findNextSession(cohorts) {
  let candidate = null;
  let candidateTs = Infinity;
  for (const c of cohorts) {
    for (const s of c.sessions || []) {
      if (!s.date) continue;
      const ts = new Date(s.date).getTime();
      const state = getSessionState(s);
      // Skip fully past sessions.
      if (state === SESSION_STATES.COMPLETED) continue;
      if (ts < candidateTs) {
        candidateTs = ts;
        candidate = { cohort: c, session: s };
      }
    }
  }
  return candidate;
}

function isAtRisk(p) {
  if ((p.lastJournalDaysAgo || 0) > 14) return true;
  const stats = getParticipantHomeworkStats(p);
  // Sessions they've completed but haven't yet submitted homework for.
  const completed = p.progress?.length || 0;
  if (completed - stats.submitted >= 2) return true;
  return false;
}
