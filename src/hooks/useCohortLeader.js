import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { getParticipantByEmail } from "../lib/adminMockData";

// ---------------------------------------------------------------------------
// useCohortLeader — detects whether the signed-in participant is a
// cohort leader and returns the matching participant record + cohort slug.
//
// Why a hook?
//   The auth user is a thin identity (email, name, role). The "leader"
//   flag lives on the participant record in mock data. We match by email
//   so any user that has a participant record with isCohortLead=true
//   automatically becomes a leader — no separate sync step required.
//
// Returns:
//   { isLeader: boolean, participant: ParticipantRecord | null, cohortSlug: string | null }
// ---------------------------------------------------------------------------
export function useCohortLeader() {
  const { user } = useAuth();
  return useMemo(() => {
    if (!user?.email) {
      return { isLeader: false, participant: null, cohortSlug: null };
    }
    const participant = getParticipantByEmail(user.email);
    const isLeader = !!participant?.isCohortLead;
    return {
      isLeader,
      participant: participant || null,
      cohortSlug: participant?.cohortSlug || null,
    };
  }, [user?.email]);
}
