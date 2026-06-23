-- ============================================================================
-- BestResults.AI Platform — initial schema
-- Migration: 0001_initial_schema
--
-- Creates all 13 domain tables. RLS is enabled on every table but no policies
-- are added here — that's 0002_rls_policies.sql. Until 0002 is applied, only
-- the service role can read/write these tables, which is correct for the
-- seed-then-policy ordering.
--
-- Idempotency: each CREATE uses IF NOT EXISTS so the migration is safe to
-- re-apply against a partially-applied schema during dev.
--
-- Mapping from the localStorage overlay model documented in
-- docs/production-readiness.md §4.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------

create extension if not exists "pgcrypto";       -- gen_random_uuid()
create extension if not exists "citext";         -- case-insensitive email column

-- ----------------------------------------------------------------------------
-- Helper: updated_at trigger function
-- Used on every table that has an updated_at column.
-- ----------------------------------------------------------------------------

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 1. profiles
-- One row per authenticated user. Linked to auth.users by id (1:1).
-- Replaces src/lib/auth.js + parts of adminMockData.js.
-- ============================================================================

create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           citext not null unique,
  name            text   not null default '',
  avatar_url      text,
  -- Capability list. Additive ladder used by src/lib/permissions.js.
  -- Possible values: 'super', 'admin', 'facilitator', 'org_admin',
  --                  'cohort_leader', 'participant'.
  capabilities    text[] not null default array['participant']::text[],
  -- Optional org membership for org-scoped capabilities.
  org_id          uuid,
  -- Phone for SMS (later) + display.
  phone           text,
  -- Time zone, used by scheduler.
  time_zone       text default 'America/New_York',
  -- Settings blob (notification preferences, theme, etc.). Schema-less for now.
  preferences     jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  archived_at     timestamptz
);

create trigger tg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.tg_set_updated_at();

create index if not exists profiles_org_idx on public.profiles(org_id) where archived_at is null;
create index if not exists profiles_capabilities_idx on public.profiles using gin(capabilities);

alter table public.profiles enable row level security;

-- ============================================================================
-- 2. organizations
-- Customer organizations (Summit Health, Pacific Health System).
-- ============================================================================

create table if not exists public.organizations (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,                       -- 'summit-health'
  name            text not null,
  logo_url        text,
  primary_color   text,                                       -- '#0F4F7A'
  -- Org admins (resolved via profiles.org_id + 'org_admin' capability).
  notes           text,                                       -- internal notes for admin UI
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  archived_at     timestamptz
);

create trigger tg_organizations_updated_at
  before update on public.organizations
  for each row execute function public.tg_set_updated_at();

alter table public.organizations enable row level security;

-- Now that organizations exists, add the FK from profiles.org_id back.
alter table public.profiles
  drop constraint if exists profiles_org_id_fkey;
alter table public.profiles
  add constraint profiles_org_id_fkey
  foreign key (org_id) references public.organizations(id) on delete set null;

-- ============================================================================
-- 3. programs
-- Program templates (AIEW3, APFW, etc.). One program is a curriculum.
-- Replaces src/lib/programs.js overlay store.
-- ============================================================================

create table if not exists public.programs (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,                       -- 'aiew3', 'apfw'
  name            text not null,
  short_name      text not null default '',
  description     text not null default '',
  -- Production tier ladder: 'no-sop', 'with-sop', 'ai-workflow', 'ai-agent', 'ai-swarm'.
  production_tiers text[] not null default array[]::text[],
  -- Session blueprint as ordered JSONB. Each entry: { number, title, summary, ... }.
  sessions        jsonb not null default '[]'::jsonb,
  -- Badge customization (per-program overrides of DEFAULT_BADGES).
  badges          jsonb not null default '[]'::jsonb,
  -- Completion criteria { sessions_completed_min, homework_submitted_min, ... }.
  completion_criteria jsonb not null default '{}'::jsonb,
  -- Default belt order (string array of belt names).
  belt_order      text[] not null default array[]::text[],
  -- Optional brand assets (logo, color override).
  branding        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  archived_at     timestamptz
);

create trigger tg_programs_updated_at
  before update on public.programs
  for each row execute function public.tg_set_updated_at();

alter table public.programs enable row level security;

-- ============================================================================
-- 4. cohorts
-- A scheduled run of a program for a specific org.
-- Replaces src/lib/cohortAdmin.js cohort records.
-- ============================================================================

create table if not exists public.cohorts (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null,                              -- 'summit-2026-q3'
  program_id      uuid not null references public.programs(id) on delete restrict,
  org_id          uuid references public.organizations(id) on delete set null,
  name            text not null,                              -- 'Summit Health · 2026 Q3'
  -- Schedule
  start_date      date,
  end_date        date,
  meeting_day     text,                                       -- 'Thursday'
  meeting_time    text,                                       -- '12:00 PT'
  meeting_zoom_url text,
  -- Roster summary fields (derived from cohort_participants in queries — these
  -- are denormalized for the cohort-list view to avoid N+1).
  participant_count int not null default 0,
  -- Per-cohort session overrides (date shifts, custom titles).
  session_overrides jsonb not null default '[]'::jsonb,
  -- Lead facilitator + cohort leader (FKs into profiles).
  facilitator_id  uuid references public.profiles(id) on delete set null,
  cohort_leader_id uuid references public.profiles(id) on delete set null,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  archived_at     timestamptz,
  unique (program_id, slug)
);

create trigger tg_cohorts_updated_at
  before update on public.cohorts
  for each row execute function public.tg_set_updated_at();

create index if not exists cohorts_org_idx on public.cohorts(org_id) where archived_at is null;
create index if not exists cohorts_program_idx on public.cohorts(program_id) where archived_at is null;
create index if not exists cohorts_facilitator_idx on public.cohorts(facilitator_id) where archived_at is null;

alter table public.cohorts enable row level security;

-- ============================================================================
-- 5. cohort_participants
-- Many-to-many: which users are in which cohort, with their role within it.
-- Replaces the participants[] field in src/lib/cohortAdmin.js + adminMockData.js.
-- ============================================================================

create table if not exists public.cohort_participants (
  id              uuid primary key default gen_random_uuid(),
  cohort_id       uuid not null references public.cohorts(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  -- Role within this cohort: 'participant' | 'cohort_leader' | 'co_facilitator'.
  role            text not null default 'participant',
  -- Belt color the participant is working toward in this cohort.
  belt            text default 'white',
  -- Production tier they're aiming for in this cohort.
  production_tier text default 'no-sop',
  -- Onboarding state.
  onboarded_at    timestamptz,
  -- Soft remove (kept for audit). Hard-delete is allowed when archived.
  removed_at      timestamptz,
  joined_at       timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (cohort_id, profile_id)
);

create trigger tg_cohort_participants_updated_at
  before update on public.cohort_participants
  for each row execute function public.tg_set_updated_at();

create index if not exists cohort_participants_cohort_idx on public.cohort_participants(cohort_id) where removed_at is null;
create index if not exists cohort_participants_profile_idx on public.cohort_participants(profile_id) where removed_at is null;

alter table public.cohort_participants enable row level security;

-- ============================================================================
-- 6. journal_entries
-- Participant journal posts.
-- Replaces journal entries in adminMockData.js / brai_journal localStorage.
-- ============================================================================

create table if not exists public.journal_entries (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  cohort_id       uuid references public.cohorts(id) on delete set null,
  session_number  int,                                        -- which session this entry is tied to
  prompt          text,                                       -- which prompt they answered
  body            text not null default '',
  -- Visibility: 'private' (just me) | 'cohort' (cohort can see) | 'public' (testimonial-ready).
  visibility      text not null default 'private',
  -- Tags for filtering / themes.
  tags            text[] not null default array[]::text[],
  attachments     jsonb not null default '[]'::jsonb,         -- [{kind, storage_path, filename}]
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  archived_at     timestamptz
);

create trigger tg_journal_entries_updated_at
  before update on public.journal_entries
  for each row execute function public.tg_set_updated_at();

create index if not exists journal_entries_profile_idx on public.journal_entries(profile_id, created_at desc);
create index if not exists journal_entries_cohort_idx on public.journal_entries(cohort_id, session_number);

alter table public.journal_entries enable row level security;

-- ============================================================================
-- 7. homework_submissions
-- Homework turned in by participants.
-- Replaces homework records in adminMockData.js / brai_homework localStorage.
-- ============================================================================

create table if not exists public.homework_submissions (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  cohort_id       uuid not null references public.cohorts(id) on delete cascade,
  session_number  int not null,
  -- Status: 'draft' | 'submitted' | 'reviewed' | 'returned'.
  status          text not null default 'draft',
  title           text not null default '',
  body            text not null default '',
  attachments     jsonb not null default '[]'::jsonb,
  -- Facilitator review.
  reviewer_id     uuid references public.profiles(id) on delete set null,
  reviewer_notes  text,
  reviewed_at     timestamptz,
  submitted_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  archived_at     timestamptz
);

create trigger tg_homework_submissions_updated_at
  before update on public.homework_submissions
  for each row execute function public.tg_set_updated_at();

create index if not exists homework_profile_cohort_idx on public.homework_submissions(profile_id, cohort_id, session_number);
create index if not exists homework_reviewer_idx on public.homework_submissions(reviewer_id) where reviewer_id is not null;

alter table public.homework_submissions enable row level security;

-- ============================================================================
-- 8. session_progress
-- Per-participant per-session completion + check-ins.
-- Replaces session progress in adminMockData.js / brai_progress localStorage.
-- ============================================================================

create table if not exists public.session_progress (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  cohort_id       uuid not null references public.cohorts(id) on delete cascade,
  session_number  int not null,
  -- Status: 'not_started' | 'attended' | 'completed' | 'absent'.
  status          text not null default 'not_started',
  attended_at     timestamptz,
  completed_at    timestamptz,
  -- Notes the participant left, e.g. why they were absent.
  participant_notes text,
  -- Facilitator notes about this participant's performance this session.
  facilitator_notes text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (profile_id, cohort_id, session_number)
);

create trigger tg_session_progress_updated_at
  before update on public.session_progress
  for each row execute function public.tg_set_updated_at();

create index if not exists session_progress_cohort_idx on public.session_progress(cohort_id, session_number);

alter table public.session_progress enable row level security;

-- ============================================================================
-- 9. feedbacks
-- Per-session rating + comment.
-- Replaces src/lib/feedbacks.js overlay store.
-- ============================================================================

create table if not exists public.feedbacks (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  cohort_id       uuid not null references public.cohorts(id) on delete cascade,
  session_number  int not null,
  rating          int not null check (rating between 1 and 5),
  comment         text,
  -- Was this feedback rolled up into the cohort summary email yet?
  summarized_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  archived_at     timestamptz,
  -- One feedback per participant per session.
  unique (profile_id, cohort_id, session_number)
);

create trigger tg_feedbacks_updated_at
  before update on public.feedbacks
  for each row execute function public.tg_set_updated_at();

create index if not exists feedbacks_cohort_session_idx on public.feedbacks(cohort_id, session_number);

alter table public.feedbacks enable row level security;

-- ============================================================================
-- 10. testimonials
-- Published participant testimonials.
-- Replaces src/lib/testimonials.js overlay store.
-- ============================================================================

create table if not exists public.testimonials (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid references public.profiles(id) on delete set null,
  cohort_id       uuid references public.cohorts(id) on delete set null,
  -- Source: 'journal_entry' (sourced from a journal post) | 'standalone'.
  source          text not null default 'standalone',
  source_entry_id uuid references public.journal_entries(id) on delete set null,
  -- Status: 'draft' | 'approved' | 'published' | 'retired'.
  status          text not null default 'draft',
  quote           text not null,
  author_name     text not null default '',
  author_title    text,
  author_org      text,
  rating          int check (rating between 1 and 5),
  -- Where the testimonial is allowed to appear.
  surfaces        text[] not null default array[]::text[],
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  archived_at     timestamptz
);

create trigger tg_testimonials_updated_at
  before update on public.testimonials
  for each row execute function public.tg_set_updated_at();

create index if not exists testimonials_status_idx on public.testimonials(status) where archived_at is null;

alter table public.testimonials enable row level security;

-- ============================================================================
-- 11. resources
-- Library items (videos, docs, links, templates).
-- Replaces src/lib/resources.js overlay store.
-- ============================================================================

create table if not exists public.resources (
  id              uuid primary key default gen_random_uuid(),
  -- Scope: 'global' | 'program' | 'cohort'.
  scope           text not null default 'global',
  program_id      uuid references public.programs(id) on delete cascade,
  cohort_id       uuid references public.cohorts(id) on delete cascade,
  -- Kind: 'video' | 'doc' | 'link' | 'template' | 'image' | 'file'.
  kind            text not null,
  title           text not null,
  description     text,
  url             text,                                       -- external URL or storage path
  storage_path    text,                                       -- supabase storage object name
  tags            text[] not null default array[]::text[],
  -- Pinned items appear at the top of the resource library for participants.
  pinned          boolean not null default false,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  archived_at     timestamptz
);

create trigger tg_resources_updated_at
  before update on public.resources
  for each row execute function public.tg_set_updated_at();

create index if not exists resources_scope_idx on public.resources(scope, program_id, cohort_id) where archived_at is null;
create index if not exists resources_pinned_idx on public.resources(pinned) where pinned = true and archived_at is null;

alter table public.resources enable row level security;

-- ============================================================================
-- 12. notifications
-- Per-user inbox.
-- Replaces brai_notifications + brai_notification_reads localStorage keys.
-- ============================================================================

create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  -- Type: 'session_reminder' | 'homework_due' | 'feedback_request' |
  --       'badge_earned' | 'cohort_announcement' | 'mention' | 'system'.
  kind            text not null,
  title           text not null,
  body            text not null default '',
  -- Where clicking the notification takes the user.
  link_path       text,
  -- Derived from which? e.g. { cohort_id, session_number } so we don't
  -- duplicate the same reminder when the underlying data hasn't changed.
  source_key      text,
  read_at         timestamptz,
  -- Optional auto-expire so old reminders don't pile up.
  expires_at      timestamptz,
  created_at      timestamptz not null default now(),
  unique (profile_id, source_key)
);

create index if not exists notifications_profile_idx on public.notifications(profile_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications(profile_id) where read_at is null;

alter table public.notifications enable row level security;

-- ============================================================================
-- 13. email_sends
-- Audit log of every transactional email the platform sends.
-- Replaces brai_email_log localStorage (capped at 25). Required for support
-- ("did Mike actually get the magic link?") and for compliance.
-- ============================================================================

create table if not exists public.email_sends (
  id              uuid primary key default gen_random_uuid(),
  -- Which email template was used. References src/lib/emailTemplates.js name.
  template        text not null,
  to_email        citext not null,
  to_profile_id   uuid references public.profiles(id) on delete set null,
  cohort_id       uuid references public.cohorts(id) on delete set null,
  subject         text not null,
  -- Provider message id (Resend returns one).
  provider        text not null default 'resend',
  provider_message_id text,
  -- Status: 'queued' | 'sent' | 'delivered' | 'bounced' | 'failed'.
  status          text not null default 'queued',
  error_message   text,
  -- Data payload used to render the template, for replay / audit.
  payload         jsonb not null default '{}'::jsonb,
  sent_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists email_sends_to_profile_idx on public.email_sends(to_profile_id, created_at desc);
create index if not exists email_sends_template_idx on public.email_sends(template, created_at desc);
create index if not exists email_sends_status_idx on public.email_sends(status) where status in ('queued', 'failed');

alter table public.email_sends enable row level security;

-- ============================================================================
-- Sanity / migration metadata
-- ============================================================================

comment on table public.profiles is 'One row per authenticated user. Mirrors auth.users.';
comment on table public.organizations is 'Customer orgs (Summit Health, Pacific Health System, etc.).';
comment on table public.programs is 'Curriculum templates (AIEW3, APFW). One program many cohorts.';
comment on table public.cohorts is 'Scheduled instance of a program for a specific org.';
comment on table public.cohort_participants is 'M:N of profiles to cohorts with per-cohort role + belt.';
comment on table public.journal_entries is 'Participant journal posts.';
comment on table public.homework_submissions is 'Homework turn-ins, optionally reviewed by facilitator.';
comment on table public.session_progress is 'Per-participant per-session attendance + completion.';
comment on table public.feedbacks is 'Session ratings + comments. One per participant per session.';
comment on table public.testimonials is 'Published participant testimonials.';
comment on table public.resources is 'Library: videos, docs, links, templates.';
comment on table public.notifications is 'Per-user inbox.';
comment on table public.email_sends is 'Audit log of every transactional email sent.';
