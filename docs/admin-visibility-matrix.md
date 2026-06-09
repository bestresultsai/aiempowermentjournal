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

## Open questions (for v2)

- Should Org Admin be able to grade homework for their org's cohorts? (today: no)
- Should Facilitators be able to add participants to their cohort directly? (today: yes, via `/admin/cohorts/:slug/participants/add`)
- Should there be a "read-only Admin" role that can see everything but not edit? (not modeled today)
