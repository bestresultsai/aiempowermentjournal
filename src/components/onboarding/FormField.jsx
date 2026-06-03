// ---------------------------------------------------------------------------
// FormField — labeled input used across the onboarding wizard.
//
// Same visual treatment as Settings.jsx's Field, factored out so the wizard
// can drop new fields in without copy-pasting boilerplate.
// ---------------------------------------------------------------------------

export function FormField({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
  required,
}) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
        {label}
        {required && <span className="text-brand-600 ml-1">*</span>}
      </span>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle pointer-events-none" strokeWidth={2} />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={
            "w-full py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body placeholder:text-ink-subtle focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all " +
            (Icon ? "pl-10 pr-4" : "px-4")
          }
        />
      </div>
      {hint && <p className="text-[11.5px] text-ink-muted mt-1.5 leading-relaxed">{hint}</p>}
    </label>
  );
}

export function FormTextarea({
  label,
  value,
  onChange,
  placeholder,
  hint,
  rows = 4,
  required,
}) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
        {label}
        {required && <span className="text-brand-600 ml-1">*</span>}
      </span>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body placeholder:text-ink-subtle focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all resize-y leading-relaxed"
      />
      {hint && <p className="text-[11.5px] text-ink-muted mt-1.5 leading-relaxed">{hint}</p>}
    </label>
  );
}
