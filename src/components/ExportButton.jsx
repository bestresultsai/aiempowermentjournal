import { calcEntryMetrics, formatCurrency, calcAggregateMetrics } from "../lib/calculations";

export default function ExportButton({ entries, title = "AI Journal Report" }) {
  async function exportCSV() {
    const headers = ["Participant", "Email", "Organization", "Cohort", "Project", "Scope",
      "Frequency", "Hours Without AI", "Hours With AI", "Time Saved", "Efficiency %",
      "Quality", "Annual Value", "Innovation", "Submission Date"];

    const rows = entries.map(e => {
      const m = calcEntryMetrics(e);
      return [
        e.participantName, e.participantEmail, e.organization, e.cohort,
        e.projectName, e.scope, e.frequency,
        e.hoursWithoutAI, e.hoursWithAI, m.timeSaved.toFixed(1),
        m.percentSaved.toFixed(0) + "%", e.qualityOutcome,
        "$" + m.annualValue.toFixed(0), e.innovationTitle || "", e.submissionDate,
      ];
    });

    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadFile(csv, `${title.replace(/\s+/g, "-")}.csv`, "text/csv");
  }

  async function exportPDF() {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({ orientation: "landscape" });
    const metrics = calcAggregateMetrics(entries);

    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, doc.internal.pageSize.width, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text("BestResults.AI", 14, 16);
    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.text("AI Empowerment Journal Report", 14, 25);
    doc.setFontSize(9);
    doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), doc.internal.pageSize.width - 14, 16, { align: "right" });
    doc.text(title, doc.internal.pageSize.width - 14, 25, { align: "right" });

    // Summary
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("Summary", 14, 45);
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    const summaryY = 52;
    const summaryItems = [
      [`Total Entries: ${metrics.totalEntries}`, `Total Time Saved: ${metrics.totalTimeSaved.toFixed(1)} hours`],
      [`Avg Efficiency: ${metrics.avgEfficiency.toFixed(0)}%`, `Total Annual Value: ${formatCurrency(metrics.totalAnnualValue)}`],
      [`Innovations: ${metrics.totalInnovations}`, `Quality: ${metrics.qualityDistribution.better} Better, ${metrics.qualityDistribution.equal} Equal, ${metrics.qualityDistribution.worse} Lower`],
    ];
    summaryItems.forEach((row, i) => {
      doc.text(row[0], 14, summaryY + i * 7);
      doc.text(row[1], 120, summaryY + i * 7);
    });

    // Table
    const tableData = entries.map(e => {
      const m = calcEntryMetrics(e);
      return [
        e.participantName, e.cohort, e.projectName, e.scope,
        `${e.hoursWithoutAI}h`, `${e.hoursWithAI}h`, `${m.timeSaved.toFixed(1)}h`,
        `${m.percentSaved.toFixed(0)}%`,
        e.qualityOutcome === "Better than original" ? "Better" :
          e.qualityOutcome === "Equal to original" ? "Equal" : "Lower",
        formatCurrency(m.annualValue),
      ];
    });

    autoTable(doc, {
      startY: summaryY + 28,
      head: [["Participant", "Cohort", "Project", "Scope", "W/o AI", "W/ AI", "Saved", "Eff%", "Quality", "Annual $"]],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    doc.save(`${title.replace(/\s+/g, "-")}.pdf`);
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={exportCSV} style={{
        background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8,
        padding: "8px 14px", fontSize: 12, fontWeight: 600, color: "#0F172A",
        cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
      }}>
        📊 CSV
      </button>
      <button onClick={exportPDF} style={{
        background: "#2563EB", border: "none", borderRadius: 8,
        padding: "8px 14px", fontSize: 12, fontWeight: 600, color: "#fff",
        cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
      }}>
        📄 PDF Report
      </button>
    </div>
  );
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
