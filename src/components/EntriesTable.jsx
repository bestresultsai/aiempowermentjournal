import { calcEntryMetrics, formatCurrency } from "../lib/calculations";
import { Lightbulb } from "lucide-react";

// Render one journal entry per row. Reads `timeBeforeAI`/`timeWithAI` in
// MINUTES (the current schema) and displays hours. Legacy entries that still
// have `hoursWithoutAI`/`hoursWithAI` are respected via the fallback in
// `hoursFor()` so old seed data doesn't render blank.
export default function EntriesTable({ entries, showCohort = true, showOrg = false }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-soft bg-surface-soft/40 p-8 text-center">
        <div className="text-[13px] text-ink-muted">No entries yet.</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-soft bg-surface-card overflow-hidden shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px] min-w-[880px]">
          <thead>
            <tr className="bg-surface-soft/60 text-ink-muted border-b border-soft">
              <Th>Participant</Th>
              {showCohort && <Th>Cohort</Th>}
              {showOrg && <Th>Organization</Th>}
              <Th>Project</Th>
              <Th>Scope</Th>
              <Th align="right">Without AI</Th>
              <Th align="right">With AI</Th>
              <Th align="right">Saved</Th>
              <Th align="right">Efficiency</Th>
              <Th>Quality</Th>
              <Th align="right">Annual $</Th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => {
              const m = calcEntryMetrics(entry);
              const hoursBefore = hoursFor(entry, "before");
              const hoursAfter = hoursFor(entry, "after");
              return (
                <tr
                  key={entry.id || i}
                  className={
                    "border-b border-soft last:border-0 hover:bg-surface-soft/40 transition-colors " +
                    (i % 2 ? "bg-surface-paper/30" : "bg-surface-card")
                  }
                >
                  <Td>
                    <div className="font-heading font-bold text-ink truncate">
                      {entry.participantName || "—"}
                    </div>
                    {entry.participantEmail && (
                      <div className="text-[11px] text-ink-subtle truncate">
                        {entry.participantEmail}
                      </div>
                    )}
                  </Td>
                  {showCohort && (
                    <Td>
                      <span className="text-ink-muted">{entry.cohort || "—"}</span>
                    </Td>
                  )}
                  {showOrg && (
                    <Td>
                      <span className="text-ink-muted">{entry.organization || "—"}</span>
                    </Td>
                  )}
                  <Td>
                    <div className="font-heading font-semibold text-ink truncate max-w-[220px]">
                      {entry.projectName || "—"}
                    </div>
                    {entry.innovationTitle && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-heading font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        <Lightbulb className="w-3 h-3" strokeWidth={2.25} />
                        Innovation
                      </span>
                    )}
                  </Td>
                  <Td>
                    <ScopeChip scope={entry.scope} />
                  </Td>
                  <Td align="right" className="tabular-nums text-ink">
                    {formatHours(hoursBefore)}
                  </Td>
                  <Td align="right" className="tabular-nums text-ink">
                    {formatHours(hoursAfter)}
                  </Td>
                  <Td align="right" className="tabular-nums font-heading font-bold text-emerald-600">
                    {formatHours(m.timeSaved)}
                  </Td>
                  <Td align="right" className="tabular-nums font-heading font-bold text-brand-700">
                    {Number.isFinite(m.percentSaved) ? `${m.percentSaved.toFixed(0)}%` : "—"}
                  </Td>
                  <Td>
                    <QualityChip outcome={entry.qualityOutcome} />
                  </Td>
                  <Td align="right" className="tabular-nums font-heading font-extrabold text-emerald-700">
                    {formatCurrency(m.annualValue)}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Field helpers -------------------------------------------------

// Hours per single execution. Prefers the new `timeBeforeAI`/`timeWithAI`
// minutes; falls back to legacy `hoursWithoutAI`/`hoursWithAI` if a legacy
// row somehow made it into the table.
function hoursFor(entry, side) {
  if (side === "before") {
    if (entry.timeBeforeAI != null) return Number(entry.timeBeforeAI) / 60;
    if (entry.hoursWithoutAI != null) return Number(entry.hoursWithoutAI);
    return 0;
  }
  if (entry.timeWithAI != null) return Number(entry.timeWithAI) / 60;
  if (entry.hoursWithAI != null) return Number(entry.hoursWithAI);
  return 0;
}

function formatHours(hours) {
  if (!Number.isFinite(hours) || hours === 0) return "0h";
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins}m`;
  }
  return `${hours.toFixed(1)}h`;
}

// ---------- Presentational sub-components ---------------------------------

function Th({ children, align = "left" }) {
  const alignClass = align === "right" ? "text-right" : "text-left";
  return (
    <th
      className={`px-4 py-3 font-heading font-bold text-[10.5px] uppercase tracking-wider ${alignClass}`}
    >
      {children}
    </th>
  );
}

function Td({ children, align = "left", className = "" }) {
  const alignClass = align === "right" ? "text-right" : "text-left";
  return (
    <td className={`px-4 py-3 align-top ${alignClass} ${className}`}>{children}</td>
  );
}

function ScopeChip({ scope }) {
  if (!scope) return <span className="text-ink-subtle">—</span>;
  const tone =
    scope === "Organization-wide"
      ? "bg-violet-50 text-violet-700 border-violet-200"
      : scope === "Department-wide"
      ? "bg-brand-50 text-brand-700 border-brand-200"
      : "bg-ink/5 text-ink-muted border-ink/10";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10.5px] font-heading font-semibold ${tone}`}
    >
      {scope}
    </span>
  );
}

function QualityChip({ outcome }) {
  if (!outcome) return <span className="text-ink-subtle">—</span>;
  const label =
    outcome === "Better than original"
      ? "Better"
      : outcome === "Equal to original"
      ? "Equal"
      : "Lower";
  const tone =
    outcome === "Better than original"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : outcome === "Equal to original"
      ? "bg-brand-50 text-brand-700 border-brand-200"
      : "bg-rose-50 text-rose-700 border-rose-200";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10.5px] font-heading font-semibold ${tone}`}
    >
      {label}
    </span>
  );
}
