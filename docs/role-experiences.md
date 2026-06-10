# Role experiences

This is the source of truth for what each role lands on, what they see on
their home, and how "view as" works. Pairs with
`docs/admin-visibility-matrix.md` (permissions per role) — this doc is about
*UX shape*, not access control.

## Home landings

When a user hits `/home` (or clicks the Home nav item), where do they go?

| Capabilities | Lands at | Why |
| --- | --- | --- |
| Participant only | `/home` (CohortLanding) | The cohort experience is their workspace |
| Cohort Leader | `/home` then drills to `/leader/cohort` | Same as participant, with leader badge + leader dashboard link |
| Facilitator | `/facilitator/home` | Their own home — cohorts they lead, grading queue, upcoming sessions |
| Org Admin | `/org/home` | Their own home — cohorts in their org, ROI, completion |
| Admin / Super Admin | `/admin` | Cross-org Dashboard already plays this role |

If a user has multiple capabilities, the highest-leverage home wins. Mike
(facilitator + admin) lands at `/admin` by default but his NavBar gives him
quick access to `/facilitator/home` too.

## View as

Any user with elevated capabilities can switch into a lower-role view to
preview what that role experiences. Examples:

- Mike (facilitator + admin) → can view as **Participant** or **Facilitator**
- An Org Admin → can view as **Participant** or **Facilitator** (within scope)
- Super Admin → can view as **Anything**

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

## Open questions (queued)

- Should Org Admins be able to switch between their assigned orgs from the
  org home? Today they see all of them aggregated. (Probably yes if more
  than one — but no Org Admin in the demo has multiple orgs yet.)
- Should Facilitators get push-style notifications (banner on `/home`) when
  homework has been pending for over 3 days? (Yes eventually, but not in
  this round.)
- Should the "View as" picker show user-level granularity (view as Marcus
  Williams specifically) or just role-level (view as Participant)? Today
  it's role-level. Per-user impersonation is a bigger lift + has audit
  implications.
