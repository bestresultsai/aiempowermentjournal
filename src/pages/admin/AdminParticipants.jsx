import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, Search, ArrowRight, ArrowUpDown, NotebookPen, Sparkles,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useScopeFilters } from "../../lib/useScopeFilters";
import { getAllCohortsForAdmin } from "../../lib/cohortAdmin";
import ScopeFilterBar from "../../components/admin/ScopeFilterBar";
import {
  ADMIN_MOCK_PARTICIPANTS,
  getEngagementBucket,
  getParticipantJournalStat,
  totalTimeSaved,
  formatMinutes,
} from "../../lib/adminMockData";
import { MOCK_SESSIONS } from "../../lib/mockCohort";

const SORTS = {
  name:       { label: "Name (A–Z)",        compare: (a, b) => a.name.localeCompare(b.name) },
  progress:   { label: "Progress (high→low)", compare: (a, b) => (b.progress?.length || 0) - (a.progress?.length || 0) },
  hours:      { label: "Hours saved",       compare: (a, b) => totalTimeSaved(b.journalEntries || []) - totalTimeSaved(a.journalEntries || []) },
  recent:     { label: "Last journal",      compare: (a, b) => (a.lastJournalDaysAgo ?? 999) - (b.lastJournalDaysAgo ?? 999) },
};

const STATUS_FILTERS = [
  { key: null,         label: "All status" },
  { key: "champion",   label: "Champions" },
  { key: "engaged",    label: "Engaged" },
  { key: "at-risk",    label: "At risk" },
];

// A participant is "at risk" when their journal is stale (>10d) or they're
// behind on belts (<=2). Combines with engagement buckets for the filter.
function bucketForFilter(p) {
  const bucket = getEngagementBucket(p); // champion | engaged | trying | absent
  const stale = (p.lastJournalDaysAgo ?? 0) > 10;
  const behind = (p.progress?.length || 0) <= 2;
  if (stale || behind) return "at-risk";
  return bucket;
}

// /admin/users — flat directory of all participants in scope, with a
// search box and a cohort filter (All / IAHE / Mayo / UCLA — only those the
// admin can see).
export default function AdminParticipants() {
  const { user } = useAuth();
  const scope = useScopeFilters(user, getAllCohortsForAdmin());
  const { cohorts, effectiveSlugs: cohortSlugs, orgs, facilitators } = scope;

  const [q, setQ] = useState("");
  // null = "All status"; otherwise "champion" | "engaged" | "at-risk".
  const [statusFilter, setStatusFilter] = useState(null);
  // Sort key — see SORTS map above.
  const [sortKey, setSortKey] = useState("name");

  const cohortBySlug = useMemo(
    () => Object.fromEntries(getAllCohortsForAdmin().map((c) => [c.slug, c])),
    [],
  );

  const filtered = useMemo(() => {
    const lc = q.trim().toLowerCase();
    const sortFn = SORTS[sortKey]?.compare || SORTS.name.compare;
    return ADMIN_MOCK_PARTICIPANTS
      .filter((p) => cohortSlugs.includes(p.cohortSlug))
      .filter((p) => !statusFilter || bucketForFilter(p) === statusFilter)
      .filter((p) =>
        !lc ||
        p.name.toLowerCase().includes(lc) ||
        p.email.toLowerCase().includes(lc) ||
        (p.organization || "").toLowerCase().includes(lc),
      )
      .sort(sortFn);
  }, [q, cohortSlugs, statusFilter, sortKey]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <header className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
          <Users className="w-5 h-5" strokeWidth={2} />
        </div>
        <div>
          <h1 className="font-heading text-[24px] lg:text-[28px] font-extrabold text-ink leading-tight">
            Participants
          </h1>
          <p className="text-[13px] text-ink-muted">
            {filtered.length} {filtered.length === 1 ? "person" : "people"} in your current scope.
          </p>
        </div>
      </header>

      {/* Scope filter — Org × Cohort × Facilitator */}
      <ScopeFilterBar
        cohorts={cohorts}
        orgs={orgs}
        facilitators={facilitators}
        orgFilter={scope.orgFilter}
        cohortFilter={scope.cohortFilter}
        facilitatorFilter={scope.facilitatorFilter}
        setOrgFilter={scope.setOrgFilter}
        setCohortFilter={scope.setCohortFilter}
        setFacilitatorFilter={scope.setFacilitatorFilter}
      />

      {/* Status filter + sort */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <FilterChip
              key={s.label}
              active={statusFilter === s.key}
              onClick={() => setStatusFilter(s.key)}
              label={s.label}
            />
          ))}
        </div>
        <div className="ml-auto inline-flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-ink-muted" strokeWidth={2.25} />
          <label className="text-[12px] text-ink-muted font-heading">Sort:</label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-soft bg-surface-card text-[12.5px] font-heading font-semibold text-ink focus:outline-none focus:border-brand-500"
          >
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle pointer-events-none" strokeWidth={2} />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, email, or organization…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body placeholder:text-ink-subtle focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
        />
      </div>

      <div className="rounded-2xl bg-surface-card border border-soft overflow-hidden">
        {filtered.map((p) => {
          const cohort = cohortBySlug[p.cohortSlug];
          const pct = Math.round(((p.progress?.length || 0) / MOCK_SESSIONS.length) * 100);
          const { entriesCount, minutesSaved } = getParticipantJournalStat(p);
          const bucket = bucketForFilter(p);
          return (
            <Link
              key={p.id}
              to={`/admin/users/${p.id}`}
              className="group flex items-center gap-3 px-5 py-3.5 hover:bg-surface-soft transition-colors border-b border-soft last:border-b-0"
            >
              <div className="w-10 h-10 rounded-full bg-brand-700 text-white flex items-center justify-center text-[12px] font-heading font-bold shrink-0">
                {p.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-heading text-[14px] font-bold text-ink truncate group-hover:text-brand-700 transition-colors">
                    {p.name}
                  </div>
                  <StatusPill bucket={bucket} />
                </div>
                <div className="text-[11.5px] text-ink-muted truncate mt-0.5">
                  {p.email} · {p.organization}
                </div>
              </div>
              {/* Journal stats — entries + hours saved */}
              <div className="hidden md:flex flex-col items-end shrink-0">
                <div className="inline-flex items-center gap-1.5 text-[12px] font-heading font-bold text-ink">
                  <NotebookPen className="w-3.5 h-3.5 text-ink-muted" strokeWidth={2.25} />
                  {entriesCount}
                </div>
                {minutesSaved > 0 && (
                  <div className="inline-flex items-center gap-1 text-[11px] font-heading font-semibold text-emerald-700 mt-0.5">
                    <Sparkles className="w-3 h-3" strokeWidth={3} />
                    {formatMinutes(minutesSaved)} saved
                  </div>
                )}
              </div>
              {/* Cohort + progress */}
              <div className="hidden sm:block text-right shrink-0">
                <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
                  {cohort?.organization?.shortName || "Cohort"}
                </div>
                <div className="text-[12.5px] font-heading font-semibold text-ink mt-0.5">
                  {pct}%
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-ink-subtle shrink-0 group-hover:text-brand-600 transition-colors" strokeWidth={2.5} />
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-8 text-center text-[13px] text-ink-muted">
            {q
              ? <>No participants match "{q}".</>
              : "No participants in this cohort."}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center px-3 py-1.5 rounded-full text-[12.5px] font-heading font-semibold transition-all duration-200 " +
        (active
          ? "bg-ink text-white"
          : "bg-surface-card border border-soft text-ink-muted hover:text-ink hover:border-brand-500")
      }
    >
      {label}
    </button>
  );
}

function StatusPill({ bucket }) {
  const cfg = {
    "at-risk":  { label: "At risk",   cls: "bg-amber-100 text-amber-800" },
    champion:   { label: "Champion",  cls: "bg-emerald-100 text-emerald-800" },
    engaged:    { label: "Engaged",   cls: "bg-blue-100 text-blue-800" },
    trying:     { label: "Trying",    cls: "bg-violet-100 text-violet-800" },
    absent:     { label: "Absent",    cls: "bg-ink/5 text-ink-muted" },
  }[bucket];
  if (!cfg) return null;
  return (
    <span className={
      "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-heading font-bold uppercase tracking-wider shrink-0 " +
      cfg.cls
    }>
      {cfg.label}
    </span>
  );
}

