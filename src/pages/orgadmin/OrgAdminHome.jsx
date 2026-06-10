import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Building2, GraduationCap, AlertTriangle, Users, Zap, Sparkles,
  ChevronRight, NotebookPen, Crown, ArrowRight,
} from "lucide-react";
import NavBar from "../../components/NavBar";
import { useAuth } from "../../context/AuthContext";
import {
  getAccessibleCohorts, getAccessibleOrgs,
} from "../../lib/adminRoles";
import { getAllCohortsForAdmin, useCohortVersion } from "../../lib/cohortAdmin";
import {
  ADMIN_MOCK_PARTICIPANTS,
  getParticipantHomeworkStats,
  timeSavedFor,
  formatMinutes,
} from "../../lib/adminMockData";
import { getSessionsCountForCohort } from "../../lib/programs";
import { primaryEffectiveRole } from "../../lib/viewAs";

// ---------------------------------------------------------------------------
// /org/home — the Org Admin's morning view.
//
// Scope is user.assignedOrgs. Cards:
//   - Our cohorts overview
//   - Aggregate ROI (cumulative hours saved by participants)
//   - At-risk participants strip
//   - Cohort leaders' recent activity
// ---------------------------------------------------------------------------

export default function OrgAdminHome() {
  // All hooks must run in the same order every render. Compute first, then
  // decide if we redirect.
  const { user } = useAuth();
  const version = useCohortVersion();

  const allCohorts = useMemo(() => getAllCohortsForAdmin(), [version]);
  const cohorts = useMemo(() => getAccessibleCohorts(user, allCohorts), [user, allCohorts]);
  const orgs = useMemo(() => getAccessibleOrgs(user, allCohorts), [user, allCohorts]);
  const cohortSlugs = useMemo(() => cohorts.map((c) => c.slug), [cohorts]);

  const participants = useMemo(
    () => ADMIN_MOCK_PARTICIPANTS.filter((p) => cohortSlugs.includes(p.cohortSlug)),
    [cohortSlugs, version],
  );

  const totalMinutesSaved = useMemo(() => {
    let sum = 0;
    for (const p of participants) {
      for (const e of p.journalEntries || []) sum += timeSavedFor(e);
    }
    return sum;
  }, [participants]);
  const activeJournalers = useMemo(
    () => participants.filter((p) => (p.journalEntries || []).length > 0).length,
    [participants],
  );
  const atRisk = useMemo(
    () => participants.filter((p) => isAtRisk(p)).slice(0, 5),
    [participants],
  );
  const recentLeaderActivity = useMemo(() => {
    const out = [];
    for (const p of participants) {
      if (!p.isCohortLead) continue;
      for (const e of p.journalEntries || []) {
        out.push({ participant: p, entry: e });
      }
    }
    return out
      .sort((a, b) => new Date(b.entry.date) - new Date(a.entry.date))
      .slice(0, 4);
  }, [participants]);

  const role = primaryEffectiveRole(user);
  // Reachable by users with the `org` capability (or above) only.
  if (
    role !== "org" &&
    !user?.capabilities?.includes?.("org") &&
    !user?.capabilities?.includes?.("admin") &&
    !user?.capabilities?.includes?.("super")
  ) {
    return <Navigate to="/home" replace />;
  }

  const firstName = (user?.name || "").trim().split(/\s+/)[0] || "there";
  const orgLabel = orgs.length === 1 ? orgs[0].name : `${orgs.length} orgs`;

  return (
    <>
      <NavBar />
      <main className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-8 lg:py-12 space-y-8">
        <header className="space-y-1.5 animate-fade-in-up">
          <div className="h-eyebrow text-brand-700">Organization · Home</div>
          <h1 className="font-heading text-[32px] lg:text-[40px] font-extrabold text-ink leading-tight">
            Hey {firstName}.
          </h1>
          <p className="text-[14px] text-ink-muted max-w-xl">
            Engagement + ROI across <strong className="font-bold text-ink">{orgLabel}</strong>'s cohorts. The shape of how AI is paying off for your team.
          </p>
        </header>

        {/* KPI tiles */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in-up">
          <KpiTile
            icon={Zap}
            color="brand"
            label="Hours saved"
            value={formatMinutes(totalMinutesSaved)}
            sub="cumulative across participants"
          />
          <KpiTile
            icon={NotebookPen}
            color="emerald"
            label="Active journalers"
            value={`${activeJournalers}/${participants.length}`}
            sub="participants logging wins"
          />
          <KpiTile
            icon={GraduationCap}
            color="purple"
            label="Cohorts"
            value={cohorts.length}
            sub={`${orgs.length} org${orgs.length === 1 ? "" : "s"}`}
          />
          <KpiTile
            icon={AlertTriangle}
            color="amber"
            label="At risk"
            value={atRisk.length}
            sub="need a check-in"
          />
        </section>

        {/* Our cohorts */}
        <section className="space-y-3 animate-fade-in-up">
          <h2 className="font-heading text-[18px] font-extrabold text-ink inline-flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-700" strokeWidth={2.25} />
            Our cohorts · {cohorts.length}
          </h2>
          {cohorts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-soft p-6 text-center text-[13px] text-ink-muted">
              No cohorts in your org yet. Reach out to BRAI staff to spin
              one up.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {cohorts.map((c) => (
                <CohortCard key={c.slug} cohort={c} participants={participants} />
              ))}
            </div>
          )}
        </section>

        {/* At-risk strip + Leaders' activity */}
        <section className="grid md:grid-cols-2 gap-4 animate-fade-in-up">
          <AtRiskPanel atRisk={atRisk} cohorts={cohorts} />
          <LeaderActivityPanel items={recentLeaderActivity} cohorts={cohorts} />
        </section>
      </main>
    </>
  );
}

// ---------------------------------------------------------------------------
// Tiles + panels.
// ---------------------------------------------------------------------------
function KpiTile({ icon: Icon, color, label, value, sub }) {
  const palette = {
    brand: { bg: "bg-brand-50", text: "text-brand-700" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700" },
    purple: { bg: "bg-purple-50", text: "text-purple-700" },
    amber: { bg: "bg-amber-50", text: "text-amber-700" },
  }[color];
  return (
    <div className="rounded-2xl bg-surface-card border border-soft p-5">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg ${palette.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${palette.text}`} strokeWidth={2.5} />
        </div>
        <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
          {label}
        </div>
      </div>
      <div className="font-heading text-[26px] font-extrabold text-ink mt-2 leading-none">
        {value}
      </div>
      {sub && <div className="text-[11.5px] text-ink-muted mt-1">{sub}</div>}
    </div>
  );
}

function CohortCard({ cohort, participants }) {
  const totalSessions = getSessionsCountForCohort(cohort) || cohort.sessions?.length || 8;
  const completedSessions = cohort.sessions?.filter((s) => s.completed).length || 0;
  const pct = Math.round((completedSessions / totalSessions) * 100);
  const cohortParticipants = participants.filter((p) => p.cohortSlug === cohort.slug);
  const minutes = cohortParticipants.reduce((sum, p) =>
    sum + (p.journalEntries || []).reduce((s, e) => s + timeSavedFor(e), 0), 0,
  );
  return (
    <Link
      to={`/admin/cohorts/${cohort.slug}`}
      className="rounded-2xl bg-surface-card border border-soft p-4 hover:border-ink/20 hover:shadow-lift transition-all space-y-3 group"
    >
      <div>
        <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
          {cohort.programCode}
        </div>
        <h3 className="font-heading text-[15px] font-extrabold text-ink leading-tight mt-0.5 truncate">
          {cohort.name}
        </h3>
        {cohort.facilitator?.name && (
          <div className="text-[11.5px] text-ink-muted mt-0.5 truncate">
            with {cohort.facilitator.name}
          </div>
        )}
      </div>
      <div>
        <div className="h-1.5 rounded-full bg-ink/10 overflow-hidden">
          <div className="h-full bg-brand-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between text-[11.5px] text-ink-muted mt-1.5">
          <span>{completedSessions}/{totalSessions} · {pct}%</span>
          <span className="inline-flex items-center gap-1">
            <Zap className="w-3 h-3" strokeWidth={2.5} />
            {formatMinutes(minutes)} saved
          </span>
        </div>
      </div>
    </Link>
  );
}

function AtRiskPanel({ atRisk, cohorts }) {
  const cohortBySlug = Object.fromEntries(cohorts.map((c) => [c.slug, c]));
  return (
    <div className="rounded-2xl bg-surface-card border border-soft p-5">
      <h2 className="font-heading text-[14px] font-extrabold text-ink inline-flex items-center gap-1.5 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-700" strokeWidth={2.25} />
        At risk · {atRisk.length}
      </h2>
      {atRisk.length === 0 ? (
        <div className="text-[12.5px] text-emerald-700 font-heading font-semibold inline-flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} />
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
                <span className="text-[11px] text-ink-muted">
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

function LeaderActivityPanel({ items, cohorts }) {
  const cohortBySlug = Object.fromEntries(cohorts.map((c) => [c.slug, c]));
  return (
    <div className="rounded-2xl bg-surface-card border border-soft p-5">
      <h2 className="font-heading text-[14px] font-extrabold text-ink inline-flex items-center gap-1.5 mb-3">
        <Crown className="w-4 h-4 text-amber-600" strokeWidth={2.25} />
        Recent cohort-leader activity
      </h2>
      {items.length === 0 ? (
        <div className="text-[12.5px] text-ink-muted">
          No recent activity from cohort leaders.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(({ participant, entry }, i) => (
            <li key={`${participant.id}-${entry.date}-${i}`}>
              <div className="rounded-xl border border-soft px-3 py-2.5">
                <div className="font-heading font-bold text-[12.5px] text-ink truncate">
                  {entry.title}
                </div>
                <div className="text-[11.5px] text-ink-muted mt-0.5 inline-flex items-center gap-1.5">
                  {participant.name}
                  <span>·</span>
                  <span>{cohortBySlug[participant.cohortSlug]?.organization?.shortName || ""}</span>
                  <span>·</span>
                  <span>{formatMinutes(timeSavedFor(entry))} saved</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// At-risk heuristic.
// ---------------------------------------------------------------------------
function isAtRisk(p) {
  if ((p.lastJournalDaysAgo || 0) > 14) return true;
  const stats = getParticipantHomeworkStats(p);
  const completed = p.progress?.length || 0;
  if (completed - stats.submitted >= 2) return true;
  return false;
}
