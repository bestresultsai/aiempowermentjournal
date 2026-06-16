import { useMemo, useState } from "react";
import {
  FileText, Timer, TrendingUp, DollarSign, Sparkles,
  Flame, Rocket, Trophy,
} from "lucide-react";
import EntriesTable from "../EntriesTable";
import {
  calcAggregateMetrics,
  formatCurrency,
  formatHours,
  formatPercent,
} from "../../lib/calculations";
import {
  cohortStreakSummary,
  cohortTierBreakdown,
  cohortBadgesEarned,
  PRODUCTION_TIERS,
} from "../../lib/gamification";
import { getBadgesForCohort } from "../../lib/programs";

export default function CohortStats({ cohort, entries = [], currentUserEmail, loading, error }) {
  const [tab, setTab] = useState("summary"); // summary | details

  const metrics = useMemo(() => calcAggregateMetrics(entries), [entries]);

  const participantCounts = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      const key = e.participantName || e.participantEmail || "Unknown";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [entries]);

  const innovations = useMemo(
    () => entries.filter((e) => e.innovationTitle).slice(0, 3),
    [entries]
  );

  // Cohort-level gamification rollups — surfaced in a strip between the
  // headline metric tiles and the Quality / Participant grids. Uses the
  // cohort's program-specific badge ladder so APFW gets APFW's milestones
  // and AIEW3 gets the platform default.
  const programBadges = useMemo(() => getBadgesForCohort(cohort), [cohort]);
  const streakSummary = useMemo(() => cohortStreakSummary(entries), [entries]);
  const tierBreakdown = useMemo(() => cohortTierBreakdown(entries), [entries]);
  const badgesEarned = useMemo(
    () => cohortBadgesEarned(entries, programBadges),
    [entries, programBadges],
  );

  const myEntryCount = useMemo(() => {
    if (!currentUserEmail) return null;
    return entries.filter(
      (e) => e.participantEmail?.toLowerCase() === currentUserEmail.toLowerCase()
    ).length;
  }, [entries, currentUserEmail]);

  return (
    <section className="mt-16 animate-fade-in-up delay-600">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="h-eyebrow mb-1">Cohort Impact</div>
          <h2 className="font-heading text-[28px] font-extrabold tracking-tight">
            {cohort.name} — AI Empowerment Outcomes
          </h2>
          {myEntryCount != null && (
            <p className="text-[14px] text-ink-muted mt-1">
              You've contributed <strong className="text-ink">{myEntryCount}</strong> of{" "}
              <strong className="text-ink">{entries.length}</strong> entries in this cohort.
            </p>
          )}
        </div>

        {/* Summary / Details toggle */}
        <SummaryDetailsTabs current={tab} onChange={setTab} />
      </div>

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[112px] rounded-2xl animate-shimmer" />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-rose-50 text-rose-700 border border-rose-200 p-4 rounded-xl mb-4 text-[14px]">
          Couldn't load cohort entries: {error}
        </div>
      )}

      {!loading && !error && entries.length === 0 && <EmptyState />}

      {!loading && !error && entries.length > 0 && (
        tab === "summary"
          ? (
            <SummaryView
              metrics={metrics}
              participantCounts={participantCounts}
              innovations={innovations}
              streakSummary={streakSummary}
              tierBreakdown={tierBreakdown}
              badgesEarned={badgesEarned}
            />
          )
          : <DetailsView entries={entries} />
      )}
    </section>
  );
}

// ---- Tabs ----

function SummaryDetailsTabs({ current, onChange }) {
  const tabs = [
    { key: "summary", label: "Summary" },
    { key: "details", label: "Details" },
  ];
  return (
    <div className="inline-flex items-center bg-surface-soft rounded-xl p-1 border border-soft">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={
            "px-4 py-1.5 rounded-lg font-heading font-semibold text-[13px] transition-all duration-200 " +
            (current === t.key
              ? "bg-surface-card text-ink shadow-sm"
              : "text-ink-muted hover:text-ink")
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ---- Summary view (the original layout) ----

function SummaryView({
  metrics,
  participantCounts,
  innovations,
  streakSummary,
  tierBreakdown,
  badgesEarned,
}) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <MetricTile icon={FileText}   label="Total Entries"  value={metrics.totalEntries} accent="bg-surface-soft text-ink" />
        <MetricTile icon={Timer}      label="Time Saved"     value={<>{formatHours(metrics.totalTimeSaved)}<span className="text-ink-muted text-[15px] font-medium ml-0.5">h</span></>} accent="bg-brand-50 text-brand-600" />
        <MetricTile icon={TrendingUp} label="Avg Efficiency" value={<>{formatPercent(metrics.avgEfficiency)?.replace("%", "") || "0"}<span className="text-ink-muted text-[15px] font-medium ml-0.5">%</span></>} accent="bg-violet-50 text-violet-600" />
        <MetricTile icon={DollarSign} label="Annual Value"   value={formatCurrency(metrics.totalAnnualValue)} accent="bg-emerald-50 text-emerald-600" />
        <MetricTile icon={Sparkles}   label="Innovations"    value={metrics.totalInnovations} accent="bg-amber-50 text-amber-600" />
      </div>

      {/* Gamification pulse — cohort-level rollups of the per-participant
          journal gamification model. Lives between the headline numbers
          and the qualitative breakdowns. */}
      <GamificationStrip
        streakSummary={streakSummary}
        tierBreakdown={tierBreakdown}
        badgesEarned={badgesEarned}
      />

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-surface-card border border-soft p-6 shadow-card transition-shadow duration-300 hover:shadow-lift">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-heading text-[15px] font-bold">Quality Outcomes</h3>
            <span className="text-[12px] text-ink-muted">vs. original work</span>
          </div>
          <QualityBar label="Better"      value={metrics.qualityDistribution.better} total={metrics.totalEntries} track="bg-emerald-50" fill="bg-emerald-500" />
          <QualityBar label="Equal"       value={metrics.qualityDistribution.equal}  total={metrics.totalEntries} track="bg-brand-50"   fill="bg-brand-500" />
          <QualityBar label="Not as good" value={metrics.qualityDistribution.worse}  total={metrics.totalEntries} track="bg-rose-50"    fill="bg-rose-500" />
        </div>

        <div className="rounded-2xl bg-surface-card border border-soft p-6 shadow-card transition-shadow duration-300 hover:shadow-lift">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-heading text-[15px] font-bold">By Participant</h3>
            <span className="text-[12px] text-ink-muted">Top 5</span>
          </div>
          {participantCounts.length === 0 ? (
            <div className="text-ink-muted text-[13px]">No entries yet.</div>
          ) : (
            <div className="space-y-3">
              {participantCounts.map(([name, count], i) => (
                <ParticipantRow key={name} name={name} count={count} colorIdx={i} />
              ))}
            </div>
          )}
        </div>
      </div>

      {innovations.length > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Sparkles className="w-5 h-5" strokeWidth={2} />
              </div>
              <div>
                <div className="h-eyebrow !text-amber-700 mb-0.5">Innovation Spotlight</div>
                <h3 className="font-heading text-[18px] font-extrabold tracking-tight">
                  Cohort breakthroughs worth celebrating
                </h3>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {innovations.map((e) => (
              <div key={e.id} className="rounded-xl bg-white border border-amber-100 p-4 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-card">
                <div className="text-[10px] font-heading font-bold uppercase tracking-wider text-amber-700 mb-1">
                  Innovation
                </div>
                <div className="font-heading text-[14px] font-bold leading-snug mb-1">
                  {e.innovationTitle}
                </div>
                <div className="text-[12px] text-ink-muted leading-relaxed mb-3">
                  {e.innovationDescription}
                </div>
                <div className="text-[11px] text-ink-subtle">— {e.participantName}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ---- Details view (full entries table) ----

function DetailsView({ entries }) {
  return (
    <div className="rounded-2xl bg-surface-card border border-soft p-6 shadow-card">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-heading text-[15px] font-bold">
          All Entries ({entries.length})
        </h3>
        <span className="text-[12px] text-ink-muted">Every journal entry logged in this cohort</span>
      </div>
      <EntriesTable entries={entries} />
    </div>
  );
}

// ---- Small parts ----

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-soft bg-surface-card p-8 text-center">
      <div className="inline-flex w-12 h-12 rounded-2xl bg-surface-soft items-center justify-center mb-3">
        <FileText className="w-6 h-6 text-ink-subtle" strokeWidth={2} />
      </div>
      <h3 className="font-heading font-bold text-[16px] text-ink mb-1">
        No journal entries yet for this cohort.
      </h3>
      <p className="text-[13px] text-ink-muted">
        As participants log their AI wins, this dashboard will fill up automatically.
      </p>
    </div>
  );
}

function MetricTile({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-2xl bg-surface-card border border-soft p-5 shadow-card transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon className="w-4 h-4" strokeWidth={2} />
        </div>
      </div>
      <div className="font-heading text-[26px] font-extrabold tracking-tight">{value}</div>
      <div className="text-[11.5px] text-ink-muted uppercase tracking-wider font-heading font-semibold mt-0.5">
        {label}
      </div>
    </div>
  );
}

function QualityBar({ label, value, total, track, fill }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] font-heading font-semibold">{label}</span>
        <span className="text-[12px] text-ink-muted">{value} · {pct}%</span>
      </div>
      <div className={`h-2 rounded-full overflow-hidden ${track}`}>
        <div
          className={`h-full rounded-full ${fill} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const AVATAR_COLORS = [
  "from-amber-300 to-amber-500",
  "from-purple-300 to-purple-500",
  "from-emerald-300 to-emerald-500",
  "from-rose-300 to-rose-500",
  "from-cyan-300 to-cyan-500",
];

// ---------------------------------------------------------------------------
// GamificationStrip — the cohort's gamification pulse.
//
// Three chips:
//   1. Active streaks       — how many participants logged this/last week
//   2. Top production tier  — highest tier any participant has reached
//   3. Badges earned        — total badge unlocks across the cohort
//
// Followed by a slim tier ladder bar showing distribution across all 5 tiers.
// ---------------------------------------------------------------------------
function GamificationStrip({ streakSummary, tierBreakdown, badgesEarned }) {
  const { activeCount, totalParticipants, maxStreak } = streakSummary;
  const { byTier, topTier, topTierCount } = tierBreakdown;

  // Don't render if there's literally no gamification signal yet — the
  // empty state belongs to the metric tiles row above.
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
        <span className="text-[11px] text-ink-muted">{totalParticipants} participants logging</span>
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

      {/* Tier ladder distribution — slim 5-cell bar showing how many
          participants are at each tier as their highest. */}
      <TierLadderBar byTier={byTier} totalParticipants={totalParticipants} />
    </div>
  );
}

const GAM_TONE = {
  amber:  "bg-amber-50 text-amber-700 border-amber-200",
  brand:  "bg-brand-50 text-brand-700 border-brand-100",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
};

function GamChip({ icon: Icon, label, primary, detail, tone = "brand" }) {
  return (
    <div className={"rounded-xl border px-3 py-2.5 flex items-center gap-3 " + GAM_TONE[tone]}>
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

function ParticipantRow({ name, count, colorIdx }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const color = AVATAR_COLORS[colorIdx % AVATAR_COLORS.length];
  return (
    <div className="flex items-center gap-3 transition-transform duration-200 hover:translate-x-0.5">
      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${color} text-white flex items-center justify-center text-[12px] font-heading font-bold shrink-0`}>
        {initials || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-heading font-semibold truncate">{name}</div>
      </div>
      <div className="text-right">
        <div className="font-heading text-[14px] font-bold text-brand-600">{count}</div>
        <div className="text-[10px] text-ink-muted uppercase tracking-wider">
          entr{count !== 1 ? "ies" : "y"}
        </div>
      </div>
    </div>
  );
}
