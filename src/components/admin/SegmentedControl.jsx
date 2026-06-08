// ---------------------------------------------------------------------------
// SegmentedControl — connected pill bar for picking one of a small set of options.
//
// Used for time-range filters where seeing every option at a glance is valuable.
// Reads more like a single coherent picker than separate pills.
//
// Props: options = [{ key, label }], value, onChange(key), size = "sm" | "md"
// ---------------------------------------------------------------------------

export default function SegmentedControl({ options, value, onChange, size = "md" }) {
  const padCls = size === "sm" ? "px-2.5 py-1" : "px-3 py-1.5";
  const textCls = size === "sm" ? "text-[11.5px]" : "text-[12.5px]";
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full bg-ink/5 p-0.5">
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={
              "rounded-full font-heading font-semibold transition-all duration-200 " +
              padCls + " " + textCls + " " +
              (active
                ? "bg-ink text-white shadow-sm"
                : "text-ink-muted hover:text-ink")
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
