import { Check } from "lucide-react";

// ---------------------------------------------------------------------------
// StepperHeader — visual progress indicator across the top of the wizard.
// Renders one circle per step + a connecting line. The active step gets the
// brand fill; completed steps get a check mark; upcoming steps stay outlined.
// ---------------------------------------------------------------------------

export default function StepperHeader({ steps, current }) {
  return (
    <ol className="flex items-center w-full max-w-md mx-auto">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const done = stepNum < current;
        const active = stepNum === current;
        return (
          <li key={label} className="flex-1 flex items-center last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={
                  "w-9 h-9 rounded-full flex items-center justify-center font-heading font-bold text-[13px] transition-all duration-300 " +
                  (done
                    ? "bg-brand-600 text-white"
                    : active
                      ? "bg-ink text-white ring-4 ring-brand-100"
                      : "bg-white text-ink-muted border-2 border-soft")
                }
              >
                {done ? (
                  <Check className="w-4 h-4" strokeWidth={3} />
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={
                  "mt-2 text-[11px] font-heading font-semibold uppercase tracking-wider transition-colors duration-300 " +
                  (active ? "text-ink" : done ? "text-brand-600" : "text-ink-subtle")
                }
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={
                  "flex-1 h-0.5 mx-2 mb-6 rounded-full transition-colors duration-300 " +
                  (done ? "bg-brand-600" : "bg-soft")
                }
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
