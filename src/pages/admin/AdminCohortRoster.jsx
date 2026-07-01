import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowLeft, GraduationCap, BookCheck, NotebookPen, Sparkles, Clock, Users,
  ChevronUp, ChevronDown, Download, Target, Pencil, UserPlus, Crown, Mail,
  Calendar as CalendarIcon, Video, AlertCircle, Check, Loader2, X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getAccessibleCohorts, canEditCohort } from "../../lib/adminRoles";
import { BELT_COLORS } from "../../lib/mockCohort";
import { getSessionsCountForCohort } from "../../lib/programs";
import {
  getParticipantsForCohort, getCohortJournalStats,
  totalTimeSaved, formatMinutes, useParticipantVersion,
} from "../../lib/adminMockData";
import { getAllCohortsForAdmin, getSessionsForCohort, setSessionRecording } from "../../lib/cohortAdmin";
import {
  findAwaitingRecording,
  getSessionState,
  SESSION_STATE_META,
} from "../../lib/sessionState";
import { sanitizeUrl, clampString, LIMITS } from "../../lib/inputValidation";
import { downloadCSV } from "../../lib/csvExport";

// /admin/cohorts/:slug — roster of participants in a single cohort.
//
// Each row shows the participant identity + main-goal preview, an 8-pip
// progress bar (one pip per belt), homework + journal stats. Headers click
// to sort. CSV export button next to header.
export default function AdminCohortRoster() {
  const { slug } = useParams();
  const { user } = useAuth();
  // Pull from the merged list so newly-created cohorts resolve here.
  const cohorts = getAccessibleCohorts(user, getAllCohortsForAdmin());
  const cohort = cohorts.find((c) => c.slug === slug);

  // Sort state.
  // sortKey: "name" | "progress" | "homework" | "journal"
  // dir: "asc" | "desc"
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  // Hooks must run in a stable order — keep them above the scope check.
  // Bump on every participant write / Realtime push so the roster count
  // stays honest without a manual reload (task #550 — the "Bethany only
  // sees 2/4 participants" bug).
  const pVersion = useParticipantVersion();
  const rosterRaw = useMemo(
    () => (cohort ? getParticipantsForCohort(slug) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cohort, slug, pVersion],
  );
  // Schedule summary — derives meeting day/time + start/end from session dates.
  const sessions = cohort ? getSessionsForCohort(slug) : [];
  // Per-cohort session count — APFW cohorts have 10, AIEW3 has 8, etc. Fall
  // back to this cohort's session list rather than the global MOCK_SESSIONS
  // (which is hardcoded to AIEW3 and would mis-count any non-AIEW3 cohort).
  const totalSessions =
    getSessionsCountForCohort(cohort) || sessions.length || 0;
  const journal = cohort ? getCohortJournalStats(slug) : { totalEntries: 0, totalMinutesSaved: 0 };
  const schedule = useMemo(() => buildScheduleSummary(sessions, cohort?.timeZone), [sessions, cohort?.timeZone]);

  // Apply sort.
  const roster = useMemo(() => {
    const arr = [...rosterRaw];
    const dir = sortDir === "asc" ? 1 : -1;
    const cmp = {
      name: (a, b) => a.name.localeCompare(b.name),
      progress: (a, b) => (a.progress?.length || 0) - (b.progress?.length || 0),
      homework: (a, b) =>
        Object.keys(a.submissions || {}).length - Object.keys(b.submissions || {}).length,
      journal: (a, b) =>
        totalTimeSaved(a.journalEntries || []) - totalTimeSaved(b.journalEntries || []),
    }[sortKey] || ((a, b) => 0);
    arr.sort((a, b) => cmp(a, b) * dir);
    return arr;
  }, [rosterRaw, sortKey, sortDir]);

  // Scope check — bounce after all hooks have run.
  if (!cohort) {
    return <Navigate to="/admin/cohorts" replace />;
  }

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      // Sensible defaults — text ascends, numbers descend.
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  function handleExportCSV() {
    const header = [
      "Name", "Email", "Title", "Organization",
      "Sessions complete", "Total sessions",
      "Homework submitted", "Homework reviewed",
      "Journal entries", "Hours saved", "Last journal (days ago)",
      "Main goal", "Why AI",
    ];
    const rows = roster.map((p) => {
      const completed = p.progress?.length || 0;
      const subs = Object.values(p.submissions || {});
      const reviewed = subs.filter((s) => s.reviewedAt).length;
      const minutes = totalTimeSaved(p.journalEntries || []);
      return [
        p.name, p.email, p.title || "", p.organization || "",
        completed, totalSessions,
        subs.length, reviewed,
        (p.journalEntries || []).length, Math.round(minutes / 60 * 10) / 10,
        p.lastJournalDaysAgo ?? "",
        p.mainGoal || "", p.whyAi || "",
      ];
    });
    downloadCSV(`${cohort.slug}-roster.csv`, [header, ...rows]);
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Back link */}
      <Link
        to="/admin/cohorts"
        className="inline-flex items-center gap-1.5 text-[12.5px] font-heading font-semibold text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
        All cohorts
      </Link>

      {/* Header */}
      <header className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
          <GraduationCap className="w-6 h-6" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-eyebrow">{cohort.organization?.name || "Cohort"}</div>
          <h1 className="font-heading text-[24px] lg:text-[28px] font-extrabold text-ink leading-tight">
            {cohort.name}
          </h1>
          <p className="text-[13px] text-ink-muted mt-0.5">
            {cohort.methodName} · {cohort.programCode} · {roster.length}{" "}
            {roster.length === 1 ? "participant" : "participants"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canEditCohort(user, cohort) && (
            <>
              <Link
                to={`/admin/cohorts/${cohort.slug}/participants/add`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600 text-white text-[12.5px] font-heading font-semibold hover:bg-brand-700 transition-colors duration-200"
              >
                <UserPlus className="w-3.5 h-3.5" strokeWidth={2.5} />
                Add participants
              </Link>
              <Link
                to={`/admin/cohorts/${cohort.slug}/edit`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-soft text-[12.5px] font-heading font-semibold text-ink hover:bg-surface-soft hover:border-brand-500 transition-all duration-200"
              >
                <Pencil className="w-3.5 h-3.5 text-brand-600" strokeWidth={2.5} />
                Edit cohort
              </Link>
            </>
          )}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-soft text-[12.5px] font-heading font-semibold text-ink hover:bg-surface-soft hover:border-brand-500 transition-all duration-200"
          >
            <Download className="w-3.5 h-3.5 text-brand-600" strokeWidth={2.5} />
            Export CSV
          </button>
        </div>
      </header>

      {/* Facilitator + Meeting schedule — at the top so anyone landing on
          this page immediately knows WHO runs the cohort and WHEN it meets. */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FacilitatorCard
          facilitator={cohort.facilitator || cohort.trainer}
          cohortSlug={slug}
          canEdit={canEditCohort(user, cohort)}
        />
        <MeetingScheduleCard schedule={schedule} timeZone={cohort.timeZone} />
      </section>

      {/* Cohort leader — when one is set among the roster, surface them
          here so admins always know who the customer-side champion is. */}
      <CohortLeaderCard leader={roster.find((p) => p.isCohortLead)} />

      {/* Sessions awaiting recording — a to-do list for the facilitator. */}
      <AwaitingRecordingSection cohortSlug={slug} sessions={sessions} />

      {/* Per-cohort session customization — surfaces every session with a
          quick edit link so a facilitator can override notes, materials,
          homework, or the recording for this cohort specifically. */}
      <SessionsCustomizationCard cohortSlug={slug} sessions={sessions} />

      {/* Cohort-level Journal summary */}
      {journal.totalEntries > 0 && (
        <section className="rounded-2xl bg-emerald-50/40 border border-emerald-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-emerald-700" strokeWidth={2.5} />
            <h2 className="font-heading text-[13px] font-bold uppercase tracking-wider text-emerald-700">
              AI Journal — this cohort
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <CohortJournalStat icon={NotebookPen} label="Entries" value={journal.totalEntries} />
            <CohortJournalStat icon={Clock} label="Hours saved" value={Math.round(journal.totalMinutesSaved / 60)} />
            <CohortJournalStat
              icon={Users}
              label="Top contributor"
              value={journal.topContributor?.name.split(" ")[0] || "—"}
              sub={journal.topContributor ? `${formatMinutes(journal.topContributorMinutes)} saved` : null}
            />
            <CohortJournalStat
              icon={Sparkles}
              label="Latest entry"
              value={journal.latest ? timeAgoShort(journal.latest.date) : "—"}
              sub={journal.latest ? journal.latest.participantName : null}
            />
          </div>
        </section>
      )}

      {/* Roster table */}
      <div className="rounded-2xl bg-surface-card border border-soft overflow-hidden">
        {/* Header row (desktop) — clickable to sort */}
        <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-soft bg-surface-soft text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
          <SortHeader label="Participant" colKey="name" current={sortKey} dir={sortDir} onClick={toggleSort} />
          <div className="w-48 text-center">Progress (8 belts)</div>
          <SortHeader label="Done" colKey="progress" current={sortKey} dir={sortDir} onClick={toggleSort} width="w-20" align="right" />
          <SortHeader label="Homework" colKey="homework" current={sortKey} dir={sortDir} onClick={toggleSort} width="w-24" align="right" />
          <SortHeader label="Journal" colKey="journal" current={sortKey} dir={sortDir} onClick={toggleSort} width="w-36" align="right" />
        </div>

        {roster.map((p) => {
          const completedCount = p.progress?.length || 0;
          const submittedCount = Object.keys(p.submissions || {}).length;
          const entriesCount = p.journalEntries?.length || 0;
          const minutesSaved = totalTimeSaved(p.journalEntries || []);
          return (
            <Link
              key={p.id}
              to={`/admin/participants/${p.id}`}
              className="group grid md:grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-4 hover:bg-surface-soft transition-colors border-b border-soft last:border-b-0"
            >
              {/* Identity */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-brand-700 text-white flex items-center justify-center text-[12px] font-heading font-bold shrink-0">
                  {p.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-heading text-[14px] font-bold text-ink truncate group-hover:text-brand-700 transition-colors">
                    {p.name}
                  </div>
                  <div className="text-[11.5px] text-ink-muted truncate">{p.title}</div>
                  {p.mainGoal && (
                    <div
                      title={p.mainGoal}
                      className="inline-flex items-center gap-1 text-[11px] text-brand-700/90 font-heading mt-1 truncate max-w-full"
                    >
                      <Target className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                      <span className="truncate">{p.mainGoal}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Belt-progress pips — use the COHORT's sessions (program-aware)
                  rather than the global MOCK_SESSIONS list, so a 10-session
                  program renders 10 pips and an 8-session program renders 8. */}
              <div className="w-full md:w-48 flex items-center justify-start md:justify-center gap-1">
                {sessions.map((s) => {
                  const done = p.progress?.includes(s.order);
                  const belt = BELT_COLORS[s.belt] || BELT_COLORS.White;
                  return (
                    <div
                      key={s.order}
                      title={`${s.belt} belt — Session ${s.order}`}
                      style={{
                        background: done ? belt.gradient : "#E5E7EB",
                        border: done && belt.needsBorder ? "1px solid #D1D5DB" : "none",
                      }}
                      className="h-4 w-4 rounded-sm shrink-0"
                    />
                  );
                })}
              </div>

              {/* Done count */}
              <div className="w-full md:w-20 text-left md:text-right">
                <div className="font-heading font-bold text-ink text-[14px]">
                  {completedCount}/{totalSessions}
                </div>
              </div>

              {/* Homework submitted */}
              <div className="w-full md:w-24 text-left md:text-right flex md:justify-end items-center gap-1.5">
                <BookCheck className="w-3.5 h-3.5 text-ink-muted shrink-0" strokeWidth={2.25} />
                <span className="font-heading font-bold text-ink text-[14px]">
                  {submittedCount}
                </span>
              </div>

              {/* Journal — entries + hours saved + last activity */}
              <div className="w-full md:w-36 text-left md:text-right">
                <div className="flex md:justify-end items-center gap-1.5">
                  <NotebookPen className="w-3.5 h-3.5 text-ink-muted shrink-0" strokeWidth={2.25} />
                  <span className="font-heading font-bold text-ink text-[14px]">
                    {entriesCount}
                  </span>
                  {minutesSaved > 0 && (
                    <span className="text-[11.5px] font-heading font-semibold text-emerald-700">
                      · {formatMinutes(minutesSaved)} saved
                    </span>
                  )}
                </div>
                <div className={
                  "text-[10.5px] font-heading mt-0.5 " +
                  ((p.lastJournalDaysAgo ?? 999) > 10 ? "text-amber-700" : "text-ink-muted")
                }>
                  {(p.lastJournalDaysAgo ?? 999) > 100 ? "no entries" :
                    p.lastJournalDaysAgo === 0 ? "today" :
                      p.lastJournalDaysAgo === 1 ? "yesterday" :
                        `last ${p.lastJournalDaysAgo}d ago`}
                </div>
              </div>
            </Link>
          );
        })}

        {roster.length === 0 && (
          <div className="p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" strokeWidth={2} />
            </div>
            <h3 className="font-heading text-[16px] font-extrabold text-ink">
              No participants in this cohort yet.
            </h3>
            <p className="text-[13px] text-ink-muted mt-1 max-w-md mx-auto">
              Add participants by email or paste a list of emails to bulk-add.
            </p>
            <Link
              to={`/admin/cohorts/${cohort.slug}/participants/add`}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600 text-white text-[12.5px] font-heading font-semibold hover:bg-brand-700 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" strokeWidth={2.5} />
              Add participants
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function CohortJournalStat({ icon: Icon, label, value, sub }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10.5px] font-heading font-bold uppercase tracking-wider text-emerald-700/80">
        <Icon className="w-3 h-3" strokeWidth={2.5} />
        {label}
      </div>
      <div className="font-heading font-extrabold text-emerald-900 text-[22px] tracking-tight mt-0.5">
        {value}
      </div>
      {sub && <div className="text-[10.5px] text-emerald-700/70 mt-0.5">{sub}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FacilitatorCard — surfaces who runs this cohort. Matches the "leader card"
// visual rhythm so the two side-by-side cards feel intentional.
// ---------------------------------------------------------------------------
function FacilitatorCard({ facilitator, cohortSlug, canEdit }) {
  if (!facilitator) {
    return (
      <div className="rounded-2xl bg-surface-card border border-dashed border-soft p-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-ink/5 text-ink-subtle flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
            Facilitator
          </div>
          <div className="text-[12.5px] text-ink-muted mt-0.5">
            None assigned yet.
          </div>
        </div>
        {canEdit && cohortSlug && (
          <Link
            to={`/admin/cohorts/${cohortSlug}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-soft text-[12px] font-heading font-semibold text-ink hover:bg-surface-soft hover:border-brand-500 transition-all duration-200 shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" strokeWidth={2.5} />
            Assign
          </Link>
        )}
      </div>
    );
  }
  const initials = facilitator.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div className="rounded-2xl bg-gradient-to-r from-brand-50/60 to-surface-card border border-brand-100 p-4 flex items-center gap-3 flex-wrap">
      {facilitator.headshotUrl ? (
        <img
          src={facilitator.headshotUrl}
          alt=""
          className="w-11 h-11 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="w-11 h-11 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-heading font-extrabold text-[14px] shrink-0">
          {initials}
        </div>
      )}
      <div className="flex-1 min-w-[160px]">
        <div className="inline-flex items-center gap-1.5 text-[10.5px] font-heading font-bold uppercase tracking-wider text-brand-700">
          <GraduationCap className="w-3 h-3" strokeWidth={2.5} />
          Facilitator
        </div>
        <div className="font-heading text-[15px] font-extrabold text-ink mt-0.5">
          {facilitator.name}
        </div>
        {facilitator.title && (
          <div className="text-[11.5px] text-ink-muted">{facilitator.title}</div>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {facilitator.email && (
          <a
            href={`mailto:${facilitator.email}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-brand-100 text-[12px] font-heading font-semibold text-brand-700 hover:bg-brand-50 transition-colors"
          >
            <Mail className="w-3.5 h-3.5" strokeWidth={2.5} />
            Email
          </a>
        )}
        {canEdit && cohortSlug && (
          <Link
            to={`/admin/cohorts/${cohortSlug}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-soft text-[12px] font-heading font-semibold text-ink hover:bg-surface-soft hover:border-brand-500 transition-all duration-200"
            title="Change the facilitator for this cohort"
          >
            <Pencil className="w-3.5 h-3.5" strokeWidth={2.5} />
            Change
          </Link>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MeetingScheduleCard — "Meets every Wednesday at 12:00 PM" + start + end.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// AwaitingRecordingSection — facilitator-facing to-do list. Lists any session
// whose date has passed but has no videoUrl. Each row gets an inline form
// to paste the recording URL.
//
// Hides itself entirely when there's nothing pending — keeps the page clean
// for cohorts that are up to date.
// ---------------------------------------------------------------------------
function AwaitingRecordingSection({ cohortSlug, sessions }) {
  const [version, setVersion] = useState(0);
  // Re-read after each write so the section disappears row by row.
  const pending = useMemo(
    () => findAwaitingRecording(sessions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions, version],
  );
  if (pending.length === 0) return null;
  return (
    <section className="rounded-2xl bg-amber-50/60 border border-amber-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-4 h-4 text-amber-700" strokeWidth={2.5} />
        <h2 className="font-heading text-[13px] font-bold uppercase tracking-wider text-amber-800">
          {pending.length} {pending.length === 1 ? "session" : "sessions"} awaiting recording
        </h2>
      </div>
      <p className="text-[12.5px] text-amber-900/80 leading-relaxed mb-4 max-w-2xl">
        These sessions have wrapped but their recordings haven't been uploaded yet. Paste the Vimeo, YouTube, or Box link below and participants will see it appear on the session page.
      </p>
      <div className="space-y-2">
        {pending.map((s) => (
          <AwaitingRecordingRow
            key={s.order}
            session={s}
            onSaved={() => setVersion((v) => v + 1)}
            cohortSlug={cohortSlug}
          />
        ))}
      </div>
    </section>
  );
}

function AwaitingRecordingRow({ session, cohortSlug, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const belt = BELT_COLORS[session.belt];

  async function handleSave() {
    setError("");
    const check = sanitizeUrl(url);
    if (!check.ok) {
      setError(check.reason);
      return;
    }
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 350));
      setSessionRecording(cohortSlug, session.order, check.value);
      onSaved?.();
    } finally {
      setSaving(false);
      setEditing(false);
      setUrl("");
    }
  }

  return (
    <div className="rounded-xl bg-white border border-amber-100 p-3">
      <div className="flex items-center gap-3 flex-wrap">
        {belt && (
          <span
            style={{
              background: belt.gradient,
              color: belt.contrast,
              border: belt.needsBorder ? "1px solid #D1D5DB" : "none",
            }}
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl font-heading font-extrabold text-[12px] shrink-0"
          >
            {session.order}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-heading text-[13.5px] font-bold text-ink truncate">
            {session.belt} Belt · Session {session.order}
          </div>
          <div className="text-[11.5px] text-ink-muted">
            {session.date
              ? new Date(session.date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "TBD"}
          </div>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink text-white text-[12px] font-heading font-bold hover:bg-brand-700 transition-colors shrink-0"
          >
            <Video className="w-3.5 h-3.5" strokeWidth={2.5} />
            Add recording
          </button>
        )}
      </div>
      {editing && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <input
            type="url"
            autoFocus
            value={url}
            onChange={(e) => setUrl(clampString(e.target.value, LIMITS.url))}
            placeholder="https://vimeo.com/... or https://www.youtube.com/watch?v=..."
            maxLength={LIMITS.url}
            className="flex-1 min-w-[260px] px-3 py-2 rounded-lg border border-amber-200 bg-white text-[13px] text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-amber-500"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !url.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-[12px] font-heading font-bold hover:bg-emerald-700 transition-colors disabled:bg-emerald-300 disabled:cursor-not-allowed shrink-0"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" strokeWidth={3} />}
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setUrl("");
              setError("");
            }}
            className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-soft transition-colors shrink-0"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      )}
      {error && (
        <div className="mt-2 text-[11.5px] text-rose-700 inline-flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
          {error}
        </div>
      )}
    </div>
  );
}

function MeetingScheduleCard({ schedule, timeZone }) {
  if (!schedule) {
    return (
      <div className="rounded-2xl bg-surface-card border border-dashed border-soft p-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-ink/5 text-ink-subtle flex items-center justify-center shrink-0">
          <CalendarIcon className="w-5 h-5" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
            Meeting schedule
          </div>
          <div className="text-[12.5px] text-ink-muted mt-0.5">
            Sessions not scheduled yet.
          </div>
        </div>
      </div>
    );
  }
  const tzLabel = timeZone ? timeZone.split("/").pop().replace("_", " ") : "";
  return (
    <div className="rounded-2xl bg-gradient-to-r from-emerald-50/60 to-surface-card border border-emerald-100 p-4 flex items-start gap-3 flex-wrap">
      <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
        <CalendarIcon className="w-5 h-5" strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-[160px]">
        <div className="inline-flex items-center gap-1.5 text-[10.5px] font-heading font-bold uppercase tracking-wider text-emerald-700">
          <Video className="w-3 h-3" strokeWidth={2.5} />
          Meeting schedule
        </div>
        <div className="font-heading text-[15px] font-extrabold text-ink mt-0.5">
          {schedule.cadence === "weekly"
            ? `Meets every ${schedule.weekday} at ${schedule.time}`
            : `${schedule.cadence === "biweekly" ? "Every other " : "Every "}${schedule.weekday} at ${schedule.time}`}
        </div>
        <div className="text-[11.5px] text-ink-muted mt-1">
          {schedule.startLabel} – {schedule.endLabel}
          {tzLabel && <span className="text-ink-subtle"> · {tzLabel}</span>}
        </div>
      </div>
    </div>
  );
}

// Builds a compact meeting-schedule summary from session date strings.
// Pure helper — no hooks, deterministic given the same input.
function buildScheduleSummary(sessions) {
  if (!Array.isArray(sessions) || sessions.length === 0) return null;
  const dated = sessions.filter((s) => s.date).slice().sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );
  if (dated.length === 0) return null;
  const first = new Date(dated[0].date);
  const last = new Date(dated[dated.length - 1].date);

  // Cadence = average gap between consecutive sessions in days.
  let cadence = "weekly";
  if (dated.length >= 2) {
    const gaps = [];
    for (let i = 1; i < dated.length; i++) {
      gaps.push(
        (new Date(dated[i].date) - new Date(dated[i - 1].date)) / (1000 * 60 * 60 * 24),
      );
    }
    const avg = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    if (avg > 10 && avg < 20) cadence = "biweekly";
    else if (avg >= 20) cadence = "monthly";
    else cadence = "weekly";
  }

  return {
    weekday: first.toLocaleDateString("en-US", { weekday: "long" }),
    time: first.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    startLabel: first.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    endLabel: last.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    cadence,
  };
}

function CohortLeaderCard({ leader }) {
  if (!leader) {
    return (
      <section className="rounded-2xl bg-surface-card border border-dashed border-soft p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-ink/5 text-ink-subtle flex items-center justify-center shrink-0">
          <Crown className="w-4 h-4" strokeWidth={2.25} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
            Cohort leader
          </div>
          <div className="text-[12.5px] text-ink-muted mt-0.5">
            No leader assigned. Toggle "Cohort leader" on a participant to mark one.
          </div>
        </div>
      </section>
    );
  }
  const initials = leader.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <section className="rounded-2xl bg-gradient-to-r from-amber-50/60 to-surface-card border border-amber-200 p-4 flex items-center gap-3 flex-wrap">
      <div className="w-11 h-11 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-heading font-extrabold text-[14px] shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-[180px]">
        <div className="inline-flex items-center gap-1.5 text-[10.5px] font-heading font-bold uppercase tracking-wider text-amber-800">
          <Crown className="w-3 h-3" strokeWidth={2.5} />
          Cohort leader
        </div>
        <Link
          to={`/admin/participants/${leader.id}`}
          className="block font-heading text-[15px] font-extrabold text-ink hover:text-amber-700 transition-colors mt-0.5"
        >
          {leader.name}
        </Link>
        {leader.title && (
          <div className="text-[11.5px] text-ink-muted">{leader.title}</div>
        )}
      </div>
      <a
        href={`mailto:${leader.email}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-[12px] font-heading font-semibold text-amber-800 hover:bg-amber-50 transition-colors shrink-0"
      >
        <Mail className="w-3.5 h-3.5" strokeWidth={2.5} />
        Email
      </a>
    </section>
  );
}

function SortHeader({ label, colKey, current, dir, onClick, width, align }) {
  const isActive = current === colKey;
  return (
    <button
      type="button"
      onClick={() => onClick(colKey)}
      className={
        "inline-flex items-center gap-1 hover:text-ink transition-colors group " +
        (width || "") + " " +
        (align === "right" ? "justify-end text-right" : "text-left")
      }
    >
      <span className={isActive ? "text-ink" : ""}>{label}</span>
      {isActive && (
        dir === "asc"
          ? <ChevronUp className="w-3 h-3 text-ink" strokeWidth={3} />
          : <ChevronDown className="w-3 h-3 text-ink" strokeWidth={3} />
      )}
    </button>
  );
}

function timeAgoShort(iso) {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// SessionsCustomizationCard — compact list of every session in the cohort
// with a quick edit link. Surfaces which sessions have overrides so the
// facilitator can spot what's been customized at a glance.
// ---------------------------------------------------------------------------
function SessionsCustomizationCard({ cohortSlug, sessions }) {
  if (!sessions || sessions.length === 0) return null;
  return (
    <section className="rounded-2xl bg-surface-card border border-soft p-5">
      <div className="flex items-end justify-between gap-3 mb-3 flex-wrap">
        <div>
          <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
            Sessions · customize for this cohort
          </div>
          <h2 className="font-heading text-[15px] font-bold text-ink">
            Override notes, materials, homework, or recording per session.
          </h2>
        </div>
        <span className="text-[11px] text-ink-muted">
          Edits apply only to this cohort.
        </span>
      </div>
      <ul className="divide-y divide-soft">
        {sessions.map((s) => {
          const belt = BELT_COLORS[s.belt] || BELT_COLORS.White;
          const hasOverride =
            !!s.customSummary ||
            (s.customMaterials && s.customMaterials.length > 0) ||
            !!s.facilitatorNotes ||
            !!s.customHomework ||
            !!s.videoUrl;
          // Lifecycle state — completed / awaiting recording / live / upcoming.
          // getSessionState already respects a manual "locked" override, so
          // when a session is force-locked it reads as LOCKED here too.
          const state = getSessionState(s);
          const stateMeta = SESSION_STATE_META[state] || null;
          // Availability — for the OTHER lock states ("unlocked" force-open,
          // or the default 3-day-before rule). Only render a lock pill when
          // the state is genuinely different from the norm.
          const lockPill =
            s.manualLockState === "locked"
              ? { label: "Locked", cls: "bg-rose-50 text-rose-700 border border-rose-200" }
              : s.manualLockState === "unlocked"
                ? { label: "Open early", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" }
                : null;
          // Date — short weekday + month + day. Falls back to a dash if the
          // session was never scheduled (shouldn't happen for real cohorts).
          const dateStr = s.date
            ? new Date(s.date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })
            : "Date TBD";
          return (
            <li key={s.order}>
              <Link
                to={`/admin/cohorts/${cohortSlug}/sessions/${s.order}/edit`}
                className="flex items-center gap-3 py-2.5 px-1 hover:bg-surface-soft rounded-lg transition-colors group"
              >
                <div
                  style={{
                    background: belt.gradient,
                    color: belt.contrast,
                    border: belt.needsBorder ? "1px solid #D1D5DB" : "none",
                  }}
                  className="w-9 h-9 rounded-lg flex items-center justify-center font-heading font-extrabold text-[12px] shrink-0"
                >
                  {s.order}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-heading text-[13.5px] font-bold text-ink truncate">
                    {s.title}
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5 inline-flex items-center gap-2 flex-wrap">
                    <CalendarIcon className="w-3 h-3" strokeWidth={2.5} />
                    <span>{dateStr}</span>
                    <span className="w-1 h-1 rounded-full bg-ink-subtle" />
                    <span>{s.belt || "—"} belt</span>
                    {/* Lifecycle status */}
                    {stateMeta && (
                      <span
                        className={
                          "inline-flex items-center gap-1 px-1.5 py-0 rounded-md text-[9.5px] font-heading font-bold uppercase border border-transparent " +
                          stateMeta.pillBg +
                          " " +
                          stateMeta.pillText
                        }
                      >
                        {stateMeta.short}
                      </span>
                    )}
                    {/* Manual lock override — only when non-default */}
                    {lockPill && (
                      <span className={"inline-flex items-center gap-1 px-1.5 py-0 rounded-md text-[9.5px] font-heading font-bold uppercase " + lockPill.cls}>
                        {lockPill.label}
                      </span>
                    )}
                    {/* Custom content indicator */}
                    {hasOverride && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0 rounded-md bg-brand-50 text-brand-700 text-[9.5px] font-heading font-bold uppercase border border-brand-100">
                        Customized
                      </span>
                    )}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11.5px] font-heading font-bold text-brand-700 group-hover:text-brand-800 shrink-0">
                  <Pencil className="w-3 h-3" strokeWidth={2.5} />
                  Edit
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
