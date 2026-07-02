import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  NotebookPen,
  Clock,
  Users,
  Trophy,
  ArrowRight,
} from "lucide-react";
import NavBar from "../../components/NavBar";
import Modal from "../../components/admin/Modal";
import JournalEntryDetail from "../../components/admin/JournalEntryDetail";
import { useAuth } from "../../context/AuthContext";
import { getAccessibleCohorts } from "../../lib/adminRoles";
import {
  getAllCohortsForAdmin,
  useCohortVersion,
} from "../../lib/cohortAdmin";
import { getCohortJournalStats, getRecentEntriesInScope, getScopeJournalStats, getProductionMethodMix, getParticipantById, formatMinutes, useParticipantVersion } from "../../lib/adminMockData";

// ---------------------------------------------------------------------------
// /facilitator/journal — the facilitator's read of journal activity across
// their cohorts.
//
// Lighter than /admin/journal (no global filters, no admin actions). Focused
// on "what's my portfolio's journal pulse?" — hours saved, entries pace,
// production-method mix, by-cohort breakdown, recent entries to click into.
// ---------------------------------------------------------------------------

export default function FacilitatorJournal() {
  // Subscribe to activity + cohort mutations so this page re-renders
  // when hydrateActivityFromSupabase or cohort mirrors emit. Without
  // this the initial render captures the pre-hydrate empty snapshot
  // (0 journal entries, 0 homework, etc.) and never refreshes.
  useParticipantVersion();
  useCohortVersion();

  const { user } = useAuth();
  const version = useCohortVersion();

  const cohorts = useMemo(
    () => getAccessibleCohorts(user, getAllCohortsForAdmin()),
    [user, version],
  );
  const cohortSlugs = useMemo(() => cohorts.map((c) => c.slug), [cohorts]);

  const stats = useMemo(
    () => getScopeJournalStats(cohortSlugs),
    [cohortSlugs, version],
  );
  const productionMix = useMemo(
    () => getProductionMethodMix(cohortSlugs),
    [cohortSlugs, version],
  );
  const recent = useMemo(
    () => getRecentEntriesInScope(cohortSlugs, 12),
    [cohortSlugs, version],
  );

  // Modal state for click-to-view on a recent entry.
  const [openEntry, setOpenEntry] = useState(null);
  const openParticipant = openEntry
    ? getParticipantById(openEntry.participantId)
    : null;

  return (
    <div className="min-h-screen bg-surface-paper">
      <NavBar />
      <main className="max-w-[1180px] mx-auto px-6 lg:px-8 py-8 lg:py-12 space-y-8">
        {/* Header */}
        <header className="space-y-1.5 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <NotebookPen className="w-5 h-5" strokeWidth={2.25} />
            </div>
            <div className="h-eyebrow text-emerald-700">
              Facilitator · Journal
            </div>
          </div>
          <h1 className="font-heading text-[32px] lg:text-[36px] font-extrabold tracking-tight text-ink leading-tight">
            Your cohorts' impact.
          </h1>
          <p className="text-[14.5px] text-ink-muted mt-2 max-w-2xl leading-relaxed">
            Every win participants log adds up. Track hours saved, what they're
            building, and who's contributing — across every cohort you facilitate.
          </p>
        </header>

        {cohorts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-soft p-10 text-center animate-fade-in-up">
            <div className="text-[14px] text-ink-muted">
              No cohorts assigned to you yet.
            </div>
            <div className="text-[12.5px] text-ink-muted mt-1">
              Reach out to an admin if you expected one.
            </div>
          </div>
        ) : (
          <>
            {/* KPI tiles */}
            <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in-up">
              <KpiTile
                icon={<Clock className="w-5 h-5" strokeWidth={2.25} />}
                tone="emerald"
                label="Hours saved"
                value={formatMinutes(stats.totalMinutes || 0)}
                sublabel={`Across ${cohorts.length} cohort${cohorts.length === 1 ? "" : "s"}`}
              />
              <KpiTile
                icon={<NotebookPen className="w-5 h-5" strokeWidth={2.25} />}
                tone="brand"
                label="Journal entries"
                value={stats.entryCount || 0}
                sublabel="Total logged"
              />
              <KpiTile
                icon={<Users className="w-5 h-5" strokeWidth={2.25} />}
                tone="amber"
                label="Active contributors"
                value={stats.contributorCount || 0}
                sublabel="Participants who've logged"
              />
              <KpiTile
                icon={<Trophy className="w-5 h-5" strokeWidth={2.25} />}
                tone="rose"
                label="Avg / participant"
                value={
                  stats.contributorCount
                    ? formatMinutes(
                        Math.round(stats.totalMinutes / stats.contributorCount),
                      )
                    : "—"
                }
                sublabel="Per active contributor"
              />
            </section>

            {/* By-cohort breakdown */}
            <section className="rounded-2xl bg-surface-card border border-soft p-5 lg:p-6 animate-fade-in-up">
              <div className="flex items-end justify-between gap-3 mb-4 flex-wrap">
                <div>
                  <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
                    By cohort
                  </div>
                  <h2 className="font-heading text-[18px] font-extrabold text-ink mt-0.5">
                    Where the wins are coming from
                  </h2>
                </div>
                <Link
                  to="/admin/journal"
                  className="text-[12.5px] font-heading font-semibold text-brand-700 hover:text-brand-800 inline-flex items-center gap-1"
                >
                  Open full dashboard
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted border-b border-soft">
                      <th className="py-2 pr-4">Cohort</th>
                      <th className="py-2 pr-4 text-right">Entries</th>
                      <th className="py-2 pr-4 text-right">Hours saved</th>
                      <th className="py-2 pr-4 text-right">Contributors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cohorts.map((c) => {
                      const s = getCohortJournalStats(c.slug);
                      return (
                        <tr
                          key={c.slug}
                          className="border-b border-soft last:border-0 hover:bg-surface-soft"
                        >
                          <td className="py-2.5 pr-4">
                            <Link
                              to={`/admin/cohorts/${c.slug}`}
                              className="font-heading font-semibold text-ink hover:text-brand-700"
                            >
                              {c.name}
                            </Link>
                            <div className="text-[11px] text-ink-muted">
                              {c.organization?.shortName || ""}
                            </div>
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">
                            {s.entryCount || 0}
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">
                            {formatMinutes(s.totalMinutes || 0)}
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">
                            {s.contributorCount || 0}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Production method mix + Recent entries */}
            <section className="grid lg:grid-cols-3 gap-4 animate-fade-in-up">
              <ProductionMixCard mix={productionMix} />
              <RecentEntriesCard
                recent={recent}
                onOpen={(e) => setOpenEntry(e)}
                cohorts={cohorts}
              />
            </section>
          </>
        )}
      </main>

      {/* Click-to-view modal */}
      {openEntry && (
        <Modal onClose={() => setOpenEntry(null)} maxWidth="max-w-2xl">
          <JournalEntryDetail
            entry={openEntry}
            participant={openParticipant}
            onClose={() => setOpenEntry(null)}
          />
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// KpiTile — single stat box. Tone selects an accent color.
// ---------------------------------------------------------------------------
function KpiTile({ icon, tone, label, value, sublabel }) {
  const toneClass = {
    emerald: "bg-emerald-50 text-emerald-700",
    brand: "bg-brand-50 text-brand-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
  }[tone];
  return (
    <div className="rounded-2xl bg-surface-card border border-soft p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${toneClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
          {label}
        </div>
        <div className="font-heading text-[20px] font-extrabold text-ink leading-none mt-1 tabular-nums">
          {value}
        </div>
        <div className="text-[11.5px] text-ink-muted mt-1 truncate">
          {sublabel}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compact production-method breakdown. Bars sized by share.
// ---------------------------------------------------------------------------
function ProductionMixCard({ mix }) {
  const total = mix.slices.reduce((s, x) => s + x.count, 0);
  return (
    <div className="rounded-2xl bg-surface-card border border-soft p-5">
      <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
        Production method
      </div>
      <div className="font-heading text-[16px] font-extrabold text-ink mt-0.5 mb-3">
        What participants are shipping
      </div>
      {total === 0 ? (
        <div className="text-[12.5px] text-ink-muted">
          No entries yet — nothing to slice.
        </div>
      ) : (
        <div className="space-y-2.5">
          {mix.slices.map((slice) => {
            const pct = total > 0 ? Math.round((slice.count / total) * 100) : 0;
            return (
              <div key={slice.key}>
                <div className="flex items-center justify-between text-[12px] mb-0.5">
                  <span className="font-heading font-semibold text-ink">
                    {slice.label}
                  </span>
                  <span className="text-ink-muted tabular-nums">
                    {slice.count} · {pct}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-ink/10 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent entries panel — last N entries across the facilitator's cohorts.
// ---------------------------------------------------------------------------
function RecentEntriesCard({ recent, onOpen, cohorts }) {
  const cohortBySlug = Object.fromEntries(cohorts.map((c) => [c.slug, c]));
  return (
    <div className="rounded-2xl bg-surface-card border border-soft p-5 lg:col-span-2">
      <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
        Recent entries
      </div>
      <div className="font-heading text-[16px] font-extrabold text-ink mt-0.5 mb-3">
        Fresh wins across your cohorts
      </div>
      {recent.length === 0 ? (
        <div className="text-[12.5px] text-ink-muted">
          Nothing logged yet. The first entry is always the hardest.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {recent.map((e) => {
            const cohort = cohortBySlug[e.cohortSlug];
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => onOpen(e)}
                  className="w-full text-left flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-surface-soft transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-heading font-semibold text-[13px] text-ink truncate">
                      {e.title || e.summary?.slice(0, 80) || "Untitled win"}
                    </div>
                    <div className="text-[11.5px] text-ink-muted mt-0.5 inline-flex items-center gap-2 flex-wrap">
                      <span className="truncate">
                        {e.participantName || e.participantEmail}
                      </span>
                      {cohort && (
                        <span className="opacity-70">
                          · {cohort.organization?.shortName || cohort.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-ink-muted tabular-nums shrink-0 mt-0.5">
                    {formatMinutes(e.minutesSaved || 0)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
