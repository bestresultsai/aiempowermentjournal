import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, Search, ArrowRight, ArrowUpDown, NotebookPen, Sparkles, Plus,
  Check, X, GraduationCap, Crown, BookCheck, Clock, AlertTriangle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useScopeFilters } from "../../lib/useScopeFilters";
import { canAccessAdmin, hasGlobalScope } from "../../lib/adminRoles";
import { getAllCohortsForAdmin } from "../../lib/cohortAdmin";
import ScopeFilterBar from "../../components/admin/ScopeFilterBar";
import Select from "../../components/Select";
import {
  ADMIN_MOCK_PARTICIPANTS,
  getEngagementBucket,
  getParticipantJournalStat,
  getParticipantCurrentSession,
  getParticipantHomeworkStats,
  assignParticipantsToCohort,
  totalTimeSaved,
  formatMinutes,
} from "../../lib/adminMockData";
import { MOCK_SESSIONS, BELT_COLORS } from "../../lib/mockCohort";
import { getProgramByCode } from "../../lib/programs";

const SORTS = {
  name:       { label: "Name (A–Z)",        compare: (a, b) => a.name.localeCompare(b.name) },
  progress:   { label: "Progress (high→low)", compare: (a, b) => (b.progress?.length || 0) - (a.progress?.length || 0) },
  hours:      { label: "Hours saved",       compare: (a, b) => totalTimeSaved(b.journalEntries || []) - totalTimeSaved(a.journalEntries || []) },
  recent:     { label: "Last journal",      compare: (a, b) => (a.lastJournalDaysAgo ?? 999) - (b.lastJournalDaysAgo ?? 999) },
};

const STATUS_FILTERS = [
  { key: null,         label: "All status" },
  { key: "at-risk",    label: "At risk" },
  { key: "champion",   label: "Journal Champions" },
  { key: "engaged",    label: "Journal Active" },
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
  // Bulk selection — set of participant ids checked.
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [assigning, setAssigning] = useState(false);
  // Bumps to force re-derive after a bulk assign.
  const [version, setVersion] = useState(0);

  const cohortBySlug = useMemo(
    () => Object.fromEntries(getAllCohortsForAdmin().map((c) => [c.slug, c])),
    [],
  );

  const filtered = useMemo(() => {
    const lc = q.trim().toLowerCase();
    const sortFn = SORTS[sortKey]?.compare || SORTS.name.compare;
    const globalScope = hasGlobalScope(user);
    return ADMIN_MOCK_PARTICIPANTS
      // Unassigned participants (cohortSlug=null) are visible only to roles
      // with global scope (super + admin). Org admins + facilitators must
      // see a cohort-scoped slug, otherwise they could surface admins-only
      // standalone users.
      .filter((p) =>
        p.cohortSlug
          ? cohortSlugs.includes(p.cohortSlug)
          : globalScope,
      )
      .filter((p) => !statusFilter || bucketForFilter(p) === statusFilter)
      .filter((p) =>
        !lc ||
        p.name.toLowerCase().includes(lc) ||
        p.email.toLowerCase().includes(lc) ||
        (p.organization || "").toLowerCase().includes(lc),
      )
      .sort(sortFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, cohortSlugs, statusFilter, sortKey, version, user]);

  function toggleSelected(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function clearSelection() { setSelectedIds(new Set()); }
  async function handleBulkAssign(targetSlug) {
    setAssigning(true);
    await new Promise((r) => setTimeout(r, 300));
    const slug = targetSlug === "__unassigned__" ? null : (targetSlug || null);
    assignParticipantsToCohort([...selectedIds], slug);
    setVersion((v) => v + 1);
    setSelectedIds(new Set());
    setAssigning(false);
  }

  const accessibleCohorts = scope.cohorts;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <header className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
          <Users className="w-5 h-5" strokeWidth={2} />
        </div>
        <div className="flex-1">
          <h1 className="font-heading text-[24px] lg:text-[28px] font-extrabold text-ink leading-tight">
            Participants
          </h1>
          <p className="text-[13px] text-ink-muted">
            {filtered.length} {filtered.length === 1 ? "person" : "people"} in your current scope.
          </p>
        </div>
        {canAccessAdmin(user) && (
          <Link
            to="/admin/participants/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600 text-white text-[12.5px] font-heading font-semibold hover:bg-brand-700 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            New participant
          </Link>
        )}
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
          <div className="w-44">
            <Select
              value={sortKey}
              onChange={setSortKey}
              options={Object.entries(SORTS).map(([key, s]) => ({
                value: key,
                label: s.label,
              }))}
            />
          </div>
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

      {/* Bulk action bar — shows when 1+ rows selected */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          cohorts={accessibleCohorts}
          assigning={assigning}
          onAssign={handleBulkAssign}
          onClear={clearSelection}
        />
      )}

      <div className="rounded-2xl bg-surface-card border border-soft overflow-hidden">
        {filtered.map((p) => {
          const bucket = bucketForFilter(p); // "at-risk" override applied here
          const checked = selectedIds.has(p.id);
          return (
            <div
              key={p.id}
              className={
                "group flex items-center gap-3 px-5 py-3.5 transition-colors border-b border-soft last:border-b-0 " +
                (checked ? "bg-brand-50/40" : "hover:bg-surface-soft")
              }
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleSelected(p.id)}
                aria-label={`Select ${p.name}`}
                className="w-4 h-4 rounded border-soft text-brand-600 focus:ring-brand-500 cursor-pointer shrink-0"
              />
              <Link
                to={`/admin/participants/${p.id}`}
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                <div className="w-10 h-10 rounded-full bg-brand-700 text-white flex items-center justify-center text-[12px] font-heading font-bold shrink-0">
                  {p.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                </div>

                {/* Identity */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="font-heading text-[14px] font-bold text-ink truncate group-hover:text-brand-700 transition-colors">
                      {p.name}
                    </div>
                    {p.isCohortLead && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-heading font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                        <Crown className="w-2.5 h-2.5" strokeWidth={3} />
                        Leader
                      </span>
                    )}
                    {bucket === "at-risk" && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-heading font-bold uppercase tracking-wider bg-red-50 text-red-700">
                        <AlertTriangle className="w-2.5 h-2.5" strokeWidth={3} />
                        At risk
                      </span>
                    )}
                  </div>
                  <div className="text-[11.5px] text-ink-muted truncate mt-0.5">
                    {p.email}{p.organization ? ` · ${p.organization}` : ""}
                  </div>
                </div>

                {/* Three metric blocks — distinct color per dimension so engagement
                    reads as journal-only, not cohort progression. */}
                <ParticipantMetrics participant={p} cohort={cohortBySlug[p.cohortSlug]} />

                <ArrowRight className="w-4 h-4 text-ink-subtle shrink-0 group-hover:text-brand-600 transition-colors" strokeWidth={2.5} />
              </Link>
            </div>
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

function BulkActionBar({ count, cohorts, assigning, onAssign, onClear }) {
  const [targetSlug, setTargetSlug] = useState("");
  function handle() {
    if (assigning) return;
    onAssign(targetSlug);
    setTargetSlug("");
  }
  return (
    <div className="rounded-2xl bg-ink text-white p-3 flex items-center gap-3 flex-wrap shadow-lift">
      <div className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-white/10">
        <Check className="w-3.5 h-3.5" strokeWidth={3} />
        <span className="text-[12.5px] font-heading font-bold">
          {count} selected
        </span>
      </div>
      <div className="flex items-center gap-2">
        <GraduationCap className="w-3.5 h-3.5 text-white/70" strokeWidth={2.25} />
        <div className="w-56">
          <Select
            value={targetSlug}
            onChange={setTargetSlug}
            placeholder="Pick a cohort…"
            options={[
              { value: "__unassigned__", label: "Remove from cohort" },
              ...cohorts.map((c) => ({ value: c.slug, label: c.name })),
            ]}
            className="!bg-white/10 !border-white/15 !text-white hover:!border-white/30"
          />
        </div>
        <button
          type="button"
          onClick={() => handle()}
          disabled={!targetSlug || assigning}
          className={
            "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12.5px] font-heading font-bold transition-colors " +
            (!targetSlug || assigning
              ? "bg-white/10 text-white/40 cursor-not-allowed"
              : "bg-emerald-500 text-white hover:bg-emerald-400")
          }
        >
          {assigning ? "Assigning…" : "Assign"}
        </button>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded text-[12px] font-heading font-semibold text-white/70 hover:text-white"
      >
        <X className="w-3 h-3" strokeWidth={2.5} />
        Clear
      </button>
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

// ---------------------------------------------------------------------------
// ParticipantMetrics — three distinct columns visualizing different signals.
// Cohort (brand) | Homework (amber) | Journal (emerald). The intent is that
// a glance shows three dimensions: where they are in the program, whether
// the facilitator owes them feedback, and how journal-active they are.
// ---------------------------------------------------------------------------
function ParticipantMetrics({ participant, cohort }) {
  const p = participant;
  const cur = getParticipantCurrentSession(p);
  const hw = getParticipantHomeworkStats(p);
  const journal = getParticipantJournalStat(p);
  const bucket = getEngagementBucket(p);
  const belt = cur ? BELT_COLORS[cur.belt] : null;
  // Pull the cohort's program for correct denominators on multi-program plats.
  const program = cohort?.programCode ? getProgramByCode(cohort.programCode) : null;
  const cohortSessionCount = program?.sessionsCount || MOCK_SESSIONS.length;

  // Journal labels are emerald + reference "Journal" explicitly so they
  // never read as cohort progression.
  const journalLabel = {
    champion: "Champion",
    engaged:  "Active",
    trying:   "Starter",
    absent:   "Silent",
  }[bucket] || "—";

  return (
    <div className="hidden md:flex items-stretch gap-1.5 shrink-0">
      {/* Cohort block */}
      <MetricBlock
        accent="brand"
        icon={GraduationCap}
        label="Cohort"
        value={
          p.cohortSlug
            ? cur
              ? <span className="inline-flex items-center gap-1">
                  <span
                    style={{
                      background: belt?.gradient,
                      color: belt?.contrast,
                      border: belt?.needsBorder ? "1px solid #D1D5DB" : "none",
                    }}
                    className="inline-block w-2.5 h-2.5 rounded-sm"
                  />
                  Sess {cur.order}
                </span>
              : "Complete"
            : "—"
        }
        sub={p.cohortSlug ? (cur?.belt || "Done") : "No cohort"}
      />

      {/* Homework block */}
      <MetricBlock
        accent={hw.pending > 0 ? "amber" : "muted"}
        icon={BookCheck}
        label="Homework"
        value={`${hw.submitted}/${cohortSessionCount}`}
        sub={
          hw.pending > 0
            ? `${hw.pending} pending review`
            : hw.reviewed > 0 ? "All reviewed" : "None submitted"
        }
      />

      {/* Journal block */}
      <MetricBlock
        accent="emerald"
        icon={NotebookPen}
        label="Journal"
        value={journalLabel}
        sub={
          journal.entriesCount > 0
            ? `${journal.entriesCount} entries · ${formatMinutes(journal.minutesSaved)}`
            : "No entries"
        }
      />
    </div>
  );
}

function MetricBlock({ accent, icon: Icon, label, value, sub }) {
  const cls = {
    brand:   "bg-brand-50/60 text-brand-700",
    amber:   "bg-amber-50 text-amber-800",
    emerald: "bg-emerald-50/70 text-emerald-800",
    muted:   "bg-ink/5 text-ink-muted",
  }[accent] || "bg-ink/5 text-ink-muted";
  return (
    <div className={"rounded-lg px-2.5 py-1.5 min-w-[120px] " + cls}>
      <div className="inline-flex items-center gap-1 text-[9.5px] font-heading font-bold uppercase tracking-wider opacity-80">
        <Icon className="w-2.5 h-2.5" strokeWidth={2.5} />
        {label}
      </div>
      <div className="font-heading font-bold text-[12.5px] leading-tight mt-0.5 whitespace-nowrap">
        {value}
      </div>
      {sub && <div className="text-[10.5px] opacity-70 truncate mt-0.5">{sub}</div>}
    </div>
  );
}

