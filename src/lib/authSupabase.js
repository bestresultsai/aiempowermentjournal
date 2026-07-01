// ---------------------------------------------------------------------------
// authSupabase.js — Supabase auth shim.
//
// This module knows how to (a) send a magic link, (b) detect the current
// session, (c) load the matching profile row from public.profiles, and
// (d) subscribe to auth state changes.
//
// Everything here is a no-op when Supabase isn't configured — the legacy
// localStorage demo path keeps working. This file is the single integration
// point so AuthContext / Login / AuthVerify don't need to know about
// Supabase shape directly.
// ---------------------------------------------------------------------------

import {
  initSupabase,
  isSupabaseEnabled,
  onAuthStateChange,
  SupabaseNotReady,
} from "./supabase";
import { db } from "./db";
import { captureError } from "./observability";

/**
 * Send a magic-link email to `email`. Resolves on success, throws on error.
 *
 * `next` is the same-origin path the user was originally trying to reach.
 * We round-trip it through the magic-link redirect URL so AuthVerify can
 * land them in the right place after the link is clicked.
 */
export async function sendSupabaseMagicLink(email, { next = "/home" } = {}) {
  const client = await initSupabase();
  if (!client) throw new SupabaseNotReady();

  const redirect = new URL("/auth/verify", window.location.origin);
  if (next) redirect.searchParams.set("next", next);

  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirect.toString(),
      // shouldCreateUser: false — we're invite-only. Only seeded users sign in.
      shouldCreateUser: false,
    },
  });

  if (error) {
    captureError(error, { source: "sendSupabaseMagicLink", email });
    throw error;
  }
}

/**
 * Fetch the current Supabase session if any. Returns { session, user } or
 * { session: null, user: null }.
 */
export async function getCurrentSession() {
  const client = await initSupabase();
  if (!client) return { session: null, user: null };
  try {
    const { data } = await client.auth.getSession();
    return {
      session: data?.session || null,
      user: data?.session?.user || null,
    };
  } catch (err) {
    captureError(err, { source: "getCurrentSession" });
    return { session: null, user: null };
  }
}

/**
 * Load the `profiles` row matching the Supabase auth user. Returns a
 * platform-shaped user object that AuthContext can consume directly.
 *
 * Returns null if the profile row doesn't exist — this means the auth
 * user signed in but we never seeded a profile for them (shouldn't happen
 * under invite-only signup, but we defend anyway).
 */
export async function loadProfileForAuthUser(authUser) {
  if (!authUser?.id) return null;

  try {
    const row = await db.get("profiles", authUser.id);
    if (!row) {
      // Auth session exists but no profile row. This is an inconsistency —
      // either the user was created bypassing the seed flow, or someone
      // deleted the profile row. Sign them out so they don't end up in an
      // unusable half-signed-in state.
      // eslint-disable-next-line no-console
      console.warn(
        "[authSupabase] Auth user has no matching profile row:",
        authUser.email,
      );
      return null;
    }

    return shapeProfileForApp(row, authUser);
  } catch (err) {
    captureError(err, { source: "loadProfileForAuthUser", authUserId: authUser.id });
    throw err;
  }
}

/**
 * Best-effort read of the client-side onboarding stash so users who completed
 * the wizard on this device but whose DB write silently didn't stick (RLS,
 * race, connectivity) don't get thrown back into the wizard on the next
 * session. Mirrors STORAGE_KEY in src/lib/onboardingApi.js.
 */
function readLocalOnboardingTimestamp() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("brai_onboarding_payload");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.onboardingCompletedAt || null;
  } catch {
    return null;
  }
}

/**
 * Map a profiles row + auth.users record into the user object shape the rest
 * of the app expects. This is the single translation layer between the new
 * Supabase schema and the legacy in-memory user shape used by every page.
 */
function shapeProfileForApp(profileRow, authUser) {
  return {
    // Identity
    userId: profileRow.id,
    email: profileRow.email || authUser?.email || "",
    name: profileRow.name || authUser?.user_metadata?.name || "",
    headshotUrl: profileRow.avatar_url || null,

    // Role + capabilities. AuthContext + permissions.js read both `role`
    // and `capabilities`. We derive `role` from capabilities for back-compat
    // with the older code paths that haven't been refactored to read
    // capabilities directly.
    capabilities: Array.isArray(profileRow.capabilities) ? profileRow.capabilities : ["participant"],
    role: primaryRoleFromCapabilities(profileRow.capabilities),

    // Scope hints
    orgId: profileRow.org_id || null,

    // Preferences / settings
    phone: profileRow.phone || "",
    defaultTimeZone: profileRow.time_zone || "America/New_York",
    preferences: profileRow.preferences || {},

    // Onboarding state. Phase 1 puts this in `preferences.onboardingCompletedAt`
    // — Phase 2 may promote it to its own column. For now the location is
    // hidden behind this getter so callers don't need to know.
    //
    // Staff (super/admin/facilitator) never go through participant onboarding,
    // so we synthesize a completion timestamp for them if it's not already set.
    // Otherwise OnboardingGate would loop them back into /welcome on every
    // profile re-fetch.
    //
    // Participants get a localStorage fallback: if we can't find the timestamp
    // in the profile row but we DO see it in the client-side stash from a
    // prior wizard completion on this device, we honor it. This guards
    // against the "session timed out → thrown back into WelcomeWizard" bug
    // Mike reported, which happens when the DB update from saveOnboarding
    // silently didn't persist (RLS 0-row update, transient error).
    onboardingCompletedAt:
      profileRow.preferences?.onboardingCompletedAt ||
      (isStaffCapability(profileRow.capabilities)
        ? profileRow.created_at || new Date().toISOString()
        : readLocalOnboardingTimestamp()),

    // Marker so downstream code can tell "this is a real Supabase user"
    // vs a demo user.
    _source: "supabase",
  };
}

// Staff capabilities skip the participant onboarding wizard entirely.
function isStaffCapability(caps) {
  if (!Array.isArray(caps)) return false;
  return caps.some((c) => c === "super" || c === "admin" || c === "facilitator" || c === "org_admin");
}

function primaryRoleFromCapabilities(caps) {
  if (!Array.isArray(caps)) return "participant";
  // Priority order matches src/lib/adminRoles.js primaryEffectiveRole()
  if (caps.includes("super")) return "super";
  if (caps.includes("admin")) return "admin";
  if (caps.includes("org_admin")) return "org_admin";
  if (caps.includes("facilitator")) return "facilitator";
  if (caps.includes("cohort_leader")) return "participant"; // leaders display as participants in role
  return "participant";
}

/**
 * Subscribe to auth state changes. Returns an unsubscribe function.
 *
 * The callback is invoked with `{ event, session, user }` where `user`
 * may be null (signed out) or a Supabase auth user (signed in). Callers
 * still need to call loadProfileForAuthUser to get the platform-shaped
 * user object.
 */
export function subscribeToAuthChanges(callback) {
  return onAuthStateChange(callback);
}

/**
 * Sign the current user out of Supabase. No-op when Supabase isn't enabled.
 */
export async function signOutSupabase() {
  const client = await initSupabase();
  if (!client) return;
  try {
    await client.auth.signOut();
  } catch (err) {
    captureError(err, { source: "signOutSupabase" });
  }
}

// Re-exports for convenience.
export { isSupabaseEnabled, SupabaseNotReady };
