import { Link } from "react-router-dom";
import { MOCK_SESSIONS, BELT_COLORS } from "../../lib/mockCohort";

// ---------------------------------------------------------------------------
// PipelineView — Kanban-style stages strip used by both /admin and
// /admin/cohorts. Each cohort card shows the org's short name, cohort name,
// and an 8-pip belt-progress strip.
//
// Props:
//   rows = [{ cohort, delivered }] — each row's `delivered` is the count of
//                                    sessions delivered for that cohort
// ---------------------------------------------------------------------------

const STAGES = [
  { key: "pre-launch",  label: "Pre-launch",  accent: "bg-ink/5 text-ink-muted" },
  { key: "in-progress", label: "In progress", accent: "bg-brand-100 text-brand-700" },
  { key: "wrapping-up", label: "Wrapping up", accent: "bg-amber-100 text-amber-700" },
  { key: "completed",   label: "Completed",   accent: "bg-emerald-100 text-emerald-700" },
];

export function stageForDelivered(delivered) {
  if (delivered === 0) return "pre-launch";
  if (delivered >= MOCK_SESSIONS.length) return "completed";
  if (delivered >= MOCK_SESSIONS.length - 1) return "wrapping-up";
  return "in-progress";
}

export default function PipelineView({ rows }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {STAGES.map((stage) => {
        const stageRows = rows.filter((r) => stageForDelivered(r.delivered) === stage.key);
        return (
          <div
            key={stage.key}
            className="rounded-2xl bg-surface-card border border-soft p-4 min-h-[120px]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={
                "inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-heading font-bold uppercase tracking-wider " +
                stage.accent
              }>
                {stage.label}
              </span>
              <span className="text-[11px] font-heading font-bold text-ink-muted">
                {stageRows.length}
              </span>
            </div>
            <div className="space-y-2">
              {stageRows.length === 0 ? (
                <div className="text-[11.5px] text-ink-subtle">—</div>
              ) : (
                stageRows.map(({ cohort: c, delivered }) => (
                  <Link
                    key={c.slug}
                    to={`/admin/cohorts/${c.slug}`}
                    className="block rounded-xl bg-surface-soft hover:bg-white border border-transparent hover:border-brand-500 p-3 transition-all duration-200"
                  >
                    <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle truncate">
                      {c.organization?.shortName || ""}
                    </div>
                    <div className="font-heading text-[12.5px] font-bold text-ink truncate mt-0.5">
                      {c.name}
                    </div>
                    {/* Belt-progress pip strip */}
                    <div className="flex items-center gap-0.5 mt-2">
                      {MOCK_SESSIONS.map((s) => {
                        const done = s.order <= delivered;
                        const belt = BELT_COLORS[s.belt];
                        return (
                          <div
                            key={s.order}
                            title={`${s.belt} — Session ${s.order}`}
                            style={{
                              background: done ? belt.gradient : "#E5E7EB",
                              border: done && belt.needsBorder ? "1px solid #D1D5DB" : "none",
                            }}
                            className="h-2 flex-1 rounded-sm"
                          />
                        );
                      })}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
