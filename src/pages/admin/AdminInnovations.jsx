import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Lightbulb, Sparkles, Clock, Building2, GraduationCap, Download, ArrowUpDown,
} from "lucide-react";
import Modal from "../../components/admin/Modal";
import JournalEntryDetail from "../../components/admin/JournalEntryDetail";
import SegmentedControl from "../../components/admin/SegmentedControl";
import ScopeFilterBar from "../../components/admin/ScopeFilterBar";
import { useAuth } from "../../context/AuthContext";
import { useScopeFilters } from "../../lib/useScopeFilters";
import { getAllCohortsForAdmin, useCohortVersion } from "../../lib/cohortAdmin";
import { getInnovationsInScope, getParticipantById, DATE_RANGES, getSinceMs, formatMinutes, useParticipantVersion } from "../../lib/adminMockData";
import { downloadCSV } from "../../lib/csvExport";

// ---------------------------------------------------------------------------
// /admin/innovations — every cohort innovation, surfaced.
//
// Innovations are journal entries the participant tagged with an
// `innovationTitle` and `innovationDescription`. They represent the
// highest-leverage work — wins worth telling stakeholders about. This page
// gathers them all, ranks them, and gives the admin one place to:
//
//   - Skim for talking points before a leadership readout
//   - Spot patterns (which orgs are shipping breakthroughs?)
//   - Pull case-study material straight from the source
//
// Inherits the same scope filters as the rest of the admin journal stack
// (org / cohort / facilitator). Adds its own sort + time-range controls.
// ---------------------------------------------------------------------------

const SORT_OPTIONS = [
  { key: "saved", label: "Hours saved" },
  { key: "date",  label: "Most recent" },
];

export default function AdminInnovations() {
  // Subscribe to activity + cohort mutations so this page re-renders
  // when hydrateActivityFromSupabase or cohort mirrors emit. Without
  // this the initial render captures the pre-hydrate empty snapshot
  // (0 journal entries, 0 homework, etc.) and never refreshes.
  useParticipantVersion();
  useCohortVersion();

  const { user } = useAuth();
  const scope = useScopeFilters(user, getAllCohortsForAdmin());
  const { cohorts, effectiveCohorts, effectiveSlugs: cohortSlugs, orgs, facilitators } = scope;

  const [range, setRange] = useState("all");
  const [sort, setSort] = useState("saved");
  const [openEntry, setOpenEntry] = useState(null);
  const openParticipant = openEntry ? getParticipantById(openEntry.participantId) : null;

  const sinceMs = getSinceMs(range);
  const rangeLabel = DATE_RANGES.find((r) => r.key === range)?.label || "All time";

  const innovations = useMemo(
    () => getInnovationsInScope(cohortSlugs, sinceMs, sort),
    [cohortSlugs, sinceMs, sort],
  );

  // KPIs above the grid.
  const totalSaved = innovations.reduce((s, e) => s + (e.saved || 0), 0);
  const uniqueParticipants = new Set(innovations.map((e) => e.participantId)).size;
  const cohortBySlug = useMemo(
    () => Object.fromEntries(getAllCohortsForAdmin().map((c) => [c.slug, c])),
    [],
  );

  function handleExportCSV() {
    const header = [
      "Date", "Innovation", "Description", "Hours saved", "Participant",
      "Email", "Organization", "Cohort",
    ];
    const rows = innovations.map((e) => [
      new Date(e.date).toISOString().slice(0, 10),
      e.innovationTitle,
      e.innovationDescription || "",
      (e.saved / 60).toFixed(1),
      e.participantName,
      e.participantEmail,
      e.organization || cohortBySlug[e.cohortSlug]?.organization?.name || "",
      cohortBySlug[e.cohortSlug]?.name || e.cohortSlug,
    ]);
    downloadCSV(`innovations-${range}.csv`, [header, ...rows]);
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <header className="flex items-start gap-3 flex-wrap">
        <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
          <Lightbulb className="w-5 h-5" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-eyebrow">Admin · Innovations</div>
          <h1 className="font-heading text-[28px] lg:text-[34px] font-extrabold tracking-tight text-ink leading-tight">
            Cohort innovations
          </h1>
          <p className="text-[14px] text-ink-muted mt-1.5 max-w-2xl">
            {rangeLabel} · {effectiveCohorts.length} of {cohorts.length}{" "}
            {cohorts.length === 1 ? "cohort" : "cohorts"}. The biggest, most
            quotable wins your participants logged. Pull straight from here
            for leadership readouts and case studies.
          </p>
        </div>
        {innovations.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-soft text-[12.5px] font-heading font-semibold text-ink hover:bg-surface-soft hover:border-brand-500 transition-all duration-200 shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-brand-600" strokeWidth={2.5} />
            Export CSV
          </button>
        )}
      </header>

      {/* Filter toolbar — Time + sort + universal scope chips. */}
      <div className="flex items-center gap-3 flex-wrap">
        <SegmentedControl
          options={DATE_RANGES.map((r) => ({ key: r.key, label: r.label }))}
          value={range}
          onChange={setRange}
        />
        <SegmentedControl
          options={SORT_OPTIONS}
          value={sort}
          onChange={setSort}
        />
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
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard
          icon={Lightbulb}
          label="Innovations"
          value={innovations.length}
          accent="bg-amber-50 text-amber-700"
        />
        <KpiCard
          icon={Clock}
          label="Hours saved · across all"
          value={Math.round(totalSaved / 60)}
          sub={formatMinutes(totalSaved)}
          accent="bg-emerald-50 text-emerald-700"
        />
        <KpiCard
          icon={Sparkles}
          label="Innovators"
          value={uniqueParticipants}
          sub={`${uniqueParticipants === 1 ? "person" : "people"} contributed`}
          accent="bg-violet-50 text-violet-700"
        />
      </div>

      {/* Grid */}
      {innovations.length === 0 ? (
        <EmptyState rangeLabel={rangeLabel} />
      ) : (
        <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {innovations.map((e, i) => (
            <InnovationCard
              key={`${e.participantId}-${e.id || i}`}
              entry={e}
              cohort={cohortBySlug[e.cohortSlug]}
              rank={sort === "saved" ? i + 1 : null}
              onOpen={() => setOpenEntry(e)}
            />
          ))}
        </section>
      )}

      {/* Modal */}
      <Modal open={!!openEntry} onClose={() => setOpenEntry(null)}>
        {openEntry && (
          <JournalEntryDetail
            entry={openEntry}
            participant={openParticipant}
            onClose={() => setOpenEntry(null)}
          />
        )}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bits.
// ---------------------------------------------------------------------------
function InnovationCard({ entry, cohort, rank, onOpen }) {
  const orgName =
    entry.organization || cohort?.organization?.name || cohort?.organization?.shortName || "—";
  const cohortName = cohort?.name || entry.cohortSlug;
  const date = entry.date
    ? new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group text-left rounded-2xl bg-gradient-to-br from-amber-50 to-surface-card border border-amber-100 hover:border-amber-300 hover:shadow-lift transition-all duration-200 p-5 flex flex-col"
    >
      <div className="flex items-center gap-2 mb-3">
        {rank != null && (
          <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-heading font-extrabold text-[11.5px]">
            {rank}
          </div>
        )}
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-heading font-bold">
          <Clock className="w-3 h-3" strokeWidth={3} />
          {formatMinutes(entry.saved)} saved
        </div>
        <span className="text-[11px] text-ink-muted ml-auto">{date}</span>
      </div>

      <h3 className="font-heading font-extrabold text-ink text-[15px] leading-snug">
        {entry.innovationTitle}
      </h3>
      <p className="text-[12.5px] text-ink-muted leading-relaxed mt-1.5 line-clamp-3 flex-1">
        {entry.innovationDescription || entry.description || "No description provided."}
      </p>

      <div className="mt-3 pt-3 border-t border-amber-100/60 flex items-center gap-3 text-[11.5px] text-ink-muted">
        <span className="inline-flex items-center gap-1 truncate">
          <Sparkles className="w-3 h-3 text-amber-600" strokeWidth={3} />
          <span className="font-heading font-semibold text-ink truncate">{entry.participantName}</span>
        </span>
        <span className="inline-flex items-center gap-1 truncate">
          <Building2 className="w-3 h-3" strokeWidth={2.5} />
          <span className="truncate">{orgName}</span>
        </span>
        <span className="inline-flex items-center gap-1 truncate ml-auto">
          <GraduationCap className="w-3 h-3" strokeWidth={2.5} />
          <span className="truncate">{cohortName}</span>
        </span>
      </div>
    </button>
  );
}

function KpiCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="rounded-2xl bg-surface-card border border-soft p-5">
      <div className="flex items-center gap-2 mb-2">
        <div className={"w-8 h-8 rounded-lg flex items-center justify-center " + accent}>
          <Icon className="w-4 h-4" strokeWidth={2.5} />
        </div>
        <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
          {label}
        </div>
      </div>
      <div className="font-heading text-[26px] font-extrabold text-ink leading-none">{value}</div>
      {sub && <div className="text-[11.5px] text-ink-muted mt-1">{sub}</div>}
    </div>
  );
}

function EmptyState({ rangeLabel }) {
  return (
    <div className="rounded-2xl border border-dashed border-soft bg-surface-card p-10 text-center">
      <div className="inline-flex w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 items-center justify-center mb-3">
        <Lightbulb className="w-6 h-6" strokeWidth={2} />
      </div>
      <h2 className="font-heading text-[18px] font-extrabold text-ink mb-1">
        No innovations tagged for {rangeLabel.toLowerCase()}.
      </h2>
      <p className="text-[13px] text-ink-muted max-w-md mx-auto">
        Participants flag innovations by filling the "Innovation" fields on a journal
        entry. Widen the time range, or nudge your facilitators to ask the question.
      </p>
      <Link
        to="/admin/journal"
        className="inline-flex items-center gap-1.5 mt-4 px-3 py-2 rounded-xl bg-ink text-white text-[12.5px] font-heading font-bold hover:bg-ink/90"
      >
        <ArrowUpDown className="w-3.5 h-3.5" strokeWidth={2.5} />
        Open the journal dashboard
      </Link>
    </div>
  );
}
