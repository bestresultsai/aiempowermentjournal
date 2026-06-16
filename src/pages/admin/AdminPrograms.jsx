import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Library,
  Plus,
  Pencil,
  GraduationCap,
  Clock,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  getAllProgramsForAdmin,
  countCohortsByProgram,
  useProgramVersion,
} from "../../lib/programs";
import { getAllCohortsForAdmin, useCohortVersion } from "../../lib/cohortAdmin";

// ---------------------------------------------------------------------------
// /admin/programs — the program catalog.
//
// Lists every program (seeded + admin-created), shows session count, cohort
// usage, and a quick link into the edit page. New programs are created at
// /admin/programs/new and inherit the same form.
// ---------------------------------------------------------------------------

export default function AdminPrograms() {
  // Re-render when programs OR cohorts change (cohort counts depend on the
  // cohort store).
  const programVersion = useProgramVersion();
  const cohortVersion = useCohortVersion();

  const programs = useMemo(
    () => getAllProgramsForAdmin(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [programVersion],
  );
  const cohorts = useMemo(
    () => getAllCohortsForAdmin(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cohortVersion],
  );
  const cohortCounts = useMemo(
    () => countCohortsByProgram(cohorts),
    [cohorts],
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="h-eyebrow">Admin · Programs</div>
          <h1 className="font-heading text-[28px] lg:text-[34px] font-extrabold tracking-tight text-ink leading-tight">
            Curriculum templates.
          </h1>
          <p className="text-[14px] text-ink-muted mt-1.5 max-w-2xl">
            Programs define the session curriculum, belt sequence, and homework
            prompts that every cohort runs. Edit a program here and every
            cohort using it inherits the change.
          </p>
        </div>
        <Link
          to="/admin/programs/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink text-white text-[13.5px] font-heading font-bold hover:bg-ink/90 transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2.75} />
          New program
        </Link>
      </header>

      {/* Program cards */}
      <section className="grid md:grid-cols-2 gap-4">
        {programs.map((p) => (
          <ProgramCard
            key={p.code}
            program={p}
            cohortCount={cohortCounts[p.code] || 0}
          />
        ))}
        {programs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-soft p-10 text-center md:col-span-2">
            <div className="text-[13px] text-ink-muted">
              No programs yet. Create one to get started.
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-program summary card.
// ---------------------------------------------------------------------------
function ProgramCard({ program, cohortCount }) {
  const sessionCount = program.sessions?.length || 0;
  const beltCount = program.belts?.length || 0;
  const minutes = program.sessionDurationMinutes || 0;
  const isCustom = !!program.isCustom;

  return (
    <Link
      to={`/admin/programs/${encodeURIComponent(program.code)}/edit`}
      className="rounded-2xl bg-surface-card border border-soft p-5 lg:p-6 hover:border-ink/20 hover:shadow-lift transition-all group block"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted inline-flex items-center gap-1.5">
            <Library className="w-3 h-3" strokeWidth={2.5} />
            {program.code}
            {isCustom && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded-md bg-emerald-50 text-emerald-700 text-[9.5px] font-heading font-bold uppercase">
                <Sparkles className="w-2.5 h-2.5" strokeWidth={2.75} />
                Custom
              </span>
            )}
          </div>
          <h3 className="font-heading text-[18px] font-extrabold text-ink leading-tight mt-1 truncate">
            {program.name}
          </h3>
        </div>
        <span className="inline-flex items-center gap-1 text-[12.5px] font-heading font-bold text-brand-700 group-hover:text-brand-800 shrink-0">
          <Pencil className="w-3.5 h-3.5" strokeWidth={2.5} />
          Edit
        </span>
      </div>

      {program.tagline && (
        <p className="text-[12.5px] text-ink-muted leading-relaxed line-clamp-2 mb-3">
          {program.tagline}
        </p>
      )}

      <div className="flex items-center gap-3 text-[11.5px] text-ink-muted flex-wrap">
        <span className="inline-flex items-center gap-1">
          <GraduationCap className="w-3 h-3" strokeWidth={2.5} />
          {sessionCount} session{sessionCount === 1 ? "" : "s"}
        </span>
        {beltCount > 0 && (
          <span>
            {beltCount} belt{beltCount === 1 ? "" : "s"}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3 h-3" strokeWidth={2.5} />
          {minutes}m default
        </span>
        <span className="ml-auto inline-flex items-center gap-1 text-ink font-heading font-semibold">
          {cohortCount} cohort{cohortCount === 1 ? "" : "s"} using it
          <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
        </span>
      </div>
    </Link>
  );
}
