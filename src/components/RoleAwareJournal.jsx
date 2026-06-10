import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useViewAs } from "../lib/viewAs";
import JournalDashboard from "../pages/JournalDashboard";

// ---------------------------------------------------------------------------
// RoleAwareJournal — mounted at /journal.
//
// Picks the right Journal page based on the user's effective role (which
// accounts for view-as mode):
//   - participant / cohort-leader → JournalDashboard (personal gamified view)
//   - facilitator → redirect to /facilitator/journal
//   - org → redirect to /org/journal
//   - admin / super → redirect to /admin/journal
//
// When an admin is in view-as-participant mode, they get the participant
// JournalDashboard with demo data fallback.
// ---------------------------------------------------------------------------

export default function RoleAwareJournal() {
  const { user } = useAuth();
  const { effectiveRole } = useViewAs(user);

  if (
    effectiveRole === "participant" ||
    effectiveRole === "cohort-leader" ||
    effectiveRole === null
  ) {
    return <JournalDashboard />;
  }

  if (effectiveRole === "facilitator") {
    return <Navigate to="/facilitator/journal" replace />;
  }
  if (effectiveRole === "org") {
    return <Navigate to="/org/journal" replace />;
  }
  return <Navigate to="/admin/journal" replace />;
}
