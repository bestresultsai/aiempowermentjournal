import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  MessageSquare, Star, Users, Calendar, ChevronDown, ChevronRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useScopeFilters } from "../../lib/useScopeFilters";
import { getAllCohortsForAdmin, getSessionsForCohort, useCohortVersion } from "../../lib/cohortAdmin";
import {
  getFeedbacksBySessionInScope,
  useFeedbackVersion,
} from "../../lib/feedbacks";
import ScopeFilterBar from "../../components/admin/ScopeFilterBar";
import { useParticipantVersion } from "../../lib/adminMockData";

// ---------------------------------------------------------------------------
// /admin/feedback — facilitator + admin view of session feedback.
//
// Layout:
//   1. Header + KPI tiles (total responses, avg rating, NPS-style breakdown)
//   2. Filter toolbar (universal scope chips)
//   3. Sessions list — one row per (cohort, sessionOrder), expandable to
//      show each comment.
//
// Read-only for now — admins don't reply to feedback inline, they take it
// into the next session. Editing happens on the participant side.
// ---------------------------------------------------------------------------

export default function AdminFeedback() {
  // Subscribe to activity + cohort mutations so this page re-renders
  // when hydrateActivityFromSupabase or cohort mirrors emit. Without
  // this the initial render captures the pre-hydrate empty snapshot
  // (0 journal entries, 0 homework, etc.) and never refreshes.
  useParticipantVersion();
  useCohortVersion();

  const { user } = useAuth();
  useFeedbackVersion(); // re-render on writes

  const scope = useScopeFilters(user, getAllCohortsForAdmin());
  const { cohorts, effectiveCohorts, effectiveSlugs: cohortSlugs, orgs, facilitators } = scope;

  const rows = useMemo(
    () => getFeedbacksBySessionInScope(cohortSlugs),
    [cohortSlugs],
  );

  const cohortBySlug = useMemo(
    () => Object.fromEntries(getAllCohortsForAdmin().map((c) => [c.slug, c])),
    [],
  );

  // Aggregate KPIs across every row in scope.
  const allComments = rows.flatMap((r) => r.comments);
  const totalCount = allComments.length;
  const avgRating = totalCount
    ? allComments.reduce(
        (s, f) => s + Math.max(1, Math.min(5, Math.round(Number(f.rating) || 0))),
        0,
      ) / totalCount
    : 0;
  const positives = allComments.filter((f) => Number(f.rating) >= 4).length;
  const detractors = allComments.filter((f) => Number(f.rating) <= 2).length;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <header className="flex items-start gap-3 flex-wrap">
        <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
          <MessageSquare className="w-5 h-5" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-eyebrow">Admin · Feedback</div>
          <h1 className="font-heading text-[28px] lg:text-[34px] font-extrabold tracking-tight text-ink leading-tight">
            Participant feedback
          </h1>
          <p className="text-[14px] text-ink-muted mt-1.5 max-w-2xl">
            {effectiveCohorts.length} of {cohorts.length}{" "}
            {cohorts.length === 1 ? "cohort" : "cohorts"}. Every star + every
            comment participants leave after a session lands here.
          </p>
        </div>
      </header>

      {/* Filter toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
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
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={MessageSquare}
          label="Responses"
          value={totalCount}
          accent="bg-amber-50 text-amber-700"
        />
        <KpiCard
          icon={Star}
          label="Avg rating"
          value={totalCount ? avgRating.toFixed(2) : "—"}
          sub={totalCount ? "out of 5" : null}
          accent="bg-brand-50 text-brand-700"
        />
        <KpiCard
          icon={Users}
          label="4★ or higher"
          value={positives}
          sub={totalCount ? `${Math.round((positives / totalCount) * 100)}% of all` : null}
          accent="bg-emerald-50 text-emerald-700"
        />
        <KpiCard
          icon={Users}
          label="2★ or lower"
          value={detractors}
          sub={totalCount ? `${Math.round((detractors / totalCount) * 100)}% of all` : null}
          accent={detractors > 0 ? "bg-rose-50 text-rose-700" : "bg-surface-soft text-ink-subtle"}
        />
      </div>

      {/* Session rows */}
      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="space-y-3">
          {rows.map((row) => (
            <SessionRow
              key={`${row.cohortSlug}-${row.sessionOrder}`}
              row={row}
              cohort={cohortBySlug[row.cohortSlug]}
            />
          ))}
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expandable session row.
// ---------------------------------------------------------------------------
function SessionRow({ row, cohort }) {
  const [open, setOpen] = useState(false);
  const sessions = cohort ? getSessionsForCohort(cohort) : [];
  const session = sessions.find((s) => Number(s.order) === Number(row.sessionOrder));
  const sessionLabel = session?.title || `Session ${row.sessionOrder}`;
  const orgLabel = cohort?.organization?.shortName || cohort?.organization?.name || "";

  return (
    <div className="rounded-2xl bg-surface-card border border-soft overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full grid grid-cols-12 gap-3 items-center px-4 py-3 hover:bg-surface-soft/60 transition-colors text-left"
      >
        <div className="col-span-5 min-w-0">
          <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
            {cohort?.name || row.cohortSlug}
            {orgLabel && ` · ${orgLabel}`}
          </div>
          <div className="font-heading text-[14px] font-bold text-ink truncate mt-0.5">
            S{row.sessionOrder} · {sessionLabel}
          </div>
        </div>
        <div className="col-span-2">
          <RatingDisplay value={row.avg} />
        </div>
        <div className="col-span-2">
          <div className="font-heading text-[14px] font-bold text-ink">
            {row.count}
          </div>
          <div className="text-[10.5px] text-ink-muted uppercase tracking-wider">
            response{row.count === 1 ? "" : "s"}
          </div>
        </div>
        <div className="col-span-3 text-right">
          <span className="inline-flex items-center gap-1 text-[12px] font-heading font-semibold text-brand-700">
            {open ? "Hide" : "View comments"}
            {open ? <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.5} /> : <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />}
          </span>
        </div>
      </button>

      {open && (
        <div className="border-t border-soft bg-surface-soft/30 p-4 space-y-2">
          {row.comments
            .slice()
            .sort((a, b) => b.rating - a.rating || new Date(b.submittedAt) - new Date(a.submittedAt))
            .map((f) => (
              <CommentRow key={f.id} feedback={f} />
            ))}
        </div>
      )}
    </div>
  );
}

function CommentRow({ feedback }) {
  return (
    <div className="rounded-xl bg-white border border-soft p-3.5">
      <div className="flex items-center gap-3 mb-1.5">
        <RatingDisplay value={feedback.rating} compact />
        <div className="flex-1 min-w-0">
          <Link
            to={`/admin/participants/${feedback.participantId || ""}`}
            className="font-heading text-[12.5px] font-bold text-ink hover:text-brand-700 truncate"
          >
            {feedback.participantName || feedback.participantEmail}
          </Link>
        </div>
        <div className="inline-flex items-center gap-1 text-[11px] text-ink-muted shrink-0">
          <Calendar className="w-3 h-3" strokeWidth={2.5} />
          {new Date(feedback.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </div>
      </div>
      {feedback.comment ? (
        <p className="text-[12.5px] text-ink-muted leading-relaxed">
          “{feedback.comment}”
        </p>
      ) : (
        <p className="text-[11.5px] text-ink-subtle italic">No comment.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small UI bits.
// ---------------------------------------------------------------------------
function RatingDisplay({ value, compact = false }) {
  const rounded = Math.max(0, Math.min(5, value));
  const stars = compact ? 5 : 5;
  return (
    <div className="inline-flex items-center gap-1">
      {Array.from({ length: stars }).map((_, i) => {
        const active = i < Math.round(rounded);
        const size = compact ? "w-3 h-3" : "w-3.5 h-3.5";
        return (
          <Star
            key={i}
            className={size + " " + (active ? "fill-amber-400 text-amber-500" : "text-ink-subtle")}
            strokeWidth={1.5}
          />
        );
      })}
      {!compact && value > 0 && (
        <span className="text-[11.5px] text-ink-muted font-heading font-semibold ml-1">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="rounded-2xl bg-surface-card border border-soft p-5">
      <div className="flex items-center gap-2 mb-2">
        <div className={"w-8 h-8 rounded-lg flex items-center justify-center " + accent}>
          <Icon className="w-4 h-4" strokeWidth={2.5} />
        </div>
        <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
          {label}
        </div>
      </div>
      <div className="font-heading text-[26px] font-extrabold text-ink leading-none">{value}</div>
      {sub && <div className="text-[11.5px] text-ink-muted mt-1">{sub}</div>}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-soft bg-surface-card p-10 text-center">
      <div className="inline-flex w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 items-center justify-center mb-3">
        <MessageSquare className="w-6 h-6" strokeWidth={2} />
      </div>
      <h2 className="font-heading text-[18px] font-extrabold text-ink mb-1">
        No feedback in scope yet.
      </h2>
      <p className="text-[13px] text-ink-muted max-w-md mx-auto">
        Once participants leave feedback on a session, it'll show up here grouped
        by cohort + session. Widen your filters above if you're expecting results.
      </p>
    </div>
  );
}
