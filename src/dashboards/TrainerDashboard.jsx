import { useState, useMemo } from "react";
import MetricCard from "../components/MetricCard";
import QualityBars from "../components/QualityBars";
import EntriesTable from "../components/EntriesTable";
import ExportButton from "../components/ExportButton";
import { calcAggregateMetrics, formatCurrency, formatHours, formatPercent } from "../lib/calculations";

export default function TrainerDashboard({ entries, cohorts, user }) {
  const [cohortFilter, setCohortFilter] = useState("");

  const assignedCohorts = user.assignedCohorts || [];

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (assignedCohorts.length > 0 && !assignedCohorts.includes(e.cohort)) return false;
      if (cohortFilter && e.cohort !== cohortFilter) return false;
      return true;
    });
  }, [entries, assignedCohorts, cohortFilter]);

  const metrics = calcAggregateMetrics(filteredEntries);

  const myCohorts = cohorts.filter(c => assignedCohorts.includes(c.name));

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px 40px" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0369A1 0%, #0284C7 100%)",
        borderRadius: 14, padding: "20px 24px", color: "#fff", marginBottom: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 500, marginBottom: 4 }}>Trainer Dashboard</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>
            Welcome, {user.name?.split(" ")[0]}
          </div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
            {assignedCohorts.length} assigned cohort{assignedCohorts.length !== 1 ? "s" : ""}
          </div>
        </div>
        <ExportButton entries={filteredEntries} title="Trainer-AI-Journal-Report" />
      </div>

      {/* Cohort Filter */}
      <div style={{ marginBottom: 20 }}>
        <select value={cohortFilter} onChange={e => setCohortFilter(e.target.value)}
          style={{
            padding: "8px 12px", borderRadius: 8, border: "1px solid #E2E8F0",
            fontSize: 13, background: "#fff", minWidth: 200,
          }}>
          <option value="">All My Cohorts</option>
          {myCohorts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      {/* Metrics */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <MetricCard label="Total Entries" value={metrics.totalEntries} icon="📝" />
        <MetricCard label="Time Saved" value={`${formatHours(metrics.totalTimeSaved)}h`} icon="⏱️" color="#0369A1" bgColor="#E0F2FE" />
        <MetricCard label="Avg Efficiency" value={formatPercent(metrics.avgEfficiency)} icon="📈" color="#0369A1" />
        <MetricCard label="Annual Value" value={formatCurrency(metrics.totalAnnualValue)} icon="💰" color="#059669" bgColor="#D1FAE5" />
      </div>

      {/* Quality + Cohort cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
          <QualityBars distribution={metrics.qualityDistribution} />
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", margin: "0 0 12px" }}>My Cohorts</h3>
          {myCohorts.map(c => {
            const count = entries.filter(e => e.cohort === c.name).length;
            return (
              <div key={c.id} style={{
                display: "flex", justifyContent: "space-between",
                padding: "10px 0", borderBottom: "1px solid #F1F5F9",
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8" }}>{c.program} • {c.status}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0369A1" }}>{count} entries</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Entries Table */}
      <div style={{
        background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0",
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", margin: "0 0 14px" }}>
          Entries ({filteredEntries.length})
        </h3>
        <EntriesTable entries={filteredEntries} showOrg />
      </div>
    </div>
  );
}
