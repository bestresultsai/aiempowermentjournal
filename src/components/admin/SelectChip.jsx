import { ChevronDown } from "lucide-react";

// ---------------------------------------------------------------------------
// SelectChip — a compact filter dropdown styled as a chip.
//
// Inline label + native <select> for zero-dependency keyboard + a11y.
// Use across the admin panel as a consistent filter affordance.
//
// Props:
//   label: short label shown before the value (e.g., "Org", "Cohort")
//   value: current value (null = "all")
//   onChange: (newValue) => void  — receives null when user picks the All option
//   options: [{ value, label }]  — first option should be the "All …" entry
//   active: boolean — set true when a non-null value is selected; styles accordingly
// ---------------------------------------------------------------------------

export default function SelectChip({ label, value, onChange, options, active }) {
  // Build a stable map of string-keys → real values so the native select can
  // round-trip null + non-string values.
  const keyFor = (v) => (v === null || v === undefined ? "__null__" : String(v));
  return (
    <label
      className={
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer " +
        (active
          ? "bg-ink text-white border-ink"
          : "bg-surface-card border-soft text-ink-muted hover:text-ink hover:border-brand-500")
      }
    >
      <span className={
        "text-[10.5px] font-heading font-bold uppercase tracking-wider " +
        (active ? "text-white/70" : "text-ink-subtle")
      }>
        {label}
      </span>
      <select
        value={keyFor(value)}
        onChange={(e) => {
          const k = e.target.value;
          const opt = options.find((o) => keyFor(o.value) === k);
          onChange(opt ? opt.value : null);
        }}
        className={
          "bg-transparent text-[12.5px] font-heading font-semibold focus:outline-none appearance-none pr-1 " +
          (active ? "text-white" : "text-ink")
        }
        style={{
          // Hide the default arrow — we render our own Lucide chevron below.
          WebkitAppearance: "none",
          MozAppearance: "none",
          appearance: "none",
        }}
      >
        {options.map((opt) => (
          <option
            key={keyFor(opt.value)}
            value={keyFor(opt.value)}
            // Style the option text so it stays readable on the OS-native dropdown.
            style={{ color: "#111", background: "#fff" }}
          >
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className={"w-3.5 h-3.5 " + (active ? "text-white/80" : "text-ink-muted")} strokeWidth={2.5} />
    </label>
  );
}
