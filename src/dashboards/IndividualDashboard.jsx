import { useState, useMemo } from "react";
import MetricCard from "../components/MetricCard";
import QualityBars from "../components/QualityBars";
import EntriesTable from "../components/EntriesTable";
import { calcAggregateMetrics, formatCurrency, formatHours, formatPercent } from "../lib/calculations";

export default function IndividualDashboard({ entries, allEntries, cohorts, email }) {
  const [tab, setTab] = useState("mine"); // mine | cohort
  const participantName = entries[0]?.participantName || email;

  const myCohortNames = useMemo(() => [...new Set(entries.map(e => e.cohort).filter(Boolean))], [entries]);

  const cohortEntries = useMemo(() => {
    if (!myCohortNames.length) return [];
    return allEntries.filter(e => myCohortNames.includes(e.cohort));
  }, [allEntries, myCohortNames]);

  const displayEntries = tab === "mine" ? entries : cohortEntries;
  const metrics = calcAggregateMetrics(displayEntries);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px 40px" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)",
        borderRadius: 14, padding: "20px 24px", color: "#fff", marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 500, marginBottom: 4 }}>My Journal</div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{participantName}</div>
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
          {entries.length} entr{entries.length !== 1 ? "ies" : "y"} submitted
        </div>
      </div>

      {/* Tab toggle */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#F1F5F9", borderRadius: 10, padding: 4 }}>
        {[
          { key: "mine", label: "My Entries" },
          { key: "cohort", label: "Cohort Aggregate" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 8, fontSize: 13,
              fontWeight: 600, border: "none", cursor: "pointer",
              background: tab === t.key ? "#fff" : "transparent",
              color: tab === t.key ? "#2563EB" : "#64748B",
              boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Metrics */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <MetricCard label="Total Entries" value={metrics.totalEntries} icon="📝" />
        <MetricCard label="Time Saved" value={`${formatHours(metrics.totalTimeSaved)}h`} icon="⏱️" />
        <MetricCard label="Avg Efficiency" value={formatPercent(metrics.avgEfficiency)} icon="📈" color="#7C3AED" bgColor="#EDE9FE" />
        <MetricCard label="Annual Value" value={formatCurrency(metrics.totalAnnualValue)} icon="💰" color="#059669" bgColor="#D1FAE5" />
      </div>

      {/* Quality + Cohorts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
          <QualityBars distribution={metrics.qualityDistribution} />
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", margin: "0 0 12px" }}>
            {tab === "mine" ? "My Cohorts" : "Cohort Participants"}
          </h3>
          {tab === "mine" ? (
            myCohortNames.map(c => (
              <div key={c} style={{ padding: "8px 0", borderBottom: "1px solid #F1F5F9", fontSize: 13, fontWeight: 500, color: "#0F172A" }}>
                {c}
              </div>
            ))
          ) : (
            [...new Set(cohortEntries.map(e => e.participantName))].map(name => (
              <div key={name} style={{
                display: "flex", justifyContent: "space-between",
                padding: "8px 0", borderBottom: "1px solid #F1F5F9",
              }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>{name}</span>
                <span style={{ fontSize: 12, color: "#64748B" }}>
                  {cohortEntries.filter(e => e.participantName === name).length} entries
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Entries Table */}
      <div style={{
        background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0",
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", margin: "0 0 14px" }}>
          {tab === "mine" ? "My" : "Cohort"} Entries ({displayEntries.length})
        </h3>
        <EntriesTable entries={displayEntries} />
      </div>
    </div>
  );
}
