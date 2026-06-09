import { HERO_GRADIENT } from "../../lib/mockCohort";
import { getProgramForCohort, getSessionsCountForCohort } from "../../lib/programs";

// Cohort identity hero — blue gradient, asymmetric.
//
// Everything program-specific (method name, tagline, session count, session
// duration) is read from the cohort's PROGRAM via getProgramForCohort. The
// cohort itself is responsible only for instance-specific data (name,
// schedule, organization). Adding a new program with different copy / belt
// count / duration ships through this component automatically.
export default function CohortHero({ cohort }) {
  if (!cohort) return null;
  const start = cohort.startDate ? new Date(cohort.startDate) : null;
  const end = cohort.endDate ? new Date(cohort.endDate) : null;
  const fmt = (d) => (d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
  const dateRange = start && end ? `${fmt(start)} → ${fmt(end)}` : fmt(start) || fmt(end);

  // Program drives the curriculum facts. Cohort fields are fallbacks for
  // legacy / demo data that pre-dates the programs catalog.
  const program = getProgramForCohort(cohort);
  const methodName = program?.methodName || cohort.methodName || "";
  const tagline = program?.tagline || cohort.journeyIntro || "";
  const sessionsTotal = getSessionsCountForCohort(cohort) || cohort.sessions?.length || 0;
  const sessionDurationMinutes =
    program?.sessionDurationMinutes ||
    Number((cohort.duration || "").replace(/[^0-9]/g, "")) ||
    null;
  const programCode = cohort.programCode || program?.code || "";
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
          {programCode} · Cohort in Session
        </div>
        <h1 className="font-heading text-[40px] lg:text-[52px] leading-[1.04] font-extrabold mb-5">
          {methodName && (
            <>
              {methodName}.<br />
            </>
          )}
          <span className="text-white/65 font-light italic">{cohort.name}.</span>
        </h1>
        {tagline && (
          <p className="text-[15px] leading-relaxed text-white/75 max-w-md mb-8">
            {tagline}
          </p>
        )}

        <div className="grid grid-cols-3 gap-4 max-w-md">
          <HeroStat value={sessionsTotal || "—"} label="Sessions" />
          <HeroStat
            value={
              sessionDurationMinutes ? (
                <>
                  {sessionDurationMinutes}
                  <span className="text-white/50 text-[15px] font-medium ml-0.5">min</span>
                </>
              ) : (
                "—"
              )
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
