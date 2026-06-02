import { useState } from "react";
import { GraduationCap } from "lucide-react";
import NavBar from "../components/NavBar";
import NextLiveSessionCard from "../components/cohort/NextLiveSessionCard";
import MissingHomeworkCard from "../components/cohort/MissingHomeworkCard";
import SessionRow from "../components/cohort/SessionRow";
import { useResolvedCohort } from "../lib/cohortResolution";

// ---------------------------------------------------------------------------
// JOURNEY PAGE — focused on the AI Empowerment Journey only.
//
// Mounted at /journey. Lighter than the Home page: no hero, no facilitator
// card, no progress band repeats — just the action-oriented Journey content
// (what's next, what's missing, the full curriculum).
//
// The comprehensive overview lives at /home.
// ---------------------------------------------------------------------------

export default function JourneyPage() {
  const { cohort, isLoading, error } = useResolvedCohort();
  const [sessionFilter, setSessionFilter] = useState("all");

  const filteredSessions = (() => {
    if (!cohort?.sessions) return [];
    if (sessionFilter === "completed") return cohort.sessions.filter((s) => s.completed);
    if (sessionFilter === "next")      return cohort.sessions.filter((s) => s.unlocked && !s.completed);
    return cohort.sessions;
  })();

  const upNextOrder = cohort?.sessions?.find((s) => s.unlocked && !s.completed)?.order;

  const completed = cohort?.progress?.completed ?? 0;
  const total = cohort?.progress?.total ?? cohort?.sessions?.length ?? 8;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-surface-paper">
      <NavBar />
      <main className="max-w-[1180px] mx-auto px-6 lg:px-8 py-8">
        {/* Page header — concise, NOT the comprehensive Welcome banner */}
        <header className="mb-8 animate-fade-in-up">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" strokeWidth={2} />
                </div>
                <div className="h-eyebrow">AI Empowerment Journey</div>
              </div>
              <h1 className="font-heading text-[32px] lg:text-[36px] font-extrabold tracking-tight text-ink leading-tight">
                Your workshops.
              </h1>
              <p className="text-[14.5px] text-ink-muted mt-2 max-w-2xl leading-relaxed">
                Eight belts, eight live workshops. Recordings + materials post here after each session,
                and your homework lives one click away.
              </p>
            </div>

            {/* Quick progress chip on the right */}
            {cohort && (
              <div className="rounded-2xl bg-surface-card border border-soft px-5 py-3 shadow-card flex items-center gap-4 shrink-0">
                <div>
                  <div className="text-[10px] font-heading font-bold uppercase tracking-wider text-ink-muted">
                    Progress
                  </div>
                  <div className="font-heading text-[14px] font-bold text-ink mt-0.5">
                    {completed} of {total}
                  </div>
                </div>
                <div className="w-px h-8 bg-soft" />
                <div className="font-heading text-[28px] font-extrabold tracking-tight text-ink leading-none">
                  {pct}<span className="text-ink-subtle text-[15px] font-medium">%</span>
                </div>
              </div>
            )}
          </div>
        </header>

        {isLoading && <Skeleton />}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-5 py-4 rounded-2xl text-[14px]">
            <strong className="font-heading font-bold">Couldn't load cohort.</strong> {error.message}
          </div>
        )}

        {cohort && (
          <>
            {/* Action-oriented cards */}
            <NextLiveSessionCard cohort={cohort} />
            <MissingHomeworkCard cohort={cohort} />

            {/* Full curriculum */}
            <section className="mt-12 animate-fade-in-up delay-300">
              <div className="flex items-baseline justify-between mb-6 flex-wrap gap-3">
                <div>
                  <div className="h-eyebrow mb-1">Curriculum</div>
                  <h2 className="font-heading text-[28px] font-extrabold tracking-tight">
                    The 8-belt path.
                  </h2>
                </div>
                <FilterTabs current={sessionFilter} onChange={setSessionFilter} />
              </div>

              <div className="space-y-2.5">
                {filteredSessions.map((s, idx) => (
                  <div key={s.order} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(idx * 40, 320)}ms` }}>
                    <SessionRow
                      session={s}
                      cohortSlug={cohort.slug}
                      meetingTime={cohort.meetingTime}
                      emphasized={s.order === upNextOrder && sessionFilter !== "completed"}
                    />
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
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

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-32 rounded-2xl bg-surface-soft" />
      <div className="h-64 rounded-2xl bg-surface-soft" />
    </div>
  );
}
