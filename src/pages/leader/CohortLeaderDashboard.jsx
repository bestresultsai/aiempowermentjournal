import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Crown, Sparkles, Users, BookCheck, GraduationCap,
  Calendar, ExternalLink, AlertTriangle, Zap, BarChart3,
  NotebookPen, ChevronRight, Paperclip, MessageSquare,
} from "lucide-react";
import NavBar from "../../components/NavBar";
import EngagementDonut from "../../components/admin/EngagementDonut";
import Modal, { ModalHeader } from "../../components/admin/Modal";
import JournalEntryDetail from "../../components/admin/JournalEntryDetail";
import SubmissionDetail from "../../components/admin/SubmissionDetail";
import { useCohortLeader } from "../../hooks/useCohortLeader";
import { getAllCohortsForAdmin } from "../../lib/cohortAdmin";
import {
  getParticipantsForCohort,
  getCohortJournalStats,
  totalTimeSaved,
  formatMinutes,
  getParticipantHomeworkStats,
  getParticipantCurrentSession,
  getParticipantJournalStat,
  getJournalEntriesForParticipant,
  getSubmissionsForParticipant,
  getProductionMethodMix,
  timeSavedFor,
} from "../../lib/adminMockData";
import { MOCK_SESSIONS, BELT_COLORS } from "../../lib/mockCohort";
import { getSessionsCountForCohort, getBadgesForCohort } from "../../lib/programs";
import { leveragePerWeek } from "../../lib/journalConstants";
import GamificationStrip from "../../components/cohort/GamificationStrip";
import CohortLeaderboard from "../../components/cohort/CohortLeaderboard";

// ---------------------------------------------------------------------------
// /leader/cohort — Cohort Leader Dashboard.
//
// The Cohort Leader is the participant representing the customer org for
// this cohort. Their purpose: see ROI on the org's investment by watching
// every teammate's engagement and the impact (via AI Journal entries) the
// program is delivering.
//
// They CAN:
//   - See the full roster + per-participant engagement
//   - Open any participant to read all their AI Journal entries
//   - Open any participant to read all their homework submissions
//   - See aggregate cohort KPIs (hours saved, completion %, leverage)
//
// They CANNOT:
//   - Grade homework or write facilitator feedback
//   - See private facilitator notes
//   - Manage cohort settings, schedule, or participants
//
// Read-only by design — observation, not action.
// ---------------------------------------------------------------------------
export default function CohortLeaderDashboard() {
  const { isLeader, participant, cohortSlug } = useCohortLeader();

  // Always compute these before any conditional returns to keep hook order stable.
  const cohort = useMemo(() => {
    if (!cohortSlug) return null;
    return getAllCohortsForAdmin().find((c) => c.slug === cohortSlug) || null;
  }, [cohortSlug]);

  const roster = useMemo(
    () => (cohortSlug ? getParticipantsForCohort(cohortSlug) : []),
    [cohortSlug],
  );

  const stats = useMemo(
    () => (cohortSlug ? getCohortJournalStats(cohortSlug) : null),
    [cohortSlug],
  );

  // Drill-in modal stack — open a participant detail modal, then nested
  // detail modals for individual journal entries / homework submissions.
  const [openParticipantId, setOpenParticipantId] = useState(null);
  const [openEntry, setOpenEntry] = useState(null);
  const [openSubmission, setOpenSubmission] = useState(null);

  if (!isLeader || !participant || !cohort) {
    return <Navigate to="/home" replace />;
  }

  const openParticipant = openParticipantId
    ? roster.find((p) => p.id === openParticipantId)
    : null;

  // --- Aggregate KPIs --------------------------------------------------------
  const rosterCount = roster.length;
  const completedSessionsAcross = roster.reduce(
    (sum, p) => sum + (p.progress?.length || 0),
    0,
  );
  const programSessionsCount = getSessionsCountForCohort(cohort) || MOCK_SESSIONS.length;
  const journeyProgressPct = rosterCount
    ? Math.round((completedSessionsAcross / (rosterCount * programSessionsCount)) * 100)
    : 0;

  let homeworkSubmitted = 0;
  let homeworkExpected = 0;
  for (const p of roster) {
    const stats = getParticipantHomeworkStats(p);
    homeworkSubmitted += stats.submitted;
    // Expected = homework attached to all sessions completed by the participant.
    const completed = p.progress?.length || 0;
    homeworkExpected += completed;
  }
  const homeworkCompletionPct = homeworkExpected
    ? Math.round((homeworkSubmitted / homeworkExpected) * 100)
    : 0;

  const activeJournalers = roster.filter((p) => {
    const stat = getParticipantJournalStat(p);
    return (stat.entries || 0) > 0;
  }).length;

  // --- Maturity ladder (production-method mix) -------------------------------
  const productionMix = getProductionMethodMix([cohortSlug]);
  const productionTotal = productionMix.slices.reduce((s, x) => s + x.count, 0);
  // Highest-tier slice with any entries — the "where the cohort is" headline.
  const topTierSlice = [...productionMix.slices].reverse().find((s) => s.count > 0) || null;

  // --- Total leverage per week (sum over all entries in the cohort) ----------
  let totalLeveragePerWeek = 0;
  for (const p of roster) {
    for (const e of p.journalEntries || []) {
      totalLeveragePerWeek += leveragePerWeek(e);
    }
  }

  // --- Flattened entries (with email + name) for gamification components ----
  // GamificationStrip + CohortLeaderboard group by participantEmail, so we
  // stamp it on every entry here. Cheap pass — at most ~50 entries / cohort.
  const cohortEntriesFlat = roster.flatMap((p) =>
    (p.journalEntries || []).map((e) => ({
      ...e,
      participantId: p.id,
      participantName: p.name,
      participantEmail: p.email,
    })),
  );
  const programBadges = getBadgesForCohort(cohort);

  // --- Upcoming sessions -----------------------------------------------------
  const now = Date.now();
  const upcoming = MOCK_SESSIONS.filter((s) => new Date(s.date).getTime() > now).slice(0, 3);

  return (
    <>
      <NavBar />
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header className="space-y-3">
          <Link
            to="/home"
            className="inline-flex items-center gap-1 text-[12.5px] text-ink-muted hover:text-ink"
          >
            ← Back to your cohort
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-heading font-bold uppercase tracking-wider bg-amber-100 text-amber-800 mb-2">
                <Crown className="w-3 h-3" strokeWidth={2.5} />
                Cohort Leader View
              </div>
              <h1 className="font-heading text-[28px] font-extrabold text-ink leading-tight">
                {cohort.name}
              </h1>
              <p className="text-[14px] text-ink-muted mt-1">
                {cohort.organization?.name || "Organization"} · Facilitated by {cohort.trainer?.name || cohort.facilitator?.name}
              </p>
            </div>
          </div>
        </header>

        {/* KPI cards */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard
            icon={Users}
            label="Participants"
            value={rosterCount}
            sub={`${activeJournalers} actively journaling`}
            color="brand"
          />
          <KpiCard
            icon={GraduationCap}
            label="Journey progress"
            value={`${journeyProgressPct}%`}
            sub={`${completedSessionsAcross} of ${rosterCount * programSessionsCount} sessions`}
            color="brand"
          />
          <KpiCard
            icon={BookCheck}
            label="Homework"
            value={`${homeworkCompletionPct}%`}
            sub={`${homeworkSubmitted} of ${homeworkExpected} submitted`}
            color="amber"
          />
          <KpiCard
            icon={Sparkles}
            label="Hours saved"
            value={formatMinutes(stats?.totalMinutesSaved || 0)}
            sub={`${stats?.totalEntries || 0} journal entries`}
            color="emerald"
          />
          <KpiCard
            icon={Zap}
            label="Leverage / week"
            value={totalLeveragePerWeek > 0 ? formatMinutes(totalLeveragePerWeek) : "—"}
            sub="frequency × volume × saved"
            color="purple"
          />
        </section>

        {/* Gamification pulse — same component the participant Journal page
            uses. Surfaces active streaks, top tier, badge count, and tier
            distribution across the cohort. */}
        <GamificationStrip
          entries={cohortEntriesFlat}
          badges={programBadges}
        />

        {/* Maturity ladder — where this cohort sits on the AI maturity ladder */}
        {productionTotal > 0 && (
          <MaturityLadderCard
            slices={productionMix.slices}
            total={productionTotal}
            topTier={topTierSlice}
          />
        )}

        {/* Leaderboard — three columns of top-3 (hours saved, badges, streak). */}
        <CohortLeaderboard
          entries={cohortEntriesFlat}
          badges={programBadges}
          highlightEmail={participant?.email}
          title={`${cohort.name} — top performers`}
        />

        {/* Roster + Upcoming sessions */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roster — 2/3 width */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="font-heading text-[18px] font-extrabold text-ink inline-flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-600" strokeWidth={2.5} />
              Roster
            </h2>
            <div className="rounded-2xl bg-surface-card border border-soft overflow-hidden">
              <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-surface-soft text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
                <div className="col-span-5">Name</div>
                <div className="col-span-3">Journey</div>
                <div className="col-span-2">Homework</div>
                <div className="col-span-2 text-right">Last journal</div>
              </div>
              {roster.map((p) => (
                <RosterRow
                  key={p.id}
                  participant={p}
                  totalSessions={programSessionsCount}
                  onOpen={() => setOpenParticipantId(p.id)}
                />
              ))}
            </div>
          </div>

          {/* Sidebar — Upcoming sessions. Top contributor moved into the
              leaderboard above so we don't surface it twice. */}
          <div className="space-y-6">
            <UpcomingSessions sessions={upcoming} cohortName={cohort.name} zoomLink={cohort.zoomLink || cohort.trainer?.defaultZoomLink} />
          </div>
        </section>
      </main>

      {/* Participant drill-in modal — open from a roster row. */}
      <Modal open={!!openParticipant} onClose={() => setOpenParticipantId(null)}>
        {openParticipant && (
          <ParticipantDrillContent
            participant={openParticipant}
            totalSessions={programSessionsCount}
            onClose={() => setOpenParticipantId(null)}
            onOpenEntry={(e) => setOpenEntry(e)}
            onOpenSubmission={(s) => setOpenSubmission(s)}
          />
        )}
      </Modal>

      {/* Nested: journal entry detail. */}
      <Modal open={!!openEntry} onClose={() => setOpenEntry(null)}>
        {openEntry && (
          <JournalEntryDetail
            entry={openEntry}
            participant={openParticipant}
            onClose={() => setOpenEntry(null)}
          />
        )}
      </Modal>

      {/* Nested: homework submission detail.
          SubmissionDetail is read-only on its own — grading actions live on
          /admin/homework, not inside this component. We just suppress the
          "View in homework queue" link the leader doesn't have access to. */}
      <Modal open={!!openSubmission} onClose={() => setOpenSubmission(null)}>
        {openSubmission && (
          <SubmissionDetail
            submission={openSubmission}
            session={MOCK_SESSIONS.find((m) => m.order === openSubmission.sessionOrder)}
            belt={(() => {
              const s = MOCK_SESSIONS.find((m) => m.order === openSubmission.sessionOrder);
              return s ? BELT_COLORS[s.belt] : null;
            })()}
            participantName={openParticipant?.name}
            participant={openParticipant}
            showHomeworkQueueLink={false}
            onClose={() => setOpenSubmission(null)}
          />
        )}
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// ParticipantDrillContent — read-only summary of a single participant for
// the Cohort Leader. Lists every AI Journal entry + every homework
// submission. Each row is clickable to open the full-detail modal.
// ---------------------------------------------------------------------------
function ParticipantDrillContent({ participant, totalSessions, onClose, onOpenEntry, onOpenSubmission }) {
  const entries = getJournalEntriesForParticipant(participant.id)
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const submissions = getSubmissionsForParticipant(participant.id)
    .slice()
    .sort((a, b) => (b.sessionOrder || 0) - (a.sessionOrder || 0));
  const hwStats = getParticipantHomeworkStats(participant);
  const completed = participant.progress?.length || 0;
  const progressPct = Math.round((completed / totalSessions) * 100);
  const totalMinutesSaved = entries.reduce((sum, e) => sum + timeSavedFor(e), 0);

  return (
    <>
      <ModalHeader
        eyebrow={participant.title || participant.email}
        title={participant.name}
        onClose={onClose}
      />
      <div className="p-6 space-y-6">
      {/* Top stats */}
      <section className="grid grid-cols-3 gap-3">
        <MiniStat icon={GraduationCap} label="Journey" value={`${progressPct}%`} sub={`${completed}/${totalSessions}`} />
        <MiniStat icon={BookCheck} label="Homework" value={`${hwStats.submitted}/${completed}`} sub="submitted" />
        <MiniStat icon={Zap} label="Time saved" value={formatMinutes(totalMinutesSaved)} sub={`${entries.length} ${entries.length === 1 ? "entry" : "entries"}`} />
      </section>

      {/* Onboarding context — what they told us about why they're here */}
      {(participant.whyAi || participant.mainGoal) && (
        <section className="rounded-2xl bg-brand-50/60 border border-brand-100 p-4 space-y-3">
          <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-brand-700">
            Why they're here
          </div>
          {participant.whyAi && (
            <div className="text-[12.5px] text-ink leading-relaxed">
              {participant.whyAi}
            </div>
          )}
          {participant.mainGoal && (
            <div className="text-[12.5px] text-ink leading-relaxed">
              <span className="font-heading font-bold text-brand-700">Main goal: </span>
              {participant.mainGoal}
            </div>
          )}
        </section>
      )}

      {/* AI Journal entries */}
      <section>
        <div className="flex items-center gap-1.5 mb-2">
          <NotebookPen className="w-4 h-4 text-brand-700" strokeWidth={2.5} />
          <h3 className="font-heading text-[14px] font-extrabold text-ink">
            AI Journal entries · {entries.length}
          </h3>
        </div>
        {entries.length === 0 ? (
          <div className="rounded-xl bg-surface-soft border border-soft px-3 py-4 text-[12.5px] text-ink-muted">
            No entries yet.
          </div>
        ) : (
          <div className="space-y-1.5">
            {entries.map((e) => (
              <button
                key={e.id || e.date + e.title}
                type="button"
                onClick={() => onOpenEntry(e)}
                className="w-full text-left rounded-xl border border-soft bg-white hover:bg-surface-soft/60 hover:border-ink/20 px-3 py-2.5 transition-colors flex items-start gap-2 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-heading font-bold text-[12.5px] text-ink truncate">{e.title}</div>
                  <div className="text-[11.5px] text-ink-muted truncate mt-0.5">
                    {e.description || "No description"}
                  </div>
                  <div className="text-[10.5px] text-ink-subtle mt-1 inline-flex items-center gap-2.5">
                    <span>{dayLabel(e.date)}</span>
                    <span>·</span>
                    <span>{formatMinutes(timeSavedFor(e))} saved</span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-ink-muted shrink-0 mt-1 group-hover:text-ink" strokeWidth={2.5} />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Homework submissions */}
      <section>
        <div className="flex items-center gap-1.5 mb-2">
          <BookCheck className="w-4 h-4 text-emerald-700" strokeWidth={2.5} />
          <h3 className="font-heading text-[14px] font-extrabold text-ink">
            Homework submissions · {submissions.length}
          </h3>
        </div>
        {submissions.length === 0 ? (
          <div className="rounded-xl bg-surface-soft border border-soft px-3 py-4 text-[12.5px] text-ink-muted">
            No submissions yet.
          </div>
        ) : (
          <div className="space-y-1.5">
            {submissions.map((s) => {
              const session = MOCK_SESSIONS.find((m) => m.order === s.sessionOrder);
              return (
                <button
                  key={s.sessionOrder}
                  type="button"
                  onClick={() => onOpenSubmission(s)}
                  className="w-full text-left rounded-xl border border-soft bg-white hover:bg-surface-soft/60 hover:border-ink/20 px-3 py-2.5 transition-colors flex items-start gap-2 group"
                >
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-heading font-extrabold text-[12px] shrink-0">
                    {s.sessionOrder}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-heading font-bold text-[12.5px] text-ink truncate">
                      {session?.title || `Session ${s.sessionOrder}`}
                    </div>
                    <div className="text-[11.5px] text-ink-muted line-clamp-2 mt-0.5">
                      {s.response || <em>No written response</em>}
                    </div>
                    <div className="text-[10.5px] text-ink-subtle mt-1 inline-flex items-center gap-2.5 flex-wrap">
                      {s.submittedAt && <span>{dayLabel(s.submittedAt)}</span>}
                      {s.attachment && (
                        <span className="inline-flex items-center gap-1">
                          <Paperclip className="w-2.5 h-2.5" strokeWidth={2.5} />
                          {s.attachment.name || "Attachment"}
                        </span>
                      )}
                      {s.feedback && (
                        <span className="inline-flex items-center gap-1 text-brand-700">
                          <MessageSquare className="w-2.5 h-2.5" strokeWidth={2.5} />
                          Facilitator feedback
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-ink-muted shrink-0 mt-1 group-hover:text-ink" strokeWidth={2.5} />
                </button>
              );
            })}
          </div>
        )}
      </section>
      </div>
    </>
  );
}

function MiniStat({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-xl bg-surface-card border border-soft p-3">
      <div className="flex items-center gap-1.5 text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
        <Icon className="w-3 h-3" strokeWidth={2.5} />
        {label}
      </div>
      <div className="font-heading text-[18px] font-extrabold text-ink mt-1 leading-none">
        {value}
      </div>
      {sub && <div className="text-[11px] text-ink-muted mt-0.5">{sub}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KpiCard — generic stat tile.
// ---------------------------------------------------------------------------
function KpiCard({ icon: Icon, label, value, sub, color = "brand" }) {
  const palette = {
    brand: { bg: "bg-brand-50", text: "text-brand-700" },
    amber: { bg: "bg-amber-50", text: "text-amber-700" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700" },
    purple: { bg: "bg-purple-50", text: "text-purple-700" },
  }[color];
  return (
    <div className="rounded-2xl bg-surface-card border border-soft p-5">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg ${palette.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${palette.text}`} strokeWidth={2.5} />
        </div>
        <div className="text-[11px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
          {label}
        </div>
      </div>
      <div className="font-heading text-[28px] font-extrabold text-ink mt-2 leading-none">
        {value}
      </div>
      {sub && <div className="text-[12px] text-ink-muted mt-1">{sub}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RosterRow — one participant row. NO journal entry content.
// ---------------------------------------------------------------------------
function RosterRow({ participant, totalSessions, onOpen }) {
  const current = getParticipantCurrentSession(participant);
  const completed = participant.progress?.length || 0;
  const progressPct = Math.round((completed / totalSessions) * 100);
  const hwStats = getParticipantHomeworkStats(participant);
  const entries = getJournalEntriesForParticipant(participant.id);
  const latestEntry = entries
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const initials = participant.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const belt = current ? BELT_COLORS[current.belt] : null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left grid grid-cols-12 gap-3 items-center px-4 py-3 border-t border-soft hover:bg-surface-soft/60 transition-colors cursor-pointer"
    >
      <div className="col-span-5 flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-full bg-brand-700/10 text-brand-700 flex items-center justify-center text-[11px] font-heading font-bold shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-[13.5px] font-heading font-semibold text-ink truncate flex items-center gap-1.5">
            {participant.name}
            {participant.isCohortLead && (
              <Crown className="w-3 h-3 text-amber-600 shrink-0" strokeWidth={2.5} />
            )}
          </div>
          <div className="text-[11.5px] text-ink-muted truncate">{participant.title || participant.email}</div>
        </div>
      </div>
      <div className="col-span-3">
        <div className="flex items-center gap-2">
          {belt ? (
            <span
              style={{
                background: belt.gradient,
                color: belt.contrast,
                border: belt.needsBorder ? "1px solid #D1D5DB" : "none",
              }}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-heading font-bold tracking-wide shrink-0"
            >
              Sess {current.order}
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-heading font-bold bg-emerald-50 text-emerald-700 shrink-0">
              Done
            </span>
          )}
          <div className="flex-1 min-w-0">
            <div className="h-1.5 rounded-full bg-ink/10 overflow-hidden">
              <div
                className="h-full bg-brand-600 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="text-[10.5px] text-ink-muted mt-0.5">{progressPct}%</div>
          </div>
        </div>
      </div>
      <div className="col-span-2">
        <div className="text-[13px] font-heading font-bold text-ink">
          {hwStats.submitted}<span className="text-ink-muted font-medium">/{completed}</span>
        </div>
        <div className="text-[10.5px] text-ink-muted">submitted</div>
      </div>
      <div className="col-span-2 text-right">
        {latestEntry ? (
          <>
            <div className="text-[12.5px] font-heading font-semibold text-ink">
              {dayLabel(latestEntry.date)}
            </div>
            <div className="text-[10.5px] text-ink-muted">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </div>
          </>
        ) : (
          <div className="text-[11.5px] text-ink-muted/70 inline-flex items-center gap-1 justify-end">
            <AlertTriangle className="w-3 h-3" strokeWidth={2.5} />
            No entries
          </div>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// UpcomingSessions — next 3 live sessions.
// ---------------------------------------------------------------------------
function UpcomingSessions({ sessions, cohortName, zoomLink }) {
  if (!sessions.length) {
    return (
      <div className="rounded-2xl bg-surface-card border border-soft p-5">
        <h2 className="font-heading text-[16px] font-extrabold text-ink inline-flex items-center gap-2 mb-2">
          <Calendar className="w-4 h-4 text-brand-600" strokeWidth={2.5} />
          Upcoming sessions
        </h2>
        <p className="text-[12.5px] text-ink-muted">
          All sessions complete. Congratulations to {cohortName}!
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-surface-card border border-soft p-5">
      <h2 className="font-heading text-[16px] font-extrabold text-ink inline-flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-brand-600" strokeWidth={2.5} />
        Upcoming sessions
      </h2>
      <div className="space-y-3">
        {sessions.map((s) => {
          const belt = BELT_COLORS[s.belt];
          return (
            <div key={s.order} className="flex items-start gap-3">
              <span
                style={{
                  background: belt.gradient,
                  color: belt.contrast,
                  border: belt.needsBorder ? "1px solid #D1D5DB" : "none",
                }}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-[12px] font-heading font-bold shrink-0"
              >
                {s.order}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-heading font-bold text-ink truncate">
                  {s.belt} Belt
                </div>
                <div className="text-[11.5px] text-ink-muted">{fullDateLabel(s.date)}</div>
              </div>
            </div>
          );
        })}
      </div>
      {zoomLink && (
        <a
          href={zoomLink}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-brand-50 text-brand-700 text-[12.5px] font-heading font-bold hover:bg-brand-100 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" strokeWidth={2.5} />
          Open Zoom link
        </a>
      )}
    </div>
  );
}

// TopContributorCard removed — CohortLeaderboard's "Hours saved" column
// supersedes it (and shows top 3 instead of just one).

// ---------------------------------------------------------------------------
// Date helpers — minimal local formatting (matches admin date style).
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// MaturityLadderCard — shows how the cohort's journal entries break down by
// production method (No SOP → AI Swarm). Doubles as an aggregate proof point
// for leadership and a coaching signal for the leader.
// ---------------------------------------------------------------------------
function MaturityLadderCard({ slices, total, topTier }) {
  return (
    <section className="rounded-2xl bg-surface-card border border-soft p-5 lg:p-6">
      <div className="flex items-start gap-3 mb-4 flex-wrap">
        <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
          <BarChart3 className="w-4 h-4" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-heading text-[18px] font-extrabold text-ink leading-tight">
            Maturity ladder
          </h2>
          <p className="text-[12.5px] text-ink-muted mt-0.5 max-w-xl">
            Where your cohort sits on the AI maturity ladder — from manual work with no SOP through multi-agent swarms. Higher tiers compound leverage.
          </p>
        </div>
        {topTier && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-[11.5px] font-heading font-bold">
            <Sparkles className="w-3 h-3" strokeWidth={3} />
            Top tier reached: {topTier.label}
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-6 items-center">
        <EngagementDonut segments={slices} />
        <div className="space-y-2">
          {slices.map((s) => {
            const pct = total ? Math.round((s.count / total) * 100) : 0;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: s.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] font-heading font-semibold text-ink">
                      {s.label}
                    </span>
                    <span className="text-[11.5px] text-ink-muted">
                      {s.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-ink/5 overflow-hidden mt-1">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: s.color }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function dayLabel(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = Date.now();
  const diffDays = Math.floor((now - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fullDateLabel(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
