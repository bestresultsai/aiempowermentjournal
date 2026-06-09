# Admin visibility matrix

This is the source of truth for what each role can see + do inside the admin
panel. When you build a new admin page or surface, check this doc first.

## Roles (broadest → narrowest scope)

| Role | Acronym | Scope |
| --- | --- | --- |
| Super Admin | super | Sees everything. Can manage other users' roles. Owns system-wide settings. |
| Admin | admin | Sees everything. Can do everything except grant the Super role. |
| Org Admin | org | Sees only cohorts within their `assignedOrgs`. |
| Facilitator | facilitator | Sees only cohorts in their `assignedCohorts`. Can grade homework + mark sessions complete. |
| Participant | participant | No admin access. Lives in the cohort/journey experience. |

Multi-role: every user can carry additional capabilities via
`user.capabilities[]`. Mike, for example, is a `facilitator` with the
`admin` capability layered on. The helpers in `src/lib/adminRoles.js` walk
the capability list, not just the primary role.

## Permission helpers (`src/lib/adminRoles.js`)

| Helper | Returns true for |
| --- | --- |
| `canAccessAdmin` | super, admin, org, facilitator |
| `hasGlobalScope` | super, admin |
| `canGradeHomework` | super, admin, facilitator |
| `canManageRoles` | super |
| `canAssignRoles` | super, admin |
| `canCreateCohorts` | super, admin |
| `canEditCohort(cohort)` | super, admin; org if cohort in `assignedOrgs`; facilitator if cohort in `assignedCohorts` |
| `canArchiveCohort` | super, admin |
| `getAccessibleCohorts(user, all)` | scoped cohort list — drives every list/chart/count |

## Sidebar visibility

| Item | super | admin | org | facilitator |
| --- | :-: | :-: | :-: | :-: |
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Calendar | ✅ | ✅ | ✅ | ✅ |
| Cohorts | ✅ | ✅ | ✅ | ✅ |
| AI Journal | ✅ | ✅ | ✅ | ✅ |
| Homework | ✅ | ✅ | ✅ | ✅ |
| Participants | ✅ | ✅ | ✅ | ✅ |
| Organizations | ✅ | ✅ | — | — |
| Facilitators | ✅ | ✅ | — | — |
| Users | ✅ | ✅ | — | — |
| `+ New cohort` | ✅ | ✅ | — | — |
| `+ New user` | ✅ | ✅ | — | — |

## Per-page rules

### `/admin` (Dashboard)
- All admin roles can land here.
- KPI tiles + activity stream are scoped via `getAccessibleCohorts`.
- Org admins / facilitators do **not** see cohorts outside their scope in
  the pipeline view.

### `/admin/calendar`
- All admin roles. List of upcoming sessions is scoped.
- Org admins see only their org's cohorts' sessions; facilitators see only
  theirs.

### `/admin/cohorts` (list)
- All admin roles. Visible cohorts come from `getAccessibleCohorts`.
- "+ New cohort" button visible to super + admin only.
- Edit button visible only when `canEditCohort(cohort)` is true.

### `/admin/cohorts/new`
- super + admin only. `canCreateCohorts` gate.

### `/admin/cohorts/:slug` (roster)
- All admin roles whose `canEditCohort` (or read access) covers the slug.
- Org admins / facilitators visiting a cohort outside their scope get
  bounced to `/admin/cohorts`.

### `/admin/cohorts/:slug/edit`
- Per-cohort `canEditCohort` check.

### `/admin/cohorts/:slug/participants/add`
- Same gate as edit.

### `/admin/journal`
- All admin roles. Entries scoped by `getAccessibleCohorts`.

### `/admin/homework`
- super + admin + facilitator. `canGradeHomework` gate.
- Org admins do **not** get a Homework tab — grading is the facilitator's
  job. They can still see homework status on the cohort roster.

### `/admin/participants` (list)
- All admin roles. Roster is scoped.

### `/admin/participants/:id`
- All admin roles, but only for participants whose cohort is in scope.
- Capability editor (the role chips) visible only to `canAssignRoles`.
- Headshot edit button visible only to `canAssignRoles`.

### `/admin/participants/new`
- All admin roles. Created standalone or attached to a cohort the creator
  can see.

### `/admin/orgs`
- super + admin only.

### `/admin/facilitators`
- super + admin only.

### `/admin/users` (cross-cutting directory)
- super + admin only. `canAssignRoles` gate.

### `/admin/users/new`
- super + admin only. Super Admin role checkbox visible only to `canManageRoles`.

## Permissions model

The role-based capabilities in `src/lib/adminRoles.js` are now thin
wrappers around a permission catalog in `src/lib/permissions.js`.

- `PERMISSIONS` — every fine-grained permission the app knows about
  (`cohorts.create`, `homework.grade`, `roles.assign`, etc.)
- `ROLE_DEFAULTS` — which permissions each role grants by default
- `user.permissionsGranted[]` / `user.permissionsRevoked[]` — per-user
  overrides on top of role defaults
- `hasPermission(user, key)` — resolves role defaults + overrides

This means a Super can grant or revoke a single permission on a specific
user without changing the role contract for everyone else with that role.

### Where to manage permissions

- `/admin/permissions` (Super only) — two tabs:
  1. **Role defaults** — read-only matrix of role × permission. To change a
     role's default contract, edit `ROLE_DEFAULTS` in `permissions.js`.
  2. **By user** — search any user, click to open a drawer with a per-
     permission toggle. Overridden permissions get an "Overridden" badge
     and a one-click Reset to default.

### Adding a new permission

1. Add an entry to the `PERMISSIONS` catalog in `permissions.js` with key +
   label + description + group.
2. Add it to the appropriate roles inside `ROLE_DEFAULTS`.
3. (If a new helper is needed) Add a `canSomething(user)` wrapper in
   `adminRoles.js` that calls `hasPermission(user, "your.new.key")`.
4. The Permissions UI picks it up automatically.

## Resolved decisions (from product Q&A)

- **Org Admin grading homework:** No. Org Admins don't grade — they
  observe.
- **Read-only Admin role:** Not needed; use per-user permission revokes
  to build a read-only profile if a single user ever needs it.
- **Cohort Leader surface:** Stays at `/leader/cohort`. Purpose: see
  roster engagement + every participant's journal entries + every
  participant's homework submissions. No grading. Today the dashboard
  shows aggregates; click-through to individual entries/submissions is
  queued.
- **Certificate signatories:** Facilitator + Mike + Lee. Three signatures
  on every certificate.
- **Org Zoom / Calendar accounts:** Only facilitators connect their own
  Google Calendar + Zoom. Participants get "Add to my calendar" `.ics`
  export per session (queued).

## Open questions (for v2)

- Should Facilitators be able to add participants to their cohort
  directly? (today: yes, via `/admin/cohorts/:slug/participants/add`)
