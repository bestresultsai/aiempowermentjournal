import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowLeft, GraduationCap, BookCheck, NotebookPen, Sparkles, Clock, Users,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getAccessibleCohorts } from "../../lib/adminRoles";
import { DEMO_COHORTS } from "../../lib/demoData";
import { MOCK_SESSIONS, BELT_COLORS } from "../../lib/mockCohort";
import {
  getParticipantsForCohort, getCohortJournalStats,
  totalTimeSaved, formatMinutes,
} from "../../lib/adminMockData";

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
  const journal = getCohortJournalStats(slug);

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

      {/* Cohort-level Journal summary */}
      {journal.totalEntries > 0 && (
        <section className="rounded-2xl bg-emerald-50/40 border border-emerald-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-emerald-700" strokeWidth={2.5} />
            <h2 className="font-heading text-[13px] font-bold uppercase tracking-wider text-emerald-700">
              AI Journal — this cohort
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <CohortJournalStat icon={NotebookPen} label="Entries" value={journal.totalEntries} />
            <CohortJournalStat icon={Clock} label="Hours saved" value={Math.round(journal.totalMinutesSaved / 60)} />
            <CohortJournalStat
              icon={Users}
              label="Top contributor"
              value={journal.topContributor?.name.split(" ")[0] || "—"}
              sub={journal.topContributor ? `${formatMinutes(journal.topContributorMinutes)} saved` : null}
            />
            <CohortJournalStat
              icon={Sparkles}
              label="Latest entry"
              value={journal.latest ? timeAgoShort(journal.latest.date) : "—"}
              sub={journal.latest ? journal.latest.participantName : null}
            />
          </div>
        </section>
      )}

      {/* Roster table */}
      <div className="rounded-2xl bg-surface-card border border-soft overflow-hidden">
        {/* Header row (desktop) */}
        <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-soft bg-surface-soft text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
          <div>Participant</div>
          <div className="w-48 text-center">Progress (8 belts)</div>
          <div className="w-20 text-right">Done</div>
          <div className="w-24 text-right">Homework</div>
          <div className="w-36 text-right">Journal</div>
        </div>

        {roster.map((p) => {
          const completedCount = p.progress?.length || 0;
          const submittedCount = Object.keys(p.submissions || {}).length;
          const entriesCount = p.journalEntries?.length || 0;
          const minutesSaved = totalTimeSaved(p.journalEntries || []);
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

              {/* Journal — entries + hours saved + last activity */}
              <div className="w-full md:w-36 text-left md:text-right">
                <div className="flex md:justify-end items-center gap-1.5">
                  <NotebookPen className="w-3.5 h-3.5 text-ink-muted shrink-0" strokeWidth={2.25} />
                  <span className="font-heading font-bold text-ink text-[14px]">
                    {entriesCount}
                  </span>
                  {minutesSaved > 0 && (
                    <span className="text-[11.5px] font-heading font-semibold text-emerald-700">
                      · {formatMinutes(minutesSaved)} saved
                    </span>
                  )}
                </div>
                <div className={
                  "text-[10.5px] font-heading mt-0.5 " +
                  ((p.lastJournalDaysAgo ?? 999) > 10 ? "text-amber-700" : "text-ink-muted")
                }>
                  {(p.lastJournalDaysAgo ?? 999) > 100 ? "no entries" :
                    p.lastJournalDaysAgo === 0 ? "today" :
                      p.lastJournalDaysAgo === 1 ? "yesterday" :
                        `last ${p.lastJournalDaysAgo}d ago`}
                </div>
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

function CohortJournalStat({ icon: Icon, label, value, sub }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10.5px] font-heading font-bold uppercase tracking-wider text-emerald-700/80">
        <Icon className="w-3 h-3" strokeWidth={2.5} />
        {label}
      </div>
      <div className="font-heading font-extrabold text-emerald-900 text-[22px] tracking-tight mt-0.5">
        {value}
      </div>
      {sub && <div className="text-[10.5px] text-emerald-700/70 mt-0.5">{sub}</div>}
    </div>
  );
}

function timeAgoShort(iso) {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}
