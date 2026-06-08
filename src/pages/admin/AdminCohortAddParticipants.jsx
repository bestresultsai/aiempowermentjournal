import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { canEditCohort } from "../../lib/adminRoles";
import { getCohortForAdmin } from "../../lib/cohortAdmin";
import ParticipantForm from "../../components/admin/ParticipantForm";

// /admin/cohorts/:slug/participants/add — locked to a specific cohort.
export default function AdminCohortAddParticipants() {
  const { slug } = useParams();
  const { user } = useAuth();
  const cohort = getCohortForAdmin(slug);
  if (!cohort) return <Navigate to="/admin/cohorts" replace />;
  if (!canEditCohort(user, cohort)) return <Navigate to={`/admin/cohorts/${slug}`} replace />;
  return (
    <ParticipantForm
      lockedCohortSlug={slug}
      redirectOnSuccess={`/admin/cohorts/${slug}`}
    />
  );
}
