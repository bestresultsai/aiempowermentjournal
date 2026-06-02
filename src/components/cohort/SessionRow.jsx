import { Link } from "react-router-dom";
import { Check, Lock, ChevronRight, ArrowRight, CheckCircle2 } from "lucide-react";
import { BELT_COLORS } from "../../lib/mockCohort";

// A single row in the cohort's curriculum list.
// Belt color + session NUMBER always shown on the left badge (never replaced).
// Status (check, chevron, lock) lives on the right.
//
// URL behavior:
//   • If `cohortSlug` is passed → scoped link `/cohort/:slug/session/:order`
//     (used when an admin views a specific cohort via /cohort/:slug)
//   • If `cohortSlug` is omitted → generic link `/session/:order`
//     (used everywhere participants navigate from Home/Journey)
export default function SessionRow({ session, cohortSlug, emphasized, meetingTime }) {
  const status = session.completed
    ? "completed"
    : session.unlocked
      ? "available"
      : "locked";

  const sessionHref = cohortSlug
    ? `/cohort/${cohortSlug}/session/${session.order}`
    : `/session/${session.order}`;

  const belt = session.belt && BELT_COLORS[session.belt] ? BELT_COLORS[session.belt] : null;
  const beltLabel = session.belt ? `${session.belt} Belt` : `Session ${session.order}`;

  const date = session.date ? new Date(session.date) : null;
  const fmtDate = date
    ? date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : "Date TBD";
  const fmtDateTime = meetingTime ? `${fmtDate} · ${meetingTime}` : fmtDate;

  if (status === "locked") return <LockedRow session={session} belt={belt} beltLabel={beltLabel} fmtDate={fmtDateTime} />;

  const isCompleted = status === "completed";

  return (
    <Link
      to={sessionHref}
      className={
        "group block transition-all duration-200 " +
        (emphasized
          ? "relative overflow-hidden rounded-2xl border-2 border-brand-500 bg-surface-card shadow-lift"
          : isCompleted
            ? "rounded-2xl border border-soft bg-surface-soft/40 hover:bg-surface-soft/70 opacity-80 hover:opacity-100"
            : "rounded-2xl border border-soft bg-surface-card hover:shadow-lift hover:-translate-y-0.5 hover:border-brand-500/40")
      }
    >
      {emphasized && <div className="absolute inset-y-0 left-0 w-1.5 bg-brand-500" />}
      <div className="flex items-center gap-5 p-5">
        {/* LEFT — belt-colored NUMBER badge (always shows the order, never replaced) */}
        <BeltBadge belt={belt} session={session} emphasized={emphasized} muted={isCompleted} />

        {/* MIDDLE — labels, status pills, title, summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={
                "text-[11px] font-heading font-semibold tracking-wider uppercase " +
                (emphasized ? "text-brand-600" : isCompleted ? "text-ink-subtle" : "text-ink-muted")
              }
            >
              {beltLabel}
            </span>
            <span className="w-1 h-1 rounded-full bg-ink-subtle" />
            <span className={"text-[11px] font-heading font-semibold " + (isCompleted ? "text-ink-subtle" : "text-ink-muted")}>{fmtDateTime}</span>
            <StatusPill status={status} emphasized={emphasized} />
            {session.homeworkSubmitted ? (
              <Pill className="bg-emerald-50 text-emerald-700 border-emerald-200 inline-flex items-center gap-1">
                <Check className="w-2.5 h-2.5" strokeWidth={3} /> Homework Done
              </Pill>
            ) : status !== "locked" && session.homework?.prompt ? (
              <Pill className="bg-amber-50 text-amber-700 border-amber-200">Homework Due</Pill>
            ) : null}
          </div>
          <h3
            className={
              "font-heading font-bold leading-snug " +
              (emphasized ? "text-[18px] text-ink" : isCompleted ? "text-[16px] text-ink-muted" : "text-[16px] text-ink")
            }
          >
            {session.title}
          </h3>
          <p
            className={
              "text-[13px] mt-1 leading-relaxed " +
              (emphasized ? "line-clamp-2 text-ink-muted" : isCompleted ? "line-clamp-1 text-ink-subtle" : "line-clamp-1 text-ink-muted")
            }
          >
            {session.summary}
          </p>
        </div>

        {/* RIGHT — status indicator (varies per state) */}
        {emphasized ? (
          <span className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 bg-ink text-white text-[13px] font-heading font-semibold rounded-lg group-hover:bg-brand-700 transition-colors duration-200 shrink-0">
            Open
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.5} />
          </span>
        ) : isCompleted ? (
          <div className="inline-flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" strokeWidth={2} />
            <span className="hidden sm:inline text-ink-subtle group-hover:text-ink transition-colors text-[13px] font-heading font-semibold">
              Review
            </span>
          </div>
        ) : (
          <ChevronRight className="w-5 h-5 text-ink-subtle group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all duration-200 shrink-0" strokeWidth={2.5} />
        )}
      </div>
    </Link>
  );
}

function LockedRow({ session, belt, beltLabel, fmtDate }) {
  return (
    <article className="flex items-center gap-5 bg-surface-card/60 border border-soft rounded-2xl p-5 cursor-not-allowed opacity-70">
      {/* LEFT — number always present, just dimmed */}
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center font-heading font-extrabold text-[18px] shrink-0 opacity-40"
        style={{
          background: belt?.gradient || belt?.hex || "#E5E7EB",
          color: belt?.contrast || "#0A0A0A",
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
          <Pill className="bg-surface-soft text-ink-muted border-soft">Locked</Pill>
        </div>
        <h3 className="font-heading text-[16px] font-bold text-ink-muted">{session.title}</h3>
        <p className="text-[13px] text-ink-subtle mt-1 line-clamp-1">{session.summary}</p>
      </div>
      <Lock className="w-4 h-4 text-ink-subtle shrink-0" strokeWidth={2} />
    </article>
  );
}

// Belt-color badge that ALWAYS shows the session number.
// Completed sessions get a muted belt color (not a green check anymore — the
// check now lives on the right side of the row for clearer status separation).
//
// Background is the belt's GRADIENT so the number tile feels consistent with
// the Next Milestone card + Next Live countdown.
function BeltBadge({ belt, session, emphasized, muted }) {
  const bg = belt?.gradient || belt?.hex || "#EFF6FF";
  const fg = belt?.contrast || "#2563EB";
  // Light belts (White today, a future Gray belt) need a subtle outline to
  // separate them from the page background.
  const border = belt?.needsBorder ? "1px solid rgba(15,23,42,0.10)" : "none";
  return (
    <div
      className={
        "rounded-xl flex items-center justify-center font-heading font-extrabold shrink-0 transition-transform duration-200 group-hover:scale-105 " +
        (emphasized ? "w-14 h-14 text-[20px]" : "w-14 h-14 text-[18px]") +
        (muted ? " opacity-60" : "")
      }
      style={{ background: bg, color: fg, border }}
    >
      {session.order}
    </div>
  );
}

function StatusPill({ status, emphasized }) {
  if (status === "completed") {
    return <Pill className="bg-emerald-50 text-emerald-700 border-emerald-200">Completed</Pill>;
  }
  if (emphasized) {
    return <Pill className="bg-brand-500 text-white border-brand-500">Up Next</Pill>;
  }
  return <Pill className="bg-brand-50 text-brand-700 border-brand-100">Available</Pill>;
}

function Pill({ className = "", children }) {
  return (
    <span className={"text-[10px] font-heading font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border " + className}>
      {children}
    </span>
  );
}
