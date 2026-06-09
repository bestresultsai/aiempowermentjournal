import { userCapabilities } from "./adminRoles";

// Role keys are hardcoded here (rather than imported from adminRoles) to
// avoid a circular-import bug: ROLE_DEFAULTS is built at module load, and
// adminRoles.js may still be mid-evaluation when this file initializes.
const ROLE_KEY = {
  SUPER: "super",
  ADMIN: "admin",
  ORG: "org",
  FACILITATOR: "facilitator",
  COHORT_LEADER: "cohort-leader",
  PARTICIPANT: "participant",
};

// ---------------------------------------------------------------------------
// Permissions — fine-grained capability catalog + resolution.
//
// Why a separate system from `adminRoles.js`?
// `adminRoles.js` answers "what role does this user have?" — the model is
// role + capabilities[]. This file answers "what is this user allowed to
// DO?" — the model is permission key + per-user overrides on top of role
// defaults. Together they're HubSpot-shaped: pick a role for a sensible
// default, then tick individual permissions on or off for that user.
//
// Resolution order (highest precedence first):
//   1. user.permissionsRevoked[]  — explicit denies win even over grants
//   2. user.permissionsGranted[]  — explicit grants beat role defaults
//   3. union of ROLE_DEFAULTS for every capability the user carries
// ---------------------------------------------------------------------------

// Catalog of every permission the app understands. Used by the Permissions
// admin page to render the matrix + per-user override drawer.
export const PERMISSIONS = [
  // -------- Access --------
  {
    key: "view.admin",
    label: "Access admin panel",
    description: "Can reach /admin and any sub-page they have permissions for.",
    group: "Access",
  },
  {
    key: "view.global",
    label: "See everything (global scope)",
    description: "Sees every cohort, org, and participant — not just their assigned scope.",
    group: "Access",
  },

  // -------- Cohorts --------
  {
    key: "cohorts.create",
    label: "Create cohorts",
    description: "Can spin up a new cohort.",
    group: "Cohorts",
  },
  {
    key: "cohorts.archive",
    label: "Archive cohorts",
    description: "Can archive + restore cohorts.",
    group: "Cohorts",
  },
  {
    key: "cohorts.edit",
    label: "Edit cohorts in scope",
    description: "Can edit cohort schedule, name, facilitator, etc. (scope still applies).",
    group: "Cohorts",
  },

  // -------- Sessions --------
  {
    key: "sessions.upload-recording",
    label: "Upload session recordings",
    description: "Can attach a recording URL to a completed session.",
    group: "Sessions",
  },

  // -------- Homework --------
  {
    key: "homework.grade",
    label: "Grade homework",
    description: "Can review submissions and write facilitator feedback.",
    group: "Homework",
  },

  // -------- Users + Roles --------
  {
    key: "users.create",
    label: "Create users",
    description: "Can add new users from /admin/users/new.",
    group: "Users",
  },
  {
    key: "roles.assign",
    label: "Assign roles",
    description: "Can grant Participant / Cohort Leader / Facilitator / Admin / Org Admin capabilities.",
    group: "Users",
  },
  {
    key: "roles.manage-super",
    label: "Grant Super Admin",
    description: "Can grant or revoke the Super Admin role itself.",
    group: "Users",
  },
  {
    key: "users.delete",
    label: "Delete users",
    description: "Can permanently remove a user account.",
    group: "Users",
  },

  // -------- Organizations / Facilitators --------
  {
    key: "orgs.manage",
    label: "Manage organizations",
    description: "Can create/edit/archive organizations.",
    group: "Platform",
  },
  {
    key: "facilitators.manage",
    label: "Manage facilitators",
    description: "Can create/edit facilitators + assign cohorts to them.",
    group: "Platform",
  },

  // -------- System --------
  {
    key: "permissions.manage",
    label: "Manage permissions",
    description: "Can open /admin/permissions and toggle per-user overrides.",
    group: "System",
  },
  {
    key: "system.settings",
    label: "Edit system settings",
    description: "Can change global brand + integration + notification defaults (Super Admin surface).",
    group: "System",
  },
];

// Convenience: lookup map by key.
export const PERMISSIONS_BY_KEY = Object.fromEntries(
  PERMISSIONS.map((p) => [p.key, p]),
);

// Distinct group list, in catalog order.
export const PERMISSION_GROUPS = [
  ...new Set(PERMISSIONS.map((p) => p.group)),
];

// ---------------------------------------------------------------------------
// Role defaults — what each role grants out of the box. The Permissions
// page renders this as a read-only matrix; overrides go on individual
// users.
// ---------------------------------------------------------------------------

const ALL_KEYS = PERMISSIONS.map((p) => p.key);

export const ROLE_DEFAULTS = {
  [ROLE_KEY.SUPER]: new Set(ALL_KEYS),

  [ROLE_KEY.ADMIN]: new Set([
    "view.admin",
    "view.global",
    "cohorts.create",
    "cohorts.archive",
    "cohorts.edit",
    "sessions.upload-recording",
    "homework.grade",
    "users.create",
    "roles.assign",
    "orgs.manage",
    "facilitators.manage",
    "permissions.manage",
  ]),

  [ROLE_KEY.ORG]: new Set([
    "view.admin",
    "cohorts.edit",
  ]),

  [ROLE_KEY.FACILITATOR]: new Set([
    "view.admin",
    "cohorts.edit",
    "sessions.upload-recording",
    "homework.grade",
  ]),

  [ROLE_KEY.COHORT_LEADER]: new Set([
    // Cohort leaders see roster + journal + submissions for their cohort.
    // They don't manage anything — the Leader Dashboard handles visibility.
    // (Their UI is /leader/cohort, not /admin.)
  ]),

  [ROLE_KEY.PARTICIPANT]: new Set(),
};

// ---------------------------------------------------------------------------
// Core lookup. Returns Set of granted permission keys for the user.
// ---------------------------------------------------------------------------
export function effectivePermissions(user) {
  const granted = new Set();
  if (!user) return granted;

  // Union of every capability's defaults.
  const caps = userCapabilities(user);
  for (const cap of caps) {
    const defaults = ROLE_DEFAULTS[cap];
    if (defaults) defaults.forEach((k) => granted.add(k));
  }

  // Per-user explicit grants on top.
  if (Array.isArray(user.permissionsGranted)) {
    for (const k of user.permissionsGranted) granted.add(k);
  }
  // Per-user explicit revokes win at the end.
  if (Array.isArray(user.permissionsRevoked)) {
    for (const k of user.permissionsRevoked) granted.delete(k);
  }
  return granted;
}

export function hasPermission(user, key) {
  return effectivePermissions(user).has(key);
}

// Returns true if the user's effective state for `key` differs from what
// their role(s) would grant by default. Used by the Permissions UI to flag
// "this is overridden" badges.
export function isPermissionOverridden(user, key) {
  if (!user) return false;
  const granted = isPermissionGrantedByRole(user, key);
  const effective = hasPermission(user, key);
  return granted !== effective;
}

// True iff at least one of the user's roles grants this permission by
// default (no per-user overrides applied).
export function isPermissionGrantedByRole(user, key) {
  if (!user) return false;
  const caps = userCapabilities(user);
  for (const cap of caps) {
    if (ROLE_DEFAULTS[cap]?.has(key)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Role default mutators + persistence.
//
// Role defaults are seeded above but can be edited live from the Permissions
// admin page. Edits persist to localStorage and are re-applied to
// ROLE_DEFAULTS on subsequent loads via hydrateRoleDefaults() below.
//
// Behavior changes here affect EVERY user with that role (unlike per-user
// overrides). The UI surfaces an explicit warning.
// ---------------------------------------------------------------------------

const ROLE_DEFAULTS_STORAGE_KEY = "brai_role_defaults_v1";

export function setRoleDefault(roleKey, permissionKey, granted) {
  if (!ROLE_DEFAULTS[roleKey]) ROLE_DEFAULTS[roleKey] = new Set();
  if (granted) {
    ROLE_DEFAULTS[roleKey].add(permissionKey);
  } else {
    ROLE_DEFAULTS[roleKey].delete(permissionKey);
  }
  persistRoleDefaults();
}

function persistRoleDefaults() {
  if (typeof window === "undefined") return;
  const serializable = {};
  for (const [role, set] of Object.entries(ROLE_DEFAULTS)) {
    serializable[role] = [...set];
  }
  try {
    window.localStorage.setItem(
      ROLE_DEFAULTS_STORAGE_KEY,
      JSON.stringify(serializable),
    );
  } catch {
    // localStorage quota or private-mode — silently ignore.
  }
}

function hydrateRoleDefaults() {
  if (typeof window === "undefined") return;
  let raw;
  try {
    raw = window.localStorage.getItem(ROLE_DEFAULTS_STORAGE_KEY);
  } catch {
    return;
  }
  if (!raw) return;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  if (!parsed || typeof parsed !== "object") return;
  for (const [role, keys] of Object.entries(parsed)) {
    if (Array.isArray(keys)) {
      ROLE_DEFAULTS[role] = new Set(keys);
    }
  }
}

// Auto-hydrate on first module load so reloads keep the user's edits.
hydrateRoleDefaults();

// ---------------------------------------------------------------------------
// Per-user overrides — mutators.
// `mode`: "grant" | "revoke" | "reset"
// `reset` clears any explicit grant/revoke for that key, returning the
// user to whatever their role default says.
// ---------------------------------------------------------------------------
export function setUserPermission(userObj, key, mode) {
  if (!userObj) return null;
  const granted = new Set(userObj.permissionsGranted || []);
  const revoked = new Set(userObj.permissionsRevoked || []);

  if (mode === "grant") {
    granted.add(key);
    revoked.delete(key);
  } else if (mode === "revoke") {
    revoked.add(key);
    granted.delete(key);
  } else if (mode === "reset") {
    granted.delete(key);
    revoked.delete(key);
  }

  userObj.permissionsGranted = [...granted];
  userObj.permissionsRevoked = [...revoked];
  return userObj;
}
