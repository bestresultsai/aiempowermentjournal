import { Link } from "react-router-dom";
import {
  GraduationCap, ArrowRight, Users, Building2, CheckCircle2,
  Calendar, Sparkles,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getAccessibleCohorts } from "../../lib/adminRoles";
import { DEMO_COHORTS } from "../../lib/demoData";
import { MOCK_SESSIONS, BELT_COLORS } from "../../lib/mockCohort";
import { getParticipantsForCohort } from "../../lib/adminMockData";

// ---------------------------------------------------------------------------
// /admin/cohorts — full list of cohorts the user can access.
//
// Each row now surfaces: organization, last delivered session, next live
// session, lifecycle status (Pre-launch / In progress / Wrapping up / Completed).
//
// Above the list, a Pipeline view groups cohorts by status so admins can scan
// "where is every cohort right now?" at a glance.
// ---------------------------------------------------------------------------

const STAGES = [
  { key: "pre-launch", label: "Pre-launch",  accent: "bg-ink/5 text-ink-muted" },
  { key: "in-progress", label: "In progress", accent: "bg-brand-100 text-brand-700" },
  { key: "wrapping-up", label: "Wrapping up", accent: "bg-amber-100 text-amber-700" },
  { key: "completed",  label: "Completed",   accent: "bg-emerald-100 text-emerald-700" },
];

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

function stageForCohort(deliveredCount) {
  if (deliveredCount === 0) return "pre-launch";
  if (deliveredCount >= MOCK_SESSIONS.length) return "completed";
  if (deliveredCount >= MOCK_SESSIONS.length - 1) return "wrapping-up";
  return "in-progress";
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function AdminCohorts() {
  const { user } = useAuth();
  const cohorts = getAccessibleCohorts(user, DEMO_COHORTS);
  const delivery = getDeliveryInfo();

  // Compute the row data once so the pipeline + list share the same shape.
  const rows = cohorts.map((c) => {
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
      stage: stageForCohort(delivery.delivered),
    };
  });

  return (
    <div className="space-y-8 animate-fade-in-up">
      <header className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
          <GraduationCap className="w-5 h-5" strokeWidth={2} />
        </div>
        <div>
          <h1 className="font-heading text-[24px] lg:text-[28px] font-extrabold text-ink leading-tight">
            Cohorts
          </h1>
          <p className="text-[13px] text-ink-muted">
            {cohorts.length} {cohorts.length === 1 ? "cohort" : "cohorts"} in your scope.
          </p>
        </div>
      </header>

      {/* Pipeline view — cohorts grouped by lifecycle stage */}
      {rows.length > 0 && <PipelineView rows={rows} />}

      {/* Full list */}
      <section>
        <h2 className="font-heading text-[14px] font-extrabold text-ink mb-3">
          All cohorts
        </h2>
        <div className="rounded-2xl bg-surface-card border border-soft overflow-hidden">
          {rows.map(({ cohort: c, participants, avgProgress, delivered, last, next, stage }) => {
            const stageCfg = STAGES.find((s) => s.key === stage);
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
// PipelineView — Kanban-style stages strip
// ---------------------------------------------------------------------------
function PipelineView({ rows }) {
  return (
    <section>
      <h2 className="font-heading text-[14px] font-extrabold text-ink mb-3">
        Pipeline
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAGES.map((stage) => {
          const stageRows = rows.filter((r) => r.stage === stage.key);
          return (
            <div
              key={stage.key}
              className="rounded-2xl bg-surface-card border border-soft p-4 min-h-[120px]"
            >
              <div className="flex items-center justify-between mb-3">
                <span className={
                  "inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-heading font-bold uppercase tracking-wider " +
                  stage.accent
                }>
                  {stage.label}
                </span>
                <span className="text-[11px] font-heading font-bold text-ink-muted">
                  {stageRows.length}
                </span>
              </div>
              <div className="space-y-2">
                {stageRows.length === 0 ? (
                  <div className="text-[11.5px] text-ink-subtle">—</div>
                ) : (
                  stageRows.map(({ cohort: c, delivered }) => (
                    <Link
                      key={c.slug}
                      to={`/admin/cohorts/${c.slug}`}
                      className="block rounded-xl bg-surface-soft hover:bg-white border border-transparent hover:border-brand-500 p-3 transition-all duration-200"
                    >
                      <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle truncate">
                        {c.organization?.shortName || ""}
                      </div>
                      <div className="font-heading text-[12.5px] font-bold text-ink truncate mt-0.5">
                        {c.name}
                      </div>
                      {/* Belt-progress pip strip */}
                      <div className="flex items-center gap-0.5 mt-2">
                        {MOCK_SESSIONS.map((s) => {
                          const done = s.order <= delivered;
                          const belt = BELT_COLORS[s.belt];
                          return (
                            <div
                              key={s.order}
                              title={`${s.belt} — Session ${s.order}`}
                              style={{
                                background: done ? belt.gradient : "#E5E7EB",
                                border: done && belt.needsBorder ? "1px solid #D1D5DB" : "none",
                              }}
                              className="h-2 flex-1 rounded-sm"
                            />
                          );
                        })}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
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
