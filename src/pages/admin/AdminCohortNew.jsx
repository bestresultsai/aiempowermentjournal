import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  canCreateCohorts,
  getAccessibleFacilitators,
} from "../../lib/adminRoles";
import { DEMO_COHORTS } from "../../lib/demoData";
import { getAllOrganizations } from "../../lib/cohortAdmin";
import CohortForm from "../../components/admin/CohortForm";

// /admin/cohorts/new — gated by canCreateCohorts (super + admin only).
export default function AdminCohortNew() {
  const { user } = useAuth();
  if (!canCreateCohorts(user)) {
    return <Navigate to="/admin/cohorts" replace />;
  }
  // Orgs come from the merged store (base + user-created). Facilitators are
  // still derived from the cohort assignments — when we add a facilitator
  // management surface, this will pull from a dedicated list.
  const orgs = getAllOrganizations();
  const facilitators = getAccessibleFacilitators(user, DEMO_COHORTS);
  return (
    <div className="max-w-[920px] mx-auto">
      <CohortForm mode="create" orgs={orgs} facilitators={facilitators} />
    </div>
  );
}
