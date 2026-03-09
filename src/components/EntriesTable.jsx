import { calcEntryMetrics, formatCurrency } from "../lib/calculations";

export default function EntriesTable({ entries, showCohort = true, showOrg = false }) {
  if (!entries || entries.length === 0) {
    return <div style={{ color: "#94A3B8", fontSize: 13, padding: 20, textAlign: "center" }}>No entries found</div>;
  }

  const cellStyle = { padding: "10px 12px", fontSize: 12, color: "#0F172A", borderBottom: "1px solid #F1F5F9" };
  const headStyle = { ...cellStyle, fontWeight: 600, color: "#64748B", background: "#F8FAFC", position: "sticky", top: 0 };

  return (
    <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #E2E8F0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
        <thead>
          <tr>
            <th style={headStyle}>Participant</th>
            {showCohort && <th style={headStyle}>Cohort</th>}
            {showOrg && <th style={headStyle}>Org</th>}
            <th style={headStyle}>Project</th>
            <th style={headStyle}>Scope</th>
            <th style={headStyle}>Without AI</th>
            <th style={headStyle}>With AI</th>
            <th style={headStyle}>Saved</th>
            <th style={headStyle}>Efficiency</th>
            <th style={headStyle}>Quality</th>
            <th style={headStyle}>Annual $</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => {
            const m = calcEntryMetrics(entry);
            const qualColor = entry.qualityOutcome === "Better than original" ? "#059669"
              : entry.qualityOutcome === "Equal to original" ? "#2563EB" : "#DC2626";
            return (
              <tr key={entry.id || i} style={{ background: i % 2 ? "#FAFBFC" : "#fff" }}>
                <td style={cellStyle}>
                  <div style={{ fontWeight: 600 }}>{entry.participantName}</div>
                </td>
                {showCohort && <td style={cellStyle}>{entry.cohort}</td>}
                {showOrg && <td style={cellStyle}>{entry.organization}</td>}
                <td style={cellStyle}>
                  <div style={{ fontWeight: 500 }}>{entry.projectName}</div>
                  {entry.innovationTitle && (
                    <span style={{ fontSize: 10, background: "#FEF3C7", color: "#B45309", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                      Innovation
                    </span>
                  )}
                </td>
                <td style={cellStyle}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4,
                    background: entry.scope === "Organization-wide" ? "#EDE9FE" : entry.scope === "Department-wide" ? "#DBEAFE" : "#F1F5F9",
                    color: entry.scope === "Organization-wide" ? "#7C3AED" : entry.scope === "Department-wide" ? "#2563EB" : "#64748B",
                  }}>
                    {entry.scope}
                  </span>
                </td>
                <td style={{ ...cellStyle, textAlign: "center" }}>{entry.hoursWithoutAI}h</td>
                <td style={{ ...cellStyle, textAlign: "center" }}>{entry.hoursWithAI}h</td>
                <td style={{ ...cellStyle, textAlign: "center", fontWeight: 600, color: "#059669" }}>{m.timeSaved.toFixed(1)}h</td>
                <td style={{ ...cellStyle, textAlign: "center", fontWeight: 600, color: "#2563EB" }}>{m.percentSaved.toFixed(0)}%</td>
                <td style={cellStyle}>
                  <span style={{ color: qualColor, fontWeight: 600, fontSize: 11 }}>
                    {entry.qualityOutcome === "Better than original" ? "Better" :
                     entry.qualityOutcome === "Equal to original" ? "Equal" : "Lower"}
                  </span>
                </td>
                <td style={{ ...cellStyle, fontWeight: 700, color: "#059669" }}>{formatCurrency(m.annualValue)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
