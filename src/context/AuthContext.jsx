import { createContext, useContext, useRef, useState, useEffect } from "react";
import { getMe } from "../lib/api";
import {
  DEMO_USER,
  DEMO_USER_OVERRIDES,
  isDemoModeActive,
  isOnboardingDemo,
  isAnyAdminDemo,
  getDemoFlavor,
  activateDemoMode,
  deactivateDemoMode,
} from "../lib/demoData";
import { identifyUser, resetUser } from "../lib/observability";
import { isSupabaseEnabled } from "../lib/supabase";
import {
  loadProfileForAuthUser,
  subscribeToAuthChanges,
  signOutSupabase,
} from "../lib/authSupabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  // Ref flag flipped during logout so any auth-state-change event that
  // fires while Supabase's async signOut is still in flight can't
  // re-populate the user. Without this, the "auto sign-in immediately
  // after Sign out" bug happens: the local session is still valid at
  // the instant we navigate to /login, the token-refresh listener sees
  // it, and setUser gets called with the old profile.
  const signingOutRef = useRef(false);

  useEffect(() => {
    // 1) If the URL has `?demo=...`, activate demo mode (persisted in localStorage).
    //    Participant flavors:
    //      ?demo=1           → single-cohort participant
    //      ?demo=multi       → multi-cohort participant
    //      ?demo=onboarding  → un-onboarded participant (lands on /welcome)
    //    Admin flavors:
    //      ?demo=super       → Super Admin (sees everything)
    //      ?demo=admin       → BRAI staff admin (sees everything)
    //      ?demo=org         → IAHE org admin (scoped to IAHE)
    //      ?demo=facilitator → Mike (scoped to assigned cohorts)
    try {
      const params = new URLSearchParams(window.location.search);
      const demoParam = params.get("demo");
      if (demoParam === "1") {
        activateDemoMode({ multi: false });
      } else if (demoParam === "multi") {
        activateDemoMode({ multi: true });
      } else if (demoParam === "onboarding") {
        activateDemoMode({ onboarding: true });
      } else if (
        ["super", "admin", "org", "facilitator", "facilitator-pure", "leader"].includes(demoParam)
      ) {
        activateDemoMode({ role: demoParam });
      }
    } catch {
      /* ignore — server-side render or no DOM */
    }

    // 2) If demo mode is active, short-circuit auth with a demo user shaped
    //    to whichever flavor is set.
    if (isDemoModeActive()) {
      const flavor = getDemoFlavor();
      let demoUser = DEMO_USER;

      if (isOnboardingDemo()) {
        demoUser = {
          ...DEMO_USER,
          title: "",
          linkedin: "",
          whyAi: "",
          mainGoal: "",
          headshotUrl: null,
          onboardingCompletedAt: null,
        };
      } else if (isAnyAdminDemo() && DEMO_USER_OVERRIDES[flavor]) {
        // Admin flavors completely replace identity (name/email/role/scope)
        // so the demo feels like a different person logging in.
        demoUser = {
          ...DEMO_USER,
          ...DEMO_USER_OVERRIDES[flavor],
          userId: `demo-${flavor}`,
        };
      } else if (flavor === "leader" && DEMO_USER_OVERRIDES.leader) {
        // Cohort leader — still a participant, but identity matches a seeded
        // participant record with isCohortLead=true so useCohortLeader()
        // unlocks the /leader/cohort dashboard.
        demoUser = {
          ...DEMO_USER,
          ...DEMO_USER_OVERRIDES.leader,
          userId: "demo-leader",
        };
      }

      setUser(demoUser);
      setIsDemo(true);
      setLoading(false);
      return;
    }

    // 3) Otherwise, real magic-link auth flow.
    //
    // When Supabase is configured (VITE_SUPABASE_URL + publishable key set),
    // we hydrate from the Supabase session and listen for auth changes.
    // Otherwise we fall back to the legacy token-in-localStorage path.
    let unsubscribe = null;
    let cancelled = false;

    if (isSupabaseEnabled()) {
      // Single source of truth for the auth session: onAuthStateChange fires
      // an INITIAL_SESSION event synchronously on subscribe carrying the
      // current session (Supabase v2 behavior). That replaces the old
      // getCurrentSession() pre-fetch — running BOTH caused a visible
      // double render on every page load (fetch profile twice, setUser
      // twice), which participants perceived as the app "reloading twice."
      //
      // Live updates from other tabs (magic-link clicks, sign-out) flow
      // through the same handler.
      //
      // Skip re-fetching the profile on TOKEN_REFRESHED — Supabase fires
      // that ~5 minutes after every load when the access token cycles, and
      // we don't need to re-read profiles just because the JWT changed.
      unsubscribe = subscribeToAuthChanges(async ({ event, user: authUser }) => {
        if (cancelled) return;
        if (event === "SIGNED_OUT" || !authUser) {
          setUser(null);
          resetUser();
          setLoading(false);
          return;
        }
        // Ignore SIGNED_IN / INITIAL_SESSION while a logout is in progress
        // — otherwise the still-valid Supabase session (signOut hasn't
        // finished yet) re-populates the user the instant we navigate to
        // /login.
        if (signingOutRef.current) {
          setLoading(false);
          return;
        }
        // TOKEN_REFRESHED = access token cycled; nothing profile-relevant
        // changed. Skip the network round-trip.
        if (event === "TOKEN_REFRESHED") {
          setLoading(false);
          return;
        }
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          try {
            const profile = await loadProfileForAuthUser(authUser);
            if (cancelled || signingOutRef.current) return;
            if (profile) {
              setUser(profile);
              identifyUser(profile);
            } else {
              // Auth session but no profile row → sign out to clear stale state.
              await signOutSupabase();
            }
          } catch {
            /* swallow — error already captured */
          } finally {
            if (!cancelled) setLoading(false);
          }
        }
      });
    } else {
      // Legacy fallback (today's prod path): the platform runs without
      // Supabase env vars, so we use the in-memory token + getMe() stub.
      const token = localStorage.getItem("auth_token");
      if (token) {
        getMe()
          .then((u) => { if (!cancelled) setUser(u); })
          .catch(() => {
            localStorage.removeItem("auth_token");
            if (!cancelled) setUser(null);
          })
          .finally(() => { if (!cancelled) setLoading(false); });
      } else {
        setLoading(false);
      }
    }

    return () => {
      cancelled = true;
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  function login(token, userData) {
    localStorage.setItem("auth_token", token);
    setUser(userData);
    // Identify the user to Sentry + PostHog so subsequent errors and events
    // are attributed correctly. No-ops until #399 wires real DSN/keys.
    identifyUser(userData);
  }

  async function logout() {
    // Flip the guard BEFORE anything else so the auth listener treats
    // any subsequent SIGN_IN / TOKEN_REFRESHED as noise.
    signingOutRef.current = true;
    localStorage.removeItem("auth_token");
    deactivateDemoMode();
    setUser(null);
    setIsDemo(false);
    resetUser();
    try {
      // AWAIT the Supabase sign-out so the session in localStorage is
      // definitively gone before the caller navigates away. Without this
      // await the fire-and-forget signOut could still be in flight when
      // Login mounts, the token refresh listener would see a live session,
      // and it would silently re-authenticate the user — the exact "auto
      // sign-in right after Sign out" bug users reported.
      await signOutSupabase();
    } catch { /* ignore — best-effort */ }
    signingOutRef.current = false;
  }

  function exitDemo() {
    deactivateDemoMode();
    setUser(null);
    setIsDemo(false);
  }

  // Called by the WelcomeWizard once the user finishes onboarding.
  // Merges the captured profile fields onto the in-memory user and stamps
  // `onboardingCompletedAt` so the gate stops redirecting to /welcome.
  function completeOnboarding(profile) {
    setUser((prev) =>
      prev
        ? {
            ...prev,
            ...profile,
            onboardingCompletedAt: new Date().toISOString(),
          }
        : prev,
    );
  }

  // Derived flag — true when we have a signed-in user who hasn't yet
  // finished the welcome wizard. Used by <OnboardingGate>.
  const needsOnboarding = !!user && !user.onboardingCompletedAt;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isDemo,
        needsOnboarding,
        login,
        logout,
        exitDemo,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
