import { useState } from "react";

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
          marginBottom: 16,
        }}
      >
        <HeroStat label="Organization" value={cohort.organization?.name} />
        <HeroStat label="Cohort dates" value={dateRange || "TBD"} />
        <HeroStat label="Meets" value={`${cohort.meetingDay || "Weekly"} · ${cohort.meetingTime || ""}`.trim()} />
      </div>

      <TrainerCard trainer={cohort.trainer} />
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

function TrainerCard({ trainer }) {
  if (!trainer?.name) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: "rgba(255,255,255,0.10)",
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: 14,
        padding: "12px 14px",
      }}
    >
      <TrainerAvatar trainer={trainer} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.70)", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 2 }}>
          Your Trainer
        </div>
        <div style={{ fontSize: 15, fontWeight: 800 }}>{trainer.name}</div>
        {trainer.title && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.4 }}>
            {trainer.title}
          </div>
        )}
      </div>
    </div>
  );
}

// Renders the headshot with a graceful fallback to an initials avatar if the
// image fails to load (or no URL is provided).
function TrainerAvatar({ trainer, size = 56 }) {
  const [errored, setErrored] = useState(false);
  const initials = (trainer.name || "?")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const showImage = trainer.headshotUrl && !errored;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        background: "#1E3A8A",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: size * 0.36,
        flexShrink: 0,
        border: "2px solid rgba(255,255,255,0.4)",
      }}
    >
      {showImage ? (
        <img
          src={trainer.headshotUrl}
          alt={trainer.name}
          width={size}
          height={size}
          onError={() => setErrored(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
