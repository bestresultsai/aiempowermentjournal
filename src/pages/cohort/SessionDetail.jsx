import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, ArrowRight, ChevronRight, Calendar, Clock,
  Check, Play, FileText, NotebookPen, Lock, Sparkles, CheckCircle2,
} from "lucide-react";
import NavBar from "../../components/NavBar";
import SessionPlayer from "../../components/cohort/SessionPlayer";
import HomeworkSubmission from "../../components/cohort/HomeworkSubmission";
import AddToCalendar from "../../components/AddToCalendar";
import { BELT_COLORS } from "../../lib/mockCohort";
import { getSession, markSessionComplete, submitHomework } from "../../lib/cohortApi";
import { useResolvedCohort } from "../../lib/cohortResolution";
import { getSessionState, SESSION_STATES, SESSION_STATE_META } from "../../lib/sessionState";

// SessionDetail is mounted on two URL patterns:
//   /session/:order               — generic; cohort resolves via useResolvedCohort()
//   /cohort/:slug/session/:order  — explicit; cohort comes from the URL slug
//
// `scopedToCohort` flag drives Prev/Next URL generation so links match the
// pattern the user came from.
export default function SessionDetail() {
  const params = useParams();
  const { order } = params;
  const explicitSlug = params.slug;
  const scopedToCohort = !!explicitSlug;

  // When generic, resolve the cohort the same way Home and Journey do.
  const { cohort: resolvedCohort } = useResolvedCohort();
  const slug = explicitSlug || resolvedCohort?.slug;

  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Helper that mints a session URL matching the current pattern.
  const sessionUrl = (n) =>
    scopedToCohort ? `/cohort/${slug}/session/${n}` : `/session/${n}`;
  const journeyUrl = scopedToCohort ? `/cohort/${slug}` : "/journey";

  // Honor ?tab=homework links (from NextMilestoneCard and email reminders).
  const initialTab = searchParams.get("tab") === "homework" || searchParams.get("tab") === "materials"
    ? searchParams.get("tab")
    : "overview";
  const [tab, setTab] = useState(initialTab);

  function selectTab(next) {
    setTab(next);
    if (next === "overview") {
      searchParams.delete("tab");
    } else {
      searchParams.set("tab", next);
    }
    setSearchParams(searchParams, { replace: true });
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ["cohort", slug, "session", order],
    queryFn: () => getSession(slug, order),
    enabled: !!slug,
  });

  const complete = useMutation({
    mutationFn: (completed) => markSessionComplete(slug, order, completed),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cohort", slug] }),
  });

  const homework = useMutation({
    mutationFn: (payload) => submitHomework(slug, order, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cohort", slug] }),
  });

  const session = data?.session;
  const cohort = data?.cohort;
  const belt = session?.belt && BELT_COLORS[session.belt] ? BELT_COLORS[session.belt] : null;

  const prevSession = cohort?.sessions?.find((s) => s.order === Number(order) - 1);
  const nextSession = cohort?.sessions?.find((s) => s.order === Number(order) + 1);

  // Canonical session lifecycle state — upcoming / live / awaiting-recording
  // / completed. Drives whether we render the player, an "awaiting recording"
  // placeholder, or the upcoming-preview card.
  const state = session ? getSessionState(session) : null;
  const isUpcoming = state === SESSION_STATES.UPCOMING;
  const isLive = state === SESSION_STATES.LIVE;
  const isAwaiting = state === SESSION_STATES.AWAITING_RECORDING;
  const hasRecording = state === SESSION_STATES.COMPLETED && session?.videoUrl;

  return (
    <div className="min-h-screen bg-surface-paper">
      <NavBar />

      {/* ---------- Belt-colored hero band ---------- */}
      {session && belt && (
        <div
          className="relative overflow-hidden text-white"
          style={{ background: belt.gradient || belt.hex, color: belt.contrast }}
        >
          <div className="absolute inset-0 grain opacity-30 pointer-events-none" />
          <div className="relative max-w-[960px] mx-auto px-6 lg:px-8 py-10 lg:py-12">
            <Link
              to={journeyUrl}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-heading font-semibold opacity-80 hover:opacity-100 transition-opacity mb-5"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
              Back to your Journey
            </Link>

            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span
                className="text-[11px] font-heading font-bold tracking-[0.18em] uppercase px-2.5 py-1 rounded-full"
                style={{
                  background: belt.needsBorder ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.18)",
                  border: belt.needsBorder ? "1px solid rgba(15,23,42,0.10)" : "1px solid rgba(255,255,255,0.28)",
                }}
              >
                {session.belt} Belt
              </span>
              <span className="text-[11px] font-heading font-semibold opacity-75">
                Session {session.order} of {cohort?.sessions?.length ?? 8}
              </span>
            </div>

            <h1 className="font-heading text-[30px] lg:text-[40px] leading-[1.1] font-extrabold mb-4 max-w-3xl">
              {session.title}
            </h1>

            <div className="flex items-center gap-4 flex-wrap text-[13.5px] font-heading font-medium opacity-85">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4" strokeWidth={2} />
                {new Date(session.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </span>
              <span className="opacity-50">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4" strokeWidth={2} />
                {cohort?.meetingTime || `${session.durationMinutes || 75} min`}
              </span>
              <span className="opacity-50">·</span>
              <span>{session.durationMinutes || 75} min</span>

              {/* Lifecycle pill — reflects where this session is in time. */}
              {state && (
                <span
                  className={
                    "ml-auto inline-flex items-center gap-1.5 text-[11.5px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border " +
                    {
                      [SESSION_STATES.LIVE]: "bg-rose-50 text-rose-700 border-rose-200",
                      [SESSION_STATES.UPCOMING]: "bg-brand-50 text-brand-700 border-brand-200",
                      [SESSION_STATES.AWAITING_RECORDING]: "bg-amber-50 text-amber-800 border-amber-200",
                      [SESSION_STATES.COMPLETED]: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    }[state]
                  }
                >
                  {state === SESSION_STATES.LIVE && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-60" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
                    </span>
                  )}
                  {state === SESSION_STATES.COMPLETED && <CheckCircle2 className="w-3 h-3" strokeWidth={3} />}
                  {SESSION_STATE_META[state]?.short}
                </span>
              )}
            </div>

            {/* Add to calendar — only useful when the session is still in
                the future or currently live. Past + recorded sessions hide
                this. */}
            {session?.date && (state === SESSION_STATES.UPCOMING || state === SESSION_STATES.LIVE) && (
              <div className="mt-4 flex justify-end">
                <AddToCalendar
                  mode="session"
                  cohort={cohort}
                  session={{
                    ...session,
                    dateObj: new Date(session.date),
                  }}
                  variant="light"
                  size="sm"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------- Loading / error states ---------- */}
      <main className="max-w-[960px] mx-auto px-6 lg:px-8 py-8 lg:py-10">
        {isLoading && <Skeleton />}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-5 py-4 rounded-2xl text-[14px]">
            <strong className="font-heading font-bold">Couldn't load session.</strong> {error.message}
          </div>
        )}

        {data && (
          <>
            {/* ---------- Video player or state-aware placeholder ---------- */}
            <section className="animate-fade-in-up">
              {hasRecording && <SessionPlayer session={session} />}
              {isLive && <LiveNowCard session={session} cohort={cohort} belt={belt} />}
              {isAwaiting && <AwaitingRecordingCard session={session} belt={belt} />}
              {isUpcoming && (
                <UpcomingPlaceholder session={session} cohort={cohort} belt={belt} />
              )}
            </section>

            {/* ---------- Tabs ---------- */}
            <section className="mt-8 animate-fade-in-up delay-100">
              <Tabs current={tab} onChange={selectTab} session={session} belt={belt} />

              <div className="rounded-2xl bg-surface-card border border-soft p-6 lg:p-7 shadow-card">
                {tab === "overview"  && <OverviewPanel session={session} />}
                {tab === "materials" && <MaterialsPanel session={session} />}
                {tab === "homework"  && (
                  <HomeworkSubmission
                    session={session}
                    pending={homework.isPending}
                    onSubmit={(payload) => homework.mutate(payload)}
                    facilitator={cohort?.trainer}
                  />
                )}
              </div>
            </section>

            {/* ---------- Completion footer ---------- */}
            <section className="mt-6 animate-fade-in-up delay-200">
              <CompletionFooter
                session={session}
                belt={belt}
                onMark={(c) => complete.mutate(c)}
                pending={complete.isPending}
                onNext={() => {
                  if (nextSession && nextSession.unlocked) {
                    navigate(sessionUrl(nextSession.order));
                  } else {
                    navigate(journeyUrl);
                  }
                }}
              />
            </section>

            {/* ---------- Prev/Next nav ---------- */}
            <section className="mt-12 animate-fade-in-up delay-300">
              <div className="h-eyebrow mb-3">Continue your journey</div>
              <div className="grid sm:grid-cols-2 gap-3">
                <SessionNavLink
                  direction="prev"
                  session={prevSession}
                  sessionUrl={sessionUrl}
                />
                <SessionNavLink
                  direction="next"
                  session={nextSession}
                  sessionUrl={sessionUrl}
                />
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upcoming placeholder — shown when the session hasn't happened yet.
// ---------------------------------------------------------------------------

// LiveNowCard — shown when the session is currently in its time window.
// Big Join Zoom CTA, pulsing live dot.
function LiveNowCard({ session, cohort, belt }) {
  const zoomLink =
    session?.zoomLink || cohort?.zoomLink || cohort?.trainer?.defaultZoomLink || "";
  return (
    <div className="rounded-3xl bg-gradient-to-br from-rose-600 to-brand-700 text-white relative overflow-hidden aspect-[16/9] flex flex-col items-center justify-center text-center p-8">
      <div className="absolute inset-0 grain opacity-40 pointer-events-none" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur mb-5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>
          <span className="text-[11px] font-heading font-bold uppercase tracking-[0.18em]">
            Live now
          </span>
        </div>
        <h3 className="font-heading text-[24px] lg:text-[28px] font-extrabold mb-2">
          The session is happening right now
        </h3>
        <p className="text-[13.5px] text-white/85 leading-relaxed max-w-md mx-auto mb-5">
          Join your facilitator + cohort on Zoom. The recording will be available here when the session wraps.
        </p>
        {zoomLink && (
          <a
            href={zoomLink}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-ink text-[14px] font-heading font-bold hover:bg-surface-soft transition-colors"
          >
            <Play className="w-4 h-4" strokeWidth={2.5} fill="currentColor" />
            Join the session
          </a>
        )}
      </div>
    </div>
  );
}

// AwaitingRecordingCard — session is over but the facilitator hasn't
// uploaded the recording yet. Sets expectation without showing a broken
// player.
function AwaitingRecordingCard({ session, belt }) {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-surface-card border border-amber-200 relative overflow-hidden aspect-[16/9] flex flex-col items-center justify-center text-center p-8">
      <div className="relative">
        <div
          className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-5"
          style={{
            background: belt?.gradient || "#FBBF24",
            border: belt?.needsBorder ? "1px solid #D1D5DB" : "none",
          }}
        >
          <Clock className="w-6 h-6" strokeWidth={2} style={{ color: belt?.contrast || "#92400E" }} />
        </div>
        <div className="h-eyebrow !text-amber-800 mb-2">Awaiting recording</div>
        <h3 className="font-heading text-[20px] lg:text-[24px] font-extrabold text-ink mb-2">
          Recording will be available soon
        </h3>
        <p className="text-[13.5px] text-ink-muted leading-relaxed max-w-md mx-auto">
          The session is over. Your facilitator usually posts the recording within 24 hours. Materials and homework below are available now.
        </p>
      </div>
    </div>
  );
}

function UpcomingPlaceholder({ session, cohort, belt }) {
  const sessionDate = session?.date ? new Date(session.date) : null;
  const today = new Date();
  const daysAway = sessionDate
    ? Math.max(0, Math.ceil((sessionDate - today) / (1000 * 60 * 60 * 24)))
    : 0;
  const dateLine = sessionDate
    ? sessionDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : "TBD";
  const timeLine = cohort?.meetingTime || (sessionDate ? sessionDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "");

  return (
    <div className="rounded-3xl bg-ink text-white relative overflow-hidden aspect-[16/9] flex flex-col items-center justify-center text-center p-8">
      <div className="absolute inset-0 grain opacity-40 pointer-events-none" />
      <div className="relative">
        <div
          className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-5"
          style={{ background: belt?.gradient || "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.20)" }}
        >
          <Play className="w-6 h-6 text-white" strokeWidth={2} fill="currentColor" />
        </div>
        <div className="h-eyebrow !text-white/70 mb-2">Recording posts after the live session</div>
        <h3 className="font-heading text-[20px] lg:text-[24px] font-extrabold mb-2">
          Live in {daysAway === 0 ? "today" : daysAway === 1 ? "1 day" : `${daysAway} days`}
        </h3>
        <p className="text-[13.5px] text-white/75 leading-relaxed max-w-md mx-auto">
          {dateLine} · {timeLine}. Materials below are already available for prep.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabs (pill style + indicator badges)
// ---------------------------------------------------------------------------

function Tabs({ current, onChange, session, belt }) {
  const tabs = [
    { id: "overview",  label: "Overview",  icon: Sparkles },
    { id: "materials", label: "Materials", icon: FileText, badge: session?.materials?.length || 0 },
    { id: "homework",  label: "Homework",  icon: NotebookPen, status: session?.homeworkSubmitted ? "done" : session?.homework?.prompt ? "due" : null },
  ];

  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      {tabs.map((t) => {
        const active = current === t.id;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-heading font-semibold text-[13.5px] transition-all duration-200 " +
              (active
                ? "bg-ink text-white shadow-card"
                : "bg-surface-card border border-soft text-ink-muted hover:text-ink hover:bg-surface-soft")
            }
          >
            <Icon className="w-4 h-4" strokeWidth={2} />
            {t.label}
            {t.badge > 0 && (
              <span className={"text-[10.5px] font-bold px-1.5 py-0.5 rounded-full " + (active ? "bg-white/20 text-white" : "bg-ink/5 text-ink-muted")}>
                {t.badge}
              </span>
            )}
            {t.status === "done" && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white">
                <Check className="w-2.5 h-2.5" strokeWidth={3.5} />
              </span>
            )}
            {t.status === "due" && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ambient-pulse" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview / Materials panels
// ---------------------------------------------------------------------------

function OverviewPanel({ session }) {
  return (
    <>
      <div className="h-eyebrow mb-2">What this session covers</div>
      <p className="text-[15px] text-ink leading-relaxed mb-7">
        {session.summary}
      </p>
      {session.objectives?.length > 0 && (
        <>
          <div className="h-eyebrow mb-3">By the end, you'll</div>
          <ul className="space-y-2.5">
            {session.objectives.map((o, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[14px] text-ink leading-relaxed">
                <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-brand-500" />
                {o}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function MaterialsPanel({ session }) {
  if (!session.materials?.length) {
    return (
      <div className="text-center py-10">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-surface-soft items-center justify-center mb-3">
          <FileText className="w-5 h-5 text-ink-subtle" strokeWidth={2} />
        </div>
        <h3 className="font-heading text-[16px] font-bold text-ink mb-1">No materials posted yet.</h3>
        <p className="text-[13px] text-ink-muted">They'll show up here once the facilitator uploads them.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {session.materials.map((m, i) => (
        <a
          key={i}
          href={m.url}
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-4 p-4 rounded-xl border border-soft bg-surface-paper hover:bg-surface-card hover:border-brand-500 hover:shadow-card transition-all duration-200"
        >
          <div
            className={
              "w-11 h-11 rounded-xl flex items-center justify-center font-heading font-extrabold text-[12px] shrink-0 " +
              (m.type === "pdf"
                ? "bg-rose-50 text-rose-700 border border-rose-100"
                : m.type === "doc"
                  ? "bg-brand-50 text-brand-700 border border-brand-100"
                  : "bg-surface-soft text-ink-muted border border-soft")
            }
          >
            {(m.type || "file").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14.5px] font-heading font-semibold text-ink truncate">{m.label}</div>
            <div className="text-[12px] text-ink-muted mt-0.5">
              {m.type === "pdf" ? "PDF document" : m.type === "doc" ? "Document" : "File"}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-ink-subtle group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all duration-200 shrink-0" strokeWidth={2.5} />
        </a>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Completion footer
// ---------------------------------------------------------------------------

function CompletionFooter({ session, belt, onMark, pending, onNext }) {
  if (session.completed) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 lg:p-6 flex items-center gap-4 flex-wrap">
        <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-heading text-[16px] font-bold text-ink">Marked complete.</div>
          <p className="text-[13px] text-ink-muted leading-relaxed">
            Nice work. Don't forget to submit your homework if you haven't already.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onMark(false)}
            disabled={pending}
            className="px-3 py-2 rounded-xl bg-white border border-soft text-[13px] font-heading font-semibold text-ink-muted hover:text-ink transition-colors"
          >
            Un-mark
          </button>
          <button
            onClick={onNext}
            className="group inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ink text-white text-[13px] font-heading font-semibold hover:bg-brand-700 transition-colors"
          >
            Next session
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-5 lg:p-6 flex items-center gap-4 flex-wrap text-white relative overflow-hidden"
      style={{ background: belt?.gradient || "linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)", color: belt?.contrast || "#fff" }}
    >
      <div className="absolute inset-0 grain opacity-30 pointer-events-none" />
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 relative"
        style={{ background: belt?.needsBorder ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.18)", border: belt?.needsBorder ? "1px solid rgba(15,23,42,0.10)" : "1px solid rgba(255,255,255,0.28)" }}
      >
        <Sparkles className="w-5 h-5" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0 relative">
        <div className="font-heading text-[16px] font-bold">Done with this session?</div>
        <p className="text-[13px] opacity-80 leading-relaxed">
          Mark it complete to update your progress. You can always un-mark it later.
        </p>
      </div>
      <button
        onClick={() => onMark(true)}
        disabled={pending}
        className="relative inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-ink text-[13px] font-heading font-semibold hover:bg-surface-paper transition-colors shrink-0"
      >
        {pending ? "Saving…" : <>Mark complete <Check className="w-3.5 h-3.5" strokeWidth={3} /></>}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prev / Next session navigation cards
// ---------------------------------------------------------------------------

function SessionNavLink({ direction, session, sessionUrl }) {
  if (!session) {
    return (
      <div className="rounded-2xl border border-dashed border-soft bg-surface-paper p-5 flex items-center gap-3 opacity-60">
        <div className="text-[11px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
          {direction === "prev" ? "Previous" : "Next"}
        </div>
        <div className="text-[13px] text-ink-muted">
          {direction === "prev" ? "This is your first session." : "You're at the final session."}
        </div>
      </div>
    );
  }

  const belt = BELT_COLORS[session.belt];
  const locked = !session.unlocked;
  const Icon = direction === "prev" ? ArrowLeft : ArrowRight;

  const inner = (
    <div className="flex items-center gap-4">
      {direction === "prev" && (
        <Icon className="w-5 h-5 text-ink-subtle group-hover:text-brand-600 group-hover:-translate-x-0.5 transition-all duration-200 shrink-0" strokeWidth={2.5} />
      )}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center font-heading font-extrabold text-[16px] shrink-0"
        style={{
          background: belt?.gradient || belt?.hex || "#EFF6FF",
          color: belt?.contrast || "#2563EB",
          border: belt?.needsBorder ? "1px solid rgba(15,23,42,0.10)" : "none",
          opacity: locked ? 0.5 : 1,
        }}
      >
        {locked ? <Lock className="w-5 h-5" strokeWidth={2} /> : session.order}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
          {direction === "prev" ? "Previous" : "Next"} · {session.belt} Belt
        </div>
        <div className="font-heading text-[14.5px] font-bold text-ink truncate mt-0.5">
          {session.title}
        </div>
      </div>
      {direction === "next" && (
        <Icon className="w-5 h-5 text-ink-subtle group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all duration-200 shrink-0" strokeWidth={2.5} />
      )}
    </div>
  );

  if (locked) {
    return (
      <div className="rounded-2xl border border-soft bg-surface-paper/70 p-5 cursor-not-allowed opacity-75">
        {inner}
      </div>
    );
  }

  return (
    <Link
      to={sessionUrl(session.order)}
      className="group rounded-2xl border border-soft bg-surface-card hover:shadow-lift hover:-translate-y-0.5 hover:border-brand-500/40 transition-all duration-200 p-5"
    >
      {inner}
    </Link>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="aspect-[16/9] rounded-3xl bg-surface-soft" />
      <div className="h-12 rounded-xl bg-surface-soft" />
      <div className="h-40 rounded-2xl bg-surface-soft" />
    </div>
  );
}
