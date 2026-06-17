import { useMemo } from "react";
import { Flame, Rocket } from "lucide-react";
import {
  cohortStreakSummary,
  cohortTierBreakdown,
} from "../../lib/gamification";

// ---------------------------------------------------------------------------
// CohortMiniStrip — a compact 2-chip gamification pulse for cohort cards on
// facilitator/org home grids.
//
// Pass the cohort's pre-flattened entries (with participantEmail stamped) so
// the strip can compute streaks + top tier without re-fetching. Renders
// nothing if there's no signal yet — the cohort card just shows its base
// progress bar.
//
// Designed to slot into a dense card layout (text-[10.5px] chips, no
// breakout heading). Pair with the existing per-cohort hours-saved label.
// ---------------------------------------------------------------------------
export default function CohortMiniStrip({ entries = [] }) {
  const streakSummary = useMemo(() => cohortStreakSummary(entries), [entries]);
  const tierBreakdown = useMemo(() => cohortTierBreakdown(entries), [entries]);

  const { activeCount, maxStreak } = streakSummary;
  const { topTier } = tierBreakdown;

  const hasSignal = activeCount > 0 || maxStreak > 0 || !!topTier;
  if (!hasSignal) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {(activeCount > 0 || maxStreak > 0) && (
        <MiniChip
          icon={Flame}
          label={
            activeCount > 0
              ? `${activeCount} active`
              : `${maxStreak}wk peak`
          }
          tone="amber"
        />
      )}
      {topTier && (
        <MiniChip
          icon={Rocket}
          label={topTier.label}
          tone="brand"
        />
      )}
    </div>
  );
}

const TONE = {
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  brand: "bg-brand-50 text-brand-700 border-brand-100",
};

function MiniChip({ icon: Icon, label, tone }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-heading font-bold " +
        TONE[tone]
      }
    >
      <Icon className="w-2.5 h-2.5" strokeWidth={2.5} />
      <span className="whitespace-nowrap">{label}</span>
    </span>
  );
}
