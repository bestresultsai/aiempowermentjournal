import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ---------------------------------------------------------------------------
// AuthGate
//
// Wraps participant-facing routes (anything that assumes a signed-in user).
// Rules:
//   - Loading (auth still resolving) → render nothing (avoid redirect flash)
//   - Unauthenticated → /login?next=<original-path>
//   - Authenticated → render the page
//
// Why ?next= and not state? URLs are more robust:
//   - Survive a full page reload during the magic-link round trip
//   - Survive the user opening the link in a different tab
//   - Easy to forward through /auth/verify
//
// We only forward same-origin path strings (no absolute URLs, no protocol-
// relative junk) so a stray query param can't be used to redirect the user
// to an attacker site after sign-in.
// ---------------------------------------------------------------------------

export default function AuthGate({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    const next = safeNext(`${location.pathname}${location.search}${location.hash}`);
    const qs = next ? `?next=${encodeURIComponent(next)}` : "";
    return <Navigate to={`/login${qs}`} replace />;
  }

  return children;
}

// Allow only same-origin path strings (must start with "/" and not "//").
export function safeNext(value) {
  if (!value || typeof value !== "string") return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null; // protocol-relative
  return value;
}
