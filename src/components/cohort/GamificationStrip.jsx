import { useMemo } from "react";
import { Flame, Rocket, Trophy } from "lucide-react";
import {
  cohortStreakSummary,
  cohortTierBreakdown,
  cohortBadgesEarned,
  PRODUCTION_TIERS,
} from "../../lib/gamification";

// ---------------------------------------------------------------------------
// GamificationStrip — the cohort's gamification pulse.
//
// Used on:
//   - CohortStats (Journal page + CohortLanding)
//   - CohortLeaderDashboard (the cohort lead's view)
//
// Renders three chips followed by a slim production-tier distribution bar:
//   1. Active streaks       — how many participants logged this/last week
//   2. Top production tier  — highest tier any participant has reached
//   3. Badges earned        — total badge unlocks across the cohort
//
// Pass `entries` (the full cohort's journal entries) and `badges` (the
// program's ladder). If `badges` is omitted, gamification helpers fall back
// to the platform DEFAULT_BADGES.
// ---------------------------------------------------------------------------
export default function GamificationStrip({ entries = [], badges }) {
  const streakSummary = useMemo(() => cohortStreakSummary(entries), [entries]);
  const tierBreakdown = useMemo(() => cohortTierBreakdown(entries), [entries]);
  const badgesEarned = useMemo(
    () => cohortBadgesEarned(entries, badges),
    [entries, badges],
  );

  const { activeCount, totalParticipants, maxStreak } = streakSummary;
  const { byTier, topTier, topTierCount } = tierBreakdown;

  // Don't render if there's literally no gamification signal yet.
  const hasAnySignal =
    activeCount > 0 || maxStreak > 0 || !!topTier || badgesEarned > 0;
  if (!hasAnySignal) return null;

  return (
    <div className="rounded-2xl border border-soft bg-gradient-to-br from-surface-card to-surface-soft/30 p-5 mb-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <Trophy className="w-3.5 h-3.5" strokeWidth={2.5} />
          </div>
          <h3 className="font-heading text-[14px] font-bold text-ink">Cohort gamification pulse</h3>
        </div>
        <span className="text-[11px] text-ink-muted">
          {totalParticipants} participant{totalParticipants === 1 ? "" : "s"} logging
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
        <GamChip
          icon={Flame}
          label="Active streaks"
          primary={`${activeCount}`}
          detail={
            maxStreak > 0
              ? `${maxStreak}-week peak streak`
              : "no active streaks yet"
          }
          tone="amber"
        />
        <GamChip
          icon={Rocket}
          label="Top tier reached"
          primary={topTier ? topTier.label : "—"}
          detail={
            topTier
              ? `${topTierCount} participant${topTierCount === 1 ? "" : "s"}`
              : "no tier unlocks yet"
          }
          tone="brand"
        />
        <GamChip
          icon={Trophy}
          label="Badges earned"
          primary={`${badgesEarned}`}
          detail="across the cohort"
          tone="violet"
        />
      </div>

      <TierLadderBar byTier={byTier} totalParticipants={totalParticipants} />
    </div>
  );
}

const TONE = {
  amber:  "bg-amber-50 text-amber-700 border-amber-200",
  brand:  "bg-brand-50 text-brand-700 border-brand-100",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
};

function GamChip({ icon: Icon, label, primary, detail, tone = "brand" }) {
  return (
    <div className={"rounded-xl border px-3 py-2.5 flex items-center gap-3 " + TONE[tone]}>
      <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider opacity-80">
          {label}
        </div>
        <div className="font-heading font-extrabold text-[15px] leading-tight truncate">
          {primary}
        </div>
        <div className="text-[11px] opacity-80 truncate">{detail}</div>
      </div>
    </div>
  );
}

function TierLadderBar({ byTier, totalParticipants }) {
  return (
    <div>
      <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted mb-1.5">
        Production tier distribution
      </div>
      <div className="flex items-stretch gap-1">
        {PRODUCTION_TIERS.map((t) => {
          const count = byTier[t.key] || 0;
          const pct = totalParticipants > 0
            ? Math.round((count / totalParticipants) * 100)
            : 0;
          return (
            <div
              key={t.key}
              className="flex-1 rounded-lg border border-soft bg-white px-2 py-1.5 text-center"
              title={`${count} participant${count === 1 ? "" : "s"} at ${t.label}`}
            >
              <div className="text-[10px] font-heading font-bold uppercase tracking-wider text-ink-subtle truncate">
                {t.label}
              </div>
              <div className="font-heading text-[14px] font-extrabold text-ink leading-none mt-0.5">
                {count}
              </div>
              <div className="text-[9.5px] text-ink-muted mt-0.5">{pct}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
