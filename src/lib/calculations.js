export const FREQUENCY_MULTIPLIERS = {
  "Daily": 260,
  "Multiple times a week": 156,
  "Once a week": 52,
  "Multiple times a month": 24,
  "Once a month": 12,
  "Multiple times a quarter": 8,
  "Once a quarter": 4,
  "Multiple times a year": 6,
  "Once a year": 1,
  "Less than once a year": 0.5,
};

export const HOURLY_RATE = 75;

export function calcTimeSaved(hoursWithout, hoursWith) {
  return Math.max(0, hoursWithout - hoursWith);
}

export function calcPercentSaved(hoursWithout, hoursWith) {
  if (!hoursWithout || hoursWithout === 0) return 0;
  return ((hoursWithout - hoursWith) / hoursWithout) * 100;
}

export function calcAnnualTimeSaved(hoursWithout, hoursWith, frequency) {
  const timeSaved = calcTimeSaved(hoursWithout, hoursWith);
  const multiplier = FREQUENCY_MULTIPLIERS[frequency] || 1;
  return timeSaved * multiplier;
}

export function calcAnnualValue(hoursWithout, hoursWith, frequency, rate = HOURLY_RATE) {
  return calcAnnualTimeSaved(hoursWithout, hoursWith, frequency) * rate;
}

export function calcEntryMetrics(entry, rate = HOURLY_RATE) {
  const timeSaved = calcTimeSaved(entry.hoursWithoutAI, entry.hoursWithAI);
  const percentSaved = calcPercentSaved(entry.hoursWithoutAI, entry.hoursWithAI);
  const annualTimeSaved = calcAnnualTimeSaved(entry.hoursWithoutAI, entry.hoursWithAI, entry.frequency);
  const annualValue = annualTimeSaved * rate;
  return { timeSaved, percentSaved, annualTimeSaved, annualValue };
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

  let totalTimeSaved = 0;
  let totalAnnualValue = 0;
  let totalPercent = 0;
  let totalInnovations = 0;
  let better = 0, equal = 0, worse = 0;

  entries.forEach(entry => {
    const m = calcEntryMetrics(entry, rate);
    totalTimeSaved += m.timeSaved;
    totalAnnualValue += m.annualValue;
    totalPercent += m.percentSaved;
    if (entry.innovationTitle) totalInnovations++;
    if (entry.qualityOutcome === "Better than original") better++;
    else if (entry.qualityOutcome === "Equal to original") equal++;
    else worse++;
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

export function formatHours(hours) {
  if (hours >= 1000) return `${(hours / 1000).toFixed(1)}k`;
  return hours.toFixed(1);
}

export function formatCurrency(amount) {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}k`;
  return `$${amount.toFixed(0)}`;
}

export function formatPercent(pct) {
  return `${pct.toFixed(0)}%`;
}
