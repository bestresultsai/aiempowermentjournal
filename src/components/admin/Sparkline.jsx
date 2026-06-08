// ---------------------------------------------------------------------------
// Sparkline — minimal SVG inline bar chart.
//
// Props: data = [number, number, ...] — one value per bucket.
// Sized to its container; pass width/height props to constrain.
// ---------------------------------------------------------------------------

export default function Sparkline({ data, width = 80, height = 22, color = "#10B981" }) {
  if (!data || data.length === 0) return <div style={{ width, height }} />;
  const max = Math.max(1, ...data);
  const gap = 2;
  const totalGap = gap * (data.length - 1);
  const barW = Math.max(2, (width - totalGap) / data.length);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img">
      {data.map((v, i) => {
        const x = i * (barW + gap);
        const h = v === 0 ? 1.5 : (v / max) * height;
        const y = height - h;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={h}
            rx={1}
            fill={v === 0 ? "#E5E7EB" : color}
            opacity={v === 0 ? 1 : 0.85}
          />
        );
      })}
    </svg>
  );
}
