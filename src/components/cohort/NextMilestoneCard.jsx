import { Lock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { BELT_COLORS } from "../../lib/mockCohort";

// Shows what's UNLOCKED next + the action that unlocks it. Designed to nudge
// participants toward completing their current journal entry / homework.
//
// Mock-mode: the milestone is the next not-yet-completed session AFTER the one
// they're working on (the "up next" session). In live mode the gating logic
// would be enforced server-side; this card is the participant-facing surface.
export default function NextMilestoneCard({ cohort }) {
  if (!cohort?.sessions?.length) return null;

  // Find the current "up next" session, then look one beyond that for the milestone.
  const upNextIdx = cohort.sessions.findIndex((s) => s.unlocked && !s.completed);
  if (upNextIdx === -1) return null;

  const current = cohort.sessions[upNextIdx];
  const milestone = cohort.sessions[upNextIdx + 1];

  if (!milestone) {
    // The next session IS the last session — show a capstone milestone variant.
    return <CapstoneMilestone session={current} cohortSlug={cohort.slug} />;
  }

  const milestoneBelt = milestone.belt && BELT_COLORS[milestone.belt] ? BELT_COLORS[milestone.belt] : null;
  const currentBelt = current.belt || "current";

  return (
    <section
      className="mt-6 rounded-2xl p-6 lg:p-7 text-white relative overflow-hidden animate-fade-in-up delay-400"
      style={{ background: "linear-gradient(135deg, #312E81 0%, #4338CA 100%)" }}
    >
      <div className="absolute inset-0 grain opacity-30 pointer-events-none" />
      <div className="relative flex items-center gap-5 flex-wrap">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: milestoneBelt?.hex
              ? `${milestoneBelt.hex}33`  /* 20% opacity backplate */
              : "rgba(255,255,255,0.16)",
            border: "1px solid rgba(255,255,255,0.24)",
          }}
        >
          <Lock className="w-6 h-6 text-white" strokeWidth={2} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-heading font-semibold tracking-[0.18em] uppercase text-white/65 mb-1">
            Your Next Milestone
          </div>
          <h3 className="font-heading text-[20px] lg:text-[22px] font-extrabold tracking-tight text-white leading-tight mb-1">
            {milestone.belt ? `${milestone.belt} Belt — ` : ""}{milestone.title}
          </h3>
          <p className="text-[13.5px] text-white/75 leading-relaxed">
            Unlock by completing the <strong className="text-white">{currentBelt} Belt</strong> homework + journal entry.
          </p>
        </div>

        <Link
          to="/journal"
          className="group inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-ink rounded-xl text-[13.5px] font-heading font-semibold hover:bg-surface-paper transition-colors duration-200 shrink-0"
        >
          Log entry to unlock
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.5} />
        </Link>
      </div>
    </section>
  );
}

function CapstoneMilestone({ session, cohortSlug }) {
  return (
    <section
      className="mt-6 rounded-2xl p-6 lg:p-7 text-white relative overflow-hidden animate-fade-in-up delay-400"
      style={{ background: "linear-gradient(135deg, #312E81 0%, #4338CA 100%)" }}
    >
      <div className="absolute inset-0 grain opacity-30 pointer-events-none" />
      <div className="relative flex items-center gap-5 flex-wrap">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.24)" }}
        >
          <Lock className="w-6 h-6 text-white" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-heading font-semibold tracking-[0.18em] uppercase text-white/65 mb-1">
            Your Final Milestone
          </div>
          <h3 className="font-heading text-[20px] lg:text-[22px] font-extrabold tracking-tight text-white leading-tight mb-1">
            Earn your Black Belt
          </h3>
          <p className="text-[13.5px] text-white/75 leading-relaxed">
            Complete your capstone and submit your portfolio of 3 deployed workflows.
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
