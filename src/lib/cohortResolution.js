// ---------------------------------------------------------------------------
// Cohort resolution layer.
//
// Hybrid URL model:
//   /cohort/:slug   — admin / explicit cohort access (URL slug wins)
//   /journey, /journal — participant-facing generic routes
//                        (resolve to: demo mode → localStorage last-visited
//                        → user's first assigned cohort → null)
//
// This file exports:
//   useResolvedCohort()  — figures out which cohort to load + fetches it
//   useCohortEntries()   — pulls journal entries (mock in demo, live otherwise)
//   getUserCohorts(user) — list of cohorts the user has access to (for switcher)
//   STORAGE_KEY          — localStorage key for last-visited cohort
// ---------------------------------------------------------------------------

import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MOCK_COHORT } from "./mockCohort";
import { getCohortBySlug } from "./cohortApi";
import { getEntries } from "./api";
import { useAuth } from "../context/AuthContext";
import { DEMO_JOURNAL_ENTRIES, DEMO_COHORTS, isMultiCohortDemo, shouldUseSeedData } from "./demoData";
import { getParticipantByEmail, useParticipantVersion } from "./adminMockData";
import { getCohortForAdmin, useCohortVersion } from "./cohortAdmin";
import { initSupabase, isSupabaseEnabled } from "./supabase";

export const STORAGE_KEY = "brai_last_cohort_slug";

// Read the last-visited cohort slug from localStorage. Safe in SSR / no-DOM.
function readLastSlug() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

function writeLastSlug(slug) {
  if (typeof window === "undefined" || !slug) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, slug);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// getUserCohorts — given a user, return the list of cohorts they can access.
//
// Mock/demo: returns the single MOCK_COHORT (a single-element array).
// Live (future): would call a /api/user/cohorts endpoint backed by Notion.
// ---------------------------------------------------------------------------
export function getUserCohorts(user) {
  if (!user) return [];

  // Multi-cohort demo (?demo=multi) — show all three demo cohorts so the
  // switcher renders with multiple options to choose from.
  if (isMultiCohortDemo()) {
    return DEMO_COHORTS.map(({ slug, name, programCode, methodName, organization }) => ({
      slug, name, programCode, methodName, organization,
    }));
  }

  // Real (Supabase) user — resolve via the participant record we hydrated
  // on boot. The participant record carries their real cohortSlug set by
  // invite-participant. This is what makes Lee see his actual cohort
  // ("AIEW3 — TestOrganization Cohort") instead of the seed IAHE mock.
  if (!shouldUseSeedData() && user.email) {
    const p = getParticipantByEmail(user.email);
    if (p?.cohortSlug) {
      const c = getCohortForAdmin(p.cohortSlug);
      if (c) {
        return [{
          slug: c.slug,
          name: c.name,
          programCode: c.programCode,
          methodName: MOCK_COHORT.methodName, // program.methodName resolved downstream
          organization: c.organization || null,
        }];
      }
    }
    // Signed-in Supabase user but no participant record / no cohort. Return
    // empty so downstream doesn't fall through to the mock. CohortLanding
    // handles the empty state gracefully.
    return [];
  }

  // Legacy demo / no-Supabase mode: single mock cohort.
  return [
    {
      slug: MOCK_COHORT.slug,
      name: MOCK_COHORT.name,
      programCode: MOCK_COHORT.programCode,
      methodName: MOCK_COHORT.methodName,
      organization: MOCK_COHORT.organization,
    },
  ];
}

// ---------------------------------------------------------------------------
// useUserCohortsDirect — Supabase-first fallback for cohort membership.
//
// The in-memory ADMIN_MOCK_PARTICIPANTS layer can miss the mark for real
// Supabase-authed users in a few subtle ways: their profile is hydrated
// but the cohort_participants link row landed after the client's cohort
// map was built, a stale localStorage overlay lists cohortSlug=null, etc.
// This hook does what we actually mean: fetch the user's cohort links
// straight from Supabase and translate them into { slug, name, ... }.
//
// Returns { data: cohorts[], isLoading }. Empty array = truly not in any
// cohort. Runs only when Supabase is enabled and the user has a userId.
// ---------------------------------------------------------------------------
// Shared hook — the in-memory list, then the Supabase direct query if
// the in-memory list is empty. Any consumer that needs to know "what
// cohorts is this user in" should use this hook instead of calling the
// synchronous getUserCohorts() function directly. Fixes the split-brain
// where /home resolved a cohort but /settings still said "not in one."
export function useUserCohorts(user) {
  const direct = useUserCohortsDirect(user);
  const inMemory = getUserCohorts(user);
  if (inMemory.length > 0) return inMemory;
  return direct.data;
}

function useUserCohortsDirect(user) {
  const query = useQuery({
    queryKey: ["user-cohorts-direct", user?.userId || null],
    enabled: !!user?.userId && isSupabaseEnabled(),
    // Keep it cheap — cohort membership doesn't churn.
    staleTime: 60 * 1000,
    queryFn: async () => {
      const client = await initSupabase();
      if (!client) return [];
      const { data, error } = await client
        .from("cohort_participants")
        .select("cohorts(slug, name, program_id, org_id)")
        .eq("profile_id", user.userId)
        .is("removed_at", null);
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      return rows
        .map((r) => r?.cohorts)
        .filter((c) => c && c.slug)
        .map((c) => ({
          slug: c.slug,
          name: c.name || c.slug,
          programCode: null, // resolved downstream via getCohortForAdmin
          methodName: MOCK_COHORT.methodName,
          organization: null,
        }));
    },
  });
  return { data: query.data || [], isLoading: query.isLoading };
}

// ---------------------------------------------------------------------------
// useResolvedCohort — the central hook every Journey/Journal page uses.
//
// Returns: { cohort, slug, isLoading, error, resolvedFrom }
//   resolvedFrom indicates how the slug was determined:
//     "url"     — from /cohort/:slug
//     "demo"    — demo mode active
//     "memory"  — last-visited localStorage
//     "user"    — user's first assigned cohort (in-memory)
//     "direct"  — Supabase direct query (fallback when in-memory misses)
//     "none"    — no slug could be resolved
// ---------------------------------------------------------------------------
export function useResolvedCohort() {
  const { slug: urlSlug } = useParams();
  const { user, isDemo } = useAuth();
  // Bump when participant hydration lands or a cohort mutation fires.
  // Without these deps the memo captured the initial (empty) state of
  // ADMIN_MOCK_PARTICIPANTS and never recomputed, so participants who
  // logged in before hydration completed saw "You're not in a cohort"
  // permanently — even after their profile + cohort link finished
  // loading from Supabase.
  const pVersion = useParticipantVersion();
  const cVersion = useCohortVersion();
  // Direct Supabase fallback query. Runs in parallel with the in-memory
  // path. If the in-memory lookup is stale/missing, this catches it.
  const direct = useUserCohortsDirect(user);

  const { slug, resolvedFrom } = useMemo(() => {
    if (urlSlug)                            return { slug: urlSlug, resolvedFrom: "url" };
    if (isDemo)                             return { slug: MOCK_COHORT.slug, resolvedFrom: "demo" };

    const last = readLastSlug();
    if (last)                               return { slug: last, resolvedFrom: "memory" };

    const userCohorts = getUserCohorts(user);
    if (userCohorts.length > 0)             return { slug: userCohorts[0].slug, resolvedFrom: "user" };

    // Fallback — the in-memory participant record didn't yield a cohort
    // (missing / cohortSlug=null / stale). Use the direct Supabase query.
    if (direct.data.length > 0)             return { slug: direct.data[0].slug, resolvedFrom: "direct" };

    return { slug: null, resolvedFrom: "none" };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSlug, user, isDemo, pVersion, cVersion, direct.data]);

  const query = useQuery({
    queryKey: ["cohort", slug],
    queryFn: () => getCohortBySlug(slug),
    enabled: !!slug,
  });

  // Once we have a cohort, remember it so the next /journey visit lands on it.
  useEffect(() => {
    if (query.data?.slug) writeLastSlug(query.data.slug);
  }, [query.data?.slug]);

  return {
    cohort: query.data,
    slug,
    isLoading: query.isLoading,
    error: query.error,
    resolvedFrom,
  };
}

// ---------------------------------------------------------------------------
// useCohortEntries — fetch journal entries scoped to a cohort.
//
// Demo mode: canned DEMO_JOURNAL_ENTRIES.
// Supabase mode: pull from public.journal_entries via the participant
//   activity hydrator (that path already runs and populates each
//   participant record's journalEntries[]). CohortLanding aggregates it
//   from getEffectiveParticipants downstream.
// Legacy Notion mode: hit /api/entries — used to be the default; now only
//   reached when Supabase is disabled AND we're not in demo mode.
// ---------------------------------------------------------------------------
export function useCohortEntries(cohort) {
  const { isDemo } = useAuth();
  const journalCohortName = cohort?.journalCohortName || cohort?.name;
  const useSupabase = isSupabaseEnabled() && !isDemo;

  const query = useQuery({
    queryKey: ["cohort-entries", journalCohortName],
    queryFn: () => getEntries({ cohort: journalCohortName }),
    // Skip the /api/entries → Notion call entirely when Supabase is wired.
    // That endpoint runs a filter against a hard-coded Notion "Cohort"
    // select dropdown and rejects any option not literally in that list —
    // producing the "cohort not found" red banner Josue was seeing.
    enabled: !!journalCohortName && !isDemo && !useSupabase,
  });

  return {
    entries: isDemo ? DEMO_JOURNAL_ENTRIES : useSupabase ? [] : (query.data || []),
    isLoading: !isDemo && !useSupabase && query.isLoading,
    error: !isDemo && !useSupabase ? query.error : null,
  };
}
