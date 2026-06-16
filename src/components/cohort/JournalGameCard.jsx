import { Link } from "react-router-dom";
import { useMemo } from "react";
import {
  Flame, NotebookPen, Trophy, ArrowRight, Clock, Lightbulb,
  Sprout, Repeat, Rocket, Crown, Target, Sparkles,
} from "lucide-react";
import {
  calculateStreakWeeks,
  earnedBadges,
  nextBadge,
  progressToNext,
  totalMinutesSaved,
  formatHoursSaved,
  highestProductionTier,
  unlockedTiers,
  innovationsCount,
  PRODUCTION_TIERS,
  BADGES,
} from "../../lib/gamification";

// Map gamification icon names → Lucide components. Sparkles is the fallback
// for any badge whose icon name doesn't match the map.
const BADGE_ICONS = {
  Sprout, Repeat, Flame, Rocket, Trophy, Crown, Target, Sparkles,
};
const FALLBACK_ICON = Sparkles;

export default function JournalGameCard({ entries = [], currentUserEmail, badges }) {
  const myEntries = useMemo(
    () =>
      currentUserEmail
        ? entries.filter(
            (e) => e.participantEmail?.toLowerCase() === currentUserEmail.toLowerCase()
          )
        : [],
    [entries, currentUserEmail]
  );

  // Use the program-supplied ladder if present; otherwise fall back to the
  // platform-wide default. Sorted just in case caller forgot.
  const ladder = useMemo(() => {
    const arr = Array.isArray(badges) && badges.length ? badges : BADGES;
    return [...arr].sort((a, b) => (a.count || 0) - (b.count || 0));
  }, [badges]);

  const total = myEntries.length;
  const streak = calculateStreakWeeks(myEntries);
  const minutesSaved = totalMinutesSaved(myEntries);
  const innovations = innovationsCount(myEntries);
  const highestTier = highestProductionTier(myEntries);
  const tiersUnlocked = unlockedTiers(myEntries);
  const next = nextBadge(total, ladder);
  const progress = progressToNext(total, ladder);
  const earned = earnedBadges(total, ladder);
  const latestBadge = earned[earned.length - 1] || null;

  // First badge (Sprout) — used for the empty-state preview so a brand-new
  // participant sees what they're a single entry away from unlocking.
  const firstBadge = ladder[0];
  const FirstBadgeIcon = BADGE_ICONS[firstBadge?.icon] || FALLBACK_ICON;
  const NextBadgeIcon = next ? (BADGE_ICONS[next.icon] || FALLBACK_ICON) : null;
  const LatestBadgeIcon = latestBadge
    ? (BADGE_ICONS[latestBadge.icon] || FALLBACK_ICON)
    : null;

  return (
    <div className="rounded-3xl bg-surface-card border border-soft p-7 shadow-card flex flex-col animate-fade-in-up delay-400 transition-shadow duration-300 hover:shadow-lift">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
          <NotebookPen className="w-5 h-5" strokeWidth={2} />
        </div>
        <span className="h-eyebrow">AI Journal</span>
      </div>

      <h3 className="font-heading text-[22px] font-extrabold tracking-tight mb-2 text-ink">
        Log one win this week.
      </h3>
      <p className="text-[13.5px] text-ink-muted leading-relaxed mb-2 max-w-2xl">
        Every workflow you ship compounds. Two minutes now → durable proof you can cite forever.
      </p>
      <p className="text-[13px] text-ink-muted leading-relaxed mb-5 max-w-2xl">
        Each entry feeds your cohort's <strong className="text-ink">aggregate impact dashboard</strong> — hours saved, dollars created, innovations shipped — and gives Mike concrete examples to coach against. You'll also see how your wins stack up next to your peers, so the best ideas spread fast.
      </p>

      {/* Top stats — Hours saved leads (brand promise), then streak, then
          entries. Latest badge moves to the chip row below so volume isn't
          the headline. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <Stat
          icon={Clock}
          value={formatHoursSaved(minutesSaved)}
          label={minutesSaved > 0 ? "hours saved" : "first hour ahead"}
          tone="emerald"
          emphasize
        />
        <Stat
          icon={Flame}
          value={streak}
          label="week streak"
          tone="amber"
        />
        <Stat
          icon={NotebookPen}
          value={total}
          label={total === 1 ? "entry" : "entries"}
          tone="brand"
        />
      </div>

      {/* Secondary chip row — badge + production tier + innovations. Shown
          when the participant has any signal at all; otherwise we surface
          the empty-state preview below. */}
      {total > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-5">
          {latestBadge && LatestBadgeIcon && (
            <Chip
              icon={<LatestBadgeIcon className="w-3.5 h-3.5" strokeWidth={2} />}
              label={latestBadge.name}
              tone="violet"
            />
          )}
          {highestTier && (
            <Chip
              icon={<Rocket className="w-3.5 h-3.5" strokeWidth={2} />}
              label={`${highestTier.label} unlocked · ${tiersUnlocked.length}/${PRODUCTION_TIERS.length} tiers`}
              tone="brand"
            />
          )}
          {innovations > 0 && (
            <Chip
              icon={<Lightbulb className="w-3.5 h-3.5" strokeWidth={2} />}
              label={`${innovations} innovation${innovations === 1 ? "" : "s"}`}
              tone="amber"
            />
          )}
        </div>
      )}

      {/* Empty-state preview — for a brand-new participant, show what's a
          single entry away. The Sprout icon is dimmed to read "almost
          unlocked" rather than "you have nothing." */}
      {total === 0 && firstBadge && (
        <div className="rounded-xl bg-surface-soft/60 border border-dashed border-soft p-4 mb-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-soft text-ink-subtle flex items-center justify-center shrink-0">
            <FirstBadgeIcon className="w-5 h-5 opacity-60" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="font-heading text-[14px] font-bold text-ink">
              Log your first win — unlock {firstBadge.name}
            </div>
            <div className="text-[12px] text-ink-muted mt-0.5 leading-relaxed">
              Two minutes is enough. Even a small workflow counts.
            </div>
          </div>
        </div>
      )}

      {/* Next badge milestone bar — only when there's still a badge ahead. */}
      {total > 0 && next && (
        <div className="rounded-xl bg-surface-soft/60 border border-soft p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                {NextBadgeIcon && <NextBadgeIcon className="w-5 h-5" strokeWidth={2} />}
              </div>
              <div>
                <div className="text-[12px] text-ink-muted font-heading">Next badge</div>
                <div className="font-heading text-[14px] font-bold text-ink">{next.name}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-heading text-[16px] font-extrabold text-ink leading-none">
                {total}<span className="text-ink-subtle font-medium">/</span>{next.count}
              </div>
              <div className="text-[10px] text-ink-muted uppercase tracking-wider mt-0.5">entries</div>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-surface-paper overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>
      )}

      {/* All badges earned — celebration variant. */}
      {total > 0 && !next && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-5 flex items-center gap-3">
          <Crown className="w-7 h-7 text-amber-700" strokeWidth={2} />
          <div>
            <div className="font-heading text-[14px] font-bold text-amber-900">All badges earned</div>
            <div className="text-[12px] text-amber-800/80">You're a Centurion. Keep going to stay sharp.</div>
          </div>
        </div>
      )}

      <Link
        to="/journal"
        className="group self-start inline-flex items-center gap-2 px-4 py-2.5 bg-ink text-white rounded-xl text-[14px] font-heading font-semibold hover:bg-brand-700 transition-all duration-200 mt-auto"
      >
        New Journal Entry
        <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.5} />
      </Link>
    </div>
  );
}

const TONE = {
  amber:  "bg-amber-50 text-amber-700 border-amber-200",
  brand:  "bg-brand-50 text-brand-700 border-brand-100",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function Stat({ icon: Icon, value, label, tone = "brand", emphasize = false }) {
  return (
    <div
      className={
        "rounded-xl border px-3 py-2.5 flex items-center gap-2.5 transition-transform duration-200 hover:scale-[1.02] " +
        TONE[tone] +
        (emphasize ? " ring-2 ring-emerald-200" : "")
      }
    >
      {Icon && <Icon className={`w-5 h-5 shrink-0 ${emphasize ? "" : "opacity-90"}`} strokeWidth={2} />}
      <div className="min-w-0">
        <div className={"font-heading font-extrabold leading-none " + (emphasize ? "text-[22px]" : "text-[18px]")}>
          {value}
        </div>
        <div className="text-[10.5px] font-heading font-semibold uppercase tracking-wider mt-0.5 leading-tight">
          {label}
        </div>
      </div>
    </div>
  );
}

function Chip({ icon, label, tone }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11.5px] font-heading font-semibold " +
        TONE[tone]
      }
    >
      {icon}
      {label}
    </span>
  );
}
