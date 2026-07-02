import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  ArrowRight,
  Calendar as CalendarIcon,
  ChevronRight,
} from "lucide-react";
import NavBar from "../../components/NavBar";
import { useAuth } from "../../context/AuthContext";
import { getAccessibleCohorts } from "../../lib/adminRoles";
import {
  getAllCohortsForAdmin,
  getSessionsForCohort,
  useCohortVersion,
} from "../../lib/cohortAdmin";
import { useParticipantVersion } from "../../lib/adminMockData";
import {
  getProgramForCohort,
  getBeltsForProgram,
} from "../../lib/programs";

// ---------------------------------------------------------------------------
// /facilitator/journey — the facilitator's read of every cohort they own,
// shaped as a belt-journey progress matrix.
//
// Different from /admin/cohorts (operational list with edits and CTAs) and
// from /facilitator/home (a multi-card dashboard). This page is laser-focused
// on "how far along is each of my cohorts on the belt journey?"
// ---------------------------------------------------------------------------

export default function FacilitatorJourney() {
  // Subscribe to activity + cohort mutations so this page re-renders
  // when hydrateActivityFromSupabase or cohort mirrors emit. Without
  // this the initial render captures the pre-hydrate empty snapshot
  // (0 journal entries, 0 homework, etc.) and never refreshes.
  useParticipantVersion();
  useCohortVersion();

  const { user } = useAuth();
  const version = useCohortVersion();

  const cohorts = useMemo(
    () => getAccessibleCohorts(user, getAllCohortsForAdmin()),
    [user, version],
  );

  // Per-cohort journey summary, computed in one pass so the grid renders
  // synchronously.
  const journeyRows = useMemo(() => {
    return cohorts.map((cohort) => {
      const program = getProgramForCohort(cohort);
      const belts = getBeltsForProgram(program);
      const sessions = getSessionsForCohort(cohort.slug) || [];
      const total = sessions.length || belts.length || 8;
      const completed = sessions.filter((s) => s.completed).length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      const nextSession = sessions.find(
        (s) => s.date && new Date(s.date).getTime() >= Date.now(),
      );
      return {
        cohort,
        program,
        belts,
        sessions,
        total,
        completed,
        pct,
        nextSession,
      };
    });
  }, [cohorts]);

  const portfolioCompleted = journeyRows.reduce((s, r) => s + r.completed, 0);
  const portfolioTotal = journeyRows.reduce((s, r) => s + r.total, 0);
  const portfolioPct =
    portfolioTotal > 0
      ? Math.round((portfolioCompleted / portfolioTotal) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-surface-paper">
      <NavBar />
      <main className="max-w-[1180px] mx-auto px-6 lg:px-8 py-8 lg:py-12 space-y-8">
        {/* Header */}
        <header className="space-y-1.5 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" strokeWidth={2.25} />
            </div>
            <div className="h-eyebrow text-emerald-700">
              Facilitator · Journey
            </div>
          </div>
          <h1 className="font-heading text-[32px] lg:text-[36px] font-extrabold tracking-tight text-ink leading-tight">
            Your cohorts, belt by belt.
          </h1>
          <p className="text-[14.5px] text-ink-muted mt-2 max-w-2xl leading-relaxed">
            Every cohort you facilitate, laid out as a belt journey. See at a
            glance which cohorts are on track and which need a nudge.
          </p>
        </header>

        {/* Portfolio progress strip */}
        {cohorts.length > 0 && (
          <PortfolioStrip
            completed={portfolioCompleted}
            total={portfolioTotal}
            pct={portfolioPct}
            cohortCount={cohorts.length}
          />
        )}

        {/* Cohort journey cards */}
        {cohorts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-soft p-10 text-center animate-fade-in-up">
            <div className="text-[14px] text-ink-muted">
              No cohorts assigned to you yet.
            </div>
            <div className="text-[12.5px] text-ink-muted mt-1">
              Reach out to an admin if you expected one.
            </div>
          </div>
        ) : (
          <section className="space-y-3 animate-fade-in-up">
            {journeyRows.map((row) => (
              <CohortJourneyCard key={row.cohort.slug} row={row} />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top-of-page summary: cohorts in scope + portfolio progress bar.
// ---------------------------------------------------------------------------
function PortfolioStrip({ completed, total, pct, cohortCount }) {
  return (
    <section className="rounded-2xl bg-ink text-white p-6 lg:p-7 flex flex-col lg:flex-row gap-5 items-start lg:items-center animate-fade-in-up">
      <div className="flex-1 min-w-0">
        <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-emerald-300 mb-1">
          Portfolio · {cohortCount} cohort{cohortCount === 1 ? "" : "s"}
        </div>
        <div className="font-heading text-[24px] lg:text-[28px] font-extrabold text-white leading-tight">
          {completed} of {total} sessions delivered
        </div>
        <div className="text-[13px] text-white/70 mt-1">
          Across every cohort you facilitate.
        </div>
      </div>
      <div className="w-full lg:w-72">
        <div className="h-2 rounded-full bg-white/15 overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-[12px] text-white/70 mt-2 text-right font-heading font-semibold">
          {pct}% delivered
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Per-cohort journey card — belt sequence visualization + meta.
// ---------------------------------------------------------------------------
function CohortJourneyCard({ row }) {
  const { cohort, belts, sessions, total, completed, pct, nextSession } = row;
  const nextLabel = nextSession
    ? new Date(nextSession.date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : null;

  // For each belt slot in the program, derive a status:
  //   - "completed" — the session at this index has completed=true
  //   - "current"   — the next still-incomplete session
  //   - "upcoming"  — everything past the current
  const slots = (belts.length ? belts : Array.from({ length: total }, (_, i) => `S${i + 1}`)).map(
    (beltName, idx) => {
      const session = sessions[idx];
      const isCompleted = !!session?.completed;
      const isCurrent =
        !isCompleted &&
        // First unfinished session that has a date in the past 30 days OR is the
        // very next not-yet-completed slot.
        idx ===
          sessions.findIndex((s, i) => !s.completed && (i === 0 || sessions[i - 1]?.completed));
      return {
        label: beltName,
        order: idx + 1,
        status: isCompleted ? "completed" : isCurrent ? "current" : "upcoming",
      };
    },
  );

  return (
    <Link
      to={`/admin/cohorts/${cohort.slug}`}
      className="block rounded-2xl bg-surface-card border border-soft p-5 lg:p-6 hover:border-ink/20 hover:shadow-lift transition-all group"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div className="min-w-0">
          <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
            {cohort.organization?.shortName || cohort.programCode}
          </div>
          <h3 className="font-heading text-[18px] font-extrabold text-ink leading-tight mt-0.5 truncate">
            {cohort.name}
          </h3>
          <div className="text-[12.5px] text-ink-muted mt-1 inline-flex items-center gap-3 flex-wrap">
            <span>
              {completed} of {total} sessions · {pct}%
            </span>
            {nextLabel && (
              <span className="inline-flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" strokeWidth={2.5} />
                Next {nextLabel}
              </span>
            )}
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[12.5px] font-heading font-bold text-brand-700 group-hover:text-brand-800 shrink-0">
          Open cohort
          <ChevronRight
            className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
            strokeWidth={2.5}
          />
        </span>
      </div>

      {/* Belt sequence */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {slots.map((slot, idx) => (
          <BeltPill key={`${slot.label}-${idx}`} slot={slot} />
        ))}
      </div>

      {/* Thin progress bar reinforcement */}
      <div className="mt-4 h-1 rounded-full bg-ink/10 overflow-hidden">
        <div
          className="h-full bg-emerald-600 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Single belt slot pill. Tinted by status.
// ---------------------------------------------------------------------------
function BeltPill({ slot }) {
  const tone =
    slot.status === "completed"
      ? "bg-emerald-600 text-white border-emerald-600"
      : slot.status === "current"
      ? "bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-300/50"
      : "bg-ink/5 text-ink-muted border-ink/10";
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11.5px] font-heading font-bold ${tone}`}
      title={`${slot.label} · ${slot.status}`}
    >
      <span className="opacity-80">{slot.order}.</span>
      <span>{slot.label}</span>
    </div>
  );
}
