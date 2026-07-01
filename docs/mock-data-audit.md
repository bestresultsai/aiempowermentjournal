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

Last updated: after task #574.
