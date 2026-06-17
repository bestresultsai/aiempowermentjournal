import { useEffect, useMemo, useState } from "react";
import { ADMIN_MOCK_PARTICIPANTS, getHomeworkRows } from "./adminMockData";
import { getAccessibleCohorts } from "./adminRoles";
import { getAllCohortsForAdmin } from "./cohortAdmin";
import { getFeedbacksInScope } from "./feedbacks";

// ---------------------------------------------------------------------------
// Notifications — facilitator-only in-app notification feed.
//
// The notification stream is DERIVED from existing data sources rather than
// being a write-time queue. That keeps the data model simple: any change to
// the underlying data automatically updates the feed, and there's no risk of
// the notification store drifting out of sync.
//
// Sources (one notification per row):
//
//   1. New homework submitted (last 14 days, unreviewed)
//   2. Stale homework (submitted 3+ days ago, still unreviewed)
//   3. New journal entries in the facilitator's cohorts (last 7 days)
//   4. Low-rating feedback (1-2 stars) in the last 14 days
//
// Read state is per-notification-id (deterministic — see makeId) and lives
// in localStorage. Marking "read" doesn't dismiss the source row, just
// clears the unread indicator.
//
// Production swap: replace the source flatten with a real notifications
// table on the backend. The hook signature stays stable.
// ---------------------------------------------------------------------------

const READ_KEY = "brai_notification_read_ids";
const CHANGE_EVENT = "brai-notification-read-changed";

// ---------------------------------------------------------------------------
// Read-state store (sync API + reactive hook)
// ---------------------------------------------------------------------------

function readReadIds() {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeReadIds(set) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(READ_KEY, JSON.stringify(Array.from(set)));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    /* ignore */
  }
}

export function markNotificationRead(id) {
  if (!id) return;
  const set = readReadIds();
  if (set.has(id)) return;
  set.add(id);
  writeReadIds(set);
}

export function markAllNotificationsRead(ids) {
  const set = readReadIds();
  let changed = false;
  for (const id of ids || []) {
    if (id && !set.has(id)) {
      set.add(id);
      changed = true;
    }
  }
  if (changed) writeReadIds(set);
}

function useReadIds() {
  const [v, setV] = useState(0);
  useEffect(() => {
    function onChange() { setV((x) => x + 1); }
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", (e) => {
      if (!e.key || e.key === READ_KEY) onChange();
    });
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);
  // We don't return the version, only the live set.
  // (The hook re-renders every time v changes.)
  return useMemo(() => readReadIds(), [v]);
}

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

const HOMEWORK_STALE_DAYS = 3;
const HOMEWORK_RECENT_DAYS = 14;
const JOURNAL_RECENT_DAYS = 7;
const FEEDBACK_RECENT_DAYS = 14;

function daysAgo(iso) {
  if (!iso) return Infinity;
  const ms = Date.now() - new Date(iso).getTime();
  return ms / (1000 * 60 * 60 * 24);
}

function makeId(parts) {
  // Stable, deterministic id per source-row so read state survives reloads.
  return parts.filter(Boolean).join("::");
}

// Returns the raw notifications (without read state attached). Pass the
// list of cohort slugs in scope.
function deriveNotifications(cohortSlugs) {
  const slugSet = new Set(cohortSlugs || []);
  const notifications = [];

  // --- 1 + 2. Homework submissions in scope ---
  const homeworkRows = getHomeworkRows(cohortSlugs || [], "pending");
  for (const row of homeworkRows) {
    if (!slugSet.has(row.cohortSlug)) continue;
    const ageDays = daysAgo(row.submittedAt);
    if (ageDays > HOMEWORK_RECENT_DAYS) continue;
    const stale = ageDays >= HOMEWORK_STALE_DAYS;
    notifications.push({
      id: makeId(["hw", row.participantId, row.sessionOrder]),
      type: stale ? "homework-stale" : "homework-new",
      title: stale
        ? `Homework waiting ${Math.floor(ageDays)} days`
        : "New homework to review",
      detail: `${row.participantName} · S${row.sessionOrder}`,
      ts: row.submittedAt,
      href: "/admin/homework",
    });
  }

  // --- 3. New journal entries in scope ---
  for (const p of ADMIN_MOCK_PARTICIPANTS) {
    if (!slugSet.has(p.cohortSlug)) continue;
    for (const e of p.journalEntries || []) {
      if (daysAgo(e.date) > JOURNAL_RECENT_DAYS) continue;
      notifications.push({
        id: makeId(["journal", p.id, e.id || e.date]),
        type: "journal-entry",
        title: e.innovationTitle
          ? `New innovation: ${e.innovationTitle}`
          : "New journal entry",
        detail: `${p.name} · ${e.title || "Untitled"}`,
        ts: e.date,
        href: `/admin/participants/${p.id}`,
      });
    }
  }

  // --- 4. Low-rating feedback in scope ---
  const sinceMs = Date.now() - FEEDBACK_RECENT_DAYS * 24 * 60 * 60 * 1000;
  const recentLowFeedback = getFeedbacksInScope(cohortSlugs || [], sinceMs).filter(
    (f) => Number(f.rating) <= 2,
  );
  for (const f of recentLowFeedback) {
    notifications.push({
      id: makeId(["fb", f.id]),
      type: "feedback-low",
      title: `Low rating · ${f.rating}★`,
      detail: `${f.participantName} on S${f.sessionOrder}`,
      ts: f.submittedAt,
      href: "/admin/feedback",
    });
  }

  // Newest first.
  notifications.sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));
  return notifications;
}

// ---------------------------------------------------------------------------
// Hook — the single consumer surface. Returns notifications + read state +
// helpers. Filters to the cohorts the facilitator can access. If the user
// can't see anything (e.g. no assignments yet) the list is empty.
// ---------------------------------------------------------------------------
export function useNotifications(user) {
  const readIds = useReadIds();

  const cohortSlugs = useMemo(() => {
    if (!user) return [];
    return getAccessibleCohorts(user, getAllCohortsForAdmin()).map((c) => c.slug);
  }, [user]);

  const notifications = useMemo(
    () => deriveNotifications(cohortSlugs),
    [cohortSlugs],
  );

  const decorated = useMemo(
    () => notifications.map((n) => ({ ...n, read: readIds.has(n.id) })),
    [notifications, readIds],
  );

  const unreadCount = decorated.filter((n) => !n.read).length;
  const allIds = useMemo(() => notifications.map((n) => n.id), [notifications]);

  function markAllRead() {
    markAllNotificationsRead(allIds);
  }

  return { notifications: decorated, unreadCount, markAllRead };
}
