import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { canEditCohort, canArchiveCohort } from "../../lib/adminRoles";
import {
  getCohortForAdmin,
  getSessionsForCohort,
  getAllOrganizations,
  useFacilitatorsFromSupabase,
} from "../../lib/cohortAdmin";
import CohortForm from "../../components/admin/CohortForm";

// /admin/cohorts/:slug/edit — edit an existing cohort.
//
// Gated by canEditCohort(user, cohort). Pre-fills the form with the cohort's
// current values + the per-cohort session schedule (if overridden).
export default function AdminCohortEdit() {
  const { slug } = useParams();
  const { user } = useAuth();
  const cohort = getCohortForAdmin(slug);
  // Live Supabase facilitator list — replaces the previous
  // getAccessibleFacilitators(user, DEMO_COHORTS) call which was
  // literally pulling names out of the seed demo data.
  const { data: facilitators } = useFacilitatorsFromSupabase();

  if (!cohort) {
    return <Navigate to="/admin/cohorts" replace />;
  }
  if (!canEditCohort(user, cohort)) {
    return <Navigate to={`/admin/cohorts/${slug}`} replace />;
  }

  // Pull the universe of orgs + facilitators the admin can assign. Always
  // includes the current cohort's org/facilitator so editing without changing
  // them still works even if those have been removed from scope.
  const orgs = ensureIncluded(getAllOrganizations(), cohort.organization);
  const facilitatorsWithCurrent = ensureIncluded(facilitators, cohort.facilitator);

  // Hydrate the form with the per-cohort session dates if available.
  const initial = { ...cohort, sessions: getSessionsForCohort(slug) };

  return (
    <div className="max-w-[920px] mx-auto">
      <CohortForm
        mode="edit"
        initial={initial}
        orgs={orgs}
        facilitators={facilitatorsWithCurrent}
        canArchive={canArchiveCohort(user)}
      />
    </div>
  );
}

function ensureIncluded(list, item) {
  if (!item) return list;
  if ((list || []).some((x) => x.id === item.id)) return list;
  return [item, ...(list || [])];
}
