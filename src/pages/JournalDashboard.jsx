import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, ArrowRight, NotebookPen } from "lucide-react";
import NavBar from "../components/NavBar";
import JournalGameCard from "../components/cohort/JournalGameCard";
import NextMilestoneCard from "../components/cohort/NextMilestoneCard";
import CohortStats from "../components/cohort/CohortStats";
import { useAuth } from "../context/AuthContext";
import { useResolvedCohort, useCohortEntries } from "../lib/cohortResolution";
import { getBadgesForCohort } from "../lib/programs";

// ---------------------------------------------------------------------------
// JOURNAL page. Mounted at /journal.
//
// Companion to the Journey page. Contains the gamified Journal CTA, the next
// badge milestone, and the cohort impact dashboard (Summary / Details tabs).
//
// No Welcome banner — that's the Journey page's home greeting. This page
// gets its own simple header.
// ---------------------------------------------------------------------------

export default function JournalDashboard() {
  const { user } = useAuth();
  const { cohort, isLoading: cohortLoading, error: cohortError } = useResolvedCohort();
  const { entries: cohortEntries, isLoading: entriesLoading, error: entriesError } = useCohortEntries(cohort);

  // Just the current user's entries for the personal "you've contributed" stat.
  const userEntryCount = useMemo(() => {
    if (!user?.email) return 0;
    return cohortEntries.filter(
      (e) => e.participantEmail?.toLowerCase() === user.email.toLowerCase()
    ).length;
  }, [cohortEntries, user]);

  return (
    <div className="min-h-screen bg-surface-paper">
      <NavBar />
      <main className="max-w-[1180px] mx-auto px-6 lg:px-8 py-8">
        {/* Page header — NOT the personalized Welcome banner. Journal stands on its own. */}
        <header className="mb-8 animate-fade-in-up">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <NotebookPen className="w-5 h-5" strokeWidth={2} />
                </div>
                <div className="h-eyebrow">AI Empowerment Journal</div>
              </div>
              <h1 className="font-heading text-[32px] lg:text-[36px] font-extrabold tracking-tight text-ink leading-tight">
                Your wins, your impact, your badges.
              </h1>
              <p className="text-[14.5px] text-ink-muted mt-2 max-w-2xl leading-relaxed">
                Every entry is a workflow you've shipped — proof of impact that compounds. Track your
                streak, unlock badges, and see how your cohort's outcomes stack up.
              </p>
            </div>

            <Link
              to="/journal/new"
              className="group inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-ink text-white text-[14px] font-heading font-semibold hover:bg-brand-700 transition-colors duration-200 shrink-0"
            >
              <Plus className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" strokeWidth={2.5} />
              New Journal Entry
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.5} />
            </Link>
          </div>
        </header>

        {cohortLoading && <Skeleton />}
        {cohortError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-5 py-4 rounded-2xl text-[14px]">
            <strong className="font-heading font-bold">Couldn't load cohort.</strong> {cohortError.message}
          </div>
        )}

        {cohort && (
          <>
            {/* ==================== JOURNAL CTA + NEXT BADGE ==================== */}
            <JournalGameCard
              entries={cohortEntries}
              currentUserEmail={user?.email}
              badges={getBadgesForCohort(cohort)}
            />
            <NextMilestoneCard
              entries={cohortEntries}
              currentUserEmail={user?.email}
              badges={getBadgesForCohort(cohort)}
            />

            {/* ==================== COHORT IMPACT ==================== */}
            <CohortStats
              cohort={cohort}
              entries={cohortEntries}
              currentUserEmail={user?.email}
              loading={entriesLoading}
              error={entriesError?.message}
            />
          </>
        )}
      </main>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-48 rounded-3xl bg-surface-soft" />
      <div className="h-32 rounded-2xl bg-surface-soft" />
      <div className="h-64 rounded-2xl bg-surface-soft" />
    </div>
  );
}
