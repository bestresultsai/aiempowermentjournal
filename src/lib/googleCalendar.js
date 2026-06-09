import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Google Calendar integration — UI-only scaffolding.
//
// In production this will be backed by a real OAuth flow:
//   1. /api/auth/google/start  — kicks off the consent screen
//   2. /api/auth/google/callback — receives the auth code, exchanges for a
//                                  refresh_token, persists it keyed to userId
//   3. /api/calendar/sync — server-side sync job triggered by the cohort
//                           pubsub. Diffs BRAI sessions against the Google
//                           "BRAI Sessions" calendar and reconciles.
//
// For now this module stores the connection state in localStorage so the UI
// can be tested end-to-end with no backend. The shape of the persisted blob
// matches what the real server will return, so when we swap in the real flow
// the consumers (Settings page, banner, status indicators) don't change.
// ---------------------------------------------------------------------------

const STORAGE_KEY_PREFIX = "brai_gcal_connection::";

// Per-user state lives at the key STORAGE_KEY_PREFIX + userId so different
// demo flavors don't bleed connection state into each other.
function readState(userId) {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + userId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeState(userId, state) {
  if (typeof window === "undefined" || !userId) return;
  try {
    if (state === null) {
      window.localStorage.removeItem(STORAGE_KEY_PREFIX + userId);
    } else {
      window.localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(state));
    }
  } catch {
    /* ignore */
  }
  // Notify subscribers in the same tab — `storage` only fires across tabs.
  try {
    window.dispatchEvent(new CustomEvent("brai-gcal-changed", { detail: { userId } }));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// useGoogleCalendarConnection — primary consumer surface for the UI.
//
// Returns:
//   {
//     connected: boolean,
//     email: string | null,
//     lastSyncedAt: ISO string | null,
//     calendarName: string,        // always "BRAI Sessions" for now
//     connect(email?): Promise,
//     disconnect(): Promise,
//     syncNow(): Promise,
//     syncing: boolean,
//   }
// ---------------------------------------------------------------------------
export function useGoogleCalendarConnection(user) {
  const userId = user?.userId || user?.email || null;
  const [state, setState] = useState(() => readState(userId));
  const [syncing, setSyncing] = useState(false);

  // Subscribe to in-tab + cross-tab changes so the UI stays in sync if the
  // user connects in one tab and the Settings page is open in another.
  useEffect(() => {
    function onChange(e) {
      if (!e || !e.detail || e.detail.userId === userId) {
        setState(readState(userId));
      }
    }
    function onStorage(e) {
      if (!e.key || e.key === STORAGE_KEY_PREFIX + userId) {
        setState(readState(userId));
      }
    }
    window.addEventListener("brai-gcal-changed", onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("brai-gcal-changed", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [userId]);

  // ----- Actions ------------------------------------------------------------

  async function connect(emailOverride) {
    // Real flow: window.location = /api/auth/google/start
    // Mock flow: fake a successful OAuth + initial sync immediately.
    if (!userId) return;
    // Small artificial latency so the spinner is visible.
    await new Promise((r) => setTimeout(r, 600));
    const next = {
      connected: true,
      email: emailOverride || user?.email || "you@bestresults.ai",
      calendarName: "BRAI Sessions",
      calendarId: `mock-cal-${userId}`,
      connectedAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
    };
    writeState(userId, next);
  }

  async function disconnect() {
    // Real flow: POST /api/auth/google/revoke
    if (!userId) return;
    await new Promise((r) => setTimeout(r, 300));
    writeState(userId, null);
  }

  async function syncNow() {
    if (!userId) return;
    const current = readState(userId);
    if (!current?.connected) return;
    setSyncing(true);
    // Real flow: POST /api/calendar/sync
    await new Promise((r) => setTimeout(r, 800));
    writeState(userId, {
      ...current,
      lastSyncedAt: new Date().toISOString(),
    });
    setSyncing(false);
  }

  return {
    connected: !!state?.connected,
    email: state?.email || null,
    calendarName: state?.calendarName || "BRAI Sessions",
    lastSyncedAt: state?.lastSyncedAt || null,
    connectedAt: state?.connectedAt || null,
    connect,
    disconnect,
    syncNow,
    syncing,
  };
}

// Helper for the banner — checks state without needing a hook (e.g. for
// server-rendered or context-detached call sites).
export function isGoogleCalendarConnected(user) {
  const userId = user?.userId || user?.email || null;
  return !!readState(userId)?.connected;
}
