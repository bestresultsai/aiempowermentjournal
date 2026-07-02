-- ============================================================================
-- BestResults.AI Platform — Allow authenticated users to read staff profiles
-- Migration: 0004_staff_profile_read_policy
--
-- Bug this fixes:
--   Participants couldn't see their cohort's facilitator name / photo / title
--   on the CohortLanding "Your Facilitator" card. The client hydrated
--   cohorts.facilitator_id from Supabase and then tried to look up the
--   profile row for that UUID — but the existing profiles SELECT policies
--   didn't grant that access to a participant.
--
--   Existing policies (migration 0002):
--     profiles_select_own          — own row
--     profiles_select_admin        — admin sees all
--     profiles_select_cohort_mate  — sees others in same cohort_participants
--
--   Facilitators are linked to cohorts via cohorts.facilitator_id, NOT via
--   cohort_participants — so cohort_mate never matched, and participants
--   got 0 profile rows back for the facilitator lookup. cohortRowToOverlay
--   ended up with facilitator=null and the FacilitatorCard silently didn't
--   render.
--
-- Fix:
--   Add a SELECT policy that lets any authenticated user read profiles
--   whose capabilities include facilitator / admin / super. That's the
--   set of "staff" profiles participants legitimately need to see (their
--   own facilitator, org admins, program admins). Regular participant
--   profiles remain protected by the existing scoped policies.
--
-- Applied manually in production via Supabase Studio → SQL Editor before
-- this file was committed. This migration exists so a fresh Supabase
-- project (staging rebuild, DR, etc.) stands up with the policy in place.
-- ============================================================================

set search_path = public;

create policy "profiles_select_staff"
  on public.profiles
  for select
  using (
    capabilities && array['facilitator', 'admin', 'super']
  );

comment on policy "profiles_select_staff" on public.profiles is
  'Any authenticated user can read profiles tagged facilitator / admin / super. '
  'Enables the participant CohortLanding "Your Facilitator" card and any other '
  'UI that renders staff names or headshots to non-admins. Regular participant '
  'profiles remain gated by profiles_select_own + profiles_select_cohort_mate.';
