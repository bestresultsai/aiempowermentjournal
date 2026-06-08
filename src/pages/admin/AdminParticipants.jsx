import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Search, ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getAccessibleCohorts, getAccessibleCohortSlugs } from "../../lib/adminRoles";
import { DEMO_COHORTS } from "../../lib/demoData";
import { ADMIN_MOCK_PARTICIPANTS } from "../../lib/adminMockData";
import { MOCK_SESSIONS } from "../../lib/mockCohort";

// /admin/users — flat directory of all participants in scope, with a
// search box and a cohort filter (All / IAHE / Mayo / UCLA — only those the
// admin can see).
export default function AdminParticipants() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  // null = "All cohorts"; otherwise a specific cohort slug.
  const [cohortFilter, setCohortFilter] = useState(null);
  const allowedSlugs = getAccessibleCohortSlugs(user, DEMO_COHORTS);
  const accessibleCohorts = getAccessibleCohorts(user, DEMO_COHORTS);

  const cohortBySlug = useMemo(
    () => Object.fromEntries(DEMO_COHORTS.map((c) => [c.slug, c])),
    [],
  );

  // Per-cohort participant counts for the filter chips.
  const countsBySlug = useMemo(() => {
    const counts = { __all__: 0 };
    for (const p of ADMIN_MOCK_PARTICIPANTS) {
      if (!allowedSlugs.includes(p.cohortSlug)) continue;
      counts.__all__++;
      counts[p.cohortSlug] = (counts[p.cohortSlug] || 0) + 1;
    }
    return counts;
  }, [allowedSlugs]);

  const filtered = useMemo(() => {
    const lc = q.trim().toLowerCase();
    return ADMIN_MOCK_PARTICIPANTS
      .filter((p) => allowedSlugs.includes(p.cohortSlug))
      .filter((p) => !cohortFilter || p.cohortSlug === cohortFilter)
      .filter((p) =>
        !lc ||
        p.name.toLowerCase().includes(lc) ||
        p.email.toLowerCase().includes(lc) ||
        (p.organization || "").toLowerCase().includes(lc),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [q, allowedSlugs, cohortFilter]);

  // Hide the filter row when the admin only has access to one cohort — it
  // would just be "All" + that single chip, which is noise.
  const showCohortFilter = accessibleCohorts.length > 1;

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
            {filtered.length} {filtered.length === 1 ? "person" : "people"}{" "}
            {cohortFilter
              ? `in ${cohortBySlug[cohortFilter]?.organization?.shortName || "this cohort"}`
              : "across your scope"}
            .
          </p>
        </div>
      </header>

      {/* Cohort filter chips (only when admin can see more than one cohort) */}
      {showCohortFilter && (
        <div className="flex items-center gap-2 flex-wrap">
          <FilterChip
            active={cohortFilter === null}
            onClick={() => setCohortFilter(null)}
            label="All cohorts"
            count={countsBySlug.__all__}
          />
          {accessibleCohorts.map((c) => (
            <FilterChip
              key={c.slug}
              active={cohortFilter === c.slug}
              onClick={() => setCohortFilter(c.slug)}
              label={c.organization?.shortName || c.name}
              count={countsBySlug[c.slug] || 0}
            />
          ))}
        </div>
      )}

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
                <div className="font-heading text-[14px] font-bold text-ink truncate group-hover:text-brand-700 transition-colors">
                  {p.name}
                </div>
                <div className="text-[11.5px] text-ink-muted truncate">
                  {p.email} · {p.organization}
                </div>
              </div>
              <div className="hidden sm:block text-right">
                <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
                  {cohort?.organization?.shortName || "Cohort"}
                </div>
                <div className="text-[12.5px] font-heading font-semibold text-ink mt-0.5">
                  {pct}% progress
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

function FilterChip({ active, onClick, label, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-heading font-semibold transition-all duration-200 " +
        (active
          ? "bg-ink text-white"
          : "bg-surface-card border border-soft text-ink-muted hover:text-ink hover:border-brand-500")
      }
    >
      {label}
      <span
        className={
          "inline-flex items-center justify-center min-w-[20px] px-1 rounded-full text-[10.5px] font-bold " +
          (active ? "bg-white/15 text-white" : "bg-ink/5 text-ink-muted")
        }
      >
        {count}
      </span>
    </button>
  );
}
