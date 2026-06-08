import { Link } from "react-router-dom";
import {
  GraduationCap, ArrowRight, Users, Building2, CheckCircle2,
  Calendar, Sparkles, Plus,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useScopeFilters } from "../../lib/useScopeFilters";
import { canCreateCohorts } from "../../lib/adminRoles";
import { MOCK_SESSIONS, BELT_COLORS } from "../../lib/mockCohort";
import { getParticipantsForCohort } from "../../lib/adminMockData";
import { getAllCohortsForAdmin } from "../../lib/cohortAdmin";
import PipelineView, { stageForDelivered } from "../../components/admin/PipelineView";
import ScopeFilterBar from "../../components/admin/ScopeFilterBar";

// ---------------------------------------------------------------------------
// /admin/cohorts — full list of cohorts the user can access.
//
// Each row now surfaces: organization, last delivered session, next live
// session, lifecycle status (Pre-launch / In progress / Wrapping up / Completed).
//
// Above the list, a Pipeline view groups cohorts by status so admins can scan
// "where is every cohort right now?" at a glance.
// ---------------------------------------------------------------------------

// STAGES + stageForDelivered now live in components/admin/PipelineView.jsx so
// both the dashboard and the cohorts page render the same stage taxonomy.

// Last delivered = latest session with date <= today.
// Next session  = earliest session with date >  today.
function getDeliveryInfo() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayMs = now.getTime();
  let last = null;
  let next = null;
  for (const s of MOCK_SESSIONS) {
    const ms = new Date(s.date).getTime();
    if (ms <= todayMs) {
      if (!last || ms > new Date(last.date).getTime()) last = s;
    } else {
      if (!next || ms < new Date(next.date).getTime()) next = s;
    }
  }
  return { last, next, delivered: last ? last.order : 0 };
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function AdminCohorts() {
  const { user } = useAuth();
  // Merge user-created cohorts (from localStorage) with the base list so newly
  // created cohorts appear here without a refresh.
  const allCohorts = getAllCohortsForAdmin();
  const scope = useScopeFilters(user, allCohorts);
  const { cohorts, effectiveCohorts, orgs, facilitators } = scope;
  const delivery = getDeliveryInfo();

  // Compute the row data once so the pipeline + list share the same shape.
  const rows = effectiveCohorts.map((c) => {
    const roster = getParticipantsForCohort(c.slug);
    const avgProgress =
      roster.length === 0
        ? 0
        : Math.round(
            roster.reduce((sum, p) => sum + (p.progress?.length || 0), 0) /
              roster.length /
              MOCK_SESSIONS.length *
              100,
          );
    return {
      cohort: c,
      participants: roster.length,
      avgProgress,
      delivered: delivery.delivered,
      last: delivery.last,
      next: delivery.next,
      stage: stageForDelivered(delivery.delivered),
    };
  });

  // STAGES is needed locally for the status pill on each row.
  const stageMeta = {
    "pre-launch":  { label: "Pre-launch",  accent: "bg-ink/5 text-ink-muted" },
    "in-progress": { label: "In progress", accent: "bg-brand-100 text-brand-700" },
    "wrapping-up": { label: "Wrapping up", accent: "bg-amber-100 text-amber-700" },
    "completed":   { label: "Completed",   accent: "bg-emerald-100 text-emerald-700" },
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <header className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
          <GraduationCap className="w-5 h-5" strokeWidth={2} />
        </div>
        <div className="flex-1">
          <h1 className="font-heading text-[24px] lg:text-[28px] font-extrabold text-ink leading-tight">
            Cohorts
          </h1>
          <p className="text-[13px] text-ink-muted">
            {effectiveCohorts.length === cohorts.length
              ? `${cohorts.length} ${cohorts.length === 1 ? "cohort" : "cohorts"} in your scope.`
              : `${effectiveCohorts.length} of ${cohorts.length} cohorts shown.`}
          </p>
        </div>
        {canCreateCohorts(user) && (
          <Link
            to="/admin/cohorts/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600 text-white text-[12.5px] font-heading font-semibold hover:bg-brand-700 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            New cohort
          </Link>
        )}
      </header>

      {/* Scope filter — Org + Facilitator (cohort chip hidden on the cohorts list). */}
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
        includeCohort={false}
      />

      {/* Pipeline view — cohorts grouped by lifecycle stage. Shared component
          so the dashboard renders identical cards. */}
      {rows.length > 0 && (
        <section>
          <h2 className="font-heading text-[14px] font-extrabold text-ink mb-3">
            Pipeline
          </h2>
          <PipelineView rows={rows} />
        </section>
      )}

      {/* Full list */}
      <section>
        <h2 className="font-heading text-[14px] font-extrabold text-ink mb-3">
          All cohorts
        </h2>
        <div className="rounded-2xl bg-surface-card border border-soft overflow-hidden">
          {rows.map(({ cohort: c, participants, avgProgress, delivered, last, next, stage }) => {
            const stageCfg = stageMeta[stage];
            return (
              <Link
                key={c.slug}
                to={`/admin/cohorts/${c.slug}`}
                className="group block px-5 py-4 hover:bg-surface-soft transition-colors border-b border-soft last:border-b-0"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Top line — org + stage */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <div className="inline-flex items-center gap-1.5 text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
                        <Building2 className="w-3 h-3" strokeWidth={2.5} />
                        {c.organization?.name || "Cohort"}
                      </div>
                      {stageCfg && (
                        <span className={
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-heading font-bold uppercase tracking-wider " +
                          stageCfg.accent
                        }>
                          {stage === "completed" && <CheckCircle2 className="w-3 h-3" strokeWidth={2.5} />}
                          {stageCfg.label}
                        </span>
                      )}
                    </div>
                    <div className="font-heading text-[15px] font-bold text-ink group-hover:text-brand-700 truncate">
                      {c.name}
                    </div>
                    <div className="text-[11.5px] text-ink-muted truncate">
                      {c.methodName} · {c.programCode}
                    </div>

                    {/* Sessions row */}
                    <div className="mt-3 flex items-center gap-5 flex-wrap text-[11.5px] font-heading">
                      <SessionInfo
                        kind="last"
                        session={last}
                        belt={last ? BELT_COLORS[last.belt] : null}
                      />
                      <SessionInfo
                        kind="next"
                        session={next}
                        belt={next ? BELT_COLORS[next.belt] : null}
                      />
                    </div>
                  </div>

                  {/* Right side — stats */}
                  <div className="hidden lg:flex items-center gap-6 shrink-0">
                    <Mini label="Participants" value={participants} icon={Users} />
                    <Mini label="Avg progress" value={`${avgProgress}%`} />
                    <Mini label="Delivered" value={`${delivered}/${MOCK_SESSIONS.length}`} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-ink-subtle shrink-0 group-hover:text-brand-600 transition-colors mt-1" strokeWidth={2.5} />
                </div>
              </Link>
            );
          })}
          {rows.length === 0 && (
            <div className="p-8 text-center text-[14px] text-ink-muted">
              No cohorts in your scope yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function SessionInfo({ kind, session, belt }) {
  if (!session) {
    return (
      <span className="inline-flex items-center gap-1.5 text-ink-subtle">
        <Calendar className="w-3 h-3" strokeWidth={2.5} />
        {kind === "last" ? "No sessions delivered yet" : "No upcoming sessions"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      {kind === "last" ? (
        <CheckCircle2 className="w-3 h-3 text-emerald-600" strokeWidth={2.5} />
      ) : (
        <Sparkles className="w-3 h-3 text-brand-600" strokeWidth={2.5} />
      )}
      <span className="text-ink-muted">{kind === "last" ? "Last delivered:" : "Next live:"}</span>
      <span
        style={{
          background: belt?.gradient,
          color: belt?.contrast,
          border: belt?.needsBorder ? "1px solid #D1D5DB" : "none",
        }}
        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-heading font-bold tracking-wider"
      >
        {session.belt}
      </span>
      <span className="font-heading font-semibold text-ink">
        Session {session.order} · {formatDate(session.date)}
      </span>
    </span>
  );
}

function Mini({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-3.5 h-3.5 text-ink-muted" strokeWidth={2.25} />}
      <div className="flex flex-col items-start leading-tight">
        <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
          {label}
        </span>
        <span className="text-[13px] font-heading font-bold text-ink mt-0.5">
          {value}
        </span>
      </div>
    </div>
  );
}
