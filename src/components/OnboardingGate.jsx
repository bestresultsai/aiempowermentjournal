import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ---------------------------------------------------------------------------
// OnboardingGate
//
// Wraps the routed app. Two redirect rules:
//
//   1. Signed-in user who hasn't completed onboarding AND isn't already on
//      /welcome → send them to /welcome.
//
//   2. Signed-in user who HAS completed onboarding AND is sitting on /welcome
//      → send them to /home (don't let people loop back into the wizard).
//
// Public routes (/, /login, /auth/verify) are always allowed through so an
// un-onboarded user can still sign in or land on the marketing page.
// ---------------------------------------------------------------------------

const PUBLIC_PATHS = ["/", "/login", "/auth/verify", "/privacy", "/terms", "/help", "/contact", "/nda"];

export default function OnboardingGate({ children }) {
  const { user, loading, needsOnboarding } = useAuth();
  const { pathname, search } = useLocation();

  // While auth is resolving, render whatever the route would normally render.
  // (Each page already handles its own "you need to sign in" state, so no
  // global spinner is needed here.)
  if (loading) return children;

  if (!user) return children;

  const isPublic = PUBLIC_PATHS.includes(pathname);
  const onWelcome = pathname === "/welcome";
  // ?preview=1 lets an already-onboarded admin/facilitator open /welcome to
  // QA the participant wizard without resetting their own onboarding state.
  // Without this escape hatch the gate would bounce them straight to /home.
  const isPreviewingOnboarding = onWelcome && new URLSearchParams(search).get("preview") === "1";

  if (needsOnboarding && !onWelcome && !isPublic) {
    return <Navigate to="/welcome" replace />;
  }

  if (!needsOnboarding && onWelcome && !isPreviewingOnboarding) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
