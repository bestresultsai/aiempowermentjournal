import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

// ---------------------------------------------------------------------------
// DeltaBadge — small ↑/↓/= pill for showing change vs a prior period.
//
// Props:
//   value: number (the delta itself; signed)
//   suffix: optional unit label ("entries", "hrs", etc.)
//   invertColor: true when positive change is bad (e.g. pending homework count)
// ---------------------------------------------------------------------------

export default function DeltaBadge({ value, suffix = "", invertColor = false }) {
  if (value === null || value === undefined) return null;

  // Decide visual treatment.
  const zero = value === 0;
  const positive = value > 0;
  // Default: positive = green. invertColor flips that (e.g. more pending homework = bad).
  const goodDirection = invertColor ? !positive : positive;

  const cls = zero
    ? "bg-ink/5 text-ink-muted"
    : goodDirection
      ? "bg-emerald-50 text-emerald-700"
      : "bg-red-50 text-red-700";

  const Icon = zero ? Minus : positive ? ArrowUpRight : ArrowDownRight;
  const sign = positive ? "+" : "";
  const display = `${sign}${Math.abs(value) === value ? value : value}`;

  return (
    <span className={
      "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10.5px] font-heading font-bold " +
      cls
    }>
      <Icon className="w-3 h-3" strokeWidth={3} />
      {display}
      {suffix && <span className="font-semibold opacity-80">{suffix}</span>}
    </span>
  );
}
