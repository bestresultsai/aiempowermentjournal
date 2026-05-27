import { useState } from "react";

export default function CohortHero({ cohort }) {
  if (!cohort) return null;
  const start = cohort.startDate ? new Date(cohort.startDate) : null;
  const end = cohort.endDate ? new Date(cohort.endDate) : null;
  const fmt = (d) => (d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
  const dateRange = start && end ? `${fmt(start)} → ${fmt(end)}` : fmt(start) || fmt(end);

  const totalSessions = 8;
  const sessionDuration = cohort.duration || "75 min";
  const meetingDay = cohort.meetingDay || "";

  return (
    <section className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-stretch">
      {/* Main hero — dark, asymmetric */}
      <div className="relative overflow-hidden rounded-3xl bg-ink p-9 lg:p-12 text-white">
        <div className="absolute inset-0 grain opacity-40" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 text-[11px] font-heading font-semibold tracking-[0.18em] uppercase text-white/70 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            {cohort.programCode || "AIEW3"} · Cohort in Session
          </div>
          <h1 className="font-heading text-[40px] lg:text-[52px] leading-[1.04] font-extrabold mb-5">
            {cohort.name}.<br />
            <span className="text-white/65 font-light italic">Eight belts, eight workshops.</span>
          </h1>
          <p className="text-[15px] leading-relaxed text-white/75 max-w-md mb-8">
            {cohort.journeyIntro}
          </p>

          <div className="grid grid-cols-3 gap-4 max-w-md">
            <HeroStat value={totalSessions} label="Sessions" />
            <HeroStat
              value={
                <>
                  {sessionDuration.replace(/[^0-9]/g, "") || 75}
                  <span className="text-white/50 text-[15px] font-medium ml-0.5">min</span>
                </>
              }
              label={meetingDay ? `each ${meetingDay.replace(/s$/, "")}` : "per session"}
            />
            <HeroStat value={dateRange || "TBD"} label={cohort.organization?.shortName || ""} small />
          </div>
        </div>
      </div>

      {/* Trainer card */}
      <TrainerCard trainer={cohort.trainer} coachingNote={cohort.coachingNote} />
    </section>
  );
}

function HeroStat({ value, label, small }) {
  return (
    <div>
      <div className={"font-heading font-extrabold leading-none " + (small ? "text-[20px]" : "text-[26px]")}>
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wider text-white/55 mt-1 font-heading">
        {label}
      </div>
    </div>
  );
}

function TrainerCard({ trainer, coachingNote }) {
  if (!trainer?.name) return null;
  return (
    <div className="rounded-3xl bg-surface-card border border-soft p-7 flex flex-col justify-between shadow-card">
      <div>
        <div className="h-eyebrow mb-3">Your Trainer</div>
        <div className="flex items-center gap-4 mb-5">
          <TrainerAvatar trainer={trainer} />
          <div>
            <div className="font-heading text-[20px] font-bold leading-tight">{trainer.name}</div>
            {trainer.title && (
              <div className="text-[13px] text-ink-muted mt-0.5">{trainer.title}</div>
            )}
          </div>
        </div>
        {coachingNote && (
          <p className="text-[13.5px] text-ink-muted leading-relaxed">
            {coachingNote}
          </p>
        )}
      </div>
      <div className="mt-6 flex items-center justify-between pt-5 border-t border-soft">
        <div className="text-[13px]">
          <div className="text-ink-muted">Office Hours</div>
          <div className="font-semibold text-ink font-heading">Fridays · 11 AM CT</div>
        </div>
        <button
          className="text-[13px] font-heading font-semibold text-brand-600 inline-flex items-center gap-1.5 hover:gap-2 transition-all"
          onClick={() => alert("Coaching booking — coming in a later phase.")}
        >
          Book 1:1 →
        </button>
      </div>
    </div>
  );
}

function TrainerAvatar({ trainer }) {
  const [errored, setErrored] = useState(false);
  const initials = (trainer.name || "?")
    .split(" ").filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join("").toUpperCase();

  const showImage = trainer.headshotUrl && !errored;
  if (showImage) {
    return (
      <img
        src={trainer.headshotUrl}
        alt={trainer.name}
        onError={() => setErrored(true)}
        className="w-20 h-20 rounded-full object-cover"
        style={{
          boxShadow: "0 0 0 3px #FAFAF7, 0 0 0 5px #2563EB",
        }}
      />
    );
  }
  return (
    <div className="w-20 h-20 rounded-full bg-brand-700 text-white flex items-center justify-center font-heading font-bold text-[24px]">
      {initials}
    </div>
  );
}
