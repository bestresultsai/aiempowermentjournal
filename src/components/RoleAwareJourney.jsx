import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useViewAs } from "../lib/viewAs";
import JourneyPage from "../pages/JourneyPage";

// ---------------------------------------------------------------------------
// RoleAwareJourney — mounted at /journey.
//
// Picks the right Journey page based on the user's effective role (which
// accounts for view-as mode):
//   - participant / cohort-leader → JourneyPage (the participant workshop view)
//   - facilitator → redirect to /facilitator/journey (cohort progress matrix)
//   - org → redirect to /org/journey
//   - admin / super → redirect to /admin/cohorts (operational list)
//
// When an admin is in view-as-participant mode, they get JourneyPage just
// like a real participant — CohortLanding-style fallbacks already handle
// "admin with no cohort" via demo data.
// ---------------------------------------------------------------------------

export default function RoleAwareJourney() {
  const { user } = useAuth();
  const { effectiveRole } = useViewAs(user);

  if (
    effectiveRole === "participant" ||
    effectiveRole === "cohort-leader" ||
    effectiveRole === null
  ) {
    return <JourneyPage />;
  }

  if (effectiveRole === "facilitator") {
    return <Navigate to="/facilitator/journey" replace />;
  }
  if (effectiveRole === "org") {
    return <Navigate to="/org/journey" replace />;
  }
  // admin + super: send to /admin/cohorts (the operational journey view).
  return <Navigate to="/admin/cohorts" replace />;
}
