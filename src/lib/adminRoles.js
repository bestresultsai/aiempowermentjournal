// ---------------------------------------------------------------------------
// Role model + scoping helpers for the admin panel.
//
// Five roles, broadest → narrowest scope:
//
//   super        BRAI founder (Josue). Sees everything. Manages user roles.
//   admin        BRAI staff. Sees everything but can't manage Super users.
//   org          Org-level admin (e.g. IAHE program lead). Scoped to their
//                `assignedOrgs` — sees only cohorts owned by those orgs.
//   facilitator  Coach (e.g. Mike). Scoped to their `assignedCohorts`. Can
//                grade homework + mark sessions complete on behalf of users.
//   participant  Default. No /admin access.
//
// Notion `Users` DB needs (eventually):
//   role             enum
//   assignedOrgs     array of org IDs           (used by `org`)
//   assignedCohorts  array of cohort slugs      (used by `facilitator`)
// ---------------------------------------------------------------------------

export const ROLES = {
  SUPER: "super",
  ADMIN: "admin",
  ORG: "org",
  FACILITATOR: "facilitator",
  PARTICIPANT: "participant",
};

// Pretty labels for chips, dropdowns, etc.
export function getRoleLabel(role) {
  switch (role) {
    case ROLES.SUPER: return "Super Admin";
    case ROLES.ADMIN: return "Admin";
    case ROLES.ORG: return "Org Admin";
    case ROLES.FACILITATOR: return "Facilitator";
    case ROLES.PARTICIPANT: return "Participant";
    default: return "Member";
  }
}

// Returns true when the user has any kind of admin-panel access.
export function canAccessAdmin(user) {
  if (!user) return false;
  return (
    user.role === ROLES.SUPER ||
    user.role === ROLES.ADMIN ||
    user.role === ROLES.ORG ||
    user.role === ROLES.FACILITATOR
  );
}

// True if the user sees every cohort/org (no scoping applied).
export function hasGlobalScope(user) {
  if (!user) return false;
  return user.role === ROLES.SUPER || user.role === ROLES.ADMIN;
}

// Can grade homework + mark sessions complete on behalf of others.
// Super/Admin can do anything; Facilitator can do this within scope; Org
// can review and read but not grade (kept simple for round 1).
export function canGradeHomework(user) {
  if (!user) return false;
  return (
    user.role === ROLES.SUPER ||
    user.role === ROLES.ADMIN ||
    user.role === ROLES.FACILITATOR
  );
}

// User management (creating/editing other admins) is Super-only.
export function canManageRoles(user) {
  return !!user && user.role === ROLES.SUPER;
}

// ---------------------------------------------------------------------------
// Scoping — which cohorts can a given user actually see?
//
// `allCohorts` is the full list pulled from cohortApi (or mock data). We
// filter it down to what's in scope.
// ---------------------------------------------------------------------------

export function getAccessibleCohorts(user, allCohorts = []) {
  if (!user) return [];
  if (hasGlobalScope(user)) return allCohorts;

  if (user.role === ROLES.ORG) {
    const orgIds = new Set(user.assignedOrgs || []);
    return allCohorts.filter((c) => c.organization && orgIds.has(c.organization.id));
  }

  if (user.role === ROLES.FACILITATOR) {
    const slugs = new Set(user.assignedCohorts || []);
    return allCohorts.filter((c) => slugs.has(c.slug));
  }

  return [];
}

// Convenience: just the slugs in scope.
export function getAccessibleCohortSlugs(user, allCohorts = []) {
  return getAccessibleCohorts(user, allCohorts).map((c) => c.slug);
}

// Convenience: org IDs the user has any visibility into.
export function getAccessibleOrgIds(user, allCohorts = []) {
  return [
    ...new Set(
      getAccessibleCohorts(user, allCohorts)
        .map((c) => c.organization?.id)
        .filter(Boolean),
    ),
  ];
}

// Distinct organizations in scope (returns the full org objects).
export function getAccessibleOrgs(user, allCohorts = []) {
  const seen = new Map();
  for (const c of getAccessibleCohorts(user, allCohorts)) {
    if (c.organization && !seen.has(c.organization.id)) {
      seen.set(c.organization.id, c.organization);
    }
  }
  return [...seen.values()];
}

// Distinct facilitators in scope (returns the facilitator objects).
export function getAccessibleFacilitators(user, allCohorts = []) {
  const seen = new Map();
  for (const c of getAccessibleCohorts(user, allCohorts)) {
    if (c.facilitator && !seen.has(c.facilitator.id)) {
      seen.set(c.facilitator.id, c.facilitator);
    }
  }
  return [...seen.values()];
}

// Apply Org + Cohort + Facilitator filters in one pass. Each filter is
// optional — null means "no filter on this dimension".
export function applyScopeFilters(cohorts, { orgId = null, cohortSlug = null, facilitatorId = null } = {}) {
  return cohorts
    .filter((c) => !orgId || c.organization?.id === orgId)
    .filter((c) => !cohortSlug || c.slug === cohortSlug)
    .filter((c) => !facilitatorId || c.facilitator?.id === facilitatorId);
}
