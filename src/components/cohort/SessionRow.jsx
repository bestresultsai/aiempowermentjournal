import { Link } from "react-router-dom";
import { BELT_COLORS } from "../../lib/mockCohort";

export default function SessionRow({ session, cohortSlug }) {
  const status = session.completed
    ? "completed"
    : session.unlocked
      ? "available"
      : "locked";

  const pill = {
    completed: { bg: "#DCFCE7", fg: "#15803D", label: "Completed" },
    available: { bg: "#DBEAFE", fg: "#1D4ED8", label: "Available" },
    locked:    { bg: "#F1F5F9", fg: "#64748B", label: "Locked" },
  }[status];

  const date = session.date ? new Date(session.date) : null;
  const fmt = date
    ? date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : "Date TBD";

  const belt = session.belt && BELT_COLORS[session.belt] ? BELT_COLORS[session.belt] : null;
  const badgeBg = session.completed
    ? "#22C55E"
    : belt
      ? belt.hex
      : "#EFF6FF";
  const badgeFg = session.completed
    ? "#fff"
    : belt
      ? belt.contrast
      : "#2563EB";
  // For "White" belt, give the badge a subtle border so it's visible on a white card.
  const badgeBorder = belt && belt.hex === "#E5E7EB" ? "1.5px solid #CBD5E1" : "none";

  const inner = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 18px",
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        opacity: status === "locked" ? 0.65 : 1,
        cursor: status === "locked" ? "default" : "pointer",
        transition: "transform 0.1s, box-shadow 0.1s",
        // A thin left-edge accent in the belt color for at-a-glance scanning.
        borderLeft: belt ? `4px solid ${belt.hex}` : "1px solid #E2E8F0",
      }}
      onMouseEnter={(e) => {
        if (status === "locked") return;
        e.currentTarget.style.boxShadow = "0 6px 18px rgba(15,23,42,0.06)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          width: 44, height: 44, borderRadius: 10,
          background: badgeBg,
          color: badgeFg,
          border: badgeBorder,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 16, flexShrink: 0,
        }}
      >
        {session.completed ? "✓" : session.order}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#64748B", letterSpacing: 0.3 }}>
            {session.belt ? `${session.belt} Belt` : `Session ${session.order}`} · {fmt}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
            background: pill.bg, color: pill.fg,
            padding: "2px 8px", borderRadius: 999, textTransform: "uppercase",
          }}>
            {pill.label}
          </span>
          {session.homeworkSubmitted && (
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
              background: "#ECFDF5", color: "#047857",
              padding: "2px 8px", borderRadius: 999, textTransform: "uppercase",
              border: "1px solid #A7F3D0",
            }}>
              HW ✓
            </span>
          )}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", marginBottom: 2 }}>
          {session.title}
        </div>
        <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {session.summary}
        </div>
      </div>
      <div style={{
        color: "#2563EB", fontSize: 13, fontWeight: 700, flexShrink: 0,
        visibility: status === "locked" ? "hidden" : "visible",
      }}>
        Open →
      </div>
    </div>
  );

  if (status === "locked") return inner;

  return (
    <Link to={`/cohort/${cohortSlug}/session/${session.order}`} style={{ textDecoration: "none", color: "inherit" }}>
      {inner}
    </Link>
  );
}
