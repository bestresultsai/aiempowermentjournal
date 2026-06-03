import { Link } from "react-router-dom";
import { BookCheck, ExternalLink, ArrowRight, ListChecks } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getAccessibleCohorts } from "../../lib/adminRoles";
import { DEMO_COHORTS } from "../../lib/demoData";
import { MOCK_SESSIONS, BELT_COLORS } from "../../lib/mockCohort";
import { getPendingHomework } from "../../lib/adminMockData";

// /admin/homework — queue of pending submissions across cohorts in scope.
//
// Read-only this round: the row shows the submission excerpt, link, and a
// Mark reviewed button (disabled here — feedback writes land in round 2).
export default function AdminHomeworkQueue() {
  const { user } = useAuth();
  const cohorts = getAccessibleCohorts(user, DEMO_COHORTS);
  const cohortSlugBySlug = Object.fromEntries(cohorts.map((c) => [c.slug, c]));
  const pending = getPendingHomework(cohorts.map((c) => c.slug));

  const sessionByOrder = Object.fromEntries(MOCK_SESSIONS.map((s) => [s.order, s]));

  return (
    <div className="space-y-6 animate-fade-in-up">
      <header className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
          <ListChecks className="w-5 h-5" strokeWidth={2} />
        </div>
        <div>
          <h1 className="font-heading text-[24px] lg:text-[28px] font-extrabold text-ink leading-tight">
            Homework queue
          </h1>
          <p className="text-[13px] text-ink-muted mt-0.5">
            {pending.length} {pending.length === 1 ? "submission" : "submissions"} awaiting review.
            Oldest first.
          </p>
        </div>
      </header>

      {pending.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {pending.map((row) => {
            const session = sessionByOrder[row.sessionOrder];
            const belt = session ? BELT_COLORS[session.belt] : null;
            const cohort = cohortSlugBySlug[row.cohortSlug];
            return (
              <article
                key={`${row.participantId}-${row.sessionOrder}`}
                className="rounded-2xl bg-surface-card border border-soft p-5 hover:shadow-card transition-shadow"
              >
                {/* Top row — participant + session belt chip */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-brand-700 text-white flex items-center justify-center text-[12px] font-heading font-bold shrink-0">
                      {row.participantName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/admin/users/${row.participantId}`}
                        className="font-heading font-bold text-ink text-[14.5px] hover:text-brand-700 transition-colors block truncate"
                      >
                        {row.participantName}
                      </Link>
                      <div className="text-[11.5px] text-ink-muted truncate">
                        {row.participantEmail} · {cohort?.organization?.shortName || ""}
                      </div>
                    </div>
                  </div>

                  {/* Belt-colored session chip */}
                  {session && (
                    <div
                      style={{
                        background: belt.gradient,
                        color: belt.contrast,
                        border: belt.needsBorder ? "1px solid #D1D5DB" : "none",
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-heading font-bold tracking-wide"
                    >
                      Session {row.sessionOrder} · {session.belt}
                    </div>
                  )}
                </div>

                {/* Submission excerpt */}
                <p className="mt-4 text-[13.5px] text-ink leading-relaxed">{row.response}</p>

                {/* Footer — link + submitted ago + actions */}
                <div className="mt-4 pt-4 border-t border-soft flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 text-[11.5px] text-ink-muted">
                    <span>Submitted {timeAgo(row.submittedAt)}</span>
                    {row.link && (
                      <a
                        href={row.link}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 font-heading font-semibold text-brand-600 hover:text-brand-700"
                      >
                        <ExternalLink className="w-3 h-3" strokeWidth={2.5} />
                        Open submission
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled
                      title="Feedback writes land in the next round"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink/5 text-ink-subtle text-[12px] font-heading font-semibold cursor-not-allowed"
                    >
                      <BookCheck className="w-3.5 h-3.5" strokeWidth={2.5} />
                      Mark reviewed
                    </button>
                    <Link
                      to={`/admin/users/${row.participantId}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-heading font-semibold text-ink hover:bg-surface-soft transition-colors"
                    >
                      Open participant
                      <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl bg-surface-card border border-soft p-10 text-center">
      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
        <BookCheck className="w-6 h-6" strokeWidth={2} />
      </div>
      <h2 className="font-heading text-[16px] font-extrabold text-ink">All caught up.</h2>
      <p className="text-[13px] text-ink-muted mt-1">No submissions waiting for review.</p>
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
