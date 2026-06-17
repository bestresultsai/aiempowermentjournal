import { Link } from "react-router-dom";
import {
  Sparkles, Flame, Calendar as CalendarIcon, Trophy, ArrowRight,
} from "lucide-react";
import { useMemo } from "react";
import {
  badgesEarnedThisMonth,
  nextBadge,
  progressToNext,
} from "../lib/gamification";

// ---------------------------------------------------------------------------
// WelcomeBanner — the participant greeting at the top of the home page.
//
// Now does triple-duty as a gamification surface:
//
//   1. Greeting + subtitle (unchanged)
//   2. Streak chip            — weeks logged (passed in pre-computed)
//   3. Badges-this-month chip — celebrates earned-this-cycle badges
//   4. Next-milestone nudge   — distance to next badge, with a CTA to /journal
//   5. Today's date           — quick anchor
//
// Pre-compute streak in the parent (we don't take `entries` for that to keep
// the existing contract). Everything else flows from `entries` + `badges`,
// which the parent passes through from the resolved cohort + program.
// ---------------------------------------------------------------------------
export default function WelcomeBanner({
  user,
  subtitle,
  streak = 0,
  entries = [],
  badges,
}) {
  const firstName = user?.name?.split(" ")[0] || null;
  const today = new Date();
  const hour = today.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // Gamification computations. All cheap; memoize for readability rather
  // than perf — the banner re-renders on every nav.
  const monthBadges = useMemo(
    () => badgesEarnedThisMonth(entries, badges),
    [entries, badges],
  );
  const totalEntries = entries.length;
  const next = useMemo(() => nextBadge(totalEntries, badges), [totalEntries, badges]);
  const progress = useMemo(
    () => progressToNext(totalEntries, badges),
    [totalEntries, badges],
  );
  // Only show the next-milestone nudge if it's within a sensible reach.
  // Showing "98 to Centurion" when the participant just logged their first
  // win is demotivating; cap at 5 entries away so it reads as "almost there".
  const showNextNudge =
    !!next && progress.target - progress.current <= 5 && progress.current > 0;

  return (
    <section className="mb-6 rounded-2xl bg-surface-card border border-soft px-6 py-5 flex items-center justify-between gap-4 flex-wrap shadow-card animate-fade-in-up">
      <div className="flex items-center gap-4">
        {firstName && (
          <div className="hidden sm:flex w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 items-center justify-center">
            <Sparkles className="w-5 h-5" strokeWidth={2} />
          </div>
        )}
        <div>
          {firstName ? (
            <>
              <h2 className="font-heading text-[22px] font-extrabold tracking-tight text-ink">
                {greeting}, {firstName}.
              </h2>
              <p className="text-[13.5px] text-ink-muted mt-0.5">
                {subtitle || "Welcome back to the BestResults.AI Platform."}
              </p>
            </>
          ) : (
            <>
              <h2 className="font-heading text-[22px] font-extrabold tracking-tight text-ink">
                Welcome to the BestResults.AI Platform
              </h2>
              <p className="text-[13.5px] text-ink-muted mt-0.5">
                {subtitle ||
                  "Your AI Empowerment cohort, sessions, and journal — all in one place."}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Streak chip — only when active and we have a name to celebrate. */}
        {streak > 0 && firstName && (
          <Chip
            icon={<Flame className="w-3.5 h-3.5" strokeWidth={2.5} />}
            label={`Active streak · ${streak} ${streak === 1 ? "week" : "weeks"}`}
            tone="emerald"
          />
        )}

        {/* Badges-this-month chip — celebrates new milestones crossed in the
            current calendar month. Hidden when zero. */}
        {monthBadges > 0 && firstName && (
          <Chip
            icon={<Trophy className="w-3.5 h-3.5" strokeWidth={2.5} />}
            label={`${monthBadges} badge${monthBadges === 1 ? "" : "s"} this month`}
            tone="amber"
          />
        )}

        {/* Next-milestone nudge — only when close enough to motivate. Links
            straight to the journal entry form. */}
        {showNextNudge && firstName && (
          <Link
            to="/journal/new"
            className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-600 text-white text-[11px] font-heading font-bold hover:bg-brand-700 transition-colors"
            title={`${progress.target - progress.current} more to unlock ${next.name}`}
          >
            <span className="uppercase tracking-wider">
              {progress.target - progress.current} to {next.name}
            </span>
            <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.5} />
          </Link>
        )}

        <div className="hidden md:flex items-center gap-2 text-ink-muted">
          <CalendarIcon className="w-4 h-4" strokeWidth={2} />
          <span className="h-eyebrow !text-[10px]">Today</span>
          <span className="text-[13px] font-heading font-semibold text-ink">
            {today.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </section>
  );
}

// Local chip used for the streak + monthly-badges pills. Keeps tone consistent
// without pulling in a shared component.
const TONE_CHIP = {
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
  amber:   "bg-amber-50 border-amber-200 text-amber-700",
};

function Chip({ icon, label, tone }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border " + TONE_CHIP[tone]
      }
    >
      {icon}
      <span className="text-[11px] font-heading font-bold uppercase tracking-wider">
        {label}
      </span>
    </span>
  );
}
