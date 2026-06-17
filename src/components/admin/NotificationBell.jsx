import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell, BookCheck, NotebookPen, Sparkles, MessageSquare, AlertTriangle, CheckCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  useNotifications,
  markNotificationRead,
} from "../../lib/notifications";

// ---------------------------------------------------------------------------
// NotificationBell — bell icon + dropdown for the admin top bar.
//
// Renders an outlined bell with a red dot when there are unread items.
// Clicking opens a panel listing every notification grouped by type, each
// linked to the page where the underlying source lives. "Mark all read"
// clears the badge. Outside-click closes the panel.
//
// Hidden when the user has no notifications AND no permission to see them
// (gracefully handled inside useNotifications which filters by accessible
// cohorts — facilitators with no assigned cohort get an empty list).
// ---------------------------------------------------------------------------

const TYPE_ICON = {
  "homework-new":   BookCheck,
  "homework-stale": AlertTriangle,
  "journal-entry":  NotebookPen,
  "feedback-low":   MessageSquare,
};

const TYPE_TONE = {
  "homework-new":   "bg-brand-50 text-brand-700",
  "homework-stale": "bg-amber-50 text-amber-700",
  "journal-entry":  "bg-emerald-50 text-emerald-700",
  "feedback-low":   "bg-rose-50 text-rose-700",
};

export default function NotificationBell() {
  const { user } = useAuth();
  const { notifications, unreadCount, markAllRead } = useNotifications(user);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return undefined;
    function onClick(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unreadCount > 0 ? ` · ${unreadCount} unread` : ""}`}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-xl border border-soft bg-surface-card text-ink-muted hover:text-ink hover:bg-surface-soft transition-colors"
      >
        <Bell className="w-4 h-4" strokeWidth={2.25} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[9.5px] font-heading font-bold tabular-nums shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 min-w-[340px] max-w-[400px] rounded-2xl bg-surface-card border border-soft shadow-lift overflow-hidden z-50 animate-fade-in-up">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-soft bg-surface-soft/60">
            <div>
              <div className="text-[13px] font-heading font-bold text-ink">
                Notifications
              </div>
              <div className="text-[11px] text-ink-muted">
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : "You're all caught up."}
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-[11.5px] font-heading font-semibold text-brand-700 hover:text-brand-800"
              >
                <CheckCheck className="w-3.5 h-3.5" strokeWidth={2.5} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          {notifications.length === 0 ? (
            <EmptyPanel />
          ) : (
            <ul className="max-h-[480px] overflow-y-auto">
              {notifications.slice(0, 20).map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onClick={() => {
                    markNotificationRead(n.id);
                    setOpen(false);
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationRow({ notification, onClick }) {
  const Icon = TYPE_ICON[notification.type] || Sparkles;
  const tone = TYPE_TONE[notification.type] || "bg-surface-soft text-ink";
  const dayLabel = (() => {
    if (!notification.ts) return "—";
    const ms = Date.now() - new Date(notification.ts).getTime();
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    if (days <= 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return new Date(notification.ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  })();

  return (
    <li>
      <Link
        to={notification.href}
        onClick={onClick}
        className={
          "flex items-start gap-3 px-4 py-3 border-b border-soft hover:bg-surface-soft/60 transition-colors " +
          (notification.read ? "opacity-80" : "")
        }
      >
        <div className={"w-8 h-8 rounded-lg flex items-center justify-center shrink-0 " + tone}>
          <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-heading text-[13px] font-bold text-ink truncate">
                {notification.title}
              </div>
              <div className="text-[11.5px] text-ink-muted truncate mt-0.5">
                {notification.detail}
              </div>
            </div>
            {!notification.read && (
              <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
            )}
          </div>
          <div className="text-[10.5px] text-ink-subtle mt-1 uppercase tracking-wider font-heading font-semibold">
            {dayLabel}
          </div>
        </div>
      </Link>
    </li>
  );
}

function EmptyPanel() {
  return (
    <div className="px-6 py-10 text-center">
      <div className="inline-flex w-10 h-10 rounded-2xl bg-surface-soft items-center justify-center mb-2">
        <Bell className="w-4 h-4 text-ink-subtle" strokeWidth={2} />
      </div>
      <div className="font-heading text-[13.5px] font-bold text-ink mb-0.5">
        Nothing to surface yet.
      </div>
      <div className="text-[11.5px] text-ink-muted max-w-[260px] mx-auto">
        Homework, journal entries, and feedback in your cohorts will appear here
        as they come in.
      </div>
    </div>
  );
}
