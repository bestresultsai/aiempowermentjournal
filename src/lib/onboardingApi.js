// ---------------------------------------------------------------------------
// Onboarding API client.
//
// Phase 1 (now): the wizard saves to localStorage so demo mode + real users
// alike can complete onboarding without a backend round-trip. The shape of
// the payload mirrors what the Notion `Users` DB will eventually accept.
//
// Phase 2 (TODO when Notion writes ship):
//   POST /api/users/me/onboarding
//   body: { name, title, linkedin, whyAi, mainGoal, headshotUrl }
//   →    { ok: true, user: { ..., onboardingCompletedAt: ISO } }
//
// The frontend should stay agnostic of which phase is live — flip
// `USE_MOCK_DATA` and the rest of the app keeps working.
// ---------------------------------------------------------------------------

export const USE_MOCK_DATA = true;

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

  if (USE_MOCK_DATA) {
    // Persist locally so a refresh keeps the user "onboarded" (the AuthContext
    // doesn't currently rehydrate from this — it just trusts in-memory state —
    // but persisting here keeps the wizard idempotent during demos).
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...clean,
        onboardingCompletedAt: new Date().toISOString(),
      }));
    } catch {
      /* ignore — storage quota / private mode */
    }
    // Tiny artificial latency so the Saving… state actually renders.
    await new Promise((r) => setTimeout(r, 500));
    return { ok: true, profile: clean };
  }

  // Live path. Wire this up once /api/users/me/onboarding exists.
  const token = getToken();
  const res = await fetch("/api/users/me/onboarding", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(clean),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to save onboarding");
  return data;
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
