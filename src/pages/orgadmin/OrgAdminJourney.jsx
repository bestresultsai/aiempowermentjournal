import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
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
import {
  getProgramForCohort,
  getBeltsForProgram,
} from "../../lib/programs";

// ---------------------------------------------------------------------------
// /org/journey — the Org Admin's read of every cohort their organization is
// running, shaped as a belt-journey progress matrix.
//
// Structurally similar to /facilitator/journey — different scope, different
// tone. An Org Admin oversees the customer side; they care about "are our
// cohorts on track" rather than "did I prep enough for tomorrow's session."
// ---------------------------------------------------------------------------

export default function OrgAdminJourney() {
  const { user } = useAuth();
  const version = useCohortVersion();

  const cohorts = useMemo(
    () => getAccessibleCohorts(user, getAllCohortsForAdmin()),
    [user, version],
  );

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
        <header className="space-y-1.5 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" strokeWidth={2.25} />
            </div>
            <div className="h-eyebrow text-purple-700">
              Organization · Journey
            </div>
          </div>
          <h1 className="font-heading text-[32px] lg:text-[36px] font-extrabold tracking-tight text-ink leading-tight">
            Your organization's cohorts.
          </h1>
          <p className="text-[14.5px] text-ink-muted mt-2 max-w-2xl leading-relaxed">
            Every cohort your team is running, laid out as a belt journey.
            Track which ones are on pace and which need a check-in with the
            facilitator.
          </p>
        </header>

        {cohorts.length > 0 && (
          <section className="rounded-2xl bg-ink text-white p-6 lg:p-7 flex flex-col lg:flex-row gap-5 items-start lg:items-center animate-fade-in-up">
            <div className="flex-1 min-w-0">
              <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-purple-300 mb-1">
                Portfolio · {cohorts.length} cohort
                {cohorts.length === 1 ? "" : "s"}
              </div>
              <div className="font-heading text-[24px] lg:text-[28px] font-extrabold text-white leading-tight">
                {portfolioCompleted} of {portfolioTotal} sessions delivered
              </div>
              <div className="text-[13px] text-white/70 mt-1">
                Across every cohort your organization is running.
              </div>
            </div>
            <div className="w-full lg:w-72">
              <div className="h-2 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full bg-purple-400 rounded-full transition-all"
                  style={{ width: `${portfolioPct}%` }}
                />
              </div>
              <div className="text-[12px] text-white/70 mt-2 text-right font-heading font-semibold">
                {portfolioPct}% delivered
              </div>
            </div>
          </section>
        )}

        {cohorts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-soft p-10 text-center animate-fade-in-up">
            <div className="text-[14px] text-ink-muted">
              No cohorts assigned to your organization yet.
            </div>
            <div className="text-[12.5px] text-ink-muted mt-1">
              Reach out to your BestResults.AI contact if you expected one.
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

function CohortJourneyCard({ row }) {
  const { cohort, belts, sessions, total, completed, pct, nextSession } = row;
  const nextLabel = nextSession
    ? new Date(nextSession.date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : null;

  const slots = (belts.length
    ? belts
    : Array.from({ length: total }, (_, i) => `S${i + 1}`)
  ).map((beltName, idx) => {
    const session = sessions[idx];
    const isCompleted = !!session?.completed;
    const isCurrent =
      !isCompleted &&
      idx ===
        sessions.findIndex(
          (s, i) => !s.completed && (i === 0 || sessions[i - 1]?.completed),
        );
    return {
      label: beltName,
      order: idx + 1,
      status: isCompleted ? "completed" : isCurrent ? "current" : "upcoming",
    };
  });

  return (
    <Link
      to={`/admin/cohorts/${cohort.slug}`}
      className="block rounded-2xl bg-surface-card border border-soft p-5 lg:p-6 hover:border-ink/20 hover:shadow-lift transition-all group"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div className="min-w-0">
          <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
            {cohort.facilitator?.name
              ? `Facilitated by ${cohort.facilitator.name}`
              : cohort.programCode}
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

      <div className="flex items-center gap-1.5 flex-wrap">
        {slots.map((slot, idx) => (
          <BeltPill key={`${slot.label}-${idx}`} slot={slot} />
        ))}
      </div>

      <div className="mt-4 h-1 rounded-full bg-ink/10 overflow-hidden">
        <div
          className="h-full bg-purple-600 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </Link>
  );
}

function BeltPill({ slot }) {
  const tone =
    slot.status === "completed"
      ? "bg-purple-600 text-white border-purple-600"
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
