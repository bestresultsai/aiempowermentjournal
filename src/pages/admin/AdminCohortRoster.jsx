import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowLeft, GraduationCap, BookCheck, NotebookPen, Sparkles, Clock, Users,
  ChevronUp, ChevronDown, Download, Target, Pencil, UserPlus,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getAccessibleCohorts, canEditCohort } from "../../lib/adminRoles";
import { MOCK_SESSIONS, BELT_COLORS } from "../../lib/mockCohort";
import {
  getParticipantsForCohort, getCohortJournalStats,
  totalTimeSaved, formatMinutes,
} from "../../lib/adminMockData";
import { getAllCohortsForAdmin } from "../../lib/cohortAdmin";
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
  const rosterRaw = cohort ? getParticipantsForCohort(slug) : [];
  const totalSessions = MOCK_SESSIONS.length;
  const journal = cohort ? getCohortJournalStats(slug) : { totalEntries: 0, totalMinutesSaved: 0 };

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
              to={`/admin/users/${p.id}`}
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

              {/* Belt-progress pips */}
              <div className="w-full md:w-48 flex items-center justify-start md:justify-center gap-1">
                {MOCK_SESSIONS.map((s) => {
                  const done = p.progress?.includes(s.order);
                  const belt = BELT_COLORS[s.belt];
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
