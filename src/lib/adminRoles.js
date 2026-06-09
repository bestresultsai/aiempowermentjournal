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

// ---------------------------------------------------------------------------
// Multi-role model — primary role + capabilities.
//
// Every user has a single `role` (primary identity — drives default landing
// page, the role chip in the avatar dropdown, etc.). On top of that they may
// have additional capabilities via `user.capabilities[]`.
//
// Example: Mike Burkesmith — facilitates IAHE cohorts AND has BRAI staff
// admin powers:
//   user = { role: "facilitator", capabilities: ["facilitator", "admin"] }
//
// Backward compat: if `capabilities` is missing, we synthesize from `role`
// (single-capability set). Old single-role users keep working unchanged.
// ---------------------------------------------------------------------------

// Returns a Set of every capability the user has.
export function userCapabilities(user) {
  if (!user) return new Set();
  const caps = new Set();
  if (Array.isArray(user.capabilities)) {
    for (const c of user.capabilities) {
      if (c) caps.add(c);
    }
  }
  // Always include the primary role so old code that only sets `role` still
  // behaves correctly through the capability lens.
  if (user.role) caps.add(user.role);
  return caps;
}

// True if the user has the given capability.
export function hasCapability(user, role) {
  return userCapabilities(user).has(role);
}

// ---------------------------------------------------------------------------
// Permission helpers.
//
// Each helper resolves to a permission key via `lib/permissions.js`. This
// gives us role defaults + per-user overrides for free: no caller has to
// change when a Super grants/revokes individual permissions on a user.
//
// ESM allows the import cycle here because hasPermission is only called at
// function-invocation time, never at module-load time.
// ---------------------------------------------------------------------------
import { hasPermission } from "./permissions";

// Returns true when the user has any kind of admin-panel access.
export function canAccessAdmin(user) {
  return hasPermission(user, "view.admin");
}

// True if the user sees every cohort/org (no scoping applied).
export function hasGlobalScope(user) {
  return hasPermission(user, "view.global");
}

// Can grade homework + mark sessions complete on behalf of others.
export function canGradeHomework(user) {
  return hasPermission(user, "homework.grade");
}

// Can grant the Super Admin role itself.
export function canManageRoles(user) {
  return hasPermission(user, "roles.manage-super");
}

// Can assign roles below Super.
export function canAssignRoles(user) {
  return hasPermission(user, "roles.assign");
}

// Cohort creation — permission-gated; default to platform staff.
export function canCreateCohorts(user) {
  return hasPermission(user, "cohorts.create");
}

// Can the user edit this specific cohort?
//   - Super / Admin: any cohort
//   - Org admin: cohorts within their `assignedOrgs`
//   - Facilitator: cohorts in their `assignedCohorts` (limited to schedule edits;
//     pages enforce field-level limits — we just gate the route here)
export function canEditCohort(user, cohort) {
  if (!user || !cohort) return false;
  const caps = userCapabilities(user);
  if (caps.has(ROLES.SUPER) || caps.has(ROLES.ADMIN)) return true;
  if (caps.has(ROLES.ORG)) {
    return (user.assignedOrgs || []).includes(cohort.organization?.id);
  }
  if (caps.has(ROLES.FACILITATOR)) {
    return (user.assignedCohorts || []).includes(cohort.slug);
  }
  return false;
}

// Archival is destructive; permission-gated.
export function canArchiveCohort(user) {
  return hasPermission(user, "cohorts.archive");
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
  const caps = userCapabilities(user);

  if (caps.has(ROLES.ORG)) {
    const orgIds = new Set(user.assignedOrgs || []);
    return allCohorts.filter((c) => c.organization && orgIds.has(c.organization.id));
  }

  if (caps.has(ROLES.FACILITATOR)) {
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
