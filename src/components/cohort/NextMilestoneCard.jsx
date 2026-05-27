import { Lock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { BELT_COLORS } from "../../lib/mockCohort";

// ---------------------------------------------------------------------------
// AI EMPOWERMENT JOURNEY — the workshop curriculum side of the platform.
// (Separate concept from the AI Empowerment JOURNAL, which is the gamified
//  reflection / impact-logging tool.)
//
// This card shows the NEXT BELT a participant unlocks in the Journey. The
// gating mechanic is "submit homework for the current session" — NOT "log a
// journal entry." The button always routes to the current session's Homework
// tab, never to /journal.
//
// The card background uses the gradient that belongs to the NEXT belt being
// unlocked, so the visual language stays consistent with the rest of the
// belt-colored UI.
// ---------------------------------------------------------------------------

export default function NextMilestoneCard({ cohort }) {
  if (!cohort?.sessions?.length) return null;

  // Find the current "up next" session, then look one beyond it for the milestone.
  const upNextIdx = cohort.sessions.findIndex((s) => s.unlocked && !s.completed);
  if (upNextIdx === -1) return null;

  const current = cohort.sessions[upNextIdx];
  const milestone = cohort.sessions[upNextIdx + 1];

  if (!milestone) {
    return <CapstoneMilestone session={current} cohortSlug={cohort.slug} />;
  }

  const milestoneBelt = milestone.belt && BELT_COLORS[milestone.belt] ? BELT_COLORS[milestone.belt] : null;
  // Card background is the NEXT belt's gradient.
  const background = milestoneBelt?.gradient
    ?? "linear-gradient(135deg, #312E81 0%, #4338CA 100%)"; // safe fallback

  // CTA routes to the CURRENT session's homework tab — this is a Journey
  // unlock (homework), not a Journal entry.
  const homeworkHref = `/cohort/${cohort.slug}/session/${current.order}?tab=homework`;

  return (
    <section
      className="mt-6 rounded-2xl p-6 lg:p-7 text-white relative overflow-hidden animate-fade-in-up delay-400"
      style={{ background }}
    >
      <div className="absolute inset-0 grain opacity-30 pointer-events-none" />
      <div className="relative flex items-center gap-5 flex-wrap">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.28)" }}
        >
          <Lock className="w-6 h-6 text-white" strokeWidth={2} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-heading font-semibold tracking-[0.18em] uppercase text-white/65 mb-1">
            Next Milestone · AI Empowerment Journey
          </div>
          <h3 className="font-heading text-[20px] lg:text-[22px] font-extrabold tracking-tight text-white leading-tight mb-1">
            {milestone.belt ? `${milestone.belt} Belt — ` : ""}{stripBeltPrefix(milestone.title)}
          </h3>
          <p className="text-[13.5px] text-white/80 leading-relaxed">
            Unlock by submitting your{" "}
            <strong className="text-white">{current.belt ? `${current.belt} Belt` : `Session ${current.order}`} homework</strong>.
          </p>
        </div>

        <Link
          to={homeworkHref}
          className="group inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-ink rounded-xl text-[13.5px] font-heading font-semibold hover:bg-surface-paper transition-colors duration-200 shrink-0"
        >
          Submit homework
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.5} />
        </Link>
      </div>
    </section>
  );
}

function CapstoneMilestone({ session, cohortSlug }) {
  const belt = BELT_COLORS["Black"];
  return (
    <section
      className="mt-6 rounded-2xl p-6 lg:p-7 text-white relative overflow-hidden animate-fade-in-up delay-400"
      style={{ background: belt?.gradient || "linear-gradient(135deg, #0A0A0A 0%, #374151 100%)" }}
    >
      <div className="absolute inset-0 grain opacity-30 pointer-events-none" />
      <div className="relative flex items-center gap-5 flex-wrap">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.28)" }}
        >
          <Lock className="w-6 h-6 text-white" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-heading font-semibold tracking-[0.18em] uppercase text-white/65 mb-1">
            Final Milestone · Black Belt Capstone
          </div>
          <h3 className="font-heading text-[20px] lg:text-[22px] font-extrabold tracking-tight text-white leading-tight mb-1">
            Earn your Black Belt
          </h3>
          <p className="text-[13.5px] text-white/80 leading-relaxed">
            Complete the capstone session and submit your portfolio of 3 deployed workflows.
          </p>
        </div>
        <Link
          to={`/cohort/${cohortSlug}/session/${session.order}`}
          className="group inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-ink rounded-xl text-[13.5px] font-heading font-semibold hover:bg-surface-paper transition-colors duration-200 shrink-0"
        >
          Open capstone
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.5} />
        </Link>
      </div>
    </section>
  );
}

// Avoid showing "Orange Belt — Orange — 100,000 Experts..." (the session title
// already starts with the belt name in our mock data). Strip the leading
// "Belt — " portion when present.
function stripBeltPrefix(title) {
  if (!title) return "";
  // Matches e.g. "Orange — 100,000 Experts..." or "Green — High-Reliability..."
  return title.replace(/^[A-Z][a-z]+\s+—\s+/, "");
}
