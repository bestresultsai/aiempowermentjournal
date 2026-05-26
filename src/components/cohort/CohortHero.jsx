export default function CohortHero({ cohort }) {
  if (!cohort) return null;
  const start = cohort.startDate ? new Date(cohort.startDate) : null;
  const end = cohort.endDate ? new Date(cohort.endDate) : null;
  const fmt = (d) =>
    d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
  const dateRange = start && end ? `${fmt(start)} – ${fmt(end)}` : fmt(start) || fmt(end);

  return (
    <section
      style={{
        background: "linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)",
        color: "#fff",
        padding: "44px 24px 36px",
        borderRadius: 16,
        marginBottom: 24,
      }}
    >
      <div style={{ display: "inline-block", background: "rgba(255,255,255,0.16)", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, letterSpacing: 0.4, marginBottom: 12 }}>
        {cohort.programName}
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 8px", lineHeight: 1.2 }}>
        Welcome to {cohort.name}
      </h1>
      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", margin: "0 0 24px", maxWidth: 640, lineHeight: 1.6 }}>
        {cohort.journeyIntro}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        <HeroStat label="Organization" value={cohort.organization?.name} />
        <HeroStat label="Cohort dates" value={dateRange || "TBD"} />
        <HeroStat label="Meets" value={`${cohort.meetingDay || "Weekly"} · ${cohort.meetingTime || ""}`.trim()} />
        <HeroStat label="Trainer" value={cohort.trainer?.name || "TBD"} />
      </div>
    </section>
  );
}

function HeroStat({ label, value }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.10)",
        borderRadius: 12,
        padding: "12px 14px",
        border: "1px solid rgba(255,255,255,0.18)",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.70)", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
