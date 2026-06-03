import { createContext, useContext, useState, useEffect } from "react";
import { getMe } from "../lib/api";
import {
  DEMO_USER,
  isDemoModeActive,
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
    //    ?demo=1     → single-cohort participant
    //    ?demo=multi → multi-cohort participant (shows the cohort switcher)
    try {
      const params = new URLSearchParams(window.location.search);
      const demoParam = params.get("demo");
      if (demoParam === "1") {
        activateDemoMode({ multi: false });
      } else if (demoParam === "multi") {
        activateDemoMode({ multi: true });
      }
    } catch {
      /* ignore — server-side render or no DOM */
    }

    // 2) If demo mode is active (URL just set it, OR a prior visit set it),
    //    short-circuit auth with the demo user.
    if (isDemoModeActive()) {
      setUser(DEMO_USER);
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

  return (
    <AuthContext.Provider value={{ user, loading, isDemo, login, logout, exitDemo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
