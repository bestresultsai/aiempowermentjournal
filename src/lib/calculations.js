// ---------------------------------------------------------------------------
// Journal-entry math.
//
// Journal entries carry per-execution timings in MINUTES:
//   entry.timeBeforeAI — minutes the task used to take without AI
//   entry.timeWithAI   — minutes the task takes now, with AI
//   entry.frequency    — one of FREQUENCIES_SIMPLE keys (daily/weekly/monthly/rare)
//   entry.volumePerDay — VOLUME_PER_DAY bucket key (only meaningful when
//                        frequency is "daily"; UI hides the input otherwise)
//
// Legacy shape (entry.hoursWithoutAI / entry.hoursWithAI / capitalized
// frequency strings) is gone. This file used to read that shape and produced
// NaN across the participant Cohort Impact dashboard.
// ---------------------------------------------------------------------------

import { FREQUENCIES_SIMPLE, VOLUME_PER_DAY } from "./journalConstants";

export const HOURLY_RATE = 75;
const WEEKS_PER_YEAR = 52;

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Per-execution minutes saved (each time you run the task).
export function minutesSavedPerRun(entry) {
  return Math.max(0, num(entry?.timeBeforeAI) - num(entry?.timeWithAI));
}

// Percentage of time cut vs. the pre-AI baseline. Returns 0 when we have no
// baseline (shouldn't happen for a valid entry, but keep it safe).
export function calcPercentSaved(entry) {
  const before = num(entry?.timeBeforeAI);
  if (before <= 0) return 0;
  const saved = before - num(entry?.timeWithAI);
  return (saved / before) * 100;
}

// How many times per year the participant runs this workflow. Combines
// frequency + volumePerDay (volume only applies when frequency is daily,
// matching what the Journal form asks). Defaults to 0 if we can't resolve
// the frequency bucket so garbage-in doesn't wreck the aggregate.
export function runsPerYear(entry) {
  const bucket = FREQUENCIES_SIMPLE.find((f) => f.key === entry?.frequency);
  if (!bucket) return 0;
  let perWeek = bucket.perWeek || 0;
  if (bucket.key === "daily" && entry?.volumePerDay) {
    const vol = VOLUME_PER_DAY.find((v) => v.key === entry.volumePerDay);
    if (vol) perWeek *= vol.midpoint;
  }
  return perWeek * WEEKS_PER_YEAR;
}

// Annual time saved for this entry, in HOURS. This is what the "Time Saved"
// tile on the Cohort Impact dashboard actually shows.
export function annualHoursSaved(entry) {
  return (minutesSavedPerRun(entry) * runsPerYear(entry)) / 60;
}

export function annualValue(entry, rate = HOURLY_RATE) {
  return annualHoursSaved(entry) * rate;
}

// Per-entry metrics bundle. Values are in HOURS (except percentSaved which
// is 0-100). Consumers used to read `timeSaved` (per-run, hours) and
// `annualTimeSaved` (annual, hours) — same names preserved for compat.
export function calcEntryMetrics(entry, rate = HOURLY_RATE) {
  const perRunMinutes = minutesSavedPerRun(entry);
  const runs = runsPerYear(entry);
  const annualMinutes = perRunMinutes * runs;
  return {
    perRunMinutes,
    perRunHours: perRunMinutes / 60,
    timeSaved: perRunMinutes / 60,        // hours saved per single execution
    percentSaved: calcPercentSaved(entry),
    annualTimeSaved: annualMinutes / 60,  // hours saved per year
    annualValue: (annualMinutes / 60) * rate,
  };
}

export function calcAggregateMetrics(entries, rate = HOURLY_RATE) {
  if (!entries || entries.length === 0) {
    return {
      totalEntries: 0,
      totalTimeSaved: 0,
      avgEfficiency: 0,
      totalAnnualValue: 0,
      totalInnovations: 0,
      qualityDistribution: { better: 0, equal: 0, worse: 0 },
    };
  }

  let totalTimeSaved = 0;    // hours (annualized across all entries)
  let totalAnnualValue = 0;
  let totalPercent = 0;
  let totalInnovations = 0;
  let better = 0, equal = 0, worse = 0;

  entries.forEach((entry) => {
    const m = calcEntryMetrics(entry, rate);
    totalTimeSaved   += m.annualTimeSaved;
    totalAnnualValue += m.annualValue;
    totalPercent     += m.percentSaved;
    if (entry.innovationTitle) totalInnovations++;
    if (entry.qualityOutcome === "Better than original") better++;
    else if (entry.qualityOutcome === "Equal to original") equal++;
    else if (entry.qualityOutcome === "Not as good as original") worse++;
  });

  return {
    totalEntries: entries.length,
    totalTimeSaved,
    avgEfficiency: totalPercent / entries.length,
    totalAnnualValue,
    totalInnovations,
    qualityDistribution: { better, equal, worse },
  };
}

// ---------------------------------------------------------------------------
// Legacy compat wrappers
//
// /journal/result still receives router state with `hoursWithoutAI` /
// `hoursWithAI` (hours) plus `frequency`, and calls the (hours, hours, freq)
// helper signatures. Kept as thin wrappers so that page keeps rendering
// without dragging the old field shape back into the aggregate metrics above.
// ---------------------------------------------------------------------------

export function calcTimeSaved(hoursWithout, hoursWith) {
  return Math.max(0, num(hoursWithout) - num(hoursWith));
}

export function calcPercentSavedHours(hoursWithout, hoursWith) {
  const before = num(hoursWithout);
  if (before <= 0) return 0;
  return ((before - num(hoursWith)) / before) * 100;
}

export function calcAnnualTimeSaved(hoursWithout, hoursWith, frequency) {
  return calcTimeSaved(hoursWithout, hoursWith) * runsPerYear({ frequency });
}

export function calcAnnualValue(hoursWithout, hoursWith, frequency, rate = HOURLY_RATE) {
  return calcAnnualTimeSaved(hoursWithout, hoursWith, frequency) * rate;
}

// ---------- Formatters -----------------------------------------------------

export function formatHours(hours) {
  if (!Number.isFinite(hours)) return "0";
  if (hours >= 1000) return `${(hours / 1000).toFixed(1)}k`;
  return hours.toFixed(1);
}

export function formatCurrency(amount) {
  if (!Number.isFinite(amount)) return "$0";
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}k`;
  return `$${amount.toFixed(0)}`;
}

export function formatPercent(pct) {
  if (!Number.isFinite(pct)) return "0%";
  return `${pct.toFixed(0)}%`;
}
