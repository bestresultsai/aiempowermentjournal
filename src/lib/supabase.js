// ---------------------------------------------------------------------------
// Supabase client wrapper.
//
// Initializes the Supabase client when env vars are present. Until they are,
// every read returns null and every write throws SupabaseNotReady, which the
// overlay stores in src/lib/* fall back from to localStorage.
//
// Env vars (set per branch in Netlify):
//
//   VITE_SUPABASE_URL
//   VITE_SUPABASE_PUBLISHABLE_KEY    (new format, sb_publishable_*)
//   VITE_SUPABASE_ANON_KEY           (legacy alias, still accepted)
//
// Public API:
//
//   getSupabase()        → SupabaseClient | null
//   isSupabaseEnabled()  → boolean
//   supabaseStatus()     → diagnostic object for the admin /system page
//   onAuthStateChange(cb)→ wraps the supabase listener, returns unsubscribe
// ---------------------------------------------------------------------------

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
// Accept either the new "publishable" key (sb_publishable_*) or the legacy
// "anon" key. Both work with @supabase/supabase-js identically.
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "";
const ENV_NAME = import.meta.env.VITE_ENV_NAME || import.meta.env.MODE || "development";

let _client = null;
let _ready = false;
let _initPromise = null;
let _initError = null;

/**
 * Initialize the Supabase client. Idempotent — calling multiple times returns
 * the same promise. Resolves to the client on success, null on failure (no
 * env vars or SDK missing).
 */
export async function initSupabase() {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      // No env vars → platform stays on localStorage demo mode. Expected
      // during Phase 0 (today) and Phase 1 before keys land.
      return null;
    }

    try {
      _client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        global: {
          headers: { "x-brai-env": ENV_NAME },
        },
      });
      _ready = true;
      return _client;
    } catch (err) {
      _initError = err;
      // eslint-disable-next-line no-console
      console.error("[supabase] Failed to initialize client.", err?.message || err);
      return null;
    }
  })();

  return _initPromise;
}

/**
 * Get the client synchronously. Returns null if init hasn't completed or env
 * vars aren't set. Most callers want `await initSupabase()` instead.
 */
export function getSupabase() {
  return _client;
}

export function isSupabaseEnabled() {
  return _ready && !!_client;
}

/**
 * Returns the current auth user (if any) without throwing. Useful for code
 * that runs before initSupabase() has resolved.
 */
export async function getCurrentSupabaseUser() {
  const client = await initSupabase();
  if (!client) return null;
  try {
    const { data } = await client.auth.getUser();
    return data?.user || null;
  } catch {
    return null;
  }
}

/**
 * Wraps client.auth.onAuthStateChange. Returns an unsubscribe function.
 * No-ops when Supabase isn't enabled.
 */
export function onAuthStateChange(callback) {
  let unsubscribed = false;
  let sub = null;

  initSupabase().then((client) => {
    if (unsubscribed || !client) return;
    const { data } = client.auth.onAuthStateChange((event, session) => {
      callback({ event, session, user: session?.user || null });
    });
    sub = data?.subscription;
  });

  return () => {
    unsubscribed = true;
    if (sub) {
      try { sub.unsubscribe(); } catch { /* ignore */ }
    }
  };
}

/**
 * Health probe for the admin /system page (added in Phase 1) and for tests.
 */
export function supabaseStatus() {
  return {
    configured: !!(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY),
    ready: _ready,
    url: SUPABASE_URL ? SUPABASE_URL.replace(/^https?:\/\//, "").split(".")[0] : null,
    env: ENV_NAME,
    error: _initError ? String(_initError?.message || _initError) : null,
  };
}

// Thrown by db.js helpers when callers try to write through Supabase but it
// isn't ready. Callers catch this and fall back to the localStorage overlay
// during the Phase 2 migration period.
export class SupabaseNotReady extends Error {
  constructor() {
    super("Supabase is not initialized — env vars missing or SDK not installed.");
    this.name = "SupabaseNotReady";
  }
}
