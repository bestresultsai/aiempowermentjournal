import { useMemo } from "react";
import { Clock, Trophy, Flame, Medal } from "lucide-react";
import {
  cohortTopByHoursSaved,
  cohortTopByBadgesEarned,
  cohortTopByStreak,
  formatHoursSaved,
} from "../../lib/gamification";

// ---------------------------------------------------------------------------
// CohortLeaderboard — the cohort's gamification podium.
//
// Three columns of top-3:
//   1. Hours saved   — minutes saved across all journal entries
//   2. Badges earned — badge count against the program ladder
//   3. Longest streak — consecutive weeks logged (with last-week grace)
//
// Cohort wide. Read-only. Designed to celebrate, not shame: empty columns
// disappear when nobody qualifies yet.
//
// Pass `entries` (the full cohort's journal entries) and `badges` (the
// program's ladder). Optional `highlightEmail` puts a "You" tag on the
// participant's rows when they appear in any column.
// ---------------------------------------------------------------------------
export default function CohortLeaderboard({ entries = [], badges, highlightEmail, title = "Cohort leaderboard" }) {
  const topHours = useMemo(() => cohortTopByHoursSaved(entries), [entries]);
  const topBadges = useMemo(
    () => cohortTopByBadgesEarned(entries, badges),
    [entries, badges],
  );
  const topStreaks = useMemo(() => cohortTopByStreak(entries), [entries]);

  const hasAnySignal =
    topHours.length || topBadges.length || topStreaks.length;
  if (!hasAnySignal) return null;

  const me = (highlightEmail || "").toLowerCase();

  return (
    <section className="rounded-2xl border border-soft bg-surface-card p-5 lg:p-6 shadow-card animate-fade-in-up">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
          <Medal className="w-4 h-4" strokeWidth={2.5} />
        </div>
        <div>
          <div className="h-eyebrow !text-amber-700">Leaderboard</div>
          <h3 className="font-heading text-[16px] font-extrabold tracking-tight text-ink leading-tight">
            {title}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <LeaderColumn
          icon={Clock}
          label="Hours saved"
          tone="emerald"
          rows={topHours.map((r) => ({
            email: r.email,
            name: r.name,
            primary: formatHoursSaved(r.minutes),
            sub: `${r.entries} ${r.entries === 1 ? "entry" : "entries"}`,
          }))}
          emptyHint="No time saved yet."
          me={me}
        />
        <LeaderColumn
          icon={Trophy}
          label="Badges earned"
          tone="amber"
          rows={topBadges.map((r) => ({
            email: r.email,
            name: r.name,
            primary: `${r.badges} badge${r.badges === 1 ? "" : "s"}`,
            sub: `${r.entries} ${r.entries === 1 ? "entry" : "entries"}`,
          }))}
          emptyHint="No badges earned yet."
          me={me}
        />
        <LeaderColumn
          icon={Flame}
          label="Longest streak"
          tone="violet"
          rows={topStreaks.map((r) => ({
            email: r.email,
            name: r.name,
            primary: `${r.streak}-week streak`,
            sub: `${r.entries} ${r.entries === 1 ? "entry" : "entries"}`,
          }))}
          emptyHint="No active streaks yet."
          me={me}
        />
      </div>
    </section>
  );
}

const TONE = {
  emerald: {
    iconBg: "bg-emerald-50 text-emerald-700",
    pill: "bg-emerald-100 text-emerald-800",
  },
  amber: {
    iconBg: "bg-amber-50 text-amber-700",
    pill: "bg-amber-100 text-amber-800",
  },
  violet: {
    iconBg: "bg-violet-50 text-violet-700",
    pill: "bg-violet-100 text-violet-800",
  },
};

function LeaderColumn({ icon: Icon, label, tone, rows, emptyHint, me }) {
  const palette = TONE[tone];
  return (
    <div className="rounded-xl border border-soft bg-surface-soft/40 p-3 flex flex-col">
      <div className="flex items-center gap-2 mb-2.5">
        <div className={"w-7 h-7 rounded-lg flex items-center justify-center " + palette.iconBg}>
          <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
        </div>
        <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
          {label}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-[12px] text-ink-muted px-2 py-3">{emptyHint}</div>
      ) : (
        <ol className="space-y-2">
          {rows.map((r, idx) => (
            <LeaderRow
              key={r.email}
              rank={idx + 1}
              name={r.name}
              primary={r.primary}
              sub={r.sub}
              isMe={me && r.email && r.email.toLowerCase() === me}
              pill={palette.pill}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

const MEDALS = {
  1: { bg: "bg-amber-400 text-white", label: "1" },
  2: { bg: "bg-zinc-300 text-zinc-800", label: "2" },
  3: { bg: "bg-amber-700 text-white", label: "3" },
};

function LeaderRow({ rank, name, primary, sub, isMe, pill }) {
  const medal = MEDALS[rank] || { bg: "bg-surface-soft text-ink-muted", label: rank };
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <li className="flex items-center gap-2.5 rounded-lg bg-white px-2 py-1.5 border border-soft">
      <div
        className={
          "w-6 h-6 rounded-full flex items-center justify-center font-heading font-extrabold text-[11px] shrink-0 " +
          medal.bg
        }
      >
        {medal.label}
      </div>
      <div className="w-7 h-7 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center font-heading font-bold text-[10.5px] shrink-0">
        {initials || "?"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-heading font-semibold text-ink truncate flex items-center gap-1.5">
          <span className="truncate">{name}</span>
          {isMe && (
            <span className="inline-flex items-center px-1.5 py-0 rounded text-[9.5px] font-heading font-bold uppercase tracking-wider bg-brand-600 text-white">
              you
            </span>
          )}
        </div>
        <div className="text-[11px] text-ink-muted truncate">{sub}</div>
      </div>
      <div
        className={
          "shrink-0 px-2 py-0.5 rounded-full text-[11px] font-heading font-bold " + pill
        }
      >
        {primary}
      </div>
    </li>
  );
}
