// Cohort-scoped impact dashboard. Same shape as AdminDashboard, but locked to
// one cohort's entries (no filter dropdowns).
//
// Props:
//   cohort      – the cohort object (for the header + display name)
//   entries     – journal entries already filtered to this cohort
//   currentUserEmail – optional; used to show "you contributed X of Y" callout
//   loading     – boolean while entries are being fetched
//   error       – error message if fetching failed

import { useMemo } from "react";
import MetricCard from "../MetricCard";
import QualityBars from "../QualityBars";
import EntriesTable from "../EntriesTable";
import {
  calcAggregateMetrics,
  formatCurrency,
  formatHours,
  formatPercent,
} from "../../lib/calculations";

export default function CohortStats({ cohort, entries = [], currentUserEmail, loading, error }) {
  const metrics = useMemo(() => calcAggregateMetrics(entries), [entries]);

  // Per-participant rollup (top 8 contributors).
  const participantCounts = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      const key = e.participantName || e.participantEmail || "Unknown";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [entries]);

  const innovations = useMemo(
    () => entries.filter((e) => e.innovationTitle),
    [entries]
  );

  const myEntryCount = useMemo(() => {
    if (!currentUserEmail) return null;
    return entries.filter(
      (e) => e.participantEmail?.toLowerCase() === currentUserEmail.toLowerCase()
    ).length;
  }, [entries, currentUserEmail]);

  return (
    <section style={{ marginTop: 32 }}>
      {/* Header — blue gradient to harmonize with the cohort hero */}
      <div
        style={{
          background: "linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)",
          borderRadius: 14,
          padding: "20px 24px",
          color: "#fff",
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 500, marginBottom: 4, letterSpacing: 0.3 }}>
          COHORT DASHBOARD
        </div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>
          {cohort.name} — AI Empowerment Impact
        </div>
        {myEntryCount != null && (
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 6 }}>
            You've contributed{" "}
            <strong>{myEntryCount}</strong> of{" "}
            <strong>{entries.length}</strong> entries in this cohort.
          </div>
        )}
      </div>

      {loading && (
        <div style={{ color: "#64748B", fontSize: 14, padding: 20 }}>
          Loading cohort stats…
        </div>
      )}

      {error && (
        <div style={{ background: "#FEE2E2", color: "#991B1B", padding: 16, borderRadius: 12, marginBottom: 20 }}>
          Couldn't load cohort entries: {error}
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div
          style={{
            background: "#fff",
            border: "1px dashed #CBD5E1",
            borderRadius: 12,
            padding: "28px 22px",
            textAlign: "center",
            color: "#64748B",
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 6 }}>📊</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>
            No journal entries yet for this cohort.
          </div>
          <div style={{ fontSize: 13 }}>
            As participants log their AI wins, this dashboard will fill up automatically.
          </div>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <>
          {/* Metric cards */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            <MetricCard label="Total Entries"   value={metrics.totalEntries} icon="📝" />
            <MetricCard label="Time Saved"      value={`${formatHours(metrics.totalTimeSaved)}h`} icon="⏱️" color="#2563EB" />
            <MetricCard label="Avg Efficiency"  value={formatPercent(metrics.avgEfficiency)}     icon="📈" color="#7C3AED" bgColor="#EDE9FE" />
            <MetricCard label="Annual Value"    value={formatCurrency(metrics.totalAnnualValue)} icon="💰" color="#059669" bgColor="#D1FAE5" />
            <MetricCard label="Innovations"     value={metrics.totalInnovations}                 icon="🚀" color="#B45309" bgColor="#FEF3C7" />
          </div>

          {/* Two columns: Quality bars + By Participant */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
              <QualityBars distribution={metrics.qualityDistribution} />
            </div>
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", margin: "0 0 12px" }}>
                By Participant
              </h3>
              {participantCounts.length === 0 ? (
                <div style={{ fontSize: 13, color: "#64748B" }}>No entries yet.</div>
              ) : (
                participantCounts.map(([name, count]) => (
                  <div
                    key={name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: "1px solid #F1F5F9",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>{name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#2563EB" }}>
                      {count} entr{count !== 1 ? "ies" : "y"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Innovations */}
          {innovations.length > 0 && (
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 20,
                border: "1px solid #E2E8F0",
                marginBottom: 20,
              }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#B45309", margin: "0 0 12px" }}>
                🚀 Innovations from this cohort
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {innovations.map((e) => (
                  <div
                    key={e.id}
                    style={{
                      background: "#FFFBEB",
                      borderRadius: 10,
                      padding: 14,
                      border: "1px solid #FDE68A",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#B45309", marginBottom: 4 }}>
                      {e.innovationTitle}
                    </div>
                    <div style={{ fontSize: 12, color: "#92400E", marginBottom: 6 }}>
                      {e.innovationDescription}
                    </div>
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>
                      — {e.participantName}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entries table */}
          <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", margin: "0 0 14px" }}>
              All Entries ({entries.length})
            </h3>
            <EntriesTable entries={entries} />
          </div>
        </>
      )}
    </section>
  );
}
