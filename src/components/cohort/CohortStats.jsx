// Cohort-scoped impact dashboard. Same shape as AdminDashboard, scoped to one cohort.
//
// Props:
//   cohort           – the cohort object (for the header + display name)
//   entries          – journal entries already filtered to this cohort
//   currentUserEmail – optional; used to show "you contributed X of Y" callout
//   loading          – boolean while entries are being fetched
//   error            – error message if fetching failed

import { useMemo } from "react";
import {
  calcAggregateMetrics,
  formatCurrency,
  formatHours,
  formatPercent,
} from "../../lib/calculations";

export default function CohortStats({ cohort, entries = [], currentUserEmail, loading, error }) {
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

  const myEntryCount = useMemo(() => {
    if (!currentUserEmail) return null;
    return entries.filter(
      (e) => e.participantEmail?.toLowerCase() === currentUserEmail.toLowerCase()
    ).length;
  }, [entries, currentUserEmail]);

  return (
    <section className="mt-16">
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
      </div>

      {loading && <div className="text-ink-muted text-[14px] py-6">Loading cohort entries…</div>}

      {error && (
        <div className="bg-rose-50 text-rose-700 border border-rose-200 p-4 rounded-xl mb-4 text-[14px]">
          Couldn't load cohort entries: {error}
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="rounded-2xl border border-dashed border-soft bg-surface-card p-8 text-center">
          <div className="text-[28px] mb-2">📊</div>
          <h3 className="font-heading font-bold text-[16px] text-ink mb-1">
            No journal entries yet for this cohort.
          </h3>
          <p className="text-[13px] text-ink-muted">
            As participants log their AI wins, this dashboard will fill up automatically.
          </p>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <MetricTile
              icon="📝"
              label="Total Entries"
              value={metrics.totalEntries}
              accent="bg-surface-soft"
            />
            <MetricTile
              icon="⏱"
              label="Time Saved"
              value={
                <>
                  {formatHours(metrics.totalTimeSaved)}
                  <span className="text-ink-muted text-[15px] font-medium ml-0.5">h</span>
                </>
              }
              accent="bg-brand-50 text-brand-600"
            />
            <MetricTile
              icon="📈"
              label="Avg Efficiency"
              value={
                <>
                  {formatPercent(metrics.avgEfficiency)?.replace("%", "") || "0"}
                  <span className="text-ink-muted text-[15px] font-medium ml-0.5">%</span>
                </>
              }
              accent="bg-violet-50 text-violet-600"
            />
            <MetricTile
              icon="$"
              label="Annual Value"
              value={formatCurrency(metrics.totalAnnualValue)}
              accent="bg-emerald-50 text-emerald-600"
            />
            <MetricTile
              icon="✨"
              label="Innovations"
              value={metrics.totalInnovations}
              accent="bg-amber-50 text-amber-600"
            />
          </div>

          {/* Two columns: Quality bars + Participants */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Quality outcomes */}
            <div className="rounded-2xl bg-surface-card border border-soft p-6 shadow-card">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-heading text-[15px] font-bold">Quality Outcomes</h3>
                <span className="text-[12px] text-ink-muted">vs. original work</span>
              </div>
              <QualityBar
                label="Better"
                value={metrics.qualityDistribution.better}
                total={metrics.totalEntries}
                track="bg-emerald-50"
                fill="bg-emerald-500"
              />
              <QualityBar
                label="Equal"
                value={metrics.qualityDistribution.equal}
                total={metrics.totalEntries}
                track="bg-brand-50"
                fill="bg-brand-500"
              />
              <QualityBar
                label="Not as good"
                value={metrics.qualityDistribution.worse}
                total={metrics.totalEntries}
                track="bg-rose-50"
                fill="bg-rose-500"
              />
            </div>

            {/* Top participants */}
            <div className="rounded-2xl bg-surface-card border border-soft p-6 shadow-card">
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

          {/* Innovations */}
          {innovations.length > 0 && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="h-eyebrow !text-amber-700 mb-1">Innovation Spotlight</div>
                  <h3 className="font-heading text-[18px] font-extrabold tracking-tight">
                    Cohort breakthroughs worth celebrating
                  </h3>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                {innovations.map((e) => (
                  <div key={e.id} className="rounded-xl bg-white border border-amber-100 p-4">
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
      )}
    </section>
  );
}

function MetricTile({ icon, label, value, accent }) {
  return (
    <div className="rounded-2xl bg-surface-card border border-soft p-5 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[14px] font-bold ${accent}`}>
          {icon}
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
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
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

function ParticipantRow({ name, count, colorIdx }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const color = AVATAR_COLORS[colorIdx % AVATAR_COLORS.length];
  return (
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${color} text-white flex items-center justify-center text-[12px] font-heading font-bold`}>
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
