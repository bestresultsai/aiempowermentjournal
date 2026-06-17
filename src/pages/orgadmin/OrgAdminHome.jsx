import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Building2, GraduationCap, AlertTriangle, Users, Zap, Sparkles,
  ChevronRight, NotebookPen, Crown, ArrowRight,
} from "lucide-react";
import NavBar from "../../components/NavBar";
import Select from "../../components/Select";
import GamificationStrip from "../../components/cohort/GamificationStrip";
import CohortLeaderboard from "../../components/cohort/CohortLeaderboard";
import CohortMiniStrip from "../../components/cohort/CohortMiniStrip";
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
import { primaryEffectiveRole, useViewAs } from "../../lib/viewAs";

// Persists the Org Admin's preferred org filter across visits so multi-org
// admins don't have to re-pick on every page load.
const ORG_FILTER_KEY = "brai_org_admin_org_filter";

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
  // Honor view-as so elevated users previewing-as-org don't get ping-ponged
  // back to /home (which would then send them right back here).
  const { mode: viewAsMode } = useViewAs(user);

  const allCohorts = useMemo(() => getAllCohortsForAdmin(), [version]);
  const allAccessibleCohorts = useMemo(
    () => getAccessibleCohorts(user, allCohorts),
    [user, allCohorts],
  );
  const orgs = useMemo(() => getAccessibleOrgs(user, allCohorts), [user, allCohorts]);

  // Org switcher — multi-org admins can pin their view to one org at a time.
  // Stored in localStorage so a refresh keeps the choice. If the persisted
  // value points to an org the user no longer has access to (e.g. they were
  // re-assigned), we silently clear it on hydrate.
  const [orgFilter, setOrgFilter] = useState(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(ORG_FILTER_KEY);
      if (saved && orgs.some((o) => o.id === saved)) {
        setOrgFilter(saved);
      } else if (saved) {
        // Stale — clean up.
        window.localStorage.removeItem(ORG_FILTER_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [orgs]);
  function changeOrgFilter(next) {
    setOrgFilter(next);
    try {
      if (next) window.localStorage.setItem(ORG_FILTER_KEY, next);
      else window.localStorage.removeItem(ORG_FILTER_KEY);
    } catch {
      /* ignore */
    }
  }

  // Cohorts in the active scope. If no org filter, use everything they can
  // see; otherwise narrow to the picked org. Every downstream stat reads
  // from `cohorts` so the whole page reflects the filter.
  const cohorts = useMemo(() => {
    if (!orgFilter) return allAccessibleCohorts;
    return allAccessibleCohorts.filter(
      (c) => c.organization?.id === orgFilter,
    );
  }, [allAccessibleCohorts, orgFilter]);
  const cohortSlugs = useMemo(() => cohorts.map((c) => c.slug), [cohorts]);
  const activeOrg = orgFilter
    ? orgs.find((o) => o.id === orgFilter) || null
    : null;

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
  // Flattened journal entries across the active scope. Stamped with
  // participantEmail + participantName so GamificationStrip + leaderboard
  // can group + rank participants. Cohorts may span multiple programs, so
  // the strip uses the platform default badge ladder rather than any one
  // program's.
  const orgCohortEntries = useMemo(() => {
    const out = [];
    for (const p of participants) {
      for (const e of p.journalEntries || []) {
        out.push({
          ...e,
          participantId: p.id,
          participantName: p.name,
          participantEmail: p.email,
        });
      }
    }
    return out;
  }, [participants]);

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
  // Reachable by users with the `org` capability (or above), or anyone in
  // view-as-org preview mode. Without the view-as escape hatch, an admin
  // previewing-as-org pings between this page and /home forever.
  const allowed =
    role === "org" ||
    !!user?.capabilities?.includes?.("org") ||
    !!user?.capabilities?.includes?.("admin") ||
    !!user?.capabilities?.includes?.("super") ||
    viewAsMode === "org";
  if (!allowed) {
    return <Navigate to="/home" replace />;
  }

  const firstName = (user?.name || "").trim().split(/\s+/)[0] || "there";
  // The header subhead reflects what the user is actually looking at right
  // now: a single org when filtered, "all of your orgs" when not.
  const orgLabel = activeOrg
    ? activeOrg.name
    : orgs.length === 1
    ? orgs[0].name
    : `your ${orgs.length} orgs`;

  return (
    <>
      <NavBar />
      <main className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-8 lg:py-12 space-y-8">
        <header className="space-y-3 animate-fade-in-up">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="h-eyebrow text-brand-700">Organization · Home</div>
              <h1 className="font-heading text-[32px] lg:text-[40px] font-extrabold text-ink leading-tight">
                Hey {firstName}.
              </h1>
              <p className="text-[14px] text-ink-muted max-w-xl mt-1.5">
                Engagement + ROI across <strong className="font-bold text-ink">{orgLabel}</strong>'s cohorts. The shape of how AI is paying off for your team.
              </p>
            </div>
            {/* Multi-org switcher — only renders when the user can see more
                than one org. Stays in the top-right of the header so it
                reads as a global scope control, like a cohort switcher. */}
            {orgs.length > 1 && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
                  Viewing
                </span>
                <Select
                  value={orgFilter}
                  onChange={(v) => changeOrgFilter(v)}
                  icon={Building2}
                  ariaLabel="Filter by organization"
                  options={[
                    { value: null, label: `All orgs (${orgs.length})` },
                    ...orgs.map((o) => ({
                      value: o.id,
                      label: o.shortName || o.name,
                    })),
                  ]}
                />
              </div>
            )}
          </div>
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

        {/* Gamification pulse — engagement signal across the org's
            cohorts. Mirrors what each participant sees on /journal, so the
            org admin reads the same story leadership decks tell. */}
        <section className="animate-fade-in-up">
          <GamificationStrip entries={orgCohortEntries} />
        </section>

        {/* Top performers across the org — three columns of top-3.
            Doubles as a "who to spotlight in the all-hands" prompt. */}
        <section className="animate-fade-in-up">
          <CohortLeaderboard
            entries={orgCohortEntries}
            title={activeOrg ? `${activeOrg.name} — top performers` : "Top performers"}
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
  // Per-cohort entries (with email) for the gamification mini-strip below.
  const cohortEntries = cohortParticipants.flatMap((p) =>
    (p.journalEntries || []).map((e) => ({
      ...e,
      participantId: p.id,
      participantName: p.name,
      participantEmail: p.email,
    })),
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
      <CohortMiniStrip entries={cohortEntries} />
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
