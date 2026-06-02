import { HERO_GRADIENT } from "../../lib/mockCohort";

// Cohort identity hero — blue gradient, asymmetric. The Facilitator + 1:1 card
// is now a sibling component (FacilitatorCard) so the hero stays focused on
// the cohort itself.
export default function CohortHero({ cohort }) {
  if (!cohort) return null;
  const start = cohort.startDate ? new Date(cohort.startDate) : null;
  const end = cohort.endDate ? new Date(cohort.endDate) : null;
  const fmt = (d) => (d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
  const dateRange = start && end ? `${fmt(start)} → ${fmt(end)}` : fmt(start) || fmt(end);

  const sessionsTotal = cohort.sessions?.length ?? 8;
  const sessionDuration = cohort.duration || "75 min";
  const meetingDay = cohort.meetingDay || "";

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-9 lg:p-12 text-white h-full"
      style={{ background: HERO_GRADIENT }}
    >
      <div className="absolute inset-0 grain opacity-40" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 text-[11px] font-heading font-semibold tracking-[0.18em] uppercase text-white/70 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
          {cohort.programCode || "AIEW3"} · Cohort in Session
        </div>
        <h1 className="font-heading text-[40px] lg:text-[52px] leading-[1.04] font-extrabold mb-5">
          {cohort.methodName || "AI Empowerment Method"}.<br />
          <span className="text-white/65 font-light italic">{cohort.name}.</span>
        </h1>
        <p className="text-[15px] leading-relaxed text-white/75 max-w-md mb-8">
          {cohort.journeyIntro}
        </p>

        <div className="grid grid-cols-3 gap-4 max-w-md">
          <HeroStat value={sessionsTotal} label="Sessions" />
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
