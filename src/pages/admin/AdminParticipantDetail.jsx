import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Mail, Building2, BookCheck, Check, Clock, GraduationCap,
  ExternalLink, NotebookPen, Sparkles, Lightbulb, Target,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getAccessibleCohortSlugs } from "../../lib/adminRoles";
import { DEMO_COHORTS } from "../../lib/demoData";
import { MOCK_SESSIONS, BELT_COLORS } from "../../lib/mockCohort";
import {
  getParticipantById,
  getSubmissionsForParticipant,
  getJournalEntriesForParticipant,
  totalTimeSaved,
  timeSavedFor,
  formatMinutes,
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
  const journalEntries = getJournalEntriesForParticipant(id);
  const submittedCount = submissions.length;
  const reviewedCount = submissions.filter((s) => s.reviewedAt).length;
  const completedCount = p.progress?.length || 0;
  const minutesSaved = totalTimeSaved(journalEntries);
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

      {/* Why they're here — onboarding payload from /welcome wizard.
          Highest-leverage 1:1 prep material; surfaces the participant's own
          words about goals + motivation. */}
      {(p.whyAi || p.mainGoal) && (
        <section className="rounded-2xl bg-gradient-to-br from-brand-50/60 to-surface-card border border-brand-100 p-5">
          <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-brand-700 mb-3">
            Why they're here
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {p.whyAi && (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                  <Lightbulb className="w-4.5 h-4.5" strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-heading font-bold uppercase tracking-wider text-brand-700/80 mb-1">
                    Their "why"
                  </div>
                  <p className="text-[13.5px] text-ink leading-relaxed">{p.whyAi}</p>
                </div>
              </div>
            )}
            {p.mainGoal && (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center shrink-0">
                  <Target className="w-4.5 h-4.5" strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-heading font-bold uppercase tracking-wider text-brand-700/80 mb-1">
                    Main goal
                  </div>
                  <p className="text-[13.5px] text-ink leading-relaxed">{p.mainGoal}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SmallKpi label="Sessions complete" value={`${completedCount}/${MOCK_SESSIONS.length}`} />
        <SmallKpi label="Homework submitted" value={submittedCount} sub={`${reviewedCount} reviewed`} />
        <SmallKpi label="Journal entries" value={journalEntries.length} accent="emerald" />
        <SmallKpi label="Hours saved" value={Math.round(minutesSaved / 60)} accent="emerald" sub={formatMinutes(minutesSaved)} />
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

      {/* AI Journal entries */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-[16px] font-extrabold text-ink inline-flex items-center gap-2">
            <NotebookPen className="w-4 h-4 text-emerald-700" strokeWidth={2.25} />
            AI Journal entries
          </h2>
          {journalEntries.length > 0 && (
            <span className="text-[12px] font-heading font-semibold text-emerald-700">
              {formatMinutes(minutesSaved)} saved across {journalEntries.length} {journalEntries.length === 1 ? "entry" : "entries"}
            </span>
          )}
        </div>
        {journalEntries.length === 0 ? (
          <div className="rounded-2xl bg-surface-card border border-soft p-6 text-center text-[13px] text-ink-muted">
            No journal entries logged yet.
          </div>
        ) : (
          <div className="space-y-3">
            {journalEntries.map((e) => {
              const saved = timeSavedFor(e);
              return (
                <article
                  key={e.id}
                  className="rounded-2xl bg-surface-card border border-soft p-5"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-[11px] text-ink-muted font-heading">
                        {dateLabel(e.date)}
                      </div>
                      <h3 className="font-heading font-bold text-ink text-[14.5px] leading-snug mt-0.5">
                        {e.title}
                      </h3>
                    </div>
                    {saved > 0 && (
                      <div className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-heading font-bold">
                        <Sparkles className="w-3 h-3" strokeWidth={3} />
                        {formatMinutes(saved)} saved
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-[13.5px] text-ink leading-relaxed">{e.description}</p>
                  {(e.timeBeforeAI > 0 || e.timeWithAI > 0) && (
                    <div className="mt-3 flex items-center gap-4 text-[11.5px] text-ink-muted font-heading">
                      <span>
                        <span className="text-ink-subtle">Before AI:</span>{" "}
                        <span className="font-semibold text-ink">{formatMinutes(e.timeBeforeAI)}</span>
                      </span>
                      <span>
                        <span className="text-ink-subtle">With AI:</span>{" "}
                        <span className="font-semibold text-ink">{formatMinutes(e.timeWithAI)}</span>
                      </span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
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

function SmallKpi({ label, value, accent, sub }) {
  const isEmerald = accent === "emerald";
  return (
    <div className={
      "rounded-2xl border p-4 " +
      (isEmerald ? "bg-emerald-50/40 border-emerald-100" : "bg-surface-card border-soft")
    }>
      <div className={
        "text-[10.5px] font-heading font-bold uppercase tracking-wider " +
        (isEmerald ? "text-emerald-700/80" : "text-ink-muted")
      }>
        {label}
      </div>
      <div className={
        "mt-1.5 font-heading font-extrabold text-[24px] tracking-tight " +
        (isEmerald ? "text-emerald-900" : "text-ink")
      }>
        {value}
      </div>
      {sub && (
        <div className={
          "text-[11px] mt-1 " +
          (isEmerald ? "text-emerald-700/80" : "text-ink-muted")
        }>
          {sub}
        </div>
      )}
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

function dateLabel(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
