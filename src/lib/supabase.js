// ---------------------------------------------------------------------------
// Supabase client wrapper.
//
// Initializes the Supabase client lazily when env vars are present. Until
// they are, every read returns null and every write throws SupabaseNotReady,
// which the overlay stores in src/lib/* fall back from to localStorage.
//
// Env vars (set per branch in Netlify):
//
//   VITE_SUPABASE_URL
//   VITE_SUPABASE_ANON_KEY
//
// Same runtime-import trick used in observability.js so the @supabase/supabase-js
// package doesn't have to be installed at build time. Once Phase 1 is wired
// in (`npm install @supabase/supabase-js`), this file will still work — the
// _runtimeImport just becomes a real dynamic import that Vite can chunk.
//
// Public API:
//
//   getSupabase()        → SupabaseClient | null
//   isSupabaseEnabled()  → boolean
//   supabaseStatus()     → diagnostic object for the admin /system page
//   onAuthStateChange(cb)→ wraps the supabase listener, returns unsubscribe
// ---------------------------------------------------------------------------

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const ENV_NAME = import.meta.env.VITE_ENV_NAME || import.meta.env.MODE || "development";

let _client = null;
let _ready = false;
let _initPromise = null;
let _initError = null;

// Hide the dynamic import from Rollup until @supabase/supabase-js is
// installed in package.json. Swap for a plain `await import(name)` after.
const _runtimeImport = new Function("m", "return import(m)");

/**
 * Initialize the Supabase client. Idempotent — calling multiple times returns
 * the same promise. Resolves to the client on success, null on failure (no
 * env vars or SDK missing).
 */
export async function initSupabase() {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      // No env vars → platform stays on localStorage demo mode. Expected
      // during Phase 0 (today) and Phase 1 before keys land.
      return null;
    }

    try {
      const mod = await _runtimeImport("@supabase/supabase-js");
      const createClient = mod.createClient || (mod.default && mod.default.createClient);
      if (typeof createClient !== "function") {
        throw new Error("createClient export not found on @supabase/supabase-js");
      }
      _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
      // Expected today — SDK not yet installed. Demoted to debug so the
      // console doesn't spam during development.
      // eslint-disable-next-line no-console
      console.debug("[supabase] SDK not present yet — staying in demo mode.", err?.message || err);
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
    configured: !!(SUPABASE_URL && SUPABASE_ANON_KEY),
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
