import { useState, useMemo } from "react";
import { PartyPopper, ShieldAlert } from "lucide-react";
import NavBar from "../../components/NavBar";
import WelcomeBanner from "../../components/WelcomeBanner";
import CohortHero from "../../components/cohort/CohortHero";
import FacilitatorCard from "../../components/cohort/FacilitatorCard";
import NextLiveSessionCard from "../../components/cohort/NextLiveSessionCard";
import MissingHomeworkCard from "../../components/cohort/MissingHomeworkCard";
import JournalGameCard from "../../components/cohort/JournalGameCard";
import NextMilestoneCard from "../../components/cohort/NextMilestoneCard";
import CohortStats from "../../components/cohort/CohortStats";
import SessionRow from "../../components/cohort/SessionRow";
import { useAuth } from "../../context/AuthContext";
import { calculateStreakWeeks } from "../../lib/gamification";
import { useResolvedCohort, useCohortEntries } from "../../lib/cohortResolution";

// ---------------------------------------------------------------------------
// HOME page (the comprehensive overview). Mounted at:
//   /home              — the participant's signed-in home
//   /cohort/:slug      — explicit, for admins/multi-cohort users
//
// Contains EVERYTHING in summary form:
//   • Welcome banner
//   • Hero + Facilitator (cohort identity)
//   • AI Empowerment Journey cards (Next Live, Missing Homework, Progress)
//   • AI Empowerment Journal cards (Game Card, Next Milestone)
//   • NDA reminder
//   • Curriculum (full sessions list)
//   • Cohort Impact dashboard (Summary / Details)
//
// Focused per-domain views live at /journey (workshops) and /journal (impact).
// ---------------------------------------------------------------------------

export default function CohortLanding() {
  const { user } = useAuth();
  const [sessionFilter, setSessionFilter] = useState("all");

  const { cohort, isLoading, error, resolvedFrom } = useResolvedCohort();
  const { entries: cohortEntries, isLoading: entriesLoading, error: entriesError } = useCohortEntries(cohort);

  // Only generate slug-scoped session URLs when an admin/multi-cohort user is
  // explicitly viewing /cohort/:slug. Otherwise use the generic /session/:n URL
  // so participants never see internal slugs in their address bar.
  const sessionLinkCohortSlug = resolvedFrom === "url" ? cohort?.slug : null;

  const filteredSessions = (() => {
    if (!cohort?.sessions) return [];
    if (sessionFilter === "completed") return cohort.sessions.filter((s) => s.completed);
    if (sessionFilter === "next")      return cohort.sessions.filter((s) => s.unlocked && !s.completed);
    return cohort.sessions;
  })();

  const upNextSession = cohort?.sessions?.find((s) => s.unlocked && !s.completed);
  const upNextOrder = upNextSession?.order;
  const currentBelt = upNextSession?.belt;

  // Compute current user's journal streak for the Welcome banner badge.
  const userEntries = useMemo(() => {
    if (!user?.email) return [];
    return cohortEntries.filter(
      (e) => e.participantEmail?.toLowerCase() === user.email.toLowerCase()
    );
  }, [cohortEntries, user]);
  const streak = useMemo(() => calculateStreakWeeks(userEntries), [userEntries]);

  return (
    <div className="min-h-screen bg-surface-paper">
      <NavBar />
      <main className="max-w-[1180px] mx-auto px-6 lg:px-8 py-8">
        <WelcomeBanner
          user={user}
          streak={streak}
          subtitle={
            cohort
              ? `You're in the ${cohort.organization?.shortName || cohort.name} cohort. Keep the streak alive.`
              : undefined
          }
        />

        {isLoading && <SkeletonHero />}
        {error && <ErrorPanel message={error.message} />}
        {!isLoading && !error && !cohort && <NoCohortPanel />}

        {cohort && (
          <>
            {/* ==================== HERO ROW ==================== */}
            <section className="grid lg:grid-cols-[1.4fr_1fr] gap-4 items-stretch">
              <div className="animate-fade-in-up">
                <CohortHero cohort={cohort} />
              </div>
              <FacilitatorCard
                facilitator={cohort.trainer}
                coachingNote={cohort.coachingNote}
              />
            </section>

            {/* ==================== AI EMPOWERMENT JOURNEY ==================== */}
            <NextLiveSessionCard cohort={cohort} />
            <MissingHomeworkCard cohort={cohort} />
            <div className="animate-fade-in-up delay-300">
              <ProgressBand cohort={cohort} currentBelt={currentBelt} />
            </div>

            {/* ==================== AI EMPOWERMENT JOURNAL ==================== */}
            <div className="mt-6">
              <JournalGameCard entries={cohortEntries} currentUserEmail={user?.email} />
            </div>
            <NextMilestoneCard entries={cohortEntries} currentUserEmail={user?.email} />

            {/* ==================== NDA ==================== */}
            {cohort.ndaRequired && <NDABanner />}

            {/* ==================== CURRICULUM ==================== */}
            <section className="mt-12 animate-fade-in-up delay-500">
              <div className="flex items-baseline justify-between mb-6 flex-wrap gap-3">
                <div>
                  <div className="h-eyebrow mb-1">Curriculum</div>
                  <h2 className="font-heading text-[28px] font-extrabold tracking-tight">
                    Your AI Empowerment Journey
                  </h2>
                </div>
                <FilterTabs current={sessionFilter} onChange={setSessionFilter} />
              </div>

              <div className="space-y-2.5">
                {filteredSessions.map((s, idx) => (
                  <div key={s.order} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(idx * 40, 320)}ms` }}>
                    <SessionRow
                      session={s}
                      cohortSlug={sessionLinkCohortSlug}
                      meetingTime={cohort.meetingTime}
                      emphasized={s.order === upNextOrder && sessionFilter !== "completed"}
                    />
                  </div>
                ))}
              </div>
            </section>

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

// ---- Progress band ----

function ProgressBand({ cohort, currentBelt }) {
  const completed = cohort.progress?.completed ?? 0;
  const total = cohort.progress?.total ?? cohort.sessions?.length ?? 8;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isDone = completed === total;
  const headline =
    completed === 0
      ? "Ready to begin"
      : isDone
        ? "Program complete"
        : currentBelt
          ? `${completed} of ${total} sessions complete · ${currentBelt} Belt up next`
          : `${completed} of ${total} sessions complete`;

  const upNextOrder = cohort.sessions?.find((s) => s.unlocked && !s.completed)?.order;

  return (
    <section className="mt-6 rounded-2xl border border-soft bg-surface-card p-6 shadow-card">
      <div>
        <div className="flex items-end justify-between mb-2 gap-4">
          <div className="flex items-center gap-3">
            {isDone && <PartyPopper className="w-5 h-5 text-emerald-600" strokeWidth={2} />}
            <div>
              <div className="h-eyebrow mb-1">Your Progress</div>
              <div className="font-heading text-[18px] font-bold">{headline}</div>
            </div>
          </div>
          <div className="font-heading text-[34px] font-extrabold tracking-tight leading-none">
            {pct}<span className="text-ink-subtle text-[18px] font-medium">%</span>
          </div>
        </div>
        <div className="relative h-2 rounded-full bg-surface-soft overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-500 to-brand-700 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="grid grid-cols-8 gap-1 mt-2">
          {(cohort.sessions || []).map((s) => {
            const isCompleted = s.completed;
            const isNext = s.order === upNextOrder;
            return (
              <span
                key={s.order}
                className={
                  "text-center text-[11px] font-heading inline-block " +
                  (isCompleted
                    ? "text-emerald-600 font-bold"
                    : isNext
                      ? "text-brand-600 font-bold animate-bounce-soft"
                      : "text-ink-subtle font-semibold")
                }
                title={s.belt ? `${s.belt} Belt` : `Session ${s.order}`}
              >
                {s.order}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---- Small pieces ----

function FilterTabs({ current, onChange }) {
  const tabs = [
    { key: "all",       label: "All" },
    { key: "next",      label: "Up Next" },
    { key: "completed", label: "Completed" },
  ];
  return (
    <div className="flex items-center gap-1 text-[13px]">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={
            "px-3 py-1.5 rounded-lg font-heading font-medium transition " +
            (current === t.key
              ? "bg-ink text-white"
              : "text-ink-muted hover:bg-ink/5 hover:text-ink")
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function NDABanner() {
  return (
    <div className="mt-6 rounded-2xl bg-amber-50/60 border border-amber-200/70 p-4 text-[13px] text-amber-900 leading-relaxed flex items-start gap-3 animate-fade-in-up delay-400">
      <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-amber-700" strokeWidth={2} />
      <div>
        <strong className="font-heading font-bold">NDA Reminder.</strong>{" "}
        All program content, recordings, and materials are restricted by the NDA you signed.
        Please do not share outside your cohort.
      </div>
    </div>
  );
}

function SkeletonHero() {
  return <div className="h-[280px] bg-surface-soft rounded-3xl mb-6 animate-pulse" />;
}

function ErrorPanel({ message }) {
  return (
    <div className="bg-rose-50 border border-rose-200 text-rose-800 px-5 py-4 rounded-2xl text-[14px]">
      <strong className="font-heading font-bold">Couldn't load cohort.</strong> {message}
    </div>
  );
}

function NoCohortPanel() {
  return (
    <div className="rounded-2xl border border-dashed border-soft bg-surface-card p-10 text-center mt-6">
      <h2 className="font-heading text-[22px] font-extrabold text-ink mb-2">
        You're not in a cohort yet.
      </h2>
      <p className="text-[14px] text-ink-muted leading-relaxed max-w-md mx-auto">
        Once you're enrolled in a cohort, your sessions, materials, and homework will appear here.
        Contact your facilitator if you think this is a mistake.
      </p>
    </div>
  );
}
