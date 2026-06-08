import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, User } from "lucide-react";

// ---------------------------------------------------------------------------
// FacilitatorPicker — branded dropdown that shows avatar + name per option.
//
// Replaces the plain native <select> for facilitator assignment so the
// form has a more human feel — admins recognize people by face/initials.
//
// Props:
//   value:     facilitator id (or "")
//   onChange:  (id) => void
//   facilitators: [{ id, name, email, headshotUrl? }]
//   required:  boolean
// ---------------------------------------------------------------------------

function initialsOf(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function Avatar({ person, size = 32 }) {
  const initials = initialsOf(person?.name);
  if (person?.headshotUrl) {
    return (
      <img
        src={person.headshotUrl}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      className="rounded-full bg-brand-700 text-white flex items-center justify-center font-heading font-bold shrink-0"
    >
      {initials}
    </div>
  );
}

export default function FacilitatorPicker({ value, onChange, facilitators, required }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const selected = facilitators.find((f) => f.id === value);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full inline-flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-soft bg-surface-card hover:border-brand-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all"
      >
        <span className="inline-flex items-center gap-3 min-w-0">
          {selected ? (
            <>
              <Avatar person={selected} size={32} />
              <span className="min-w-0 text-left">
                <span className="block font-heading text-[14px] font-semibold text-ink truncate">
                  {selected.name}
                </span>
                {selected.email && (
                  <span className="block text-[11.5px] text-ink-muted truncate">{selected.email}</span>
                )}
              </span>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-ink/5 text-ink-subtle flex items-center justify-center shrink-0">
                <User className="w-4 h-4" strokeWidth={2} />
              </div>
              <span className="text-[14px] font-heading text-ink-subtle">
                Pick a facilitator
              </span>
            </>
          )}
        </span>
        <ChevronDown
          className={"w-4 h-4 text-ink-muted transition-transform " + (open ? "rotate-180" : "")}
          strokeWidth={2.5}
        />
      </button>

      {/* Hidden text input so HTML5 `required` validation still triggers. */}
      <input
        type="text"
        tabIndex={-1}
        value={value || ""}
        required={required}
        onChange={() => {}}
        className="sr-only"
        aria-hidden="true"
      />

      {/* Options */}
      {open && (
        <div className="absolute z-30 top-full left-0 right-0 mt-2 max-h-72 overflow-y-auto rounded-2xl bg-surface-card border border-soft shadow-lift animate-fade-in-up">
          {facilitators.length === 0 ? (
            <div className="p-4 text-[13px] text-ink-muted text-center">
              No facilitators available.
            </div>
          ) : (
            facilitators.map((f) => {
              const active = f.id === value;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { onChange(f.id); setOpen(false); }}
                  className={
                    "w-full flex items-center gap-3 px-3 py-2.5 border-b border-soft last:border-b-0 transition-colors " +
                    (active ? "bg-brand-50/60" : "hover:bg-surface-soft")
                  }
                >
                  <Avatar person={f} size={32} />
                  <div className="flex-1 min-w-0 text-left">
                    <div className={"text-[13.5px] font-heading font-semibold truncate " + (active ? "text-brand-700" : "text-ink")}>
                      {f.name}
                    </div>
                    {f.email && (
                      <div className="text-[11.5px] text-ink-muted truncate">{f.email}</div>
                    )}
                  </div>
                  {active && (
                    <Check className="w-4 h-4 text-brand-600 shrink-0" strokeWidth={2.5} />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
