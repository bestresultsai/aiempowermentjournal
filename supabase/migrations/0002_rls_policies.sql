-- ============================================================================
-- BestResults.AI Platform — Row Level Security policies
-- Migration: 0002_rls_policies
--
-- Three-tier scope model (matches src/lib/permissions.js):
--
--   GLOBAL    — super, admin see everything
--   PROGRAM   — facilitator + org_admin see their program / org
--   COHORT    — cohort_leader + participants see their cohort
--
-- Helper functions are SECURITY DEFINER so they can read public.profiles
-- without triggering recursive RLS checks. Each function runs under the
-- table owner (postgres) and we restrict the search_path to public.
--
-- This file is intentionally read-side first. Write policies follow each
-- read block.
-- ============================================================================

set search_path = public;

-- ----------------------------------------------------------------------------
-- Helper functions
-- ----------------------------------------------------------------------------

-- Has any of the listed capabilities.
create or replace function public.has_capability(uid uuid, caps text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
      from public.profiles
     where id = uid
       and archived_at is null
       and capabilities && caps
  );
$$;

create or replace function public.is_super(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_capability(uid, array['super']);
$$;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.has_capability(uid, array['super', 'admin']);
$$;

-- Is the current user the facilitator on this cohort, OR an admin?
create or replace function public.is_facilitator_of(uid uuid, target_cohort uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_admin(uid) or exists (
    select 1
      from public.cohorts c
     where c.id = target_cohort
       and c.archived_at is null
       and (c.facilitator_id = uid)
  );
$$;

-- Is the current user the cohort leader on this cohort?
create or replace function public.is_cohort_leader_of(uid uuid, target_cohort uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
      from public.cohorts c
     where c.id = target_cohort
       and c.cohort_leader_id = uid
       and c.archived_at is null
  );
$$;

-- Is the current user a participant (any role) in this cohort?
create or replace function public.is_in_cohort(uid uuid, target_cohort uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
      from public.cohort_participants cp
     where cp.cohort_id = target_cohort
       and cp.profile_id = uid
       and cp.removed_at is null
  );
$$;

-- Is the current user an org admin for the org that owns this cohort?
create or replace function public.is_org_admin_of_cohort(uid uuid, target_cohort uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
      from public.cohorts c
      join public.profiles p on p.org_id = c.org_id
     where c.id = target_cohort
       and p.id = uid
       and 'org_admin' = any(p.capabilities)
       and p.archived_at is null
  );
$$;

-- Convenience: can the current user see anything related to this cohort?
create or replace function public.can_see_cohort(uid uuid, target_cohort uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
       public.is_admin(uid)
    or public.is_facilitator_of(uid, target_cohort)
    or public.is_cohort_leader_of(uid, target_cohort)
    or public.is_in_cohort(uid, target_cohort)
    or public.is_org_admin_of_cohort(uid, target_cohort);
$$;

-- ============================================================================
-- profiles
-- ============================================================================

-- Read your own row.
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Read anyone if you're an admin.
create policy "profiles_select_admin"
  on public.profiles
  for select
  using (public.is_admin(auth.uid()));

-- Read profiles of people in the same cohort as you (so participant view
-- can show classmates). A user is "co-cohorted" when both are non-removed
-- members of any shared cohort.
create policy "profiles_select_cohort_mate"
  on public.profiles
  for select
  using (
    exists (
      select 1
        from public.cohort_participants me
        join public.cohort_participants them
          on me.cohort_id = them.cohort_id
       where me.profile_id = auth.uid()
         and them.profile_id = public.profiles.id
         and me.removed_at is null
         and them.removed_at is null
    )
  );

-- Update your own row.
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admin can update any row (capability changes, etc.).
create policy "profiles_update_admin"
  on public.profiles
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Admin can insert new profiles (e.g. when seeding cohort participants).
create policy "profiles_insert_admin"
  on public.profiles
  for insert
  with check (public.is_admin(auth.uid()));

-- No direct delete policy — use archived_at via update. Hard deletes happen
-- via service role only.

-- ============================================================================
-- organizations
-- ============================================================================

-- Anyone authenticated can read org metadata (name, logo, etc.).
create policy "organizations_select_authenticated"
  on public.organizations
  for select
  using (auth.uid() is not null);

-- Only admin writes.
create policy "organizations_insert_admin"
  on public.organizations
  for insert
  with check (public.is_admin(auth.uid()));

create policy "organizations_update_admin"
  on public.organizations
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ============================================================================
-- programs
-- ============================================================================

-- Programs are visible to any authenticated user (the catalog is non-secret).
create policy "programs_select_authenticated"
  on public.programs
  for select
  using (auth.uid() is not null);

create policy "programs_insert_admin"
  on public.programs
  for insert
  with check (public.is_admin(auth.uid()));

create policy "programs_update_admin"
  on public.programs
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ============================================================================
-- cohorts
-- ============================================================================

-- Visible if you can see the cohort by any of the four lanes (admin,
-- facilitator, leader, participant, org admin).
create policy "cohorts_select_visible"
  on public.cohorts
  for select
  using (public.can_see_cohort(auth.uid(), id));

-- Admins create/update cohorts. Facilitators can update their own.
create policy "cohorts_insert_admin"
  on public.cohorts
  for insert
  with check (public.is_admin(auth.uid()));

create policy "cohorts_update_admin_or_facilitator"
  on public.cohorts
  for update
  using (public.is_admin(auth.uid()) or facilitator_id = auth.uid())
  with check (public.is_admin(auth.uid()) or facilitator_id = auth.uid());

-- ============================================================================
-- cohort_participants
-- ============================================================================

-- See the roster if you're in the cohort or can see the cohort.
create policy "cohort_participants_select_visible"
  on public.cohort_participants
  for select
  using (public.can_see_cohort(auth.uid(), cohort_id));

-- Admins or facilitators of the cohort manage the roster.
create policy "cohort_participants_insert_facilitator"
  on public.cohort_participants
  for insert
  with check (public.is_facilitator_of(auth.uid(), cohort_id));

create policy "cohort_participants_update_facilitator"
  on public.cohort_participants
  for update
  using (public.is_facilitator_of(auth.uid(), cohort_id))
  with check (public.is_facilitator_of(auth.uid(), cohort_id));

-- Participants can update their own row (e.g. mark onboarded).
create policy "cohort_participants_update_self"
  on public.cohort_participants
  for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- ============================================================================
-- journal_entries
-- ============================================================================

-- See your own entries.
create policy "journal_select_own"
  on public.journal_entries
  for select
  using (auth.uid() = profile_id);

-- See cohort entries if you're in the cohort and visibility allows it.
create policy "journal_select_cohort"
  on public.journal_entries
  for select
  using (
    cohort_id is not null
    and visibility in ('cohort', 'public')
    and (
         public.is_in_cohort(auth.uid(), cohort_id)
      or public.is_facilitator_of(auth.uid(), cohort_id)
      or public.is_cohort_leader_of(auth.uid(), cohort_id)
    )
  );

-- Admins see everything (for moderation).
create policy "journal_select_admin"
  on public.journal_entries
  for select
  using (public.is_admin(auth.uid()));

-- Write your own entries.
create policy "journal_insert_own"
  on public.journal_entries
  for insert
  with check (auth.uid() = profile_id);

create policy "journal_update_own"
  on public.journal_entries
  for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "journal_delete_own"
  on public.journal_entries
  for delete
  using (auth.uid() = profile_id);

-- ============================================================================
-- homework_submissions
-- ============================================================================

-- See your own homework.
create policy "homework_select_own"
  on public.homework_submissions
  for select
  using (auth.uid() = profile_id);

-- Facilitator/admin see all homework for the cohort.
create policy "homework_select_facilitator"
  on public.homework_submissions
  for select
  using (public.is_facilitator_of(auth.uid(), cohort_id));

-- Cohort leader sees homework in their cohort.
create policy "homework_select_leader"
  on public.homework_submissions
  for select
  using (public.is_cohort_leader_of(auth.uid(), cohort_id));

-- Write your own homework.
create policy "homework_insert_own"
  on public.homework_submissions
  for insert
  with check (auth.uid() = profile_id);

create policy "homework_update_own"
  on public.homework_submissions
  for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- Facilitator can update reviewer fields.
create policy "homework_update_facilitator"
  on public.homework_submissions
  for update
  using (public.is_facilitator_of(auth.uid(), cohort_id))
  with check (public.is_facilitator_of(auth.uid(), cohort_id));

-- ============================================================================
-- session_progress
-- ============================================================================

create policy "progress_select_own"
  on public.session_progress
  for select
  using (auth.uid() = profile_id);

create policy "progress_select_facilitator"
  on public.session_progress
  for select
  using (public.is_facilitator_of(auth.uid(), cohort_id));

create policy "progress_select_leader"
  on public.session_progress
  for select
  using (public.is_cohort_leader_of(auth.uid(), cohort_id));

create policy "progress_insert_own"
  on public.session_progress
  for insert
  with check (auth.uid() = profile_id);

create policy "progress_update_own"
  on public.session_progress
  for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "progress_update_facilitator"
  on public.session_progress
  for update
  using (public.is_facilitator_of(auth.uid(), cohort_id))
  with check (public.is_facilitator_of(auth.uid(), cohort_id));

-- ============================================================================
-- feedbacks
-- ============================================================================

create policy "feedbacks_select_own"
  on public.feedbacks
  for select
  using (auth.uid() = profile_id);

create policy "feedbacks_select_facilitator"
  on public.feedbacks
  for select
  using (public.is_facilitator_of(auth.uid(), cohort_id));

create policy "feedbacks_select_admin"
  on public.feedbacks
  for select
  using (public.is_admin(auth.uid()));

create policy "feedbacks_insert_own"
  on public.feedbacks
  for insert
  with check (auth.uid() = profile_id);

create policy "feedbacks_update_own"
  on public.feedbacks
  for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- ============================================================================
-- testimonials
-- ============================================================================

-- Anyone authenticated reads published testimonials (used on internal pages).
create policy "testimonials_select_published"
  on public.testimonials
  for select
  using (
    auth.uid() is not null
    and status = 'published'
    and archived_at is null
  );

-- Authors see their own drafts.
create policy "testimonials_select_own"
  on public.testimonials
  for select
  using (auth.uid() = profile_id);

-- Admins see everything.
create policy "testimonials_select_admin"
  on public.testimonials
  for select
  using (public.is_admin(auth.uid()));

-- Admins write.
create policy "testimonials_insert_admin"
  on public.testimonials
  for insert
  with check (public.is_admin(auth.uid()));

create policy "testimonials_update_admin"
  on public.testimonials
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ============================================================================
-- resources
-- ============================================================================

-- Global resources visible to all authenticated users.
create policy "resources_select_global"
  on public.resources
  for select
  using (
    auth.uid() is not null
    and scope = 'global'
    and archived_at is null
  );

-- Program-scoped resources visible if user is in any cohort of that program.
create policy "resources_select_program"
  on public.resources
  for select
  using (
    scope = 'program'
    and program_id is not null
    and (
         public.is_admin(auth.uid())
      or exists (
        select 1
          from public.cohorts c
          join public.cohort_participants cp on cp.cohort_id = c.id
         where c.program_id = public.resources.program_id
           and cp.profile_id = auth.uid()
           and cp.removed_at is null
           and c.archived_at is null
      )
      or exists (
        -- Facilitators of any cohort of the program
        select 1
          from public.cohorts c
         where c.program_id = public.resources.program_id
           and c.facilitator_id = auth.uid()
      )
    )
  );

-- Cohort-scoped resources visible if user can see the cohort.
create policy "resources_select_cohort"
  on public.resources
  for select
  using (
    scope = 'cohort'
    and cohort_id is not null
    and public.can_see_cohort(auth.uid(), cohort_id)
  );

-- Admin can read all (for the library admin pages).
create policy "resources_select_admin"
  on public.resources
  for select
  using (public.is_admin(auth.uid()));

-- Writes: admin always; facilitator can write for their cohort.
create policy "resources_insert_admin"
  on public.resources
  for insert
  with check (public.is_admin(auth.uid()));

create policy "resources_insert_cohort_facilitator"
  on public.resources
  for insert
  with check (
    scope = 'cohort'
    and cohort_id is not null
    and public.is_facilitator_of(auth.uid(), cohort_id)
  );

create policy "resources_update_admin"
  on public.resources
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "resources_update_cohort_facilitator"
  on public.resources
  for update
  using (
    scope = 'cohort'
    and cohort_id is not null
    and public.is_facilitator_of(auth.uid(), cohort_id)
  )
  with check (
    scope = 'cohort'
    and cohort_id is not null
    and public.is_facilitator_of(auth.uid(), cohort_id)
  );

-- ============================================================================
-- notifications
-- ============================================================================

-- Only see your own notifications.
create policy "notifications_select_own"
  on public.notifications
  for select
  using (auth.uid() = profile_id);

-- Only update your own (e.g. mark read).
create policy "notifications_update_own"
  on public.notifications
  for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- Inserts come from the service role (the notification refresher). No
-- end-user insert policy.

-- ============================================================================
-- email_sends
-- ============================================================================

-- You can see emails sent to you (e.g. magic link audit).
create policy "email_sends_select_own"
  on public.email_sends
  for select
  using (auth.uid() = to_profile_id);

-- Admin sees all (for the admin dashboard).
create policy "email_sends_select_admin"
  on public.email_sends
  for select
  using (public.is_admin(auth.uid()));

-- Inserts are service-role only (the Netlify Function that calls Resend).

-- ============================================================================
-- Final sanity: confirm every table has RLS on.
-- ============================================================================

do $$
declare
  t text;
begin
  for t in
    select tablename
      from pg_tables
     where schemaname = 'public'
       and tablename in (
         'profiles', 'organizations', 'programs', 'cohorts',
         'cohort_participants', 'journal_entries', 'homework_submissions',
         'session_progress', 'feedbacks', 'testimonials', 'resources',
         'notifications', 'email_sends'
       )
  loop
    if not exists (
      select 1 from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public'
         and c.relname = t
         and c.relrowsecurity = true
    ) then
      raise exception 'RLS not enabled on table %', t;
    end if;
  end loop;
end$$;
