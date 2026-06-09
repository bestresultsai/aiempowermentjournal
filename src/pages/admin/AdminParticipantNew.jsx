import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { canAccessAdmin } from "../../lib/adminRoles";
import ParticipantForm from "../../components/admin/ParticipantForm";

// /admin/users/new — standalone participant creation.
// Optional ?cohort=slug pre-selects a cohort but doesn't lock it.
export default function AdminParticipantNew() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  if (!canAccessAdmin(user)) return <Navigate to="/home" replace />;
  return (
    <ParticipantForm
      defaultCohortSlug={params.get("cohort") || null}
      redirectOnSuccess="/admin/participants"
    />
  );
}
