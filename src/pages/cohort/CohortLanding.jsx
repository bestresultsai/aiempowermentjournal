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
import CohortLeaderboard from "../../components/cohort/CohortLeaderboard";
import CohortStats from "../../components/cohort/CohortStats";
import SessionRow from "../../components/cohort/SessionRow";
import AddToCalendar from "../../components/AddToCalendar";
import { useAuth } from "../../context/AuthContext";
import { calculateStreakWeeks } from "../../lib/gamification";
import { useResolvedCohort, useCohortEntries } from "../../lib/cohortResolution";
import { useViewAs } from "../../lib/viewAs";
import { MOCK_COHORT } from "../../lib/mockCohort";
import { getProgramForCohort, getSessionsCountForCohort, getBadgesForCohort } from "../../lib/programs";

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
  const { mode: viewAsMode } = useViewAs(user);
  const [sessionFilter, setSessionFilter] = useState("all");

  const { cohort: realCohort, isLoading, error, resolvedFrom } = useResolvedCohort();
  // When an admin (or any elevated user) enters view-as-participant mode
  // and doesn't actually have a cohort, render the IAHE demo cohort so they
  // can preview the participant experience. The DemoParticipantNotice
  // below explains what's happening.
  const isDemoFallback = !realCohort && viewAsMode === "participant";
  const cohort = isDemoFallback ? MOCK_COHORT : realCohort;

  // Self-referential UI gating.
  //   - If the viewer IS the cohort's facilitator, hide FacilitatorCard
  //     (they'd be looking at themselves)
  //   - If the viewer isn't a real participant in this cohort, hide the
  //     participant-only progression cards (MissingHomework, Journal,
  //     NextMilestone) — they have no homework, no journal, no belt path
  //
  // When the viewer is in view-as-participant mode, all of these come back
  // — they're previewing the participant view.
  const inViewAsMode = viewAsMode === "participant";
  const isCohortFacilitator =
    !!cohort?.facilitator?.email &&
    cohort.facilitator.email.toLowerCase() === (user?.email || "").toLowerCase();
  const isParticipantInCohort = (user?.cohortSlug || user?.cohorts || []).length
    ? Array.isArray(user.cohorts)
      ? user.cohorts.some((c) => c.slug === cohort?.slug)
      : user.cohortSlug === cohort?.slug
    : false;
  const showParticipantUI = inViewAsMode || isParticipantInCohort;
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
          entries={userEntries}
          badges={cohort ? getBadgesForCohort(cohort) : undefined}
          subtitle={
            cohort
              ? `You're in the ${cohort.organization?.shortName || cohort.name} cohort. Keep the streak alive.`
              : undefined
          }
        />

        {isLoading && <SkeletonHero />}
        {error && <ErrorPanel message={error.message} />}
        {!isLoading && !error && !cohort && <NoCohortPanel />}

        {/* Banner: this is the IAHE demo cohort, not their real one. */}
        {isDemoFallback && <DemoParticipantNotice />}

        {cohort && (
          <>
            {/* ==================== HERO ROW ==================== */}
            <section className="grid lg:grid-cols-[1.4fr_1fr] gap-4 items-stretch">
              <div className="animate-fade-in-up">
                <CohortHero cohort={cohort} />
              </div>
              {!isCohortFacilitator && (
                <FacilitatorCard
                  facilitator={cohort.trainer}
                  coachingNote={cohort.coachingNote}
                />
              )}
            </section>

            {/* ==================== AI EMPOWERMENT JOURNEY ==================== */}
            <NextLiveSessionCard cohort={cohort} />
            {showParticipantUI && <MissingHomeworkCard cohort={cohort} />}
            <div className="animate-fade-in-up delay-300">
              <ProgressBand cohort={cohort} currentBelt={currentBelt} />
            </div>
            <CertificateCallout cohort={cohort} user={user} />


            {/* ==================== AI EMPOWERMENT JOURNAL ==================== */}
            {showParticipantUI && (
              <>
                <div className="mt-6">
                  <JournalGameCard
                    entries={cohortEntries}
                    currentUserEmail={user?.email}
                    badges={getBadgesForCohort(cohort)}
                  />
                </div>
                <NextMilestoneCard
                  entries={cohortEntries}
                  currentUserEmail={user?.email}
                  badges={getBadgesForCohort(cohort)}
                />
                <div className="mt-6">
                  <CohortLeaderboard
                    entries={cohortEntries}
                    badges={getBadgesForCohort(cohort)}
                    highlightEmail={user?.email}
                  />
                </div>
              </>
            )}

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
                <div className="flex items-center gap-2 flex-wrap">
                  <AddAllUpcomingButton cohort={cohort} />
                  <FilterTabs current={sessionFilter} onChange={setSessionFilter} />
                </div>
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
  // Total session count is program-driven (AIEW3 = 8, APFW = 10). Fall back
  // through progress.total → sessions.length → program lookup so legacy
  // cohorts without sessions[] still get the right denominator.
  const total =
    cohort.progress?.total ??
    cohort.sessions?.length ??
    getSessionsCountForCohort(cohort) ??
    0;
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
        {/* Session pip grid — columns scale with the program's session count
            (APFW = 10, AIEW3 = 8). Using inline gridTemplateColumns so a
            future 12-session program drops in without a tailwind variant. */}
        <div
          className="grid gap-1 mt-2"
          style={{
            gridTemplateColumns: `repeat(${Math.max((cohort.sessions || []).length || total, 1)}, minmax(0, 1fr))`,
          }}
        >
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

// Wraps AddToCalendar in cohort mode, pre-filtering to sessions with a real
// date that's still in the future (or today). Hides itself entirely when
// the cohort is complete + has nothing left to add.
function AddAllUpcomingButton({ cohort }) {
  const upcoming = (cohort.sessions || [])
    .filter((s) => s.date)
    .map((s) => ({ ...s, dateObj: new Date(s.date) }))
    .filter((s) => s.dateObj.getTime() >= Date.now() - 60 * 60 * 1000); // include sessions starting within the last hour (still live)
  if (upcoming.length === 0) return null;
  return (
    <AddToCalendar
      mode="cohort"
      cohort={cohort}
      sessions={upcoming}
      size="sm"
      label={`Add ${upcoming.length} to calendar`}
    />
  );
}

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

// Inline strip that appears when an elevated user enters view-as-participant
// mode but doesn't have a real cohort. We fall back to the IAHE demo cohort
// so they can preview the participant experience; this notice keeps them
// honest about what they're looking at.
function DemoParticipantNotice() {
  return (
    <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-[13px] text-amber-900 font-heading">
      <div className="font-extrabold text-amber-900">Viewing as Participant · Demo cohort</div>
      <div className="font-medium text-amber-900/85 mt-0.5">
        You're not enrolled in a cohort, so this is the IAHE demo cohort —
        useful for QA-ing the participant experience without real data.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CertificateCallout — surfaces a download/preview affordance.
//
// Two modes:
//   - earned   → green "Download your certificate" button, fully unlocked
//   - preview  → muted "Preview certificate" link, shown only when the
//                program has a cert configured (always available so anyone
//                can sanity-check the cert template without finishing)
// ---------------------------------------------------------------------------
function CertificateCallout({ cohort, user }) {
  if (!cohort) return null;
  const program = getProgramForCohort(cohort);
  if (!program?.certificate) return null;

  const completed = cohort.progress?.completed ?? 0;
  const total = cohort.progress?.total ?? cohort.sessions?.length ?? 0;
  const earned = total > 0 && completed >= total;

  // Synthesize the participant record the cert needs. In the real app this
  // would be the looked-up roster entry; here we use the auth user, plus the
  // cohort's progress count so the cert generator treats it as complete.
  const participant = {
    name: user?.name || "Participant",
    email: user?.email,
    progress: Array.from({ length: completed }, (_, i) => i + 1),
  };

  async function handleDownload() {
    const { downloadCertificate } = await import("../../lib/certificateGen");
    await downloadCertificate({ program, cohort, participant });
  }
  async function handlePreview() {
    const { buildCertificatePreviewUrl } = await import("../../lib/certificateGen");
    const url = await buildCertificatePreviewUrl({
      program,
      cohort,
      participant: { ...participant, name: participant.name || "Sample Participant" },
    });
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (earned) {
    return (
      <section className="mt-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-surface-card border-2 border-emerald-200 p-5 lg:p-6 flex flex-col md:flex-row items-start md:items-center gap-4 animate-fade-in-up">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
          <span className="font-heading font-extrabold text-[18px]">★</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-emerald-700 mb-0.5">
            Program complete
          </div>
          <h3 className="font-heading text-[18px] font-extrabold text-ink leading-tight">
            Your certificate is ready.
          </h3>
          <p className="text-[12.5px] text-ink-muted mt-1 max-w-md">
            Download a PDF of your {program.code} completion certificate to
            share, frame, or post.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          className="px-5 py-2.5 rounded-xl bg-ink text-white text-[13.5px] font-heading font-bold hover:bg-ink/90 shrink-0"
        >
          Download certificate
        </button>
      </section>
    );
  }

  // Not yet earned — small unobtrusive preview entry so it's still testable.
  return (
    <section className="mt-3 text-right">
      <button
        type="button"
        onClick={handlePreview}
        className="text-[11.5px] font-heading font-semibold text-ink-muted hover:text-ink underline-offset-2 hover:underline"
      >
        Preview your future certificate
      </button>
    </section>
  );
}

