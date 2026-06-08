import { useMemo, useState } from "react";
import {
  getAccessibleCohorts,
  getAccessibleOrgs,
  getAccessibleFacilitators,
  applyScopeFilters,
} from "./adminRoles";

// ---------------------------------------------------------------------------
// useScopeFilters — single hook that returns everything an admin page needs
// to render <ScopeFilterBar> and derive the filtered cohort slugs.
//
// Returns:
//   cohorts, orgs, facilitators           — full lists in role-scope
//   effectiveCohorts, effectiveSlugs      — after Org × Cohort × Facilitator filters
//   orgFilter, cohortFilter, facilitatorFilter, set*Filter
//
// Pages pass `user` and `allCohorts` (typically DEMO_COHORTS).
// ---------------------------------------------------------------------------

export function useScopeFilters(user, allCohorts) {
  const cohorts = useMemo(
    () => getAccessibleCohorts(user, allCohorts),
    [user, allCohorts],
  );
  const orgs = useMemo(() => getAccessibleOrgs(user, allCohorts), [user, allCohorts]);
  const facilitators = useMemo(
    () => getAccessibleFacilitators(user, allCohorts),
    [user, allCohorts],
  );

  const [orgFilter, setOrgFilter] = useState(null);
  const [cohortFilter, setCohortFilter] = useState(null);
  const [facilitatorFilter, setFacilitatorFilter] = useState(null);

  const effectiveCohorts = useMemo(
    () => applyScopeFilters(cohorts, {
      orgId: orgFilter,
      cohortSlug: cohortFilter,
      facilitatorId: facilitatorFilter,
    }),
    [cohorts, orgFilter, cohortFilter, facilitatorFilter],
  );

  const effectiveSlugs = useMemo(
    () => effectiveCohorts.map((c) => c.slug),
    [effectiveCohorts],
  );

  return {
    cohorts,
    orgs,
    facilitators,
    effectiveCohorts,
    effectiveSlugs,
    orgFilter,
    cohortFilter,
    facilitatorFilter,
    setOrgFilter,
    setCohortFilter,
    setFacilitatorFilter,
  };
}
