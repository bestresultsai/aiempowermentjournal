import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import NavBar from "../../components/NavBar";
import WelcomeBanner from "../../components/WelcomeBanner";
import CohortHero from "../../components/cohort/CohortHero";
import SessionRow from "../../components/cohort/SessionRow";
import CohortStats from "../../components/cohort/CohortStats";
import JournalGameCard from "../../components/cohort/JournalGameCard";
import { getCohortBySlug } from "../../lib/cohortApi";
import { getEntries } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function CohortLanding() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [sessionFilter, setSessionFilter] = useState("all"); // all | next | completed

  const { data: cohort, isLoading, error } = useQuery({
    queryKey: ["cohort", slug],
    queryFn: () => getCohortBySlug(slug),
  });

  const journalCohortName = cohort?.journalCohortName || cohort?.name;
  const {
    data: cohortEntries = [],
    isLoading: entriesLoading,
    error: entriesError,
  } = useQuery({
    queryKey: ["cohort-entries", journalCohortName],
    queryFn: () => getEntries({ cohort: journalCohortName }),
    enabled: !!journalCohortName,
  });

  const filteredSessions = (() => {
    if (!cohort?.sessions) return [];
    if (sessionFilter === "completed") return cohort.sessions.filter((s) => s.completed);
    if (sessionFilter === "next")      return cohort.sessions.filter((s) => s.unlocked && !s.completed);
    return cohort.sessions;
  })();

  const upNextSession = cohort?.sessions?.find((s) => s.unlocked && !s.completed);
  const upNextOrder = upNextSession?.order;
  const currentBelt = upNextSession?.belt;

  return (
    <div className="min-h-screen bg-surface-paper">
      <NavBar />
      <main className="max-w-[1180px] mx-auto px-6 lg:px-8 py-8">
        <WelcomeBanner
          user={user}
          subtitle={
            cohort
              ? `You're in the ${cohort.organization?.shortName || cohort.name} cohort. Keep the streak alive.`
              : undefined
          }
        />

        {isLoading && <SkeletonHero />}
        {error && <ErrorPanel message={error.message} />}

        {cohort && (
          <>
            <CohortHero cohort={cohort} />

            {/* CTAs sit right under the hero, per design feedback */}
            <CTAStrip
              entries={cohortEntries}
              currentUserEmail={user?.email}
            />

            <ProgressBand cohort={cohort} currentBelt={currentBelt} />

            {cohort.ndaRequired && <NDABanner />}

            <section className="mt-12">
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
                {filteredSessions.map((s) => (
                  <SessionRow
                    key={s.order}
                    session={s}
                    cohortSlug={cohort.slug}
                    emphasized={s.order === upNextOrder && sessionFilter !== "completed"}
                  />
                ))}
              </div>
            </section>

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

// ---- CTA strip (Coaching + gamified Journal) ----

function CTAStrip({ entries, currentUserEmail }) {
  return (
    <section className="mt-6 grid md:grid-cols-2 gap-4">
      <CoachingCard />
      <JournalGameCard entries={entries} currentUserEmail={currentUserEmail} />
    </section>
  );
}

function CoachingCard() {
  return (
    <div className="rounded-3xl bg-ink text-white p-7 relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 grain opacity-50" />
      <div className="relative flex-1 flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-500/20 backdrop-blur flex items-center justify-center text-brand-500 text-[18px]">
            💬
          </div>
          <span className="h-eyebrow !text-white/60">1:1 Coaching</span>
        </div>
        <h3 className="font-heading text-[22px] font-extrabold tracking-tight mb-2">
          Stuck? Bring it to your trainer.
        </h3>
        <p className="text-[13.5px] text-white/70 leading-relaxed mb-5">
          Friday 1:1s, 25 minutes, your AI problem. Book the slot that works for you.
        </p>
        <button
          className="self-start inline-flex items-center gap-2 px-4 py-2.5 bg-white text-ink rounded-xl text-[14px] font-heading font-semibold hover:bg-surface-paper transition mt-auto"
          onClick={() => alert("Coaching booking — coming in a later phase.")}
        >
          Schedule a 1:1 →
        </button>
      </div>
    </div>
  );
}

// ---- Progress band ----

function ProgressBand({ cohort, currentBelt }) {
  const completed = cohort.progress?.completed ?? 0;
  const total = cohort.progress?.total ?? cohort.sessions?.length ?? 8;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const headline =
    completed === 0
      ? "Ready to begin"
      : completed === total
        ? "Program complete 🎉"
        : currentBelt
          ? `${completed} of ${total} sessions complete · ${currentBelt} Belt up next`
          : `${completed} of ${total} sessions complete`;

  const upNextOrder = cohort.sessions?.find((s) => s.unlocked && !s.completed)?.order;

  return (
    <section className="mt-6 grid lg:grid-cols-[1fr_auto] gap-5 items-center rounded-2xl border border-soft bg-surface-card p-6 shadow-card">
      <div>
        <div className="flex items-end justify-between mb-2 gap-4">
          <div>
            <div className="h-eyebrow mb-1">Your Progress</div>
            <div className="font-heading text-[18px] font-bold">{headline}</div>
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
        {/* Session number scale (1–8) — replaces belt letters per design feedback */}
        <div className="grid grid-cols-8 gap-1 mt-2">
          {(cohort.sessions || []).map((s) => {
            const isCompleted = s.completed;
            const isNext = s.order === upNextOrder;
            return (
              <span
                key={s.order}
                className={
                  "text-center text-[11px] font-heading " +
                  (isCompleted
                    ? "text-emerald-600 font-bold"
                    : isNext
                      ? "text-brand-600 font-bold"
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

// ---- Other small pieces ----

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
    <div className="mt-6 rounded-2xl bg-amber-50/60 border border-amber-200/70 p-4 text-[13px] text-amber-900 leading-relaxed">
      <strong className="font-heading font-bold">NDA Reminder.</strong>{" "}
      All program content, recordings, and materials are restricted by the NDA you signed.
      Please do not share outside your cohort.
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
