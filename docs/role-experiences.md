# Role experiences

This is the source of truth for what each role lands on, what they see on
their home, and how "view as" works. Pairs with
`docs/admin-visibility-matrix.md` (permissions per role) — this doc is about
*UX shape*, not access control.

## Two parallel role ladders

Roles live on two separate ladders. They are NOT one global hierarchy.

| Internal (BRAI staff) | External (clients) |
| --- | --- |
| Super Admin | Org Admin |
| Admin | Participant |
| Facilitator | Cohort Leader (sub-flavor of Participant) |

An Org Admin is not "below" a Facilitator — they're on different sides.
A Facilitator can't preview an Org Admin and vice versa.

## Identity roles vs power roles

`user.role` is an explicit field representing **identity** — what someone IS,
their job. `capabilities` is a separate list representing **powers** — what
someone can DO on top of that identity.

| Identity (a job) | Power (an extra ability) |
| --- | --- |
| Facilitator | Admin |
| Org Admin | Super Admin |
| Participant | |
| Cohort Leader | |

Mike is a Facilitator (his job) who also has the Admin power. His record:
- `role: "facilitator"` (the identity)
- `capabilities: ["facilitator", "admin"]` (job + extra power)

Default primary-role rule when creating a user — identity-laden capabilities
win over power capabilities. Surfaced in the `/admin/users/new` form as a
"Primary role" override field that defaults to the identity pick.

## Home landings

`user.role` drives where Home goes. The capability list determines what
*else* the user can access from the avatar dropdown.

| user.role | Lands at | Notes |
| --- | --- | --- |
| `participant` | `/home` (CohortLanding) | The cohort experience is their workspace |
| `cohort-leader` | `/home` | Same as participant; the Cohort dashboard is one click away |
| `facilitator` | `/facilitator/home` | Their own home — cohorts they lead, grading queue, upcoming sessions |
| `org` | `/org/home` | Their own home — cohorts in their org, ROI, completion |
| `admin` | `/admin` | Cross-org Dashboard plays this role |
| `super` | `/admin` | Same as admin landing + access to Permissions surface |

Mike (`role: "facilitator"`, capabilities including admin) lands at
`/facilitator/home`. The Admin panel button stays one click away in the
avatar dropdown because the gate is capability-based.

## View as

Elevated users can preview the platform as someone on a more restricted
role. Rules:

1. **Internal staff can preview internal roles below them on their ladder.**
   Super can preview Admin + Facilitator. Admin can preview Facilitator.
2. **Internal staff can additionally preview external roles for QA** —
   BRAI needs to see the customer experience. Super + Admin can preview
   Org Admin + Participant.
3. **External users can preview lower external roles.** Org Admin can
   preview Participant. Participants can't preview anything (no one is
   below them).
4. **External users cannot preview internal roles.** An Org Admin would
   never need to see how BRAI's internal facilitator workflow operates.
5. **Subtract any role the user already has as a capability.** No point
   in "view as Facilitator" for someone who IS a facilitator.

Resulting menu by user:

| User | Capabilities | View-as options |
| --- | --- | --- |
| Super Admin | `super` | Admin, Facilitator, Org Admin, Participant |
| Pure Admin | `admin` | Facilitator, Org Admin, Participant |
| Mike (facilitator + admin) | `facilitator, admin` | Org Admin, Participant |
| Pure Facilitator | `facilitator` | Participant |
| Pure Org Admin | `org` | Participant |
| Participant | — | (switcher hidden) |

While view-as is active:

1. A **ViewAsBanner** appears at the top of every page — clearly marked
   with the role they're previewing and an "Exit" button
2. The Home link routes to that role's home (so an admin viewing-as-
   participant clicks Home → `/home` CohortLanding, not `/admin`)
3. Self-referential UI behaves as it would for that role (e.g. the
   FacilitatorCard shows even if the real user is the facilitator —
   they're previewing the participant view, after all)
4. Mode persists in localStorage so a refresh keeps them in it. Clearing
   it returns to their real home.

When an **admin with no cohort assignment** enters view-as-participant
mode, we render `CohortLanding` against the IAHE demo cohort with a small
notice: *"You're not enrolled in a cohort. Here's the participant view with
demo data."* That lets BRAI staff QA the participant experience without
having to manually enroll.

## Journey + Journal per role

Every elevated user gets their own version of Journey and Journal. The
NavBar links always point at `/journey` and `/journal`; smart wrappers
(`RoleAwareJourney`, `RoleAwareJournal`) route to the right concrete page
based on effective role. View-as-participant mode renders the participant
versions, matching the home-page pattern.

| Effective role | /journey | /journal |
| --- | --- | --- |
| participant / cohort-leader | `JourneyPage` (workshop list) | `JournalDashboard` (personal gamified) |
| facilitator | `/facilitator/journey` (cohort progress matrix) | `/facilitator/journal` (portfolio dashboard) |
| org | `/org/journey` (org cohorts matrix) | `/org/journal` (org dashboard) |
| admin / super | `/admin/cohorts` (operational list) | `/admin/journal` (full dashboard) |

The "+ New Entry" CTA in the NavBar only appears for participant /
cohort-leader effective role. Facilitators and admins don't log their own
wins — their Journal view is a read-only portfolio.

## Facilitator home (`/facilitator/home`)

The facilitator's morning view. Cards:

1. **My cohorts** — grid, one card per assigned cohort. Each shows the
   cohort name + org + progress (sessions done / total) + next session
   date in their timezone. Click → `/admin/cohorts/:slug`
2. **Up next** — the next session across all their cohorts (with countdown
   + "Open Zoom" if within an hour of start)
3. **Homework awaiting review** — count + link to `/admin/homework` filtered
   to their cohorts. If there's any pending more than 7 days old, escalates
   to a soft warning
4. **At-risk participants** — across all their cohorts. Strip of cards
   matching the existing `/admin` Dashboard at-risk strip but scoped to
   the facilitator
5. **1:1 office hours** — their declared office hours + recent bookings.
   Quick link to share booking page
6. **Calendar connect nudge** — only when Google Calendar isn't connected.
   "Sessions aren't syncing to your calendar yet"

## Org Admin home (`/org/home`)

The customer-side admin's morning view. Scoped to `user.assignedOrgs`. Cards:

1. **Our cohorts** — grid, one card per cohort in the org. Each shows
   facilitator, progress, status (in session / wrapping / done)
2. **Aggregate ROI** — cumulative hours saved by participants in their
   org's cohorts. Big number + monthly trend sparkline
3. **Completion rate trend** — % of sessions delivered on time vs scheduled
4. **At-risk participants** — strip across their org's cohorts (with cohort
   badges so they can tell which cohort each person is in)
5. **Cohort leaders' activity** — most recent journal entries / homework
   submissions by participants flagged as `isCohortLead`. Lets the Org
   Admin see their key stakeholders staying engaged

## Hide self-referential UI

Even when not in view-as mode, certain participant-only UI should hide
itself when the viewer isn't a participant in the cohort they're looking
at. Specifically on `CohortLanding`:

- **FacilitatorCard** hides when the viewer IS the cohort's facilitator
- **MissingHomeworkCard** hides when the viewer has no homework expected
  (they're not a participant in this cohort)
- **JournalGameCard / NextMilestoneCard** hide when the viewer isn't a
  participant in this cohort

If the viewer is in view-as-participant mode, these cards re-appear (they're
previewing the participant view, after all).

## Resolved decisions

- **Multi-org Org Admin switcher** — yes, build it (small dropdown on
  `/org/home`). Queued for the next round.
- **Stale-homework banner on `/facilitator/home`** — yes, top-of-page
  amber banner when any homework has been pending 3+ days, complementary
  to the existing 7-day red escalation. Queued for the next round.
- **User-level view-as** — yes, demo-only initially (pick a specific user
  from a dropdown, no audit log). Production version with audit logging
  is queued separately. Queued for the next round.
- **Facilitator participant adds** — yes, current behavior stays
  (facilitators can add participants to their assigned cohorts).
