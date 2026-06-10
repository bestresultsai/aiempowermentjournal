import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useViewAs, homePathForRole } from "../lib/viewAs";
import CohortLanding from "../pages/cohort/CohortLanding";

// ---------------------------------------------------------------------------
// RoleAwareHome — mounted at /home.
//
// When a user lands on /home, we pick the right home for them based on
// their effective role (after view-as resolution):
//   - participant / cohort-leader → CohortLanding (this file's default)
//   - facilitator → redirect to /facilitator/home
//   - org → redirect to /org/home
//   - admin / super → redirect to /admin
//
// When view-as=participant is active, we always render CohortLanding so
// the elevated user gets the participant experience. (CohortLanding itself
// handles the "no cohort + admin demo data" case via DemoParticipantNotice.)
// ---------------------------------------------------------------------------

export default function RoleAwareHome() {
  const { user } = useAuth();
  const { effectiveRole } = useViewAs(user);

  // Always show the participant experience to anyone whose effective role
  // is participant/leader (including admins in view-as-participant mode).
  if (
    effectiveRole === "participant" ||
    effectiveRole === "cohort-leader" ||
    effectiveRole === null
  ) {
    return <CohortLanding />;
  }

  // Everyone else gets sent to their own home.
  const path = homePathForRole(effectiveRole);
  return <Navigate to={path} replace />;
}
