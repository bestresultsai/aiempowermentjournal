-- ============================================================================
-- BestResults.AI Platform — extend activity tables for legacy fields
-- Migration: 0003_activity_columns
--
-- Adds the columns the legacy participant.journalEntries + .submissions
-- shapes carry but the initial schema didn't model as columns. Required so
-- the platform's existing analytics (time saved, production-method donut,
-- innovations feed) keeps working post-migration.
--
-- All additions are nullable so the migration is non-destructive to
-- existing rows.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- journal_entries
-- ----------------------------------------------------------------------------

alter table public.journal_entries
  add column if not exists title text,
  add column if not exists link text,
  add column if not exists time_before_ai int,
  add column if not exists time_with_ai int,
  add column if not exists production_method text,
  add column if not exists volume_per_day text,
  add column if not exists frequency text,
  add column if not exists scope text,
  add column if not exists quality_outcome text,
  add column if not exists innovation_title text,
  add column if not exists innovation_description text;

comment on column public.journal_entries.production_method is
  'no-sop | with-sop | ai-workflow | ai-agent | ai-swarm';
comment on column public.journal_entries.volume_per_day is
  '1 | 2-5 | 6-10 | 10+';
comment on column public.journal_entries.frequency is
  'multiple-per-day | daily | weekly | monthly | rare';
comment on column public.journal_entries.scope is
  'Individual | Department-wide | Organization-wide';

-- Index commonly-queried filter dimensions for the /admin/journal page.
create index if not exists journal_entries_production_method_idx
  on public.journal_entries(production_method)
  where archived_at is null;

create index if not exists journal_entries_innovation_idx
  on public.journal_entries(profile_id)
  where innovation_title is not null and archived_at is null;

-- ----------------------------------------------------------------------------
-- homework_submissions
-- ----------------------------------------------------------------------------

alter table public.homework_submissions
  add column if not exists link text;

comment on column public.homework_submissions.link is
  'External link (Google Doc, Notion, etc.) referenced by the submission.';
