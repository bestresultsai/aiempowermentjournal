import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ---------------------------------------------------------------------------
// Home — root route ("/"). This is no longer a marketing splash; the
// platform is now the product. Behavior:
//
//   - While auth is loading → render nothing (avoids a flash)
//   - Signed-in users → redirect to /home (their role-aware home)
//   - Signed-out users → redirect to /login (where they can request a
//     magic-link sign-in)
//
// The old marketing splash with "Log an Entry / Sign In" buttons has been
// removed; if we ever want a public landing page again it should live at a
// separate marketing domain (e.g. www.bestresults.ai), keeping tools.* as
// the app surface only.
// ---------------------------------------------------------------------------

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/home" replace />;
  return <Navigate to="/login" replace />;
}
