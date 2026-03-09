import { useState, useMemo } from "react";
import MetricCard from "../components/MetricCard";
import QualityBars from "../components/QualityBars";
import EntriesTable from "../components/EntriesTable";
import ExportButton from "../components/ExportButton";
import { calcAggregateMetrics, formatCurrency, formatHours, formatPercent } from "../lib/calculations";

export default function AdminDashboard({ entries, cohorts }) {
  const [cohortFilter, setCohortFilter] = useState("");
  const [orgFilter, setOrgFilter] = useState("");

  const orgs = useMemo(() => [...new Set(entries.map(e => e.organization).filter(Boolean))], [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (cohortFilter && e.cohort !== cohortFilter) return false;
      if (orgFilter && e.organization !== orgFilter) return false;
      return true;
    });
  }, [entries, cohortFilter, orgFilter]);

  const metrics = calcAggregateMetrics(filteredEntries);

  const cohortCounts = useMemo(() => {
    const map = {};
    filteredEntries.forEach(e => {
      map[e.cohort] = (map[e.cohort] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredEntries]);

  const innovations = filteredEntries.filter(e => e.innovationTitle);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px 40px" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
        borderRadius: 14, padding: "20px 24px", color: "#fff", marginBottom: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 500, marginBottom: 4 }}>Admin Dashboard</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>AI Empowerment Overview</div>
        </div>
        <ExportButton entries={filteredEntries} title="Admin-AI-Journal-Report" />
      </div>

      {/* Filters */}
      <div style={{
        display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center",
      }}>
        <select value={cohortFilter} onChange={e => setCohortFilter(e.target.value)}
          style={{
            padding: "8px 12px", borderRadius: 8, border: "1px solid #E2E8F0",
            fontSize: 13, background: "#fff", minWidth: 200,
          }}>
          <option value="">All Cohorts</option>
          {cohorts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select value={orgFilter} onChange={e => setOrgFilter(e.target.value)}
          style={{
            padding: "8px 12px", borderRadius: 8, border: "1px solid #E2E8F0",
            fontSize: 13, background: "#fff", minWidth: 200,
          }}>
          <option value="">All Organizations</option>
          {orgs.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        {(cohortFilter || orgFilter) && (
          <button onClick={() => { setCohortFilter(""); setOrgFilter(""); }}
            style={{
              background: "none", border: "none", color: "#2563EB",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Metrics */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <MetricCard label="Total Entries" value={metrics.totalEntries} icon="📝" />
        <MetricCard label="Time Saved" value={`${formatHours(metrics.totalTimeSaved)}h`} icon="⏱️" color="#2563EB" />
        <MetricCard label="Avg Efficiency" value={formatPercent(metrics.avgEfficiency)} icon="📈" color="#7C3AED" bgColor="#EDE9FE" />
        <MetricCard label="Annual Value" value={formatCurrency(metrics.totalAnnualValue)} icon="💰" color="#059669" bgColor="#D1FAE5" />
        <MetricCard label="Innovations" value={metrics.totalInnovations} icon="🚀" color="#B45309" bgColor="#FEF3C7" />
      </div>

      {/* Two columns: Quality + Cohorts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
          <QualityBars distribution={metrics.qualityDistribution} />
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", margin: "0 0 12px" }}>By Cohort</h3>
          {cohortCounts.map(([name, count]) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#0F172A" }}>{name}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#2563EB" }}>{count} entries</span>
            </div>
          ))}
        </div>
      </div>

      {/* Innovations */}
      {innovations.length > 0 && (
        <div style={{
          background: "#fff", borderRadius: 12, padding: 20,
          border: "1px solid #E2E8F0", marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#B45309", margin: "0 0 12px" }}>
            🚀 Innovations & Testimonials
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {innovations.map(e => (
              <div key={e.id} style={{
                background: "#FFFBEB", borderRadius: 10, padding: 14,
                border: "1px solid #FDE68A",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#B45309", marginBottom: 4 }}>
                  {e.innovationTitle}
                </div>
                <div style={{ fontSize: 12, color: "#92400E", marginBottom: 6 }}>
                  {e.innovationDescription}
                </div>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>
                  — {e.participantName}, {e.organization}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entries Table */}
      <div style={{
        background: "#fff", borderRadius: 12, padding: 20,
        border: "1px solid #E2E8F0",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", margin: 0 }}>
            All Entries ({filteredEntries.length})
          </h3>
        </div>
        <EntriesTable entries={filteredEntries} showOrg />
      </div>
    </div>
  );
}
