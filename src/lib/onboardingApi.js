// ---------------------------------------------------------------------------
// Onboarding API client.
//
// When Supabase is wired (production): saveOnboarding updates the participant's
// profile row directly — sets preferences.onboardingCompletedAt so the gate
// stops redirecting them to /welcome on subsequent sign-ins, plus writes the
// profile fields the wizard collected. This is what makes onboarding "sticky"
// across devices and sessions.
//
// When Supabase is not wired (localhost demo): falls through to a localStorage
// stub so /welcome still works for design QA.
// ---------------------------------------------------------------------------

import { initSupabase, isSupabaseEnabled } from "./supabase";

const STORAGE_KEY = "brai_onboarding_payload";

function getToken() {
  return typeof window === "undefined"
    ? null
    : localStorage.getItem("auth_token");
}

// Strip out anything the API doesn't care about (e.g. local-only preview keys)
// and normalize trimmed strings.
function sanitize(payload) {
  // Location is grouped so it can travel as a single column / Notion property
  // when we wire the live API. The empty-string defaults keep old payloads
  // backward-compatible.
  const location = {
    country: (payload.country || "").trim(),
    state: (payload.state || "").trim(),
    city: (payload.city || "").trim(),
  };
  return {
    name: (payload.name || "").trim(),
    title: (payload.title || "").trim(),
    linkedin: (payload.linkedin || "").trim(),
    whyAi: (payload.whyAi || "").trim(),
    mainGoal: (payload.mainGoal || "").trim(),
    // headshotUrl carries the base64 data URL during the stub phase. Cloud
    // storage will replace this with a real https:// URL later.
    headshotUrl: payload.headshotUrl || null,
    location,
    defaultTimeZone: (payload.defaultTimeZone || "").trim(),
    timeZoneOverride: !!payload.timeZoneOverride,
  };
}

export async function saveOnboarding(payload) {
  const clean = sanitize(payload);
  const completedAt = new Date().toISOString();

  // Always stash in localStorage too — cheap safety net for offline / demo.
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...clean,
      onboardingCompletedAt: completedAt,
    }));
  } catch { /* ignore */ }

  // Supabase path — the real production write. Merges the wizard payload
  // into the participant's profile row so OnboardingGate stops redirecting
  // them on subsequent sign-ins, from any device.
  if (isSupabaseEnabled()) {
    const client = await initSupabase();
    if (client) {
      const { data: sessionData } = await client.auth.getSession();
      const authUser = sessionData?.session?.user;
      if (authUser?.id) {
        // Read current preferences so we can merge (don't clobber other keys).
        const { data: existing } = await client
          .from("profiles")
          .select("preferences")
          .eq("id", authUser.id)
          .maybeSingle();
        const nextPrefs = {
          ...(existing?.preferences || {}),
          onboardingCompletedAt: completedAt,
          title: clean.title,
          linkedin: clean.linkedin,
          whyAi: clean.whyAi,
          mainGoal: clean.mainGoal,
          location: clean.location,
        };
        const update = {
          preferences: nextPrefs,
          time_zone: clean.defaultTimeZone || undefined,
        };
        if (clean.name) update.name = clean.name;
        if (clean.headshotUrl) update.avatar_url = clean.headshotUrl;
        const { error } = await client
          .from("profiles")
          .update(update)
          .eq("id", authUser.id);
        if (error) {
          throw new Error(error.message || "Failed to save onboarding to Supabase.");
        }
        return { ok: true, profile: { ...clean, onboardingCompletedAt: completedAt } };
      }
    }
  }

  // Demo / no-Supabase fallback — same shape, in-memory only.
  await new Promise((r) => setTimeout(r, 300));
  return { ok: true, profile: { ...clean, onboardingCompletedAt: completedAt } };
}

// Optional: read any previously-saved payload (useful for debugging /welcome).
export function readSavedOnboarding() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSavedOnboarding() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
