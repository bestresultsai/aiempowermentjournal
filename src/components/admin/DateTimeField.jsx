import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";

// ---------------------------------------------------------------------------
// DateTimeField — branded date + time picker.
//
// Replaces the native <input type="datetime-local"> with a styled popover
// that opens a month calendar + time row. Value round-trips through the same
// "YYYY-MM-DDTHH:MM" format so it drops into the existing CohortForm without
// any data-layer changes.
//
// Props:
//   value:    "YYYY-MM-DDTHH:MM" or ""
//   onChange: (newValue) => void
//   required: boolean (controls validation state)
// ---------------------------------------------------------------------------

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseValue(value) {
  if (!value) {
    const d = new Date();
    d.setHours(16, 0, 0, 0);
    return d;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatValue(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDisplay(value) {
  if (!value) return "Pick date & time";
  const d = parseValue(value);
  const dateStr = d.toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
  const timeStr = d.toLocaleTimeString(undefined, {
    hour: "numeric", minute: "2-digit",
  });
  return `${dateStr} · ${timeStr}`;
}

export default function DateTimeField({ value, onChange, required, timeZone }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  // Position the portal-rendered popover under the trigger using fixed
  // coordinates. We render the popover at document.body so it isn't clipped
  // by overflow-hidden ancestors and won't slide behind sibling cards on the
  // session schedule.
  const [pos, setPos] = useState({ top: 0, left: 0, width: 320 });

  useLayoutEffect(() => {
    if (!open) return;
    function updatePos() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const popoverWidth = 320;
      const popoverHeight = popoverRef.current?.offsetHeight || 380;
      // Default: open below the trigger.
      let top = rect.bottom + 8;
      // If we'd run off the bottom of the viewport, flip above.
      if (top + popoverHeight > window.innerHeight - 8) {
        top = Math.max(8, rect.top - popoverHeight - 8);
      }
      let left = rect.left;
      // Keep the popover on screen horizontally.
      if (left + popoverWidth > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - popoverWidth - 8);
      }
      setPos({ top, left, width: popoverWidth });
    }
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open]);

  // Local working state — committed on Apply.
  const [draft, setDraft] = useState(() => parseValue(value));
  const [viewMonth, setViewMonth] = useState(() => {
    const d = parseValue(value);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Reset draft when reopening or when the upstream value changes.
  useEffect(() => {
    if (open) {
      const d = parseValue(value);
      setDraft(d);
      setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
    }
  }, [open, value]);

  // Click outside closes. The popover now lives at document.body (portal),
  // so we need to allow clicks inside it too — check both the wrapper and
  // the popover.
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      const w = wrapperRef.current;
      const p = popoverRef.current;
      if (w?.contains(e.target)) return;
      if (p?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleApply() {
    onChange(formatValue(draft));
    setOpen(false);
  }

  function setDate(year, month, day) {
    setDraft((d) => {
      const next = new Date(d);
      next.setFullYear(year, month, day);
      return next;
    });
  }

  function setTime(hours, minutes) {
    setDraft((d) => {
      const next = new Date(d);
      next.setHours(hours, minutes, 0, 0);
      return next;
    });
  }

  // Build the month grid.
  const firstOfMonth = new Date(viewMonth.year, viewMonth.month, 1);
  const startWeekday = firstOfMonth.getDay(); // 0=Sun
  const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  // 12-hour time pieces from draft.
  const h24 = draft.getHours();
  const isPM = h24 >= 12;
  const h12 = ((h24 + 11) % 12) + 1;
  const minutes = draft.getMinutes();

  return (
    <div ref={wrapperRef} className="relative">
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full inline-flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body hover:border-brand-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all"
      >
        <span className="inline-flex items-center gap-2 min-w-0">
          <Calendar className="w-4 h-4 text-ink-subtle shrink-0" strokeWidth={2} />
          <span className={"truncate font-heading font-semibold " + (value ? "text-ink" : "text-ink-subtle")}>
            {formatDisplay(value)}
          </span>
        </span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="text-ink-muted hover:text-ink p-0.5"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.5} />
          </span>
        )}
      </button>

      {/* Hidden native input so HTML5 `required` validation still works. */}
      <input
        type="text"
        tabIndex={-1}
        value={value}
        required={required}
        onChange={() => {}}
        className="sr-only"
        aria-hidden="true"
      />

      {/* Popover — portal-rendered to document.body with fixed positioning
          so it escapes any overflow:hidden ancestor and floats above sibling
          cards in the session schedule. */}
      {open && createPortal(
        <div
          ref={popoverRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
          className="z-[1000] rounded-2xl bg-surface-card border border-soft shadow-lift overflow-hidden animate-fade-in-up"
        >
          {/* Calendar header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-soft bg-surface-soft">
            <button
              type="button"
              onClick={() => setViewMonth((v) => {
                const m = v.month - 1;
                return m < 0 ? { year: v.year - 1, month: 11 } : { ...v, month: m };
              })}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-white"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
            </button>
            <div className="font-heading text-[13.5px] font-bold text-ink">
              {MONTHS[viewMonth.month]} {viewMonth.year}
            </div>
            <button
              type="button"
              onClick={() => setViewMonth((v) => {
                const m = v.month + 1;
                return m > 11 ? { year: v.year + 1, month: 0 } : { ...v, month: m };
              })}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-white"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          {/* Day-of-week header */}
          <div className="grid grid-cols-7 px-3 py-2 text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
            {DAYS.map((d, i) => (
              <div key={i} className="text-center">{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5 px-3 pb-3">
            {cells.map((d, i) => {
              if (d == null) return <div key={i} />;
              const cellDate = new Date(viewMonth.year, viewMonth.month, d);
              const isSelected =
                draft.getFullYear() === viewMonth.year &&
                draft.getMonth() === viewMonth.month &&
                draft.getDate() === d;
              const isToday = cellDate.getTime() === today.getTime();
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setDate(viewMonth.year, viewMonth.month, d)}
                  className={
                    "h-8 w-full rounded-lg text-[12.5px] font-heading font-semibold transition-colors " +
                    (isSelected
                      ? "bg-brand-600 text-white"
                      : isToday
                        ? "bg-brand-50 text-brand-700"
                        : "text-ink hover:bg-surface-soft")
                  }
                >
                  {d}
                </button>
              );
            })}
          </div>

          {/* Time row */}
          <div className="px-4 py-3 border-t border-soft bg-surface-soft">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-3.5 h-3.5 text-ink-muted" strokeWidth={2.25} />
              <span className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
                Time
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Stepper
                value={h12}
                min={1}
                max={12}
                onChange={(next) => {
                  const next24 = (next % 12) + (isPM ? 12 : 0);
                  setTime(next24, minutes);
                }}
              />
              <span className="text-[14px] font-heading font-bold text-ink">:</span>
              <Stepper
                value={minutes}
                min={0}
                max={59}
                step={5}
                pad
                onChange={(next) => setTime(h24, next)}
              />
              <button
                type="button"
                onClick={() => {
                  const next24 = (h12 % 12) + (!isPM ? 12 : 0);
                  setTime(next24, minutes);
                }}
                className={
                  "ml-2 px-3 py-1.5 rounded-lg text-[12px] font-heading font-bold transition-colors " +
                  "bg-white border border-soft text-ink hover:border-brand-500"
                }
              >
                {isPM ? "PM" : "AM"}
              </button>
            </div>
            {timeZone && (
              <div className="mt-2 text-[11px] text-ink-muted font-heading">
                Time zone: <span className="font-semibold text-ink">{timeZone}</span>
              </div>
            )}
          </div>

          {/* Apply / Cancel */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-soft">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-heading font-semibold text-ink-muted hover:text-ink hover:bg-ink/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-3 py-1.5 rounded-lg text-[12px] font-heading font-semibold bg-brand-600 text-white hover:bg-brand-700"
            >
              Apply
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// −/+ stepper with typeable input. Users can either click +/− or type the
// number directly. On blur, the value is clamped to [min, max].
function Stepper({ value, min, max, step = 1, pad, onChange }) {
  const [draft, setDraft] = useState(() => (pad ? String(value).padStart(2, "0") : String(value)));

  // Keep the input in sync when value changes externally (e.g., +/-).
  useEffect(() => {
    setDraft(pad ? String(value).padStart(2, "0") : String(value));
  }, [value, pad]);

  function bump(delta) {
    let next = value + delta * step;
    if (next > max) next = min;
    if (next < min) next = max;
    onChange(next);
  }

  function commit(raw) {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) {
      setDraft(pad ? String(value).padStart(2, "0") : String(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, n));
    onChange(clamped);
    setDraft(pad ? String(clamped).padStart(2, "0") : String(clamped));
  }

  return (
    <div className="inline-flex items-center rounded-lg border border-soft bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => bump(-1)}
        className="w-7 h-8 text-[14px] font-heading font-bold text-ink-muted hover:bg-surface-soft"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
        }}
        onFocus={(e) => e.target.select()}
        className="w-9 h-8 text-center font-heading font-bold text-ink text-[14px] bg-transparent focus:outline-none focus:bg-surface-soft border-0"
      />
      <button
        type="button"
        onClick={() => bump(1)}
        className="w-7 h-8 text-[14px] font-heading font-bold text-ink-muted hover:bg-surface-soft"
      >
        +
      </button>
    </div>
  );
}
