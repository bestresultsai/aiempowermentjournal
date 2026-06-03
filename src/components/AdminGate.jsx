import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canAccessAdmin } from "../lib/adminRoles";

// ---------------------------------------------------------------------------
// AdminGate
//
// Wraps every /admin/* route. Rules:
//   - Loading (auth still resolving) → render nothing (avoid redirect flash).
//   - Unauthenticated → /login
//   - Participant (no admin role) → /home
//   - Otherwise → render the admin tree.
// ---------------------------------------------------------------------------

export default function AdminGate({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!canAccessAdmin(user)) return <Navigate to="/home" replace />;

  return children;
}
