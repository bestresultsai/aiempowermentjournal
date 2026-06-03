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
import { DEMO_JOURNAL_ENTRIES, DEMO_COHORTS, isMultiCohortDemo } from "./demoData";

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
    return DEMO_COHORTS.map(({ slug, name, programCode, methodName }) => ({
      slug, name, programCode, methodName,
    }));
  }

  // Default: a single mock cohort (whatever MOCK_COHORT is configured as).
  return [
    {
      slug: MOCK_COHORT.slug,
      name: MOCK_COHORT.name,
      programCode: MOCK_COHORT.programCode,
      methodName: MOCK_COHORT.methodName,
    },
  ];
}

// ---------------------------------------------------------------------------
// useResolvedCohort — the central hook every Journey/Journal page uses.
//
// Returns: { cohort, slug, isLoading, error, resolvedFrom }
//   resolvedFrom indicates how the slug was determined:
//     "url"     — from /cohort/:slug
//     "demo"    — demo mode active
//     "memory"  — last-visited localStorage
//     "user"    — user's first assigned cohort
//     "none"    — no slug could be resolved
// ---------------------------------------------------------------------------
export function useResolvedCohort() {
  const { slug: urlSlug } = useParams();
  const { user, isDemo } = useAuth();

  const { slug, resolvedFrom } = useMemo(() => {
    if (urlSlug)                            return { slug: urlSlug, resolvedFrom: "url" };
    if (isDemo)                             return { slug: MOCK_COHORT.slug, resolvedFrom: "demo" };

    const last = readLastSlug();
    if (last)                               return { slug: last, resolvedFrom: "memory" };

    const userCohorts = getUserCohorts(user);
    if (userCohorts.length > 0)             return { slug: userCohorts[0].slug, resolvedFrom: "user" };

    return { slug: null, resolvedFrom: "none" };
  }, [urlSlug, user, isDemo]);

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
// Demo mode short-circuits the network — uses canned DEMO_JOURNAL_ENTRIES.
// ---------------------------------------------------------------------------
export function useCohortEntries(cohort) {
  const { isDemo } = useAuth();
  const journalCohortName = cohort?.journalCohortName || cohort?.name;

  const query = useQuery({
    queryKey: ["cohort-entries", journalCohortName],
    queryFn: () => getEntries({ cohort: journalCohortName }),
    enabled: !!journalCohortName && !isDemo,
  });

  return {
    entries: isDemo ? DEMO_JOURNAL_ENTRIES : (query.data || []),
    isLoading: !isDemo && query.isLoading,
    error: !isDemo ? query.error : null,
  };
}
