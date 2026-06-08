import { Link } from "react-router-dom";
import {
  GraduationCap, Users, BookCheck, NotebookPen, ArrowRight,
  TrendingUp, Clock, Sparkles, AlertTriangle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getAccessibleCohorts, hasGlobalScope, getRoleLabel } from "../../lib/adminRoles";
import { DEMO_COHORTS } from "../../lib/demoData";
import {
  ADMIN_MOCK_PARTICIPANTS,
  getParticipantsForCohort,
  getPendingHomework,
  getScopeJournalStats,
  getRecentEntriesInScope,
  getAtRiskParticipants,
  formatMinutes,
  timeSavedFor,
  totalTimeSaved,
} from "../../lib/adminMockData";

// ---------------------------------------------------------------------------
// /admin — landing page.
//
// KPI cards across the top, then cohorts-in-scope + recent activity feed.
// All data is mock today; the same components will work when cohortApi /
// adminApi are real (just swap the source).
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const { user } = useAuth();

  // Universe of cohorts we know about. In live mode this will be /api/cohorts
  // filtered server-side; for now, use the demo cohorts + the base mock.
  const allCohorts = DEMO_COHORTS;

  // Apply role scoping.
  const cohorts = getAccessibleCohorts(user, allCohorts);
  const cohortSlugs = cohorts.map((c) => c.slug);

  // Participants in scope.
  const participants = ADMIN_MOCK_PARTICIPANTS.filter((p) => cohortSlugs.includes(p.cohortSlug));

  // Pending homework in scope.
  const pending = getPendingHomework(cohortSlugs);

  // AI Journal aggregates in scope.
  const journalStats = getScopeJournalStats(cohortSlugs);
  const recentEntries = getRecentEntriesInScope(cohortSlugs, 6);
  const atRisk = getAtRiskParticipants(cohortSlugs);

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Page header */}
      <header>
        <div className="h-eyebrow">Admin · {getRoleLabel(user?.role)}</div>
        <h1 className="font-heading text-[28px] lg:text-[34px] font-extrabold tracking-tight text-ink leading-tight">
          {hasGlobalScope(user)
            ? "Everything BRAI."
            : `Welcome back, ${(user?.name || "").split(" ")[0]}.`}
        </h1>
        <p className="text-[14px] text-ink-muted mt-1.5 max-w-2xl">
          {hasGlobalScope(user)
            ? "All orgs, all cohorts. Drill in below."
            : `Showing the ${cohorts.length === 1 ? "cohort" : `${cohorts.length} cohorts`} you have access to.`}
        </p>
      </header>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard
          icon={GraduationCap}
          label="Cohorts"
          value={cohorts.length}
          accent="brand"
        />
        <KpiCard
          icon={Users}
          label="Participants"
          value={participants.length}
          accent="brand"
        />
        <KpiCard
          icon={BookCheck}
          label="Homework to review"
          value={pending.length}
          accent={pending.length > 0 ? "warn" : "muted"}
        />
        <KpiCard
          icon={NotebookPen}
          label="Journal entries"
          value={journalStats.totalEntries}
          accent="emerald"
        />
        <KpiCard
          icon={Clock}
          label="Hours saved"
          value={Math.round(journalStats.totalMinutesSaved / 60)}
          accent="emerald"
        />
      </div>

      {/* At-risk participants — combines stale journal, low progress, late homework
          into one triage list so facilitators don't have to triangulate. */}
      {atRisk.length > 0 && (
        <section className="rounded-2xl bg-amber-50/40 border border-amber-100 p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-4.5 h-4.5" strokeWidth={2.25} />
              </div>
              <div>
                <h2 className="font-heading text-[15px] font-extrabold text-ink">
                  {atRisk.length} participant{atRisk.length === 1 ? "" : "s"} need attention
                </h2>
                <p className="text-[12px] text-ink-muted">
                  Combined signal: stale journal, behind on belts, or homework stalled.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-surface-card border border-amber-100 overflow-hidden">
            {atRisk.slice(0, 5).map((p) => (
              <Link
                key={p.id}
                to={`/admin/users/${p.id}`}
                className="group flex items-center gap-3 px-4 py-3 hover:bg-amber-50/60 transition-colors border-b border-amber-100/50 last:border-b-0"
              >
                <div className="w-9 h-9 rounded-full bg-brand-700 text-white flex items-center justify-center text-[11px] font-heading font-bold shrink-0">
                  {p.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-heading text-[13.5px] font-bold text-ink truncate group-hover:text-brand-700 transition-colors">
                    {p.name}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    {p.risks.map((r) => (
                      <span
                        key={r}
                        className="text-[10.5px] font-heading font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-ink-subtle shrink-0 group-hover:text-brand-600 transition-colors" strokeWidth={2.5} />
              </Link>
            ))}
          </div>
          {atRisk.length > 5 && (
            <div className="mt-3 text-[12px] text-ink-muted text-right">
              + {atRisk.length - 5} more participant{atRisk.length - 5 === 1 ? "" : "s"}
            </div>
          )}
        </section>
      )}

      {/* Cohorts in scope */}
      <section>
        <SectionHeader title="Your cohorts" cta={{ to: "/admin/cohorts", label: "View all" }} />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {cohorts.map((c) => {
            const roster = getParticipantsForCohort(c.slug);
            const totalParticipants = roster.length;
            const avgProgress =
              totalParticipants === 0
                ? 0
                : Math.round(
                    roster.reduce((sum, p) => sum + (p.progress?.length || 0), 0) /
                      totalParticipants /
                      8 *
                      100,
                  );
            const cohortMinutes = roster.reduce(
              (sum, p) => sum + totalTimeSaved(p.journalEntries || []),
              0,
            );
            return (
              <Link
                key={c.slug}
                to={`/admin/cohorts/${c.slug}`}
                className="group rounded-2xl bg-surface-card border border-soft p-5 hover:border-brand-500 hover:shadow-card transition-all duration-200"
              >
                <div className="text-[11px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
                  {c.organization?.shortName || "Cohort"}
                </div>
                <div className="font-heading text-[16px] font-bold text-ink mt-1 group-hover:text-brand-700 transition-colors">
                  {c.name}
                </div>
                <div className="text-[12px] text-ink-muted mt-0.5">
                  {c.methodName} · {c.programCode}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Stat label="People" value={totalParticipants} />
                  <Stat label="Progress" value={`${avgProgress}%`} />
                  <Stat label="Hrs saved" value={Math.round(cohortMinutes / 60)} accent="emerald" />
                </div>
              </Link>
            );
          })}
          {cohorts.length === 0 && (
            <div className="col-span-full p-6 rounded-2xl border border-dashed border-soft text-center text-[13px] text-ink-muted">
              No cohorts in scope yet.
            </div>
          )}
        </div>
      </section>

      {/* Pending homework preview */}
      {pending.length > 0 && (
        <section>
          <SectionHeader
            title="Homework needs review"
            cta={{ to: "/admin/homework", label: `View all (${pending.length})` }}
          />
          <div className="rounded-2xl bg-surface-card border border-soft overflow-hidden">
            {pending.slice(0, 5).map((row) => (
              <PendingRow key={`${row.participantId}-${row.sessionOrder}`} row={row} />
            ))}
          </div>
        </section>
      )}

      {/* Recent AI Journal activity */}
      <section>
        <SectionHeader title="Recent journal entries" />
        <div className="space-y-2">
          {recentEntries.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-soft text-center text-[13px] text-ink-muted">
              No journal entries yet in your scope.
            </div>
          ) : recentEntries.map((e) => (
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
                  <div className="flex items-center gap-2 text-[11.5px] text-ink-muted mb-1">
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
                <TimeSavedChip minutes={timeSavedFor(e)} />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

// ---- Components ----

function KpiCard({ icon: Icon, label, value, accent = "brand", isText }) {
  const accentClass =
    accent === "warn"
      ? "bg-amber-50 text-amber-700"
      : accent === "muted"
        ? "bg-ink/5 text-ink-muted"
        : accent === "emerald"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-brand-50 text-brand-600";
  return (
    <div className="rounded-2xl bg-surface-card border border-soft p-4 lg:p-5">
      <div className="flex items-center gap-2">
        <div className={"w-8 h-8 rounded-lg flex items-center justify-center " + accentClass}>
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
    </div>
  );
}

function SectionHeader({ title, cta }) {
  return (
    <div className="flex items-end justify-between mb-3">
      <h2 className="font-heading text-[16px] font-extrabold text-ink">{title}</h2>
      {cta && (
        <Link
          to={cta.to}
          className="inline-flex items-center gap-1 text-[12.5px] font-heading font-semibold text-brand-600 hover:text-brand-700"
        >
          {cta.label}
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
        </Link>
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
        {label}
      </div>
      <div
        className={
          "font-heading font-extrabold text-[20px] tracking-tight mt-0.5 " +
          (accent === "emerald" ? "text-emerald-700" : "text-ink")
        }
      >
        {value}
      </div>
    </div>
  );
}

function TimeSavedChip({ minutes }) {
  if (!minutes || minutes <= 0) return null;
  return (
    <div className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-heading font-bold">
      <Sparkles className="w-3 h-3" strokeWidth={3} />
      {formatMinutes(minutes)} saved
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

function PendingRow({ row }) {
  return (
    <Link
      to="/admin/homework"
      className="flex items-center gap-3 px-4 py-3 hover:bg-surface-soft transition-colors border-b border-soft last:border-b-0"
    >
      <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
        <TrendingUp className="w-4 h-4" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-heading font-semibold text-ink truncate">
          {row.participantName} · Session {row.sessionOrder}
        </div>
        <div className="text-[11.5px] text-ink-muted truncate">{row.response}</div>
      </div>
      <ArrowRight className="w-4 h-4 text-ink-subtle shrink-0" strokeWidth={2.5} />
    </Link>
  );
}
