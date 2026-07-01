import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { canCreateCohorts } from "../../lib/adminRoles";
import {
  getAllOrganizations,
  useFacilitatorsFromSupabase,
} from "../../lib/cohortAdmin";
import CohortForm from "../../components/admin/CohortForm";

// /admin/cohorts/new — gated by canCreateCohorts (super + admin only).
export default function AdminCohortNew() {
  const { user } = useAuth();
  // Facilitators list is Supabase-authoritative — the hook returns only
  // profiles currently in Supabase with facilitator/admin/super caps.
  // Previously this called getAccessibleFacilitators(user, DEMO_COHORTS)
  // which meant the picker literally listed the seed demo facilitators
  // even in a clean-slate deploy.
  const { data: facilitators } = useFacilitatorsFromSupabase();
  const orgs = getAllOrganizations();

  if (!canCreateCohorts(user)) {
    return <Navigate to="/admin/cohorts" replace />;
  }
  return (
    <div className="max-w-[920px] mx-auto">
      <CohortForm mode="create" orgs={orgs} facilitators={facilitators} />
    </div>
  );
}
