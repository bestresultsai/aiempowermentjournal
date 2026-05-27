import { Link } from "react-router-dom";
import { BELT_COLORS } from "../../lib/mockCohort";

// A single row in the cohort's curriculum list.
// Uses the belt color as an accent ONLY on the number badge, keeping the row itself calm.
export default function SessionRow({ session, cohortSlug, emphasized }) {
  const status = session.completed
    ? "completed"
    : session.unlocked
      ? "available"
      : "locked";

  const belt = session.belt && BELT_COLORS[session.belt] ? BELT_COLORS[session.belt] : null;
  const beltLabel = session.belt ? `${session.belt} Belt` : `Session ${session.order}`;

  const date = session.date ? new Date(session.date) : null;
  const fmtDate = date
    ? date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : "Date TBD";

  if (status === "locked") return <LockedRow session={session} belt={belt} beltLabel={beltLabel} fmtDate={fmtDate} />;

  return (
    <Link
      to={`/cohort/${cohortSlug}/session/${session.order}`}
      className={
        "group block " +
        (emphasized
          ? "relative overflow-hidden rounded-2xl border-2 border-brand-500 bg-surface-card shadow-lift"
          : "rounded-2xl border border-soft bg-surface-card hover:shadow-lift hover:-translate-y-0.5 transition")
      }
    >
      {emphasized && <div className="absolute inset-y-0 left-0 w-1.5 bg-brand-500" />}
      <div className="flex items-center gap-5 p-5">
        <BeltBadge belt={belt} session={session} emphasized={emphasized} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={"text-[11px] font-heading font-semibold tracking-wider uppercase " + (emphasized ? "text-brand-600" : "text-ink-muted")}>
              {beltLabel}
            </span>
            <span className="w-1 h-1 rounded-full bg-ink-subtle" />
            <span className="text-[11px] font-heading font-semibold text-ink-muted">{fmtDate}</span>
            <StatusPill status={status} emphasized={emphasized} />
            {session.homeworkSubmitted ? (
              <Pill className="bg-emerald-50 text-emerald-700 border-emerald-200">HW ✓</Pill>
            ) : status !== "locked" && session.homework?.prompt ? (
              <Pill className="bg-amber-50 text-amber-700 border-amber-200">HW DUE</Pill>
            ) : null}
          </div>
          <h3 className={"font-heading font-bold text-ink leading-snug " + (emphasized ? "text-[18px]" : "text-[16px]")}>
            {session.title}
          </h3>
          <p className={"text-[13px] text-ink-muted mt-1 leading-relaxed " + (emphasized ? "line-clamp-2" : "line-clamp-1")}>
            {session.summary}
          </p>
        </div>

        {emphasized ? (
          <span className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 bg-ink text-white text-[13px] font-heading font-semibold rounded-lg group-hover:bg-brand-700 transition shrink-0">
            Open →
          </span>
        ) : (
          <span className="text-ink-subtle group-hover:text-brand-600 group-hover:translate-x-0.5 transition text-[18px] shrink-0">
            →
          </span>
        )}
      </div>
    </Link>
  );
}

function LockedRow({ session, belt, beltLabel, fmtDate }) {
  return (
    <article className="flex items-center gap-5 bg-surface-card/60 border border-soft rounded-2xl p-5 cursor-not-allowed opacity-70">
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center font-heading font-extrabold text-[18px] shrink-0 opacity-40"
        style={{
          background: belt?.hex || "#E5E7EB",
          color: belt?.contrast || "#0A0A0A",
          border: belt?.hex === "#E5E7EB" ? "1px solid #D4D4D4" : "none",
        }}
      >
        {session.order}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-[11px] font-heading font-semibold tracking-wider uppercase text-ink-muted">
            {beltLabel}
          </span>
          <span className="w-1 h-1 rounded-full bg-ink-subtle" />
          <span className="text-[11px] font-heading font-semibold text-ink-muted">{fmtDate}</span>
          <Pill className="bg-surface-soft text-ink-muted border-soft">LOCKED</Pill>
        </div>
        <h3 className="font-heading text-[16px] font-bold text-ink-muted">{session.title}</h3>
        <p className="text-[13px] text-ink-subtle mt-1 line-clamp-1">{session.summary}</p>
      </div>
      <span className="text-ink-subtle text-[18px] shrink-0">🔒</span>
    </article>
  );
}

function BeltBadge({ belt, session, emphasized }) {
  const completedBg = "#22C55E";
  const completedFg = "#ffffff";
  const bg = session.completed ? completedBg : belt?.hex || "#EFF6FF";
  const fg = session.completed ? completedFg : belt?.contrast || "#2563EB";
  const border = belt?.hex === "#E5E7EB" ? "1px solid #D4D4D4" : "none";
  return (
    <div
      className={"rounded-xl flex items-center justify-center font-heading font-extrabold shrink-0 " + (emphasized ? "w-14 h-14 text-[20px]" : "w-14 h-14 text-[18px]")}
      style={{ background: bg, color: fg, border }}
    >
      {session.completed ? "✓" : session.order}
    </div>
  );
}

function StatusPill({ status, emphasized }) {
  if (status === "completed") {
    return <Pill className="bg-emerald-50 text-emerald-700 border-emerald-200">COMPLETED</Pill>;
  }
  if (emphasized) {
    return <Pill className="bg-brand-500 text-white border-brand-500">UP NEXT</Pill>;
  }
  return <Pill className="bg-brand-50 text-brand-700 border-brand-100">AVAILABLE</Pill>;
}

function Pill({ className = "", children }) {
  return (
    <span className={"text-[10px] font-heading font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border " + className}>
      {children}
    </span>
  );
}
