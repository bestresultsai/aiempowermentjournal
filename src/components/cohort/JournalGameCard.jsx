import { Link } from "react-router-dom";
import { useMemo } from "react";
import {
  calculateStreakWeeks,
  earnedBadges,
  nextBadge,
  progressToNext,
} from "../../lib/gamification";

// Gamified Journal CTA card. Replaces the basic "log one entry this week"
// nudge with: streak, total entries, next badge milestone, progress bar.
//
// Props:
//   entries          – cohort entries (we'll filter to currentUserEmail)
//   currentUserEmail – the signed-in user's email
export default function JournalGameCard({ entries = [], currentUserEmail }) {
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
  const streak = calculateStreakWeeks(myEntries);
  const next = nextBadge(total);
  const progress = progressToNext(total);
  const earned = earnedBadges(total);
  const latestBadge = earned[earned.length - 1] || null;

  return (
    <div className="rounded-3xl bg-surface-card border border-soft p-7 shadow-card flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 text-[18px]">
          ✎
        </div>
        <span className="h-eyebrow">AI Journal</span>
      </div>

      <h3 className="font-heading text-[22px] font-extrabold tracking-tight mb-2 text-ink">
        Log one win this week.
      </h3>
      <p className="text-[13.5px] text-ink-muted leading-relaxed mb-5">
        Every workflow you ship compounds. Two minutes now → durable proof you can cite forever.
      </p>

      {/* Gamification strip */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <Stat icon="🔥" value={streak} label={streak === 1 ? "week streak" : "week streak"} tone="amber" />
        <Stat icon="📝" value={total} label={total === 1 ? "entry" : "entries"} tone="brand" />
        <Stat
          icon={latestBadge?.icon || "🎯"}
          value={latestBadge ? "" : "—"}
          label={latestBadge ? latestBadge.name : "no badges yet"}
          tone="violet"
          compact={!!latestBadge}
        />
      </div>

      {/* Next milestone */}
      {next && (
        <div className="rounded-xl bg-surface-soft/60 border border-soft p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[20px]">{next.icon}</span>
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
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>
      )}

      {!next && total > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-5 text-center">
          <div className="text-[22px] mb-1">👑</div>
          <div className="font-heading text-[14px] font-bold text-amber-900">All badges earned</div>
          <div className="text-[12px] text-amber-800/80">You're a Centurion. Keep going to stay sharp.</div>
        </div>
      )}

      <Link
        to="/journal"
        className="self-start inline-flex items-center gap-2 px-4 py-2.5 bg-ink text-white rounded-xl text-[14px] font-heading font-semibold hover:bg-brand-700 transition mt-auto"
      >
        + New Journal Entry <span>→</span>
      </Link>
    </div>
  );
}

const TONE = {
  amber:  "bg-amber-50 text-amber-700 border-amber-200",
  brand:  "bg-brand-50 text-brand-700 border-brand-100",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
};

function Stat({ icon, value, label, tone = "brand", compact = false }) {
  return (
    <div className={`rounded-xl border ${TONE[tone]} px-3 py-2.5 flex items-center gap-2`}>
      <span className="text-[20px] leading-none">{icon}</span>
      <div className="min-w-0">
        {!compact && (
          <div className="font-heading text-[18px] font-extrabold leading-none">{value}</div>
        )}
        <div className={"text-[10.5px] font-heading font-semibold uppercase tracking-wider " + (compact ? "leading-tight" : "mt-0.5 leading-tight")}>
          {label}
        </div>
      </div>
    </div>
  );
}
