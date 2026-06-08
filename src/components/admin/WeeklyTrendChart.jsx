// ---------------------------------------------------------------------------
// WeeklyTrendChart — small SVG bar chart, no dependency.
//
// Props: data = [{ weekLabel, count, minutesSaved }]
//
// Dual-axis vibe: bars for entries (emerald) + a thin line for hours saved
// (slate). Keeps the chart legible at small sizes; works in light mode only
// since the rest of the admin panel is light-only today.
// ---------------------------------------------------------------------------

export default function WeeklyTrendChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-[12.5px] text-ink-muted p-8 text-center">
        Not enough data to chart yet.
      </div>
    );
  }

  const PAD_LEFT = 28;
  const PAD_RIGHT = 36;
  const PAD_TOP = 14;
  const PAD_BOTTOM = 24;
  const HEIGHT = 180;
  const COL_WIDTH = 44;
  const INNER_PAD = 8;

  const innerWidth = data.length * COL_WIDTH;
  const totalWidth = PAD_LEFT + innerWidth + PAD_RIGHT;
  const chartHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  // Bars scale to the max entries-count in the window. Floor at 4 so a tiny
  // dataset still leaves visual headroom.
  const maxCount = Math.max(4, ...data.map((d) => d.count));
  const maxMinutes = Math.max(1, ...data.map((d) => d.minutesSaved));

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${totalWidth} ${HEIGHT}`}
        style={{ minWidth: totalWidth, height: HEIGHT }}
        role="img"
        aria-label="Journal entries per week"
      >
        {/* Horizontal gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => {
          const y = PAD_TOP + chartHeight * (1 - p);
          return (
            <g key={p}>
              <line
                x1={PAD_LEFT}
                x2={PAD_LEFT + innerWidth}
                y1={y}
                y2={y}
                stroke="#E5E7EB"
                strokeWidth={1}
                strokeDasharray={p === 0 ? "0" : "2 4"}
              />
              <text
                x={PAD_LEFT - 6}
                y={y + 4}
                textAnchor="end"
                fontSize={10}
                fill="#9CA3AF"
                fontFamily="Inter, system-ui, sans-serif"
              >
                {Math.round(maxCount * p)}
              </text>
            </g>
          );
        })}

        {/* Bars + labels */}
        {data.map((d, i) => {
          const cx = PAD_LEFT + i * COL_WIDTH + COL_WIDTH / 2;
          const barW = COL_WIDTH - INNER_PAD * 2;
          const barH = (d.count / maxCount) * chartHeight;
          const barY = PAD_TOP + (chartHeight - barH);
          return (
            <g key={i}>
              {/* Bar */}
              {d.count > 0 && (
                <>
                  <rect
                    x={cx - barW / 2}
                    y={barY}
                    width={barW}
                    height={barH}
                    rx={4}
                    fill="#10B981"
                    fillOpacity={0.92}
                  />
                  <text
                    x={cx}
                    y={barY - 6}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={700}
                    fill="#064E3B"
                    fontFamily="Inter, system-ui, sans-serif"
                  >
                    {d.count}
                  </text>
                </>
              )}
              {/* Week label */}
              <text
                x={cx}
                y={HEIGHT - 8}
                textAnchor="middle"
                fontSize={10}
                fill="#6B7280"
                fontFamily="Inter, system-ui, sans-serif"
              >
                {d.weekLabel}
              </text>
            </g>
          );
        })}

        {/* Hours-saved line overlay */}
        <polyline
          points={data
            .map((d, i) => {
              const cx = PAD_LEFT + i * COL_WIDTH + COL_WIDTH / 2;
              const y =
                PAD_TOP +
                chartHeight -
                (d.minutesSaved / maxMinutes) * chartHeight * 0.85;
              return `${cx},${y}`;
            })
            .join(" ")}
          fill="none"
          stroke="#1E3A8A"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeDasharray="3 3"
        />
        {data.map((d, i) => {
          if (d.minutesSaved === 0) return null;
          const cx = PAD_LEFT + i * COL_WIDTH + COL_WIDTH / 2;
          const y =
            PAD_TOP +
            chartHeight -
            (d.minutesSaved / maxMinutes) * chartHeight * 0.85;
          return (
            <circle
              key={`dot-${i}`}
              cx={cx}
              cy={y}
              r={2.5}
              fill="#1E3A8A"
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 px-2 text-[11px] font-heading text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          Entries
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-px bg-brand-700" style={{ borderTop: "1px dashed #1E3A8A", width: 14 }} />
          Hours saved (relative)
        </span>
      </div>
    </div>
  );
}
