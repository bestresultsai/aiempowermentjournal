import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, GraduationCap, BookCheck, NotebookPen } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getAccessibleCohorts } from "../../lib/adminRoles";
import { DEMO_COHORTS } from "../../lib/demoData";
import { MOCK_SESSIONS, BELT_COLORS } from "../../lib/mockCohort";
import { getParticipantsForCohort } from "../../lib/adminMockData";

// /admin/cohorts/:slug — roster of participants in a single cohort.
//
// Each row shows the participant identity, an 8-pip progress bar (one pip per
// belt), homework submission count, and last journal activity.
export default function AdminCohortRoster() {
  const { slug } = useParams();
  const { user } = useAuth();
  const cohorts = getAccessibleCohorts(user, DEMO_COHORTS);
  const cohort = cohorts.find((c) => c.slug === slug);

  // Scope check — if the user's role can't see this cohort, bounce.
  if (!cohort) {
    return <Navigate to="/admin/cohorts" replace />;
  }

  const roster = getParticipantsForCohort(slug);
  const totalSessions = MOCK_SESSIONS.length;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Back link */}
      <Link
        to="/admin/cohorts"
        className="inline-flex items-center gap-1.5 text-[12.5px] font-heading font-semibold text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
        All cohorts
      </Link>

      {/* Header */}
      <header className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
          <GraduationCap className="w-6 h-6" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-eyebrow">{cohort.organization?.name || "Cohort"}</div>
          <h1 className="font-heading text-[24px] lg:text-[28px] font-extrabold text-ink leading-tight">
            {cohort.name}
          </h1>
          <p className="text-[13px] text-ink-muted mt-0.5">
            {cohort.methodName} · {cohort.programCode} · {roster.length}{" "}
            {roster.length === 1 ? "participant" : "participants"}
          </p>
        </div>
      </header>

      {/* Roster table */}
      <div className="rounded-2xl bg-surface-card border border-soft overflow-hidden">
        {/* Header row (desktop) */}
        <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-soft bg-surface-soft text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
          <div>Participant</div>
          <div className="w-48 text-center">Progress (8 belts)</div>
          <div className="w-20 text-right">Done</div>
          <div className="w-24 text-right">Homework</div>
          <div className="w-24 text-right">Last journal</div>
        </div>

        {roster.map((p) => {
          const completedCount = p.progress?.length || 0;
          const submittedCount = Object.keys(p.submissions || {}).length;
          return (
            <Link
              key={p.id}
              to={`/admin/users/${p.id}`}
              className="group grid md:grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-4 hover:bg-surface-soft transition-colors border-b border-soft last:border-b-0"
            >
              {/* Identity */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-brand-700 text-white flex items-center justify-center text-[12px] font-heading font-bold shrink-0">
                  {p.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-heading text-[14px] font-bold text-ink truncate group-hover:text-brand-700 transition-colors">
                    {p.name}
                  </div>
                  <div className="text-[11.5px] text-ink-muted truncate">{p.title}</div>
                </div>
              </div>

              {/* Belt-progress pips */}
              <div className="w-full md:w-48 flex items-center justify-start md:justify-center gap-1">
                {MOCK_SESSIONS.map((s) => {
                  const done = p.progress?.includes(s.order);
                  const belt = BELT_COLORS[s.belt];
                  return (
                    <div
                      key={s.order}
                      title={`${s.belt} belt — Session ${s.order}`}
                      style={{
                        background: done ? belt.gradient : "#E5E7EB",
                        border: done && belt.needsBorder ? "1px solid #D1D5DB" : "none",
                      }}
                      className="h-4 w-4 rounded-sm shrink-0"
                    />
                  );
                })}
              </div>

              {/* Done count */}
              <div className="w-full md:w-20 text-left md:text-right">
                <div className="font-heading font-bold text-ink text-[14px]">
                  {completedCount}/{totalSessions}
                </div>
              </div>

              {/* Homework submitted */}
              <div className="w-full md:w-24 text-left md:text-right flex md:justify-end items-center gap-1.5">
                <BookCheck className="w-3.5 h-3.5 text-ink-muted shrink-0" strokeWidth={2.25} />
                <span className="font-heading font-bold text-ink text-[14px]">
                  {submittedCount}
                </span>
              </div>

              {/* Last journal */}
              <div className="w-full md:w-24 text-left md:text-right flex md:justify-end items-center gap-1.5">
                <NotebookPen className="w-3.5 h-3.5 text-ink-muted shrink-0" strokeWidth={2.25} />
                <span className={
                  "font-heading font-semibold text-[13px] " +
                  ((p.lastJournalDaysAgo ?? 999) > 10 ? "text-amber-700" : "text-ink")
                }>
                  {(p.lastJournalDaysAgo ?? 999) > 100 ? "—" :
                    p.lastJournalDaysAgo === 0 ? "today" :
                      p.lastJournalDaysAgo === 1 ? "yesterday" :
                        `${p.lastJournalDaysAgo}d ago`}
                </span>
              </div>
            </Link>
          );
        })}

        {roster.length === 0 && (
          <div className="p-8 text-center text-[14px] text-ink-muted">
            No participants in this cohort yet.
          </div>
        )}
      </div>
    </div>
  );
}
