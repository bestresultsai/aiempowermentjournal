import { Link } from "react-router-dom";
import {
  GraduationCap, Users, BookCheck, NotebookPen, ArrowRight,
  Activity, TrendingUp,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getAccessibleCohorts, hasGlobalScope, getRoleLabel } from "../../lib/adminRoles";
import { DEMO_COHORTS } from "../../lib/demoData";
import { MOCK_COHORT } from "../../lib/mockCohort";
import {
  ADMIN_MOCK_PARTICIPANTS,
  getParticipantsForCohort,
  getPendingHomework,
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

  // Last activity (most recent journal entry across scoped participants).
  const minDaysAgo = participants.reduce(
    (min, p) => Math.min(min, p.lastJournalDaysAgo ?? 999),
    999,
  );
  const lastActivityLabel =
    minDaysAgo === 999
      ? "—"
      : minDaysAgo === 0
        ? "today"
        : minDaysAgo === 1
          ? "yesterday"
          : `${minDaysAgo}d ago`;

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
          icon={Activity}
          label="Last journal entry"
          value={lastActivityLabel}
          accent="muted"
          isText
        />
      </div>

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
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Stat label="Participants" value={totalParticipants} />
                  <Stat label="Avg progress" value={`${avgProgress}%`} />
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

      {/* Recent journal activity */}
      <section>
        <SectionHeader title="Recent activity" />
        <div className="rounded-2xl bg-surface-card border border-soft overflow-hidden">
          {participants
            .slice()
            .sort((a, b) => a.lastJournalDaysAgo - b.lastJournalDaysAgo)
            .slice(0, 6)
            .map((p) => (
              <Link
                key={p.id}
                to={`/admin/users/${p.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-soft transition-colors border-b border-soft last:border-b-0"
              >
                <div className="w-9 h-9 rounded-full bg-brand-700 text-white flex items-center justify-center text-[11px] font-heading font-bold">
                  {p.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-heading font-semibold text-ink truncate">
                    {p.name}
                  </div>
                  <div className="text-[11.5px] text-ink-muted">
                    {p.organization} · last journal {p.lastJournalDaysAgo === 0 ? "today" : `${p.lastJournalDaysAgo}d ago`}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-heading font-bold text-brand-600">
                  <NotebookPen className="w-3.5 h-3.5" strokeWidth={2.5} />
                  Open
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

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
        {label}
      </div>
      <div className="font-heading font-extrabold text-ink text-[20px] tracking-tight mt-0.5">
        {value}
      </div>
    </div>
  );
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
