import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight } from "lucide-react";
import { BELT_COLORS } from "../../lib/mockCohort";

// ---------------------------------------------------------------------------
// JOURNEY — Missing Homework reminder.
//
// Shown when at least one session whose live date has passed still has no
// homework submission. The card surfaces the OLDEST missing homework first
// (so participants chip away at the backlog in order).
//
// Trigger:  session.unlocked (date has arrived) AND !session.homeworkSubmitted
// CTA:      link to that session's Homework tab.
// ---------------------------------------------------------------------------

export default function MissingHomeworkCard({ cohort }) {
  if (!cohort?.sessions?.length) return null;

  const today = new Date();
  const missing = cohort.sessions.filter((s) => {
    if (!s.date || !s.homework?.prompt) return false;
    const sessionDate = new Date(s.date);
    return sessionDate < today && !s.homeworkSubmitted;
  });

  if (missing.length === 0) return null;

  // Show the oldest missing one as the primary CTA.
  const oldest = missing[0];
  const belt = oldest.belt && BELT_COLORS[oldest.belt] ? BELT_COLORS[oldest.belt] : null;
  const count = missing.length;
  const beltLabel = oldest.belt ? `${oldest.belt} Belt` : `Session ${oldest.order}`;

  return (
    <section
      className="mt-6 rounded-2xl border-2 border-amber-300/70 bg-gradient-to-br from-amber-50 to-white p-5 lg:p-6 animate-fade-in-up delay-200"
    >
      <div className="flex items-center gap-5 flex-wrap">
        {/* Left — accent block in the missing session's belt color */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-white shrink-0 relative overflow-hidden"
          style={{
            background: belt?.gradient || belt?.hex || "#F59E0B",
            color: belt?.contrast || "#FFFFFF",
            border: belt?.needsBorder ? "1px solid rgba(15,23,42,0.10)" : "none",
          }}
        >
          <AlertCircle className="w-6 h-6 relative z-10" strokeWidth={2} />
        </div>

        {/* Middle — message */}
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-heading font-semibold tracking-[0.18em] uppercase text-amber-800 mb-1">
            Missing Homework · AI Empowerment Journey
          </div>
          <h3 className="font-heading text-[18px] lg:text-[20px] font-extrabold tracking-tight text-ink leading-tight mb-1">
            {count === 1
              ? "1 homework submission is waiting on you."
              : `${count} homework submissions are waiting on you.`}
          </h3>
          <p className="text-[13.5px] text-ink-muted leading-relaxed">
            Start with{" "}
            <strong className="text-ink">{beltLabel} — {stripBeltPrefix(oldest.title)}</strong>.
            Each submission keeps your Journey on track.
          </p>
        </div>

        {/* Right — CTA */}
        <Link
          to={`/cohort/${cohort.slug}/session/${oldest.order}?tab=homework`}
          className="group inline-flex items-center gap-1.5 px-4 py-2.5 bg-ink text-white rounded-xl text-[13.5px] font-heading font-semibold hover:bg-brand-700 transition-colors duration-200 shrink-0"
        >
          Submit homework
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.5} />
        </Link>
      </div>
    </section>
  );
}

// Strip a leading "{Belt} — " prefix from a session title so it doesn't
// duplicate when we render it after the belt label.
function stripBeltPrefix(title) {
  if (!title) return "";
  return title.replace(/^[A-Z][a-z]+\s+—\s+/, "");
}
