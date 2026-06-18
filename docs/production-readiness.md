# Production-Readiness Migration Plan (#399)

> **Status:** Draft — for review before Round J implementation.
> **Owner:** Josue
> **Last updated:** June 17, 2026

---

## 1. Executive summary

The platform today is a fully built React UI that persists every piece of state to `localStorage`. To accept real participants we need three swaps:

1. **Real auth** — magic-link email sign-in tied to a verified user record
2. **Real database** — Postgres holding every domain entity currently in the local overlays
3. **Real file storage** — uploaded headshots, homework attachments, resource files, session recordings

We recommend doing all three with **Supabase** as one bundled provider, plus **Resend** for transactional email. Total estimated effort: **3 sprints (≈ 6 weeks at half-time)** including a hand-held Summit + PHS pilot launch in the final week.

This swap is the single launch blocker (#399). Until it ships, real users will lose their data the moment they clear browser storage.

---

## 2. Current state inventory

Every store the platform reads from today, what it holds, and where it's written.

### 2.1 Identity + sessions

| Store | What it holds | Mechanism |
|---|---|---|
| `localStorage.auth_token` | Demo "logged in" flag | `AuthContext.login()` |
| `lib/api.getMe()` | Fake user payload | In-memory mock |
| `lib/demoData.js` | DEMO_USER + overrides | Module constants |

### 2.2 Domain entities (overlay stores — seed + localStorage)

| Store | Module | localStorage key | Notes |
|---|---|---|---|
| Cohorts | `lib/cohortAdmin.js` | `brai_cohort_overlays` | Includes session schedule, Zoom links, facilitator assignments |
| Programs | `lib/programs.js` | `brai_program_overlays` | Includes badges ladder, certificate config |
| Resources | `lib/resources.js` | `brai_resource_overlays` | Includes uploaded files (base64 data URLs) |
| Feedbacks | `lib/feedbacks.js` | `brai_feedback_overlays` | Per-session participant feedback |
| Testimonials | `lib/testimonials.js` | `brai_testimonial_overlays` | Program-completion testimonials with approval state |

### 2.3 Participant-side data (currently all in-memory mocks)

| Domain | Source | Notes |
|---|---|---|
| Participants + roster | `lib/adminMockData.ADMIN_MOCK_PARTICIPANTS` | Hard-coded array |
| Journal entries | Same | Stamped on each participant |
| Homework submissions | Same | Keyed by session order |
| Facilitator notes | Same | Private per-participant |
| Cohort leader status | Same | Boolean flag |

### 2.4 Single-user state (localStorage)

| Store | Module | Purpose |
|---|---|---|
| Notification read state | `lib/notifications.js` | Per-user-id set of read notification IDs |
| Email send log | `lib/mailer.js` | Last 25 sends (will be replaced by audit log) |
| Email preferences | `lib/mailer.js` | Per-recipient prefs |
| View-as mode + user | `lib/viewAs.js` | Demo/QA only — stays local |

### 2.5 Files (base64 in records)

| Surface | Field | Production target |
|---|---|---|
| Headshot upload | `user.headshotUrl` | Supabase Storage bucket `headshots/` |
| Homework attachments | `submission.attachment` | Supabase Storage `homework/` |
| Resource files | `resource.url` (when `fileName` set) | Supabase Storage `resources/` |
| Session recordings | `session.videoUrl` (per-cohort customization) | Supabase Storage `recordings/` (or hand off to Zoom Cloud — see #409) |

---

## 3. Stack decisions

### 3.1 Recommended stack

| Layer | Choice | Rationale |
|---|---|---|
| **Auth** | Supabase Auth (magic link + email OTP) | Native magic-link flow that matches the current Login UX. Free at our scale. JWT sessions integrate with Postgres row-level security. |
| **Database** | Supabase Postgres | Postgres + a hosted dashboard + row-level security + realtime. Tables map 1-to-1 with the current overlay records. |
| **File storage** | Supabase Storage | Bucketed object storage with per-bucket auth policies. Already integrated with the same SDK. |
| **Transactional email** | Resend | Modern API, React-Email components, generous free tier. Sender domain easy to configure. Falls back to Supabase Auth's built-in for magic links to start. |
| **Errors** | Sentry | Scaffolded in `lib/observability.js`. Just needs `VITE_SENTRY_DSN`. |
| **Analytics** | PostHog | Scaffolded in `lib/observability.js`. Just needs `VITE_POSTHOG_KEY`. |
| **Hosting** | Netlify | Already deployed there. Just add env vars + redeploy. |
| **Domain** | Migrate `tools.bestresults.ai` → `app.bestresults.ai` (#267) | Tied to this release. |

### 3.2 Alternatives considered

- **Clerk** for auth — clean DX but adds a separate billing relationship. Defer unless we outgrow Supabase Auth.
- **AWS S3** for storage — more battle-tested but adds an IAM/CDN setup tax we don't need yet.
- **Postmark / SendGrid** for email — both fine. Resend's React-Email components are the tiebreaker; we already have the template HTML.
- **Neon / PlanetScale** for DB — both excellent but lose the integrated auth + storage benefit.
- **Vercel** for hosting — would mean a migration. Stay on Netlify until/unless we hit limits.

### 3.3 Cost envelope

At pilot scale (Summit + PHS, ~50 active users, < 1 GB storage):

| Provider | Tier | Monthly cost |
|---|---|---|
| Supabase | Free tier (500 MB DB, 1 GB storage, 50K monthly auth users) | $0 |
| Resend | Free tier (3,000 emails / month, 100 / day) | $0 |
| Sentry | Free tier (5K events / month) | $0 |
| PostHog | Free tier (1M events / month) | $0 |
| Netlify | Pro (already paying) | unchanged |

First paid tier expected at ~200 active users or > 5 GB storage. Budget for **$50–100/month** at full-launch scale (Supabase Pro $25 + Resend Pro $20 + Sentry Team $26).

---

## 4. Data model

Tables map 1-to-1 with the existing overlay stores. Field names match the current JS shape so the swap is mostly call-site replacement, not refactoring.

### 4.1 Core identity

```sql
-- Auth lives in auth.users (Supabase). We mirror profile fields into a
-- public.profiles table keyed by auth.users.id so the app reads a single
-- row instead of joining across schemas.
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text unique not null,
  name            text,
  title           text,
  organization    text,
  location        text,
  timezone        text default 'America/Los_Angeles',
  headshot_url    text,                       -- Supabase Storage URL
  why_ai          text,
  main_goal       text,
  capabilities    text[] default '{}',        -- ["facilitator","admin",…]
  primary_role    text default 'participant',
  onboarding_completed_at timestamptz,
  default_zoom_link text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  short_name  text,
  created_at  timestamptz default now()
);

create table public.programs (
  code        text primary key,         -- "AIEW3", "APFW"
  name        text not null,
  method_name text,
  tagline     text,
  session_duration_minutes int default 75,
  belts       text[] default '{}',
  sessions    jsonb not null default '[]',  -- session array as-is
  badges      jsonb not null default '[]',
  certificate jsonb not null default '{}',
  is_custom   boolean default false,
  archived_at timestamptz,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table public.cohorts (
  slug              text primary key,
  name              text not null,
  organization_id   uuid references public.organizations(id),
  program_code      text references public.programs(code),
  facilitator_id    uuid references public.profiles(id),
  meeting_day       text,
  meeting_time      text,
  timezone          text,
  zoom_link         text,
  start_date        date,
  is_open           boolean default true,
  sessions          jsonb default '[]',  -- per-cohort overrides
  nda_required      boolean default false,
  archived_at       timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create table public.cohort_participants (
  cohort_slug    text references public.cohorts(slug) on delete cascade,
  participant_id uuid references public.profiles(id) on delete cascade,
  is_cohort_lead boolean default false,
  joined_at      timestamptz default now(),
  primary key (cohort_slug, participant_id)
);
```

### 4.2 Activity tables

```sql
create table public.journal_entries (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid references public.profiles(id) on delete cascade,
  cohort_slug     text references public.cohorts(slug),
  date            timestamptz not null,
  title           text not null,
  description     text,
  time_before_ai  int not null,
  time_with_ai    int not null,
  production_method text,                       -- "no-sop", "ai-workflow", …
  volume_per_day  text,
  frequency       text,
  scope           text,
  quality_outcome text,
  innovation_title text,
  innovation_description text,
  created_at      timestamptz default now()
);

create table public.homework_submissions (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid references public.profiles(id) on delete cascade,
  cohort_slug     text references public.cohorts(slug),
  session_order   int not null,
  response        text,
  link            text,
  attachment_url  text,                          -- Storage URL
  attachment_name text,
  submitted_at    timestamptz default now(),
  reviewed_at     timestamptz,
  reviewed_by     uuid references public.profiles(id),
  feedback        text,
  unique (participant_id, cohort_slug, session_order)
);

create table public.session_progress (
  participant_id  uuid references public.profiles(id) on delete cascade,
  cohort_slug     text references public.cohorts(slug),
  session_order   int not null,
  completed_at    timestamptz default now(),
  primary key (participant_id, cohort_slug, session_order)
);

create table public.feedbacks (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid references public.profiles(id) on delete cascade,
  cohort_slug     text references public.cohorts(slug),
  session_order   int not null,
  rating          int check (rating between 1 and 5),
  comment         text,
  submitted_at    timestamptz default now(),
  updated_at      timestamptz,
  unique (participant_id, cohort_slug, session_order)
);

create table public.testimonials (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid references public.profiles(id),
  cohort_slug     text references public.cohorts(slug),
  program_code    text references public.programs(code),
  quote           text not null,
  role            text,
  organization    text,
  allow_marketing_use boolean default false,
  status          text default 'pending',   -- pending | approved | declined
  submitted_at    timestamptz default now(),
  updated_at      timestamptz,
  approved_at     timestamptz,
  approved_by     uuid references public.profiles(id),
  declined_at     timestamptz,
  declined_by     uuid references public.profiles(id),
  deleted_at      timestamptz
);

create table public.resources (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  type            text,
  url             text,                            -- link OR Storage URL
  file_name       text,
  program_code    text references public.programs(code),
  cohort_slug     text references public.cohorts(slug),
  category        text default 'Uncategorized',
  added_at        timestamptz default now(),
  archived_at     timestamptz
);

create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  recipient_id    uuid references public.profiles(id) on delete cascade,
  type            text not null,
  title           text not null,
  detail          text,
  href            text,
  source_id       text,
  read_at         timestamptz,
  created_at      timestamptz default now()
);

create table public.email_sends (
  id              uuid primary key default gen_random_uuid(),
  template_id     text not null,
  recipient_email text not null,
  recipient_id    uuid references public.profiles(id),
  subject         text not null,
  preview         text,
  status          text default 'queued',  -- queued | sent | failed | bounced
  provider_id     text,                    -- Resend message id
  sent_at         timestamptz,
  error           text,
  created_at      timestamptz default now()
);
```

### 4.3 Row-level security policies

Pattern: participants can read/write their own rows; cohort facilitators can read/write any row in their cohort; admins can do everything.

Example for `journal_entries`:

```sql
alter table public.journal_entries enable row level security;

-- Participants read/write their own.
create policy "Participants manage their own entries"
  on public.journal_entries
  for all
  using (auth.uid() = participant_id)
  with check (auth.uid() = participant_id);

-- Facilitators read every entry in a cohort they facilitate.
create policy "Facilitators read cohort entries"
  on public.journal_entries
  for select
  using (
    exists (
      select 1 from public.cohorts c
      where c.slug = journal_entries.cohort_slug
        and c.facilitator_id = auth.uid()
    )
  );

-- Admins do everything.
create policy "Admins do everything"
  on public.journal_entries
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and ('admin' = any(p.capabilities) or 'super' = any(p.capabilities))
    )
  );
```

Replicate the same three-tier pattern across `homework_submissions`, `feedbacks`, `testimonials`, `notifications`.

---

## 5. Phased rollout

Three sequential phases. Each phase ends with a buildable, shippable state — if we have to pause, the platform still works.

### Phase 1 — Foundations (Sprint 1, ~2 weeks)

**Goal:** Real auth + Postgres + a thin data layer. No participant data migrated yet.

**Tasks:**

1. **Set up Supabase project** — environments for `dev` + `prod`. Lock down service-role key to Netlify build env.
2. **Run migrations** — section 4 schema, plus RLS policies.
3. **Build `src/lib/supabase.js`** — a single client created from env vars, exposed via a `getSupabase()` helper.
4. **Replace `lib/api.js` with real client calls** — `getMe()`, `login()`, `verify()`, `logout()` swap to Supabase Auth.
5. **Wire AuthContext to Supabase session** — on app boot, hydrate from `supabase.auth.getSession()`. Subscribe to `onAuthStateChange`.
6. **Add staff users manually** in the Supabase dashboard — Mike, Josue, Lee, Jordan. Set `capabilities` accordingly.
7. **Sentry + PostHog env vars** — install the SDKs (`@sentry/react`, `posthog-js`) and drop the runtime-import trick in `observability.js`.
8. **Privacy + Terms** — replace draft copy with legal-approved versions.

**Exit criteria:** Mike can sign in with a real magic link, lands on `/home`, sees an empty cohort list because no data is migrated yet. No regressions in the demo flow (`?demo=…` still works for testing UI).

### Phase 2 — Domain data + seed (Sprint 2, ~2 weeks)

**Goal:** Move every overlay store to Supabase. Reads + writes go through Supabase. Seed Summit + PHS as real cohorts.

**Tasks:**

1. **Refactor each overlay module** — `cohortAdmin`, `programs`, `resources`, `feedbacks`, `testimonials` keep their public API but route reads/writes to Supabase. Pubsub stays in-memory for instant UI updates after writes.
2. **Build a `lib/db.js` query helper** — generic `getRows`, `upsertRow`, `softDelete` wrappers so each overlay module is ~20 lines instead of 200.
3. **Migration script** — Node script that reads the seed JSON from `ADMIN_MOCK_PARTICIPANTS` etc. and inserts into Supabase. Runs once against `prod`. Idempotent (uses upsert).
4. **Storage buckets** — create `headshots`, `homework`, `resources`, `recordings`. Set per-bucket public-read or signed-URL policies.
5. **Swap base64 upload paths** — `HeadshotUpload`, `MaterialsEditor`, `ResourceForm` Source section, `HomeworkSubmission` attachment — each gets a `uploadToStorage(file, bucket)` call that returns a URL.
6. **Seed Summit + PHS for real** — same participants, journal entries, homework that exist in the demo data. Invite the actual participants via magic link.

**Exit criteria:** Summit + PHS facilitators see their real cohorts with real participants. Journal entries persist. Headshots survive a browser cache clear.

### Phase 3 — Email + polish + go-live (Sprint 3, ~2 weeks)

**Goal:** Real email sending, scheduled jobs, final QA, DNS migration, public launch.

**Tasks:**

1. **Resend account + domain verification** — verify `bestresults.ai` sender domain (SPF/DKIM/DMARC).
2. **Swap `lib/mailer.js` internals** — `_enqueue` calls Resend's API. Writes to `email_sends` audit table. Reads pref from `lib/mailer.getMailable`.
3. **Wire triggers** — onboarding-confirmed (on `auth.users` insert), homework-reviewed (on `homework_submissions.reviewed_at` update), etc. Implement as Supabase Edge Functions called from RLS triggers or app code.
4. **Scheduled jobs** — Supabase pg_cron for the 24h / 1h session reminders + weekly digests. Each job reads upcoming sessions, calls `sendEmail` per recipient.
5. **DNS migration (#267)** — point `app.bestresults.ai` at Netlify, update all hardcoded URLs (already audited in Round 1B), redirect `tools.bestresults.ai` → `app.bestresults.ai`.
6. **Mobile audit re-run** — confirm everything still feels right with real data.
7. **Pilot launch** — send the first real `welcome-to-cohort` to Summit + PHS participants. Mike + Jordan hand-hold the first week.

**Exit criteria:** Real participants sign in, journal entries persist, facilitators get real email notifications, certificates download with real names. Pilot stays manageable (no errors in Sentry, no support tickets we can't answer).

---

## 6. Data migration strategy

For the pilot, we don't have a real-user dataset to migrate — Summit + PHS haven't logged in yet. So "migration" really means **seeding** the demo data as production data on day one.

The seed script:

```js
// scripts/seed-prod.mjs
import { createClient } from "@supabase/supabase-js";
import { ADMIN_MOCK_PARTICIPANTS } from "../src/lib/adminMockData.js";
import { PROGRAMS } from "../src/lib/programs.js";
import { SEED_RESOURCES } from "../src/lib/resources.js";
import { SEED_FEEDBACKS } from "../src/lib/feedbacks.js";
import { SEED_TESTIMONIALS } from "../src/lib/testimonials.js";
// … plus organizations + cohorts from cohortAdmin's seed

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

await upsertOrganizations();
await upsertPrograms();
await upsertCohorts();
await upsertParticipants();      // creates auth.users rows via admin API
await upsertJournalEntries();
await upsertHomeworkSubmissions();
await upsertSessionProgress();
await upsertFeedbacks();
await upsertTestimonials();
await upsertResources();

console.log("Seed complete.");
```

Run against `prod` once. Idempotent: every insert uses `upsert(..., { onConflict: 'id' })` so a rerun is safe.

For headshots + uploaded files: pre-existing demo files are placeholder data — we don't need to migrate them. Real headshots get uploaded by real users in Phase 2.

---

## 7. Rollback strategy

**Phase 1 rollback:** Don't merge the AuthContext swap until Phase 1 is green in dev. If sign-in breaks for staff in prod, revert the AuthContext PR and the platform falls back to the localStorage demo session.

**Phase 2 rollback:** Each overlay module ships behind a feature flag (`VITE_USE_SUPABASE_COHORTS=1` etc.) so we can flip any one back to localStorage if its Supabase backend misbehaves. Flags get removed in Phase 3 cleanup.

**Phase 3 rollback (DNS):** Netlify's DNS cutover is instant + reversible. Keep `tools.bestresults.ai` active for a week as a fallback. Update hardcoded URLs to read from `VITE_APP_URL` so we can flip without code changes.

**Data rollback:** Supabase does point-in-time recovery on the Pro tier — required before launch. Daily snapshots before then. The seed script is idempotent so re-running it can't corrupt existing data.

---

## 8. Risks + open questions

### Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Supabase free tier limit hit during pilot | Low | Monitor; upgrade to Pro at first warning ($25/month) |
| Magic-link delivery to corporate domains flagged as spam | Medium | Verify sender domain SPF/DKIM/DMARC early. Test with each pilot org's email IT contact. |
| Existing `localStorage` overlays still active on staff browsers after the swap | High | Add a one-time clear-overlay script in `main.jsx` that runs once after deploy, gated by a `VITE_OVERLAY_CLEAR_TOKEN`. |
| File uploads exceed Storage quota | Low | Cap upload size in the UI (already 5 MB for resources/materials, set same for homework). Monitor usage in dashboard. |
| RLS policy bug exposes data | High impact | Write SQL tests that assert "user A cannot read user B's rows" before any policy ships. |
| Email send failures silent | Medium | Audit log in `email_sends` + Sentry alert on > 5 failures in 1 hour. |

### Open questions

- **NDA workflow** — Cohorts can require an NDA today (UI shows NDABanner). Do we want clickwrap NDA acceptance stored against the cohort_participants row? Defer to post-launch unless legal requires it.
- **Multi-org users** — `cohort_participants` supports a user being in N cohorts. Profile is single-org. If a user works across two orgs, does the profile copy or do we add an `org_memberships` table? Defer to post-launch.
- **Zoom integration (#409)** — auto-upload of session recordings. Phase 3 picks manual upload; Zoom-driven upload is a follow-up.
- **Google Calendar (#354)** — `.ics` download covers v1. Real Calendar API integration is a follow-up.

---

## 9. Estimated effort

| Phase | Effort | Calendar (half-time) |
|---|---|---|
| 1 — Foundations | 5 dev-days | Sprint 1 (~2 weeks) |
| 2 — Domain data + seed | 7 dev-days | Sprint 2 (~2 weeks) |
| 3 — Email + go-live | 5 dev-days | Sprint 3 (~2 weeks) |
| **Total** | **17 dev-days** | **6 calendar weeks** |

These numbers assume one person at ~half capacity on the migration plus QA from Mike + Josue along the way. Full-time would compress to 3 weeks.

---

## 10. Pre-launch checklist (must hit before pilot invite goes out)

- [ ] Supabase prod project provisioned with daily snapshots
- [ ] All migrations applied; RLS policies tested with SQL fixtures
- [ ] Sender domain verified (SPF, DKIM, DMARC green)
- [ ] Sentry + PostHog DSN / keys live in Netlify env
- [ ] Privacy + Terms reviewed by counsel and published
- [ ] DNS cutover to `app.bestresults.ai` complete; redirect from `tools.bestresults.ai`
- [ ] Mobile audit re-run against real data
- [ ] Mike + Josue + Jordan signed in with their real accounts
- [ ] Welcome email sent to one real test participant end-to-end
- [ ] First Summit participant added; they receive welcome, complete onboarding, see their cohort home

---

## Appendix A — Tracked tasks

- **#399** — This plan (Round J)
- **#267** — DNS migration (tied to Phase 3)
- **#354** — Google Calendar API (post-launch)
- **#409** — Zoom auto-upload (post-launch)
- **#469** — Error reporting + analytics (scaffold already shipped; SDK install lands in Phase 1)
- **#468** — Privacy + Terms (draft shipped; legal review tracked here)
- **#471** — Mobile responsiveness (audited; Phase 3 re-runs against real data)

## Appendix B — Files that will change

Every file under these paths is a candidate for the Phase 1–2 refactor:

- `src/lib/api.js` — replace with Supabase client calls
- `src/lib/cohortAdmin.js` — overlay → Supabase
- `src/lib/programs.js` — overlay → Supabase
- `src/lib/resources.js` — overlay + base64 → Supabase + Storage URLs
- `src/lib/feedbacks.js` — overlay → Supabase
- `src/lib/testimonials.js` — overlay → Supabase
- `src/lib/adminMockData.js` — replaced by Supabase reads scoped by role
- `src/lib/mailer.js` — `_enqueue` swaps to Resend
- `src/lib/observability.js` — runtime-import swap to direct import
- `src/context/AuthContext.jsx` — wire to `supabase.auth`
- `src/components/HeadshotUpload.jsx` — base64 → Storage upload
- `src/components/admin/MaterialsEditor.jsx` — base64 → Storage upload
- `src/components/admin/ResourceForm.jsx` — base64 → Storage upload
- `src/components/cohort/HomeworkSubmission.jsx` — base64 → Storage upload

Roughly 14 modules to refactor. The public API of each stays stable — the swap is mechanical.
