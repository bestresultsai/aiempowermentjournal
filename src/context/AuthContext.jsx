import { createContext, useContext, useState, useEffect } from "react";
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

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

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
      } else if (["super", "admin", "org", "facilitator", "leader"].includes(demoParam)) {
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
    const token = localStorage.getItem("auth_token");
    if (token) {
      getMe()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem("auth_token");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  function login(token, userData) {
    localStorage.setItem("auth_token", token);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem("auth_token");
    deactivateDemoMode();
    setUser(null);
    setIsDemo(false);
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
