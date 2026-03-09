export default function QualityBars({ distribution }) {
  const { better, equal, worse } = distribution;
  const total = better + equal + worse;
  if (total === 0) return <div style={{ color: "#94A3B8", fontSize: 13 }}>No data</div>;

  const bars = [
    { label: "Better", count: better, pct: (better / total) * 100, color: "#059669", bg: "#D1FAE5" },
    { label: "Equal", count: equal, pct: (equal / total) * 100, color: "#2563EB", bg: "#DBEAFE" },
    { label: "Not as good", count: worse, pct: (worse / total) * 100, color: "#DC2626", bg: "#FEE2E2" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", margin: 0 }}>Quality Outcomes</h3>
      {bars.map(b => (
        <div key={b.label}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#64748B" }}>{b.label}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: b.color }}>{b.count} ({b.pct.toFixed(0)}%)</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: "#F1F5F9", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${b.pct}%`, background: b.color, borderRadius: 4, transition: "width 0.5s ease" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
