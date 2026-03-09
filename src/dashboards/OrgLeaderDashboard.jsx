import { useState, useMemo } from "react";
import MetricCard from "../components/MetricCard";
import QualityBars from "../components/QualityBars";
import EntriesTable from "../components/EntriesTable";
import ExportButton from "../components/ExportButton";
import { calcAggregateMetrics, calcEntryMetrics, formatCurrency, formatHours, formatPercent } from "../lib/calculations";

export default function OrgLeaderDashboard({ entries, cohorts, user }) {
  const [memberFilter, setMemberFilter] = useState("");

  const orgEntries = useMemo(() => {
    return entries.filter(e => e.organization === user.organization);
  }, [entries, user.organization]);

  const filteredEntries = useMemo(() => {
    if (!memberFilter) return orgEntries;
    return orgEntries.filter(e => e.participantEmail === memberFilter);
  }, [orgEntries, memberFilter]);

  const metrics = calcAggregateMetrics(filteredEntries);

  const teamMembers = useMemo(() => {
    const map = {};
    orgEntries.forEach(e => {
      if (!map[e.participantEmail]) {
        map[e.participantEmail] = { name: e.participantName, email: e.participantEmail, totalTimeSaved: 0, entries: 0 };
      }
      const m = calcEntryMetrics(e);
      map[e.participantEmail].totalTimeSaved += m.timeSaved;
      map[e.participantEmail].entries++;
    });
    return Object.values(map).sort((a, b) => b.totalTimeSaved - a.totalTimeSaved);
  }, [orgEntries]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px 40px" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #B45309 0%, #D97706 100%)",
        borderRadius: 14, padding: "20px 24px", color: "#fff", marginBottom: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 500, marginBottom: 4 }}>Organization Dashboard</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{user.organization}</div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
            {teamMembers.length} team member{teamMembers.length !== 1 ? "s" : ""}
          </div>
        </div>
        <ExportButton entries={filteredEntries} title={`${user.organization}-AI-Report`} />
      </div>

      {/* Member Filter */}
      <div style={{ marginBottom: 20 }}>
        <select value={memberFilter} onChange={e => setMemberFilter(e.target.value)}
          style={{
            padding: "8px 12px", borderRadius: 8, border: "1px solid #E2E8F0",
            fontSize: 13, background: "#fff", minWidth: 200,
          }}>
          <option value="">All Team Members</option>
          {teamMembers.map(m => <option key={m.email} value={m.email}>{m.name}</option>)}
        </select>
      </div>

      {/* Metrics */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <MetricCard label="Total Entries" value={metrics.totalEntries} icon="📝" />
        <MetricCard label="Time Saved" value={`${formatHours(metrics.totalTimeSaved)}h`} icon="⏱️" color="#B45309" bgColor="#FEF3C7" />
        <MetricCard label="Avg Efficiency" value={formatPercent(metrics.avgEfficiency)} icon="📈" color="#B45309" />
        <MetricCard label="Annual Value" value={formatCurrency(metrics.totalAnnualValue)} icon="💰" color="#059669" bgColor="#D1FAE5" />
      </div>

      {/* Two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
          <QualityBars distribution={metrics.qualityDistribution} />
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", margin: "0 0 12px" }}>Team Members</h3>
          {teamMembers.map(m => (
            <div key={m.email} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0", borderBottom: "1px solid #F1F5F9",
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{m.name}</div>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>{m.entries} entries</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>
                {m.totalTimeSaved.toFixed(1)}h saved
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Entries Table */}
      <div style={{
        background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E2E8F0",
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", margin: "0 0 14px" }}>
          Entries ({filteredEntries.length})
        </h3>
        <EntriesTable entries={filteredEntries} showCohort />
      </div>
    </div>
  );
}
