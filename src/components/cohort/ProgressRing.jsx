export default function ProgressRing({ completed = 0, total = 1, size = 96 }) {
  const radius = (size - 12) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = total > 0 ? completed / total : 0;
  const offset = circ * (1 - pct);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={10}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#2563EB"
          strokeWidth={10}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", lineHeight: 1 }}>
          {Math.round(pct * 100)}%
        </div>
        <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>
          {completed}/{total}
        </div>
      </div>
    </div>
  );
}
