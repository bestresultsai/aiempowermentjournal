# Mock Data Audit

Living document tracking every seed/mock/demo data source in the codebase,
where it's read from, and whether that path is safe in a Supabase-wired
production deploy. Update as we knock items off.

Key: ✅ safe / 🟡 gated but risky / 🔴 leaks demo data into prod

---

## Data sources

### `src/lib/demoData.js` — `DEMO_COHORTS`
Static array of 3–5 seed cohorts (IAHE, Mayo, UCLA, Summit, PHS) with
facilitator + org + participant seed data. Legitimate uses: `?demo=multi`
mode, seed hydration when Supabase is off.

Gated by `shouldUseSeedData()` (returns `false` when Supabase is enabled and
no demo query param is active).

**Direct imports (audit needed at each):**

- `src/lib/cohortAdmin.js` → `baseFacilitators()`, `baseOrgs()`,
  `getAllCohortsForAdmin()` — ✅ all gate on `shouldUseSeedData()`.
- `src/pages/admin/AdminCohortNew.jsx` — 🔴 **FIXED** this round. Was
  calling `getAccessibleFacilitators(user, DEMO_COHORTS)` directly, which
  is the root cause of the "picker shows Jess/Carlos/Jordan" bug. Now
  uses `useFacilitatorsFromSupabase()`.
- `src/pages/admin/AdminCohortEdit.jsx` — 🔴 **FIXED** same round, same
  fix.
- `src/pages/admin/AdminPermissions.jsx` — needs audit.
- `src/pages/admin/AdminUsers.jsx` — needs audit.
- `src/pages/admin/AdminFacilitators.jsx` — needs audit; probably
  should call `useFacilitatorsFromSupabase()` too.
- `src/pages/admin/AdminOrgs.jsx` — needs audit.
- `src/lib/cohortResolution.js` — ✅ uses `isMultiCohortDemo()` gate.
- `src/lib/api.js` — ✅ uses `isDemoModeActive()` gate.
- Various view-as / role-experience files under `src/pages/facilitator/`,
  `src/pages/orgadmin/` — need audit.

### `src/lib/mockCohort.js` — `MOCK_COHORT` + `MOCK_SESSIONS`
The single-cohort seed used when `?demo=1` is active OR as a fallback when
cohort resolution can't find a real cohort. Includes IAHE / Purple Belt /
Mike Burkesmith seed identity that used to leak into participant views.

**Direct imports:**

- `src/lib/cohortApi.js` — 🟡 `buildParticipantCohortView` uses
  `MOCK_COHORT.trainer` as fallback when no real facilitator resolves
  (that fallback used to be Purple Belt Mike; task #551 patched the
  clean-slate path). Fine for demo, questionable for production —
  worth revisiting when we're sure every real cohort has a facilitator.
- `src/lib/cohortResolution.js` — ✅ uses `MOCK_COHORT.methodName` as
  a display placeholder only, resolved downstream from `programs`.
- `src/lib/mockCohort.js` — internal.
- Handful of participant pages reference `MOCK_COHORT.slug` for demo
  routing. Safe under `?demo` gates.

### `src/lib/adminMockData.js` — `ADMIN_MOCK_PARTICIPANTS`
Hard-coded participant array (~25 rows) used pre-Supabase.
`getEffectiveParticipants()` filters to Supabase-hydrated + admin-created
rows in clean-slate mode, so the raw seed is hidden.

**Risk points:**

- 🟡 Any code that imports `ADMIN_MOCK_PARTICIPANTS` directly instead of
  going through `getEffectiveParticipants()`. Grep found several
  internal references — safe because they're the write path (push /
  find). External reads are all via `getEffectiveParticipants()`.
- 🟡 Cohort scope helpers that iterate every seeded participant.

### `src/lib/programs.js` — seed programs
AIEW3 + APFW seed program definitions. Hydrated from Supabase when wired,
falls through to seed otherwise. ✅ safe.

### Sample data in `src/lib/emailTemplates.js` — `SAMPLE_PARTICIPANT`, etc.
Used by `/admin/emails` preview page ONLY. Not used in real sends. ✅ safe.

### `DEMO_USER` in `src/lib/demoData.js`
Used only by `?demo=` participant modes. ✅ safe.

### `MOCK_PROGRESS`, `MOCK_HOMEWORK`
Empty objects — no risk.

---

## Read paths currently at risk (highest → lowest priority)

1. 🟡 **`AdminFacilitators` page** — verify it doesn't render off
   `getAccessibleFacilitators(user, DEMO_COHORTS)` or similar. Likely
   needs `useFacilitatorsFromSupabase()`.
2. 🟡 **Facilitator picker in `ParticipantForm`** (if any) — same fix.
3. 🟡 **Admin dashboard "At risk / activity" strips** — verify they
   pull from `getEffectiveParticipants()` not the raw seed.
4. 🟡 **`/leader/cohort` page** — its cohort resolution should follow
   the same Supabase-first path as `useResolvedCohort` (task #573).
5. 🟡 **`useCohortLeader` helper** — same.
6. 🟡 **`getAllOrganizations`** — currently overlay-backed. If a stale
   overlay carries an org that's since been deleted from Supabase, it
   still shows. Consider a Supabase-direct hook.

## Follow-up rounds

- [ ] Audit each admin page listed under "at risk" and confirm it
      pulls from live Supabase queries where relevant. One round per
      page keeps commits small and safe.
- [ ] Add `useOrgsFromSupabase()` mirror of the facilitators hook,
      swap consumers.
- [ ] Delete `getAccessibleFacilitators(user, DEMO_COHORTS)` call
      sites entirely. The helper stays for other legit scope-scoped
      uses (org admins seeing only their own facilitators).
- [ ] Once every read is Supabase-live, remove `DEMO_COHORTS` /
      `MOCK_COHORT` from the production bundle via a build-time flag
      that strips them.

---

## Round 2 sweep (task #576)

Grepped every direct import of DEMO_COHORTS / MOCK_COHORT /
ADMIN_MOCK_PARTICIPANTS across 29 files. Categorized each:

**Safe (definitions or explicit demo/gated paths):**

- `src/lib/demoData.js` — source
- `src/lib/mockCohort.js` — source
- `src/lib/adminMockData.js` — source
- `src/lib/programs.js` — hydrator, no risk
- `src/lib/notifications.js` — ✅ **fixed this round** (was iterating
  raw ADMIN_MOCK_PARTICIPANTS; swapped to getEffectiveParticipants
  so seed rows are hidden in clean-slate mode)
- `src/lib/cohortAdmin.js` — DEMO_COHORTS use gated by shouldUseSeedData
- `src/lib/cohortResolution.js` — MOCK_COHORT + DEMO_COHORTS gated
- `src/lib/cohortApi.js` — DEMO_COHORTS gated by shouldUseSeedData
- `src/context/AuthContext.jsx` — demo user path only
- `src/components/ViewAsUserPicker.jsx` — dev/QA tool
- `src/pages/admin/AdminCohortEdit.jsx` — fixed #574
- `src/pages/admin/AdminCohortNew.jsx` — fixed #574
- `src/pages/admin/AdminFacilitators.jsx` — fixed #574
- `src/pages/admin/AdminCohortRoster.jsx`, `AdminParticipantDetail.jsx`,
  `AdminDashboard.jsx`, `AdminJournalDashboard.jsx`, `AdminPermissions.jsx`,
  `AdminParticipants.jsx`, `AdminHomeworkQueue.jsx`, `AdminCohorts.jsx`,
  `CohortLeaderDashboard.jsx`, `OrgAdminHome.jsx`, `FacilitatorHome.jsx`,
  `CohortForm.jsx`, `SubmissionDetail.jsx`, `PipelineView.jsx`,
  `useScopeFilters.js` — all import mock symbols but only reach them via
  getAllCohortsForAdmin / getEffectiveParticipants / getAccessibleCohorts
  (which are gated). Confirmed safe.

**Fixed this round:**

- 🟢 `src/lib/adminMockData.js` `hydrateParticipantsFromSupabase` — no
  longer adopts seed rows by email match in clean-slate mode. Instead
  removes any seed collision and pushes the fresh Supabase-derived
  participant. Prior approach zeroed activity fields; this is safer
  because it eliminates the entire class of "adopted seed" leakage.
- 🟢 `src/lib/notifications.js` — see above.
- 🟢 `src/dashboards/IndividualDashboard.jsx` — was falling back to
  MOCK_COHORT.name / MOCK_COHORT.slug when a real user had no journal
  entries. Now skips the cohort fetch until a real entry gives us a
  real name, so a fresh user sees an empty state instead of seed
  cohort data.

**Kept as intentional demo fallback:**

- `src/pages/cohort/CohortLanding.jsx` MOCK_COHORT fallback — only
  fires when `viewAsMode === "participant"` AND the admin has no real
  cohort. That's the admin's own "view-as participant preview"
  affordance; showing the demo cohort here is the desired behavior
  and doesn't leak to real end users.

## Still-open follow-ups

- Add `useOrgsFromSupabase()` hook + rewire /admin/orgs and the org
  picker in CohortForm.
- Add `useParticipantsFromSupabase()` hook for cases where consumers
  need the guaranteed-fresh list rather than the in-memory overlay.
- Consider a build-time flag to strip DEMO_* / MOCK_* out of the
  production bundle entirely, once every consumer is Supabase-live.
- Sanitize seed emails in ADMIN_MOCK_PARTICIPANTS so the demo/staging
  build never has real user emails in the fixtures.

Last updated: after task #576.
