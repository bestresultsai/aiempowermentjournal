import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

// ---------------------------------------------------------------------------
// Select — brand-styled dropdown that replaces the native <select>.
//
// Why we built our own:
//   - Native <select> renders the OS popup, which on macOS/Windows looks
//     completely off-brand (gray + bright blue highlight) and breaks our
//     visual language. The popover here matches our cards: rounded-xl,
//     border-soft, ink-100 text.
//
// Props:
//   value      currently-selected option value
//   onChange   (newValue) => void
//   options    Array<{ value, label, group?, disabled?, icon?, hint? }>
//   placeholder    shown when no value (or empty string) is selected
//   icon       optional Lucide icon component shown inside the trigger
//   disabled   disables the trigger
//   ariaLabel  accessibility label when no visible <label> is provided
//   matchTriggerWidth  default true — pin menu width to trigger width
//   className  extra classes on the trigger button
//
// Implementation notes:
//   - Menu renders into a portal on document.body so it floats above modals,
//     sticky bars, and overflow-hidden containers.
//   - Positioned next to the trigger using getBoundingClientRect(). Re-runs
//     on scroll/resize while open.
//   - Keyboard: Enter/Space to open, Esc/Tab to close, Up/Down to move,
//     Enter to commit.
// ---------------------------------------------------------------------------

export default function Select({
  value,
  onChange,
  options = [],
  placeholder = "Select…",
  icon: IconCmp,
  disabled = false,
  ariaLabel,
  matchTriggerWidth = true,
  className = "",
}) {
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });

  const selected = options.find((o) => o.value === value);

  // Position menu under the trigger.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    function update() {
      const r = triggerRef.current.getBoundingClientRect();
      setMenuPos({
        top: r.bottom + 6,
        left: r.left,
        width: matchTriggerWidth ? r.width : Math.max(r.width, 220),
      });
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, matchTriggerWidth]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (
        triggerRef.current?.contains(e.target) ||
        menuRef.current?.contains(e.target)
      )
        return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function commitIndex(i) {
    const opt = options[i];
    if (!opt || opt.disabled) return;
    onChange?.(opt.value);
    setOpen(false);
  }

  function handleKey(e) {
    if (disabled) return;
    if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault();
      setOpen(true);
      const i = Math.max(0, options.findIndex((o) => o.value === value));
      setActiveIndex(i);
      return;
    }
    if (!open) return;
    if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min((i < 0 ? -1 : i) + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      commitIndex(activeIndex >= 0 ? activeIndex : options.findIndex((o) => o.value === value));
    }
  }

  // Build flat list of items with optional group headers.
  const grouped = [];
  let lastGroup = null;
  options.forEach((opt, i) => {
    if (opt.group && opt.group !== lastGroup) {
      grouped.push({ type: "group", label: opt.group });
      lastGroup = opt.group;
    }
    grouped.push({ type: "opt", opt, i });
  });

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-soft text-[13px] text-ink text-left transition-colors hover:border-ink/30 focus:outline-none focus:ring-2 focus:ring-brand-300 ${
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
        } ${className}`}
      >
        {IconCmp && (
          <IconCmp className="w-3.5 h-3.5 shrink-0 opacity-60" strokeWidth={2.5} />
        )}
        <span
          className={`flex-1 min-w-0 truncate font-heading font-semibold ${
            selected ? "" : "opacity-60"
          }`}
        >
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform opacity-60 ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={2.5}
        />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              zIndex: 1000,
            }}
            className="bg-white border border-soft rounded-xl shadow-lg overflow-hidden animate-fade-in-up"
          >
            <div className="max-h-72 overflow-y-auto py-1">
              {grouped.map((item, idx) => {
                if (item.type === "group") {
                  return (
                    <div
                      key={`g-${idx}`}
                      className="px-3 pt-2 pb-1 text-[10px] font-heading font-extrabold tracking-wider uppercase text-ink-subtle"
                    >
                      {item.label}
                    </div>
                  );
                }
                const { opt, i } = item;
                const isSelected = opt.value === value;
                const isActive = i === activeIndex;
                const Icon = opt.icon;
                return (
                  <button
                    key={`${opt.value}-${i}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => commitIndex(i)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors ${
                      opt.disabled
                        ? "text-ink-subtle cursor-not-allowed"
                        : isActive
                        ? "bg-brand-50 text-ink"
                        : "text-ink hover:bg-surface-soft"
                    }`}
                  >
                    {Icon && (
                      <Icon
                        className="w-3.5 h-3.5 shrink-0 text-ink-muted"
                        strokeWidth={2.5}
                      />
                    )}
                    <span
                      className={`flex-1 min-w-0 truncate font-heading ${
                        isSelected ? "font-extrabold" : "font-semibold"
                      }`}
                    >
                      {opt.label}
                    </span>
                    {opt.hint && (
                      <span className="text-[11px] text-ink-muted font-heading font-semibold shrink-0">
                        {opt.hint}
                      </span>
                    )}
                    {isSelected && (
                      <Check
                        className="w-3.5 h-3.5 text-brand-700 shrink-0"
                        strokeWidth={3}
                      />
                    )}
                  </button>
                );
              })}
              {options.length === 0 && (
                <div className="px-3 py-3 text-[12px] text-ink-muted">
                  No options
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
