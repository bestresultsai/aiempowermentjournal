import { Link } from "react-router-dom";
import {
  NotebookPen, Clock, Users, Trophy, Sparkles, AlertCircle,
  TrendingUp, Building2, ArrowRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getAccessibleCohorts } from "../../lib/adminRoles";
import { DEMO_COHORTS } from "../../lib/demoData";
import {
  getCohortJournalStats,
  getRecentEntriesInScope,
  getTopContributorsInScope,
  getStaleParticipantsInScope,
  getScopeJournalStats,
  getParticipantsForCohort,
  timeSavedFor,
  totalTimeSaved,
  formatMinutes,
} from "../../lib/adminMockData";

// ---------------------------------------------------------------------------
// /admin/journal — the AI Journal dashboard.
//
// Aggregates time-saved data across every cohort the admin can see. Sections:
//   1. Hero KPIs (5 cards)
//   2. Cohort comparison table (entries / hours / avg per participant)
//   3. Top contributors leaderboard (5 with hours saved)
//   4. Stale participants callout (no journal in 14+ days)
//   5. Recent entries stream (latest 20)
// ---------------------------------------------------------------------------

export default function AdminJournalDashboard() {
  const { user } = useAuth();
  const cohorts = getAccessibleCohorts(user, DEMO_COHORTS);
  const cohortSlugs = cohorts.map((c) => c.slug);

  const stats = getScopeJournalStats(cohortSlugs);
  const topContributors = getTopContributorsInScope(cohortSlugs, 5);
  const stale = getStaleParticipantsInScope(cohortSlugs, 14);
  const recent = getRecentEntriesInScope(cohortSlugs, 20);

  // Per-cohort breakdown for the comparison table.
  const cohortRows = cohorts.map((c) => {
    const roster = getParticipantsForCohort(c.slug);
    const cohortStats = getCohortJournalStats(c.slug);
    const activeCount = roster.filter((p) => (p.journalEntries?.length || 0) > 0).length;
    return {
      cohort: c,
      participants: roster.length,
      activeCount,
      entries: cohortStats.totalEntries,
      minutesSaved: cohortStats.totalMinutesSaved,
      avgMinutesPerParticipant:
        roster.length === 0 ? 0 : Math.round(cohortStats.totalMinutesSaved / roster.length),
    };
  });

  // Roll-up for the "people actively journaling" KPI.
  const activeJournalersCount = cohortRows.reduce((s, r) => s + r.activeCount, 0);
  const totalParticipants = cohortRows.reduce((s, r) => s + r.participants, 0);

  const topContributor = topContributors[0] || null;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <header className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
          <NotebookPen className="w-5 h-5" strokeWidth={2} />
        </div>
        <div>
          <div className="h-eyebrow">Admin · Journal</div>
          <h1 className="font-heading text-[28px] lg:text-[34px] font-extrabold tracking-tight text-ink leading-tight">
            AI Journal dashboard
          </h1>
          <p className="text-[14px] text-ink-muted mt-1.5 max-w-2xl">
            Time saved, top contributors, and recent activity across the {cohorts.length}{" "}
            {cohorts.length === 1 ? "cohort" : "cohorts"} you can see.
          </p>
        </div>
      </header>

      {/* Hero KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard
          icon={NotebookPen}
          label="Entries"
          value={stats.totalEntries}
        />
        <KpiCard
          icon={Clock}
          label="Hours saved"
          value={Math.round(stats.totalMinutesSaved / 60)}
          sub={formatMinutes(stats.totalMinutesSaved)}
        />
        <KpiCard
          icon={Users}
          label="Active journalers"
          value={activeJournalersCount}
          sub={`of ${totalParticipants}`}
        />
        <KpiCard
          icon={TrendingUp}
          label="Avg per journaler"
          value={
            activeJournalersCount > 0
              ? formatMinutes(Math.round(stats.totalMinutesSaved / activeJournalersCount))
              : "—"
          }
          isText
        />
        <KpiCard
          icon={Trophy}
          label="Top contributor"
          value={topContributor ? topContributor.name.split(" ")[0] : "—"}
          sub={topContributor ? `${formatMinutes(topContributor.minutesSaved)} saved` : null}
          isText
        />
      </div>

      {/* Cohort comparison */}
      {cohortRows.length > 0 && (
        <section>
          <SectionHeader title="By cohort" />
          <div className="rounded-2xl bg-surface-card border border-soft overflow-hidden">
            <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-soft bg-surface-soft text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
              <div>Cohort</div>
              <div className="w-28 text-right">Active</div>
              <div className="w-24 text-right">Entries</div>
              <div className="w-28 text-right">Hours saved</div>
              <div className="w-32 text-right">Avg / person</div>
            </div>
            {cohortRows.map((row) => (
              <Link
                key={row.cohort.slug}
                to={`/admin/cohorts/${row.cohort.slug}`}
                className="group grid md:grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-4 hover:bg-surface-soft transition-colors border-b border-soft last:border-b-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-heading text-[14px] font-bold text-ink truncate group-hover:text-brand-700">
                      {row.cohort.name}
                    </div>
                    <div className="text-[11.5px] text-ink-muted truncate">
                      {row.cohort.organization?.shortName || ""} · {row.cohort.programCode}
                    </div>
                  </div>
                </div>
                <RightCell value={`${row.activeCount}/${row.participants}`} width="w-28" />
                <RightCell value={row.entries} width="w-24" />
                <RightCell value={Math.round(row.minutesSaved / 60)} sub="hrs" width="w-28" accent="emerald" />
                <RightCell value={formatMinutes(row.avgMinutesPerParticipant)} width="w-32" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Top contributors */}
      {topContributors.length > 0 && (
        <section>
          <SectionHeader title="Top contributors" />
          <div className="rounded-2xl bg-surface-card border border-soft overflow-hidden">
            {topContributors.map((p, i) => (
              <Link
                key={p.id}
                to={`/admin/users/${p.id}`}
                className="group flex items-center gap-3 px-5 py-3.5 hover:bg-surface-soft transition-colors border-b border-soft last:border-b-0"
              >
                <div
                  className={
                    "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-heading font-extrabold shrink-0 " +
                    (i === 0
                      ? "bg-amber-100 text-amber-700"
                      : "bg-ink/5 text-ink-muted")
                  }
                >
                  {i + 1}
                </div>
                <div className="w-10 h-10 rounded-full bg-brand-700 text-white flex items-center justify-center text-[12px] font-heading font-bold shrink-0">
                  {p.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-heading text-[14px] font-bold text-ink truncate group-hover:text-brand-700">
                    {p.name}
                  </div>
                  <div className="text-[11.5px] text-ink-muted truncate">
                    {p.organization} · {p.entriesCount} {p.entriesCount === 1 ? "entry" : "entries"}
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11.5px] font-heading font-bold">
                  <Sparkles className="w-3 h-3" strokeWidth={3} />
                  {formatMinutes(p.minutesSaved)}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Stale participants — facilitator nudge target */}
      {stale.length > 0 && (
        <section>
          <SectionHeader title="Hasn't journaled in 14+ days" />
          <div className="rounded-2xl bg-amber-50/40 border border-amber-100 overflow-hidden">
            {stale.map((p) => (
              <Link
                key={p.id}
                to={`/admin/users/${p.id}`}
                className="group flex items-center gap-3 px-5 py-3.5 hover:bg-amber-50 transition-colors border-b border-amber-100 last:border-b-0"
              >
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" strokeWidth={2.25} />
                <div className="w-10 h-10 rounded-full bg-brand-700 text-white flex items-center justify-center text-[12px] font-heading font-bold shrink-0">
                  {p.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-heading text-[14px] font-bold text-ink truncate group-hover:text-brand-700">
                    {p.name}
                  </div>
                  <div className="text-[11.5px] text-ink-muted truncate">
                    {p.organization} · last entry {p.lastJournalDaysAgo}d ago
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-ink-subtle shrink-0 group-hover:text-brand-600" strokeWidth={2.5} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent entries */}
      <section>
        <SectionHeader title={`Recent entries${recent.length > 0 ? ` · ${recent.length}` : ""}`} />
        {recent.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-soft text-center text-[13px] text-ink-muted">
            No journal entries yet in your scope.
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((e) => (
              <Link
                key={`${e.participantId}-${e.id}`}
                to={`/admin/users/${e.participantId}`}
                className="block rounded-2xl bg-surface-card border border-soft p-4 hover:border-brand-500 hover:shadow-card transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-700 text-white flex items-center justify-center text-[11px] font-heading font-bold shrink-0">
                    {e.participantName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[11.5px] text-ink-muted mb-1 flex-wrap">
                      <span className="font-heading font-semibold text-ink">{e.participantName}</span>
                      <span>·</span>
                      <span>{e.organization}</span>
                      <span>·</span>
                      <span>{timeAgo(e.date)}</span>
                    </div>
                    <div className="font-heading text-[14px] font-bold text-ink leading-snug">
                      {e.title}
                    </div>
                    <p className="text-[12.5px] text-ink-muted leading-relaxed mt-1 line-clamp-2">
                      {e.description}
                    </p>
                  </div>
                  {timeSavedFor(e) > 0 && (
                    <div className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-heading font-bold">
                      <Sparkles className="w-3 h-3" strokeWidth={3} />
                      {formatMinutes(timeSavedFor(e))} saved
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ---- Components ----

function KpiCard({ icon: Icon, label, value, sub, isText }) {
  return (
    <div className="rounded-2xl bg-surface-card border border-soft p-4 lg:p-5">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
          <Icon className="w-4 h-4" strokeWidth={2.25} />
        </div>
        <span className="text-[11px] font-heading font-bold uppercase tracking-wider text-ink-muted">
          {label}
        </span>
      </div>
      <div
        className={
          "mt-3 font-heading font-extrabold text-ink tracking-tight " +
          (isText ? "text-[22px]" : "text-[32px] lg:text-[36px]")
        }
      >
        {value}
      </div>
      {sub && (
        <div className="text-[11px] text-ink-muted mt-1 font-heading">{sub}</div>
      )}
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div className="flex items-end justify-between mb-3">
      <h2 className="font-heading text-[16px] font-extrabold text-ink">{title}</h2>
    </div>
  );
}

function RightCell({ value, sub, width, accent }) {
  return (
    <div className={"w-full text-left md:text-right " + (width || "")}>
      <div
        className={
          "font-heading font-extrabold text-[16px] tracking-tight " +
          (accent === "emerald" ? "text-emerald-700" : "text-ink")
        }
      >
        {value}
        {sub && <span className="text-[10.5px] text-ink-muted font-semibold ml-1">{sub}</span>}
      </div>
    </div>
  );
}

function timeAgo(iso) {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}
