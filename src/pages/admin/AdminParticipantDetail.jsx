import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Mail, Briefcase, Building2, BookCheck, Check,
  Clock, GraduationCap, ExternalLink,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getAccessibleCohortSlugs } from "../../lib/adminRoles";
import { DEMO_COHORTS } from "../../lib/demoData";
import { MOCK_SESSIONS, BELT_COLORS } from "../../lib/mockCohort";
import {
  getParticipantById,
  getSubmissionsForParticipant,
} from "../../lib/adminMockData";

// /admin/users/:id — drill-in on a single participant.
// Read-only this round.
export default function AdminParticipantDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const p = getParticipantById(id);

  // Scope check — the participant must belong to a cohort the admin can see.
  const allowedSlugs = getAccessibleCohortSlugs(user, DEMO_COHORTS);
  if (!p || !allowedSlugs.includes(p.cohortSlug)) {
    return <Navigate to="/admin" replace />;
  }

  const cohort = DEMO_COHORTS.find((c) => c.slug === p.cohortSlug);
  const submissions = getSubmissionsForParticipant(id);
  const submittedCount = submissions.length;
  const reviewedCount = submissions.filter((s) => s.reviewedAt).length;
  const completedCount = p.progress?.length || 0;
  const initials = p.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="space-y-7 animate-fade-in-up">
      {/* Back */}
      <Link
        to={`/admin/cohorts/${p.cohortSlug}`}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-heading font-semibold text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
        Back to {cohort?.name || "cohort"}
      </Link>

      {/* Profile header */}
      <header className="rounded-2xl bg-surface-card border border-soft p-6 flex items-start gap-5 flex-wrap">
        <div className="w-20 h-20 rounded-full bg-brand-700 text-white flex items-center justify-center text-[24px] font-heading font-extrabold shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="font-heading text-[24px] lg:text-[28px] font-extrabold text-ink leading-tight">
            {p.name}
          </h1>
          <div className="text-[13px] text-ink-muted mt-0.5">{p.title}</div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" strokeWidth={2.25} />
              {p.email}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" strokeWidth={2.25} />
              {p.organization}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" strokeWidth={2.25} />
              {cohort?.name || p.cohortSlug}
            </span>
          </div>
        </div>
      </header>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <SmallKpi label="Sessions complete" value={`${completedCount}/${MOCK_SESSIONS.length}`} />
        <SmallKpi label="Homework submitted" value={submittedCount} />
        <SmallKpi label="Reviewed" value={`${reviewedCount}/${submittedCount || 0}`} />
      </div>

      {/* Belt progress */}
      <section>
        <h2 className="font-heading text-[16px] font-extrabold text-ink mb-3">Belt progress</h2>
        <div className="rounded-2xl bg-surface-card border border-soft p-5">
          <div className="flex items-center gap-2 flex-wrap">
            {MOCK_SESSIONS.map((s) => {
              const done = p.progress?.includes(s.order);
              const belt = BELT_COLORS[s.belt];
              return (
                <div
                  key={s.order}
                  title={s.title}
                  style={{
                    background: done ? belt.gradient : "#F3F4F6",
                    color: done ? belt.contrast : "#9CA3AF",
                    border: done && belt.needsBorder ? "1px solid #D1D5DB" : "none",
                  }}
                  className="h-12 flex-1 min-w-[90px] rounded-xl flex flex-col items-center justify-center font-heading font-bold transition-all"
                >
                  <span className="text-[10px] uppercase tracking-wider opacity-80">{s.belt}</span>
                  <span className="text-[15px] mt-0.5">
                    {done ? <Check className="w-4 h-4 inline" strokeWidth={3} /> : s.order}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Homework submissions */}
      <section>
        <h2 className="font-heading text-[16px] font-extrabold text-ink mb-3">
          Homework submissions
        </h2>
        {submissions.length === 0 ? (
          <div className="rounded-2xl bg-surface-card border border-soft p-6 text-center text-[13px] text-ink-muted">
            No homework submitted yet.
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((s) => {
              const session = MOCK_SESSIONS.find((sess) => sess.order === s.order);
              const belt = session ? BELT_COLORS[session.belt] : null;
              const reviewed = !!s.reviewedAt;
              return (
                <article
                  key={s.order}
                  className="rounded-2xl bg-surface-card border border-soft p-5"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      {belt && (
                        <div
                          style={{
                            background: belt.gradient,
                            color: belt.contrast,
                            border: belt.needsBorder ? "1px solid #D1D5DB" : "none",
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-heading font-bold"
                        >
                          Session {s.order} · {session.belt}
                        </div>
                      )}
                      <span
                        className={
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-heading font-semibold " +
                          (reviewed
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700")
                        }
                      >
                        {reviewed ? <Check className="w-3 h-3" strokeWidth={3} /> : <Clock className="w-3 h-3" strokeWidth={3} />}
                        {reviewed ? "Reviewed" : "Pending review"}
                      </span>
                    </div>
                    <div className="text-[11.5px] text-ink-muted">
                      Submitted {timeAgo(s.submittedAt)}
                    </div>
                  </div>
                  <p className="mt-3 text-[13.5px] text-ink leading-relaxed">{s.response}</p>
                  {s.link && (
                    <a
                      href={s.link}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-3 inline-flex items-center gap-1 text-[12px] font-heading font-semibold text-brand-600 hover:text-brand-700"
                    >
                      <ExternalLink className="w-3 h-3" strokeWidth={2.5} />
                      Open submission
                    </a>
                  )}
                  {s.feedback && (
                    <div className="mt-4 p-3 rounded-xl bg-emerald-50/40 border border-emerald-100">
                      <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-emerald-700 mb-1">
                        Facilitator feedback
                      </div>
                      <p className="text-[13px] text-ink leading-relaxed">{s.feedback}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function SmallKpi({ label, value }) {
  return (
    <div className="rounded-2xl bg-surface-card border border-soft p-4">
      <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
        {label}
      </div>
      <div className="mt-1.5 font-heading font-extrabold text-ink text-[24px] tracking-tight">
        {value}
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
