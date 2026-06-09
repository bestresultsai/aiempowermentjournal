import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// ---------------------------------------------------------------------------
// Modal — overlay + click-outside + ESC to close.
//
// Renders into document.body via a React portal. That guarantees the fixed
// backdrop always covers the entire viewport and the modal sits in the
// correct place regardless of ancestor transforms or scroll position.
// ---------------------------------------------------------------------------
export default function Modal({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    // Lock body scroll so the user can't scroll the page behind the modal.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      // Fixed overlay over the whole viewport. `overflow-y-auto` lets the
      // modal scroll if its content exceeds viewport height.
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-ink/60 backdrop-blur-sm animate-fade-in-up"
      style={{ paddingTop: "5vh", paddingBottom: "5vh" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl mx-4 rounded-2xl bg-surface-card shadow-lift"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

// Reusable header bar — eyebrow, title, and close button.
export function ModalHeader({ eyebrow, title, onClose }) {
  return (
    <div className="px-6 py-4 border-b border-soft flex items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
            {eyebrow}
          </div>
        )}
        <h2 className="font-heading text-[18px] font-extrabold text-ink leading-snug mt-0.5">
          {title}
        </h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-ink/5 shrink-0"
        aria-label="Close"
      >
        <X className="w-4 h-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}
