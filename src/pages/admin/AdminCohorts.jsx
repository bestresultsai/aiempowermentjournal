import { Link } from "react-router-dom";
import { GraduationCap, ArrowRight, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getAccessibleCohorts } from "../../lib/adminRoles";
import { DEMO_COHORTS } from "../../lib/demoData";
import { getParticipantsForCohort } from "../../lib/adminMockData";

// /admin/cohorts — full list of cohorts the user can access.
export default function AdminCohorts() {
  const { user } = useAuth();
  const cohorts = getAccessibleCohorts(user, DEMO_COHORTS);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <header className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
          <GraduationCap className="w-5 h-5" strokeWidth={2} />
        </div>
        <div>
          <h1 className="font-heading text-[24px] lg:text-[28px] font-extrabold text-ink leading-tight">
            Cohorts
          </h1>
          <p className="text-[13px] text-ink-muted">
            {cohorts.length} {cohorts.length === 1 ? "cohort" : "cohorts"} in your scope.
          </p>
        </div>
      </header>

      <div className="rounded-2xl bg-surface-card border border-soft overflow-hidden">
        {cohorts.map((c) => {
          const roster = getParticipantsForCohort(c.slug);
          const avgProgress =
            roster.length === 0
              ? 0
              : Math.round(
                  roster.reduce((sum, p) => sum + (p.progress?.length || 0), 0) /
                    roster.length /
                    8 *
                    100,
                );
          return (
            <Link
              key={c.slug}
              to={`/admin/cohorts/${c.slug}`}
              className="group flex items-center gap-4 px-5 py-4 hover:bg-surface-soft transition-colors border-b border-soft last:border-b-0"
            >
              <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
                  {c.organization?.shortName || "Cohort"}
                </div>
                <div className="font-heading text-[15px] font-bold text-ink mt-0.5 group-hover:text-brand-700 truncate">
                  {c.name}
                </div>
                <div className="text-[11.5px] text-ink-muted truncate">
                  {c.methodName} · {c.programCode}
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-6">
                <Mini label="Participants" value={roster.length} icon={Users} />
                <Mini label="Avg progress" value={`${avgProgress}%`} />
              </div>
              <ArrowRight className="w-4 h-4 text-ink-subtle shrink-0 group-hover:text-brand-600 transition-colors" strokeWidth={2.5} />
            </Link>
          );
        })}
        {cohorts.length === 0 && (
          <div className="p-8 text-center text-[14px] text-ink-muted">
            No cohorts in your scope yet.
          </div>
        )}
      </div>
    </div>
  );
}

function Mini({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-3.5 h-3.5 text-ink-muted" strokeWidth={2.25} />}
      <div className="flex flex-col items-start leading-tight">
        <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
          {label}
        </span>
        <span className="text-[13px] font-heading font-bold text-ink mt-0.5">
          {value}
        </span>
      </div>
    </div>
  );
}
