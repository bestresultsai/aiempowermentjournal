import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, ArrowRight, ChevronRight, Calendar, Clock,
  Check, Play, FileText, NotebookPen, Lock, Sparkles, CheckCircle2,
  Star, MessageSquare,
} from "lucide-react";
import NavBar from "../../components/NavBar";
import SessionPlayer from "../../components/cohort/SessionPlayer";
import HomeworkSubmission from "../../components/cohort/HomeworkSubmission";
import AddToCalendar from "../../components/AddToCalendar";
import { BELT_COLORS } from "../../lib/mockCohort";
import { getSession, markSessionComplete, submitHomework } from "../../lib/cohortApi";
import { useResolvedCohort } from "../../lib/cohortResolution";
import { getSessionState, SESSION_STATES, SESSION_STATE_META } from "../../lib/sessionState";
import {
  getFeedbackForParticipantSession,
  submitFeedback,
  useFeedbackVersion,
} from "../../lib/feedbacks";
import { useAuth } from "../../context/AuthContext";

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

  // Honor ?tab=homework / ?tab=materials / ?tab=feedback links.
  const VALID_TABS = new Set(["homework", "materials", "feedback"]);
  const initialTab = VALID_TABS.has(searchParams.get("tab"))
    ? searchParams.get("tab")
    : "overview";
  const [tab, setTab] = useState(initialTab);
  const { user } = useAuth();
  // Re-render when feedback is submitted so the panel updates without a
  // page refresh. Cheap, listens to the same pubsub admin pages use.
  useFeedbackVersion();

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
              <Tabs current={tab} onChange={selectTab} session={session} belt={belt} feedbackEnabled={!isUpcoming} />

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
                {tab === "feedback" && (
                  <FeedbackPanel
                    cohortSlug={slug}
                    sessionOrder={Number(order)}
                    user={user}
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
  const liveInLabel =
    daysAway === 0 ? "today" : daysAway === 1 ? "in 1 day" : `in ${daysAway} days`;

  return (
    <div className="rounded-3xl bg-gradient-to-br from-brand-50 to-surface-card border border-brand-100 relative overflow-hidden aspect-[16/9] flex flex-col items-center justify-center text-center p-8">
      <div className="relative">
        {/* Calendar icon (instead of Play) so the card doesn't read as a
            broken video player. The session hasn't happened yet, so there's
            no recording to play — make that obvious. */}
        <div
          className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-5"
          style={{
            background: belt?.gradient || "rgba(37,99,235,0.10)",
            border: belt?.needsBorder ? "1px solid #D1D5DB" : "none",
          }}
        >
          <Calendar className="w-6 h-6" strokeWidth={2.25} style={{ color: belt?.contrast || "#1D4ED8" }} />
        </div>
        <div className="h-eyebrow text-brand-700 mb-2">No recording yet</div>
        <h3 className="font-heading text-[20px] lg:text-[24px] font-extrabold text-ink mb-2">
          The session recording will be posted here after the session
        </h3>
        <p className="text-[13.5px] text-ink-muted leading-relaxed max-w-md mx-auto">
          Live {liveInLabel} · {dateLine} · {timeLine}. Materials below are already available for prep.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabs (pill style + indicator badges)
// ---------------------------------------------------------------------------

function Tabs({ current, onChange, session, belt, feedbackEnabled }) {
  const tabs = [
    { id: "overview",  label: "Overview",  icon: Sparkles },
    { id: "materials", label: "Materials", icon: FileText, badge: session?.materials?.length || 0 },
    { id: "homework",  label: "Homework",  icon: NotebookPen, status: session?.homeworkSubmitted ? "done" : (session?.customHomework || session?.homework?.prompt) ? "due" : null },
  ];
  if (feedbackEnabled) {
    tabs.push({ id: "feedback", label: "Feedback", icon: MessageSquare });
  }

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
  // customSummary (per-cohort override) wins over the program's default
  // summary; if no override, fall back to the program copy.
  const summary = session.customSummary || session.summary;
  return (
    <>
      <div className="h-eyebrow mb-2">What this session covers</div>
      <p className="text-[15px] text-ink leading-relaxed mb-7">
        {summary}
      </p>

      {/* facilitatorNotes is a per-cohort note shown to participants. Renders
          as a soft brand-tinted callout so it reads as "your facilitator
          wrote this" rather than core curriculum. */}
      {session.facilitatorNotes && (
        <div className="rounded-2xl bg-brand-50/60 border border-brand-100 p-4 mb-7">
          <div className="h-eyebrow text-brand-700 mb-1.5">
            From your facilitator
          </div>
          <p className="text-[14px] text-ink leading-relaxed whitespace-pre-line">
            {session.facilitatorNotes}
          </p>
        </div>
      )}

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

// ---------------------------------------------------------------------------
// FeedbackPanel — star rating + comment, per (participant, cohort, session).
// One row per participant per session — submitting again updates the row.
// ---------------------------------------------------------------------------
function FeedbackPanel({ cohortSlug, sessionOrder, user }) {
  const existing = user?.email
    ? getFeedbackForParticipantSession(user.email, cohortSlug, sessionOrder)
    : null;

  const [rating, setRating] = useState(existing?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(existing?.comment || "");
  const [error, setError] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  // Re-seed if the cached existing record changes (e.g. user navigates between sessions).
  useEffect(() => {
    setRating(existing?.rating || 0);
    setComment(existing?.comment || "");
    setError("");
  }, [existing?.id]);

  // Anyone visiting /session without being signed in shouldn't see the form —
  // gate behind a friendly notice.
  if (!user?.email) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="w-6 h-6 mx-auto text-ink-subtle mb-2" strokeWidth={2} />
        <h3 className="font-heading font-bold text-[15px] text-ink mb-1">
          Sign in to leave feedback
        </h3>
        <p className="text-[13px] text-ink-muted">
          Your feedback helps your facilitator tailor future sessions.
        </p>
      </div>
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (rating < 1) {
      setError("Pick a star rating before submitting.");
      return;
    }
    try {
      submitFeedback({
        participantId: user.id || null,
        participantName: user.name || "",
        participantEmail: user.email,
        cohortSlug,
        sessionOrder,
        rating,
        comment,
      });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } catch (err) {
      setError(err?.message || "Couldn't save your feedback.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-amber-700" strokeWidth={2.5} />
        <h3 className="font-heading text-[15px] font-extrabold text-ink">
          {existing ? "Update your feedback" : "How was this session?"}
        </h3>
      </div>
      <p className="text-[13px] text-ink-muted leading-relaxed max-w-xl">
        We'd love to know what you thought about this session. Anything you
        share helps your facilitator make the next one even better.
      </p>

      <div>
        <label className="block text-[12px] font-heading font-bold uppercase tracking-wider text-ink-muted mb-2">
          Rating
        </label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hoverRating || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(n)}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                className="p-1 rounded transition-transform duration-100 hover:scale-110"
              >
                <Star
                  className={
                    "w-7 h-7 " +
                    (active ? "fill-amber-400 text-amber-500" : "text-ink-subtle")
                  }
                  strokeWidth={1.5}
                />
              </button>
            );
          })}
          {rating > 0 && (
            <span className="ml-2 text-[12px] text-ink-muted font-heading">
              {rating} of 5
            </span>
          )}
        </div>
      </div>

      <div>
        <label className="block text-[12px] font-heading font-bold uppercase tracking-wider text-ink-muted mb-2">
          Comments (optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="What worked? What didn't? Anything we should adjust next time?"
          className="w-full px-3.5 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[13.5px] font-body leading-relaxed focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-900">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ink text-white text-[13.5px] font-heading font-bold hover:bg-ink/90"
        >
          <Check className="w-4 h-4" strokeWidth={2.5} />
          {existing ? "Save changes" : "Submit feedback"}
        </button>
        {justSaved && (
          <span className="inline-flex items-center gap-1 text-[12.5px] font-heading font-semibold text-emerald-700">
            <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
            Saved
          </span>
        )}
        {existing && !justSaved && (
          <span className="text-[11.5px] text-ink-muted">
            Submitted {new Date(existing.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        )}
      </div>
    </form>
  );
}

function MaterialsPanel({ session }) {
  const programMaterials = (session.materials || []).map(asMaterial);
  const customMaterials = (session.customMaterials || []).map(asMaterial);
  if (programMaterials.length === 0 && customMaterials.length === 0) {
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
      {/* Cohort-specific materials added by the facilitator surface first
          with a brand-tinted treatment so it's clear they're context this
          cohort got on top of the program's defaults. */}
      {customMaterials.length > 0 && (
        <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-3 mb-1">
          <div className="h-eyebrow text-brand-700 mb-2 px-1">
            Added for this cohort
          </div>
          <div className="space-y-2">
            {customMaterials.map((m, i) => (
              <MaterialCard key={`c-${i}`} material={m} subtle />
            ))}
          </div>
        </div>
      )}
      {programMaterials.map((m, i) => (
        <MaterialCard key={`p-${i}`} material={m} />
      ))}
    </div>
  );
}

// Renders a single material item as a brand-aligned card. Handles both URL
// links (open in new tab) and uploaded files (download with original
// filename so participants get sensible names instead of "data.bin").
function MaterialCard({ material, subtle }) {
  const isUpload = !!material.fileName;
  return (
    <a
      href={material.url || "#"}
      target={isUpload ? undefined : "_blank"}
      rel="noreferrer"
      download={isUpload ? material.fileName : undefined}
      className={
        "group flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 " +
        (subtle
          ? "border-soft bg-white hover:bg-brand-50/50 hover:border-brand-500"
          : "border-soft bg-surface-paper hover:bg-surface-card hover:border-brand-500 hover:shadow-card")
      }
    >
      <MaterialTypeBadge type={material.type} />
      <div className="flex-1 min-w-0">
        <div className="text-[14.5px] font-heading font-semibold text-ink truncate">
          {material.title}
        </div>
        <div className="text-[12px] text-ink-muted mt-0.5 inline-flex items-center gap-2 flex-wrap">
          <span>{materialTypeLabel(material.type)}</span>
          {isUpload && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded-md bg-emerald-50 text-emerald-700 text-[9.5px] font-heading font-bold uppercase">
              Upload · {material.fileName}
            </span>
          )}
        </div>
      </div>
      <ChevronRight
        className="w-5 h-5 text-ink-subtle group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all duration-200 shrink-0"
        strokeWidth={2.5}
      />
    </a>
  );
}

// Type-aware badge to the left of each material card. Mirrors the icon set
// in MaterialsEditor so the admin sees the same shape they're publishing.
function MaterialTypeBadge({ type }) {
  const tone =
    type === "pdf"
      ? "bg-rose-50 text-rose-700 border border-rose-100"
      : type === "video"
      ? "bg-amber-50 text-amber-700 border border-amber-100"
      : type === "template"
      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
      : type === "prompt"
      ? "bg-violet-50 text-violet-700 border border-violet-100"
      : type === "doc"
      ? "bg-brand-50 text-brand-700 border border-brand-100"
      : "bg-surface-soft text-ink-muted border border-soft";
  return (
    <div
      className={
        "w-11 h-11 rounded-xl flex items-center justify-center font-heading font-extrabold text-[10.5px] uppercase tracking-wider shrink-0 " +
        tone
      }
    >
      {(type || "Link").toUpperCase().slice(0, 4)}
    </div>
  );
}

function materialTypeLabel(type) {
  switch (type) {
    case "pdf": return "PDF document";
    case "video": return "Video";
    case "template": return "Template";
    case "prompt": return "Prompt file";
    case "doc": return "Document";
    case "link":
    default: return "Link";
  }
}

// Backwards-compat coerce: programs from before this round shipped
// materials as either strings or {label, type, url}. Normalize to the new
// {title, type, url, fileName?} shape so the renderer above stays simple.
function asMaterial(m) {
  if (!m) return { title: "—", type: "link", url: "" };
  if (typeof m === "string") return { title: m, type: "link", url: "" };
  return {
    title: m.title || m.label || "Material",
    type: m.type || "link",
    url: m.url || "",
    fileName: m.fileName || null,
  };
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
