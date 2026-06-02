import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sprout, Repeat, Flame, Rocket, Trophy, Crown } from "lucide-react";
import {
  nextBadge,
  progressToNext,
} from "../../lib/gamification";

// ---------------------------------------------------------------------------
// AI EMPOWERMENT JOURNAL — Next Milestone (next badge).
//
// This card lives in the JOURNAL section of the cohort page. It surfaces the
// next badge a participant can earn by logging journal entries. Gamification
// gating, NOT curriculum gating — completely separate from the AI Empowerment
// JOURNEY (workshops + homework).
//
// The background gradient is amber/gold — the platform's "earned achievement"
// palette — so the card visually belongs with the streak badge + Journal Game
// Card and reads as distinct from any belt-themed Journey surface.
// ---------------------------------------------------------------------------

// Same Lucide icons used in JournalGameCard, keyed by the names defined in
// gamification.js.
const BADGE_ICONS = { Sprout, Repeat, Flame, Rocket, Trophy, Crown };

// Achievement palette — warm amber → gold. NOT a belt color.
const ACHIEVEMENT_GRADIENT = "linear-gradient(135deg, #B45309 0%, #F59E0B 100%)";

export default function NextMilestoneCard({ entries = [], currentUserEmail }) {
  const myEntries = useMemo(
    () =>
      currentUserEmail
        ? entries.filter(
            (e) => e.participantEmail?.toLowerCase() === currentUserEmail.toLowerCase()
          )
        : [],
    [entries, currentUserEmail]
  );

  const total = myEntries.length;
  const next = nextBadge(total);
  const progress = progressToNext(total);
  const NextIcon = next ? BADGE_ICONS[next.icon] || Trophy : Crown;

  // No more badges to unlock — show a celebration variant.
  if (!next) {
    return <AllBadgesEarnedCard total={total} />;
  }

  const remaining = Math.max(0, next.count - total);

  return (
    <section
      className="mt-6 rounded-2xl p-6 lg:p-7 text-white relative overflow-hidden animate-fade-in-up delay-300"
      style={{ background: ACHIEVEMENT_GRADIENT }}
    >
      <div className="absolute inset-0 grain opacity-30 pointer-events-none" />
      <div className="relative flex items-center gap-5 flex-wrap">
        {/* Left — next badge icon */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.28)" }}
        >
          <NextIcon className="w-6 h-6 text-white" strokeWidth={2} />
        </div>

        {/* Middle — milestone copy */}
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-heading font-semibold tracking-[0.18em] uppercase text-white/70 mb-1">
            Next Milestone · AI Empowerment Journal
          </div>
          <h3 className="font-heading text-[20px] lg:text-[22px] font-extrabold tracking-tight text-white leading-tight mb-1">
            Earn the {next.name} badge
          </h3>
          <p className="text-[13.5px] text-white/85 leading-relaxed">
            {next.blurb}{" "}
            <strong className="text-white">
              {remaining === 1 ? "1 more entry" : `${remaining} more entries`}
            </strong>{" "}
            to unlock.
          </p>

          {/* Inline progress bar */}
          <div className="mt-3 h-1.5 rounded-full bg-white/20 overflow-hidden max-w-md">
            <div
              className="h-full bg-white rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
          <div className="text-[11px] font-heading font-semibold tracking-wider mt-1.5 text-white/70">
            {total} / {next.count} ENTRIES · {progress.pct}%
          </div>
        </div>

        {/* Right — CTA */}
        <Link
          to="/journal"
          className="group inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-ink rounded-xl text-[13.5px] font-heading font-semibold hover:bg-surface-paper transition-colors duration-200 shrink-0"
        >
          Log entry
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.5} />
        </Link>
      </div>
    </section>
  );
}

function AllBadgesEarnedCard({ total }) {
  return (
    <section
      className="mt-6 rounded-2xl p-6 lg:p-7 text-white relative overflow-hidden animate-fade-in-up delay-300"
      style={{ background: ACHIEVEMENT_GRADIENT }}
    >
      <div className="absolute inset-0 grain opacity-30 pointer-events-none" />
      <div className="relative flex items-center gap-5 flex-wrap">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.28)" }}
        >
          <Crown className="w-7 h-7 text-white" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-heading font-semibold tracking-[0.18em] uppercase text-white/70 mb-1">
            All Milestones · AI Empowerment Journal
          </div>
          <h3 className="font-heading text-[20px] lg:text-[22px] font-extrabold tracking-tight text-white leading-tight mb-1">
            Every badge earned — you're a Centurion.
          </h3>
          <p className="text-[13.5px] text-white/85 leading-relaxed">
            {total} entries logged. Keep going to stay sharp and to give your cohort wins to learn from.
          </p>
        </div>
        <Link
          to="/journal"
          className="group inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-ink rounded-xl text-[13.5px] font-heading font-semibold hover:bg-surface-paper transition-colors duration-200 shrink-0"
        >
          Log entry
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.5} />
        </Link>
      </div>
    </section>
  );
}
