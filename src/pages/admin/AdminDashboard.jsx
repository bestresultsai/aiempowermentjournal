import { Link } from "react-router-dom";
import {
  GraduationCap, Users, BookCheck, NotebookPen, ArrowRight,
  Clock, Sparkles, AlertTriangle, Calendar, Send, Download,
  Activity, Award, CheckCircle2, MessageSquare, Trophy,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { hasGlobalScope, getRoleLabel } from "../../lib/adminRoles";
import { useScopeFilters } from "../../lib/useScopeFilters";
import { getAllCohortsForAdmin } from "../../lib/cohortAdmin";
import { MOCK_SESSIONS, BELT_COLORS } from "../../lib/mockCohort";
import {
  ADMIN_MOCK_PARTICIPANTS,
  getParticipantsForCohort,
  getPendingHomework,
  getScopeJournalStats,
  getRecentEntriesInScope,
  getAtRiskParticipants,
  getBiggestWinsInScope,
  getDeltaStats,
  getUpcomingSessions,
  getActivityStream,
  getCohortSparkline,
  formatMinutes,
  timeSavedFor,
  totalTimeSaved,
} from "../../lib/adminMockData";
import { downloadCSV } from "../../lib/csvExport";
import Sparkline from "../../components/admin/Sparkline";
import DeltaBadge from "../../components/admin/DeltaBadge";
import PipelineView from "../../components/admin/PipelineView";
import ScopeFilterBar from "../../components/admin/ScopeFilterBar";

// ---------------------------------------------------------------------------
// /admin — Admin landing dashboard. Top to bottom:
//
//   1. Header + quick actions
//   2. Top win banner
//   3. KPI strip (with this-week-vs-last-week deltas)
//   4. At-risk participants
//   5. Upcoming live sessions strip
//   6. Pipeline view (condensed)
//   7. Cohorts in scope (with sparklines)
//   8. Weekly digest preview
//   9. Homework needs review (preview)
//  10. Activity stream
// ---------------------------------------------------------------------------

function getDelivered() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayMs = now.getTime();
  let delivered = 0;
  for (const s of MOCK_SESSIONS) {
    if (new Date(s.date).getTime() <= todayMs) delivered++;
  }
  return delivered;
}

function timeAgo(iso) {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function timeUntil(iso) {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days}d`;
}

function formatShortDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const scope = useScopeFilters(user, getAllCohortsForAdmin());
  const { cohorts, effectiveCohorts, effectiveSlugs: cohortSlugs, orgs, facilitators } = scope;

  const participants = ADMIN_MOCK_PARTICIPANTS.filter((p) => cohortSlugs.includes(p.cohortSlug));
  const pending = getPendingHomework(cohortSlugs);
  const journalStats = getScopeJournalStats(cohortSlugs);
  const recentEntries = getRecentEntriesInScope(cohortSlugs, 6);
  const atRisk = getAtRiskParticipants(cohortSlugs);
  const topWin = getBiggestWinsInScope(cohortSlugs, 1)[0] || null;
  const deltas = getDeltaStats(cohortSlugs, 7);
  const upcoming = getUpcomingSessions(14)(MOCK_SESSIONS);
  const activity = getActivityStream(cohortSlugs, 10);

  const delivered = getDelivered();

  function handleExportWeek() {
    const since = Date.now() - 7 * 86400000;
    const rows = [["Date", "Participant", "Cohort", "Title", "Hours saved"]];
    for (const p of participants) {
      for (const e of p.journalEntries || []) {
        if (new Date(e.date).getTime() < since) continue;
        rows.push([
          new Date(e.date).toISOString().slice(0, 10),
          p.name,
          p.cohortSlug,
          e.title,
          (timeSavedFor(e) / 60).toFixed(1),
        ]);
      }
    }
    downloadCSV("this-week-journal.csv", rows);
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* ---------- 1. Header + quick actions ---------- */}
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="h-eyebrow">Admin · {getRoleLabel(user?.role)}</div>
          <h1 className="font-heading text-[28px] lg:text-[34px] font-extrabold tracking-tight text-ink leading-tight">
            {hasGlobalScope(user)
              ? "Everything BRAI."
              : `Welcome back, ${(user?.name || "").split(" ")[0]}.`}
          </h1>
          <p className="text-[14px] text-ink-muted mt-1.5 max-w-2xl">
            {hasGlobalScope(user)
              ? "All orgs, all cohorts. Drill in below."
              : (effectiveCohorts.length === cohorts.length
                  ? `Showing the ${cohorts.length === 1 ? "cohort" : `${cohorts.length} cohorts`} you have access to.`
                  : `Showing ${effectiveCohorts.length} of ${cohorts.length} cohorts.`)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            disabled
            title="Email digest sending lands when /api integration is wired"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-ink/5 text-ink-subtle text-[12.5px] font-heading font-semibold cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" strokeWidth={2.5} />
            Send digest
          </button>
          <button
            onClick={handleExportWeek}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-soft text-[12.5px] font-heading font-semibold text-ink hover:bg-surface-soft hover:border-brand-500 transition-all duration-200"
          >
            <Download className="w-3.5 h-3.5 text-brand-600" strokeWidth={2.5} />
            Export this week
          </button>
          <Link
            to="/admin/journal"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-[12.5px] font-heading font-semibold hover:bg-emerald-700 transition-colors"
          >
            <NotebookPen className="w-3.5 h-3.5" strokeWidth={2.5} />
            Journal dashboard
          </Link>
        </div>
      </header>

      {/* Scope filter — Org × Cohort × Facilitator. Auto-hides chips when
          there's only one option in a dimension. */}
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

      {/* ---------- 2. Top win banner ---------- */}
      {topWin && (
        <section className="rounded-2xl bg-gradient-to-r from-amber-50 via-emerald-50 to-surface-card border border-amber-100 p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-amber-800 mb-1">
                Win of the period
              </div>
              <Link
                to={`/admin/users/${topWin.participantId}`}
                className="font-heading text-[18px] font-extrabold text-ink leading-snug hover:text-brand-700 transition-colors"
              >
                {topWin.title}
              </Link>
              <p className="text-[12.5px] text-ink-muted leading-relaxed mt-1 line-clamp-2">
                {topWin.description}
              </p>
              <div className="mt-2 text-[11.5px] text-ink-muted font-heading">
                <span className="font-semibold text-ink">{topWin.participantName}</span>
                {" · "}{topWin.organization}
              </div>
            </div>
            <div className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-600 text-white text-[12px] font-heading font-bold">
              <Sparkles className="w-3.5 h-3.5" strokeWidth={3} />
              {formatMinutes(topWin.saved)} saved
            </div>
          </div>
        </section>
      )}

      {/* ---------- 3. KPI strip with deltas ---------- */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard
          icon={GraduationCap}
          label="Cohorts"
          value={effectiveCohorts.length}
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
          label="Homework pending"
          value={pending.length}
          accent={pending.length > 0 ? "warn" : "muted"}
          delta={deltas.homework.delta}
          deltaInvertColor
          deltaSuffix=" this wk"
        />
        <KpiCard
          icon={NotebookPen}
          label="Journal entries"
          value={journalStats.totalEntries}
          accent="emerald"
          delta={deltas.entries.delta}
          deltaSuffix=" this wk"
        />
        <KpiCard
          icon={Clock}
          label="Hours saved"
          value={Math.round(journalStats.totalMinutesSaved / 60)}
          accent="emerald"
          delta={Math.round(deltas.minutesSaved.delta / 60)}
          deltaSuffix=" hrs this wk"
        />
      </div>

      {/* ---------- 4. At-risk participants ---------- */}
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
        </section>
      )}

      {/* ---------- 5. Upcoming live sessions ---------- */}
      {upcoming.length > 0 && (
        <section>
          <SectionHeader title="Upcoming live sessions" subtitle="next 14 days" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcoming.slice(0, 3).map((s) => {
              const belt = BELT_COLORS[s.belt];
              return (
                <div
                  key={s.order}
                  className="rounded-2xl bg-surface-card border border-soft p-4 flex items-center gap-3"
                >
                  <div
                    style={{
                      background: belt.gradient,
                      color: belt.contrast,
                      border: belt.needsBorder ? "1px solid #D1D5DB" : "none",
                    }}
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-heading font-extrabold text-[14px] shrink-0"
                  >
                    {s.order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
                      {s.belt} belt · Session {s.order}
                    </div>
                    <div className="font-heading text-[13.5px] font-bold text-ink truncate mt-0.5">
                      {formatShortDate(s.date)}
                    </div>
                    <div className="text-[11px] text-brand-700 font-heading font-semibold mt-0.5">
                      {timeUntil(s.date)} · {effectiveCohorts.length} {effectiveCohorts.length === 1 ? "cohort" : "cohorts"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ---------- 6. Pipeline view — same rich cards as /admin/cohorts ---------- */}
      <section>
        <SectionHeader title="Pipeline" cta={{ to: "/admin/cohorts", label: "Full view" }} />
        <PipelineView
          rows={effectiveCohorts.map((c) => ({ cohort: c, delivered }))}
        />
      </section>

      {/* ---------- 7. Cohorts in scope (with sparklines) ---------- */}
      <section>
        <SectionHeader title="Your cohorts" cta={{ to: "/admin/cohorts", label: "View all" }} />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {effectiveCohorts.map((c) => {
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
            const sparkline = getCohortSparkline(c.slug, 8);
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
                <div className="mt-3 pt-3 border-t border-soft flex items-center justify-between">
                  <span className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
                    8-week trend
                  </span>
                  <Sparkline data={sparkline} width={90} height={20} />
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

      {/* ---------- 8. Weekly digest preview ---------- */}
      <WeeklyDigestCard
        cohortsCount={cohorts.length}
        entries={deltas.entries.current}
        minutesSaved={deltas.minutesSaved.current}
        reviewsPending={pending.length}
        atRiskCount={atRisk.length}
        topWin={topWin}
      />

      {/* ---------- 9. Pending homework preview ---------- */}
      {pending.length > 0 && (
        <section>
          <SectionHeader
            title="Homework needs review"
            cta={{ to: "/admin/homework", label: `View all (${pending.length})` }}
          />
          <div className="rounded-2xl bg-surface-card border border-soft overflow-hidden">
            {pending.slice(0, 5).map((row) => (
              <Link
                key={`${row.participantId}-${row.sessionOrder}`}
                to="/admin/homework"
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-soft transition-colors border-b border-soft last:border-b-0"
              >
                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                  <BookCheck className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-heading font-semibold text-ink truncate">
                    {row.participantName} · Session {row.sessionOrder}
                  </div>
                  <div className="text-[11.5px] text-ink-muted truncate">{row.response}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-ink-subtle shrink-0" strokeWidth={2.5} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------- 10. Activity stream ---------- */}
      {activity.length > 0 && (
        <section>
          <SectionHeader title="Activity" subtitle="latest across your scope" />
          <div className="rounded-2xl bg-surface-card border border-soft overflow-hidden">
            {activity.map((e, i) => (
              <ActivityRow key={`${e.kind}-${e.participantId}-${i}`} event={e} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function KpiCard({ icon: Icon, label, value, accent = "brand", isText, delta, deltaSuffix, deltaInvertColor }) {
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
      {delta !== undefined && (
        <div className="mt-1.5">
          <DeltaBadge value={delta} suffix={deltaSuffix} invertColor={deltaInvertColor} />
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, subtitle, cta }) {
  return (
    <div className="flex items-end justify-between mb-3 gap-3 flex-wrap">
      <h2 className="font-heading text-[16px] font-extrabold text-ink">
        {title}
        {subtitle && <span className="ml-2 text-[11.5px] text-ink-muted font-semibold">· {subtitle}</span>}
      </h2>
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

function ActivityRow({ event }) {
  const cfg = {
    journal:              { icon: NotebookPen, color: "bg-emerald-100 text-emerald-700" },
    "homework-submitted": { icon: BookCheck,   color: "bg-amber-100 text-amber-700" },
    "homework-reviewed":  { icon: CheckCircle2,color: "bg-brand-100 text-brand-700" },
  }[event.kind] || { icon: Activity, color: "bg-ink/5 text-ink-muted" };
  const Icon = cfg.icon;
  return (
    <Link
      to={`/admin/users/${event.participantId}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-surface-soft transition-colors border-b border-soft last:border-b-0"
    >
      <div className={"w-8 h-8 rounded-full flex items-center justify-center shrink-0 " + cfg.color}>
        <Icon className="w-4 h-4" strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-heading text-ink">
          <span className="font-bold">{event.participantName}</span>{" "}
          <span className="font-medium text-ink-muted">
            {event.kind === "journal" ? "logged" :
              event.kind === "homework-submitted" ? "submitted" :
              "got feedback —"}
          </span>{" "}
          <span className="font-semibold">{event.title}</span>
        </div>
        <div className="text-[11px] text-ink-muted mt-0.5">
          {event.organization} · {timeAgo(event.date)}
          {event.kind === "journal" && event.meta?.saved > 0 && (
            <> · <span className="text-emerald-700 font-semibold">{formatMinutes(event.meta.saved)} saved</span></>
          )}
        </div>
      </div>
    </Link>
  );
}

function WeeklyDigestCard({ cohortsCount, entries, minutesSaved, reviewsPending, atRiskCount, topWin }) {
  return (
    <section className="rounded-2xl bg-surface-card border-2 border-dashed border-soft p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
          <MessageSquare className="w-4.5 h-4.5" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-brand-700">
            Weekly digest preview
          </div>
          <div className="font-heading text-[15px] font-extrabold text-ink mt-0.5">
            {entries} entries · {Math.round(minutesSaved / 60)} hours saved across {cohortsCount} {cohortsCount === 1 ? "cohort" : "cohorts"}
          </div>
        </div>
        <button
          disabled
          title="Will send a styled email digest once /api integration is wired"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink/5 text-ink-subtle text-[11.5px] font-heading font-semibold cursor-not-allowed shrink-0"
        >
          <Send className="w-3.5 h-3.5" strokeWidth={2.5} />
          Send digest
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <ul className="space-y-1.5 text-[12.5px] text-ink-muted">
          <li className="inline-flex items-start gap-1.5">
            <span className="font-bold text-emerald-700 shrink-0">●</span>
            {entries} new journal {entries === 1 ? "entry" : "entries"} logged this week
          </li>
          <li className="inline-flex items-start gap-1.5">
            <span className="font-bold text-brand-600 shrink-0">●</span>
            {formatMinutes(minutesSaved)} of time saved across the cohort
            {cohortsCount === 1 ? "" : "s"}
          </li>
          <li className="inline-flex items-start gap-1.5">
            <span className={"font-bold shrink-0 " + (reviewsPending > 0 ? "text-amber-700" : "text-emerald-700")}>●</span>
            {reviewsPending === 0
              ? "All homework reviewed"
              : `${reviewsPending} homework submission${reviewsPending === 1 ? "" : "s"} need${reviewsPending === 1 ? "s" : ""} review`}
          </li>
          <li className="inline-flex items-start gap-1.5">
            <span className={"font-bold shrink-0 " + (atRiskCount > 0 ? "text-amber-700" : "text-emerald-700")}>●</span>
            {atRiskCount === 0
              ? "No participants at risk"
              : `${atRiskCount} participant${atRiskCount === 1 ? "" : "s"} need attention`}
          </li>
        </ul>
        {topWin && (
          <div className="rounded-xl bg-emerald-50/40 border border-emerald-100 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Trophy className="w-3 h-3 text-emerald-700" strokeWidth={3} />
              <span className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-emerald-700">
                Featured win
              </span>
            </div>
            <div className="text-[12.5px] font-heading font-bold text-ink leading-snug">
              {topWin.title}
            </div>
            <div className="text-[11px] text-ink-muted mt-1">
              {topWin.participantName} · {formatMinutes(topWin.saved)} saved
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
