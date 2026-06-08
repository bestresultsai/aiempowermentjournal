// ---------------------------------------------------------------------------
// EngagementDonut — small SVG donut + legend, no dependency.
//
// Props: segments = [{ key, label, count, hint, color }]
// ---------------------------------------------------------------------------

export default function EngagementDonut({ segments }) {
  const total = segments.reduce((s, x) => s + x.count, 0);
  const SIZE = 160;
  const R_OUTER = 70;
  const R_INNER = 46;
  const CX = SIZE / 2;
  const CY = SIZE / 2;

  if (total === 0) {
    return (
      <div className="text-[12.5px] text-ink-muted p-8 text-center">
        No participants in scope yet.
      </div>
    );
  }

  let cursor = -Math.PI / 2; // start at 12 o'clock

  const wedges = segments.map((s) => {
    const fraction = s.count / total;
    const angle = fraction * Math.PI * 2;
    const startAngle = cursor;
    const endAngle = cursor + angle;
    cursor = endAngle;

    const x1 = CX + R_OUTER * Math.cos(startAngle);
    const y1 = CY + R_OUTER * Math.sin(startAngle);
    const x2 = CX + R_OUTER * Math.cos(endAngle);
    const y2 = CY + R_OUTER * Math.sin(endAngle);
    const x3 = CX + R_INNER * Math.cos(endAngle);
    const y3 = CY + R_INNER * Math.sin(endAngle);
    const x4 = CX + R_INNER * Math.cos(startAngle);
    const y4 = CY + R_INNER * Math.sin(startAngle);

    const largeArc = angle > Math.PI ? 1 : 0;

    // Handle 100% case — a full ring needs a different path because a single
    // arc can't draw 360°.
    const isFull = fraction >= 1 - 1e-6;
    const d = isFull
      ? `M ${CX + R_OUTER} ${CY}
         A ${R_OUTER} ${R_OUTER} 0 1 1 ${CX - R_OUTER} ${CY}
         A ${R_OUTER} ${R_OUTER} 0 1 1 ${CX + R_OUTER} ${CY}
         M ${CX + R_INNER} ${CY}
         A ${R_INNER} ${R_INNER} 0 1 0 ${CX - R_INNER} ${CY}
         A ${R_INNER} ${R_INNER} 0 1 0 ${CX + R_INNER} ${CY} Z`
      : `M ${x1} ${y1}
         A ${R_OUTER} ${R_OUTER} 0 ${largeArc} 1 ${x2} ${y2}
         L ${x3} ${y3}
         A ${R_INNER} ${R_INNER} 0 ${largeArc} 0 ${x4} ${y4} Z`;

    return { ...s, d, fraction };
  });

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="shrink-0 relative" style={{ width: SIZE, height: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img" aria-label="Engagement breakdown">
          {wedges.map((w) =>
            w.count === 0 ? null : (
              <path
                key={w.key}
                d={w.d}
                fill={w.color}
                fillRule="evenodd"
              />
            ),
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-heading font-extrabold text-ink text-[24px] leading-none">
            {total}
          </div>
          <div className="text-[10.5px] font-heading font-semibold uppercase tracking-wider text-ink-muted mt-1">
            People
          </div>
        </div>
      </div>

      <ul className="flex-1 min-w-[160px] space-y-1.5">
        {segments.map((s) => {
          const pct = total === 0 ? 0 : Math.round((s.count / total) * 100);
          return (
            <li key={s.key} className="flex items-center gap-2.5">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ background: s.color }}
              />
              <span className="text-[13px] font-heading font-bold text-ink">
                {s.label}
              </span>
              <span className="text-[11.5px] text-ink-muted ml-auto">
                {s.count} · {pct}%
              </span>
              <span className="text-[10.5px] text-ink-subtle hidden sm:inline">
                {s.hint}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
