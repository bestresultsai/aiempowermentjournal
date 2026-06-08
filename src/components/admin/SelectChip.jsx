import { ChevronDown } from "lucide-react";

// ---------------------------------------------------------------------------
// SelectChip — a compact filter dropdown styled as a chip.
//
// Implementation note: the native <select> is layered on top of the chip and
// rendered invisible (opacity-0), but it covers the whole pill including the
// chevron. That means clicking ANYWHERE on the chip — label, value, or arrow —
// opens the OS dropdown. The visible text + chevron we render are purely for
// styling (browsers don't let you restyle the native dropdown well).
//
// Props:
//   label: short label shown before the value (e.g., "Organization", "Cohort")
//   value: current value (null = "all")
//   onChange: (newValue) => void — receives null when user picks the "All" option
//   options: [{ value, label }] — first option should be the "All …" entry
//   active: boolean — set true when a non-null value is selected; styles accordingly
// ---------------------------------------------------------------------------

export default function SelectChip({ label, value, onChange, options, active }) {
  const keyFor = (v) => (v === null || v === undefined ? "__null__" : String(v));
  const currentOption = options.find((o) => keyFor(o.value) === keyFor(value));
  const currentLabel = currentOption?.label || "—";

  return (
    <span
      className={
        "relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-200 " +
        (active
          ? "bg-ink text-white border-ink"
          : "bg-surface-card border-soft text-ink-muted hover:text-ink hover:border-brand-500")
      }
    >
      {/* Visible styled label + value + chevron — purely decorative. */}
      <span className={
        "text-[10.5px] font-heading font-bold uppercase tracking-wider pointer-events-none " +
        (active ? "text-white/70" : "text-ink-subtle")
      }>
        {label}
      </span>
      <span className={
        "text-[12.5px] font-heading font-semibold pointer-events-none " +
        (active ? "text-white" : "text-ink")
      }>
        {currentLabel}
      </span>
      <ChevronDown
        className={"w-3.5 h-3.5 pointer-events-none " + (active ? "text-white/80" : "text-ink-muted")}
        strokeWidth={2.5}
      />

      {/* Real <select> stretched over the whole chip + invisible. Catches every
          click — including on the chevron — and opens the native dropdown. */}
      <select
        value={keyFor(value)}
        onChange={(e) => {
          const k = e.target.value;
          const opt = options.find((o) => keyFor(o.value) === k);
          onChange(opt ? opt.value : null);
        }}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-label={label}
      >
        {options.map((opt) => (
          <option
            key={keyFor(opt.value)}
            value={keyFor(opt.value)}
            style={{ color: "#111", background: "#fff" }}
          >
            {opt.label}
          </option>
        ))}
      </select>
    </span>
  );
}
