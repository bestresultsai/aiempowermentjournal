// ---------------------------------------------------------------------------
// Shared journal entry vocabulary.
//
// Used by:
//   - Journal.jsx (the entry form on the participant side)
//   - AdminJournalDashboard.jsx (charts, filter chips)
//   - AdminParticipantDetail.jsx (entry detail modal)
//   - adminMockData.js (seeded entries + entry() factory)
//   - csvExport.js (column headers)
//
// Adding a new bucket here automatically flows through every consumer.
// ---------------------------------------------------------------------------

// Production method — captures HOW the deliverable was produced.
// Ranked low → high along the BestResults AI maturity ladder.
// `key` is the canonical value stored on the entry; `label` is what we render.
export const PRODUCTION_METHODS = [
  {
    key: "no-sop",
    label: "No SOP",
    short: "No SOP",
    description: "One-off effort — no documented process. The work happened in someone's head.",
    rank: 1,
    color: "ink-muted",
    chipBg: "bg-ink/5",
    chipText: "text-ink-muted",
  },
  {
    key: "with-sop",
    label: "With SOP",
    short: "With SOP",
    description: "Followed a documented standard operating procedure. Repeatable but still human-driven.",
    rank: 2,
    color: "amber",
    chipBg: "bg-amber-50",
    chipText: "text-amber-800",
  },
  {
    key: "ai-workflow",
    label: "AI Workflow",
    short: "AI Workflow",
    description: "AI assists a structured workflow — prompts, prompt chains, or templates that humans operate.",
    rank: 3,
    color: "brand",
    chipBg: "bg-brand-50",
    chipText: "text-brand-700",
  },
  {
    key: "ai-agent",
    label: "AI Agent",
    short: "AI Agent",
    description: "An AI agent runs the workflow end-to-end. Human reviews and approves.",
    rank: 4,
    color: "emerald",
    chipBg: "bg-emerald-50",
    chipText: "text-emerald-700",
  },
  {
    key: "ai-swarm",
    label: "AI Swarm",
    short: "AI Swarm",
    description: "Multiple agents collaborate as a team. The most leveraged tier on the maturity ladder.",
    rank: 5,
    color: "purple",
    chipBg: "bg-purple-50",
    chipText: "text-purple-700",
  },
];

export function getProductionMethod(key) {
  return PRODUCTION_METHODS.find((m) => m.key === key) || null;
}

// Volume per day — how many times the participant performs this on a typical
// day they do it. We store the midpoint so leverage math works cleanly.
export const VOLUME_PER_DAY = [
  { key: "1",    label: "1",    midpoint: 1 },
  { key: "2-5",  label: "2–5",  midpoint: 3.5 },
  { key: "6-10", label: "6–10", midpoint: 8 },
  { key: "10+",  label: "10+",  midpoint: 15 },
];

export function getVolumeBucket(key) {
  return VOLUME_PER_DAY.find((v) => v.key === key) || null;
}

// Frequency — simpler 5-bucket variant from the new design. Each entry stores
// the bucket key + a "perWeek" multiplier so leverage math is a simple
// multiplication (volume.midpoint × frequency.perWeek × hoursSaved).
export const FREQUENCIES_SIMPLE = [
  { key: "multiple-per-day", label: "Multiple times per day", perWeek: 5 * 4 },
  { key: "daily",            label: "Daily",                  perWeek: 5 },
  { key: "weekly",           label: "Weekly",                 perWeek: 1 },
  { key: "monthly",          label: "Monthly",                perWeek: 0.25 },
  { key: "rare",             label: "Rare / as needed",       perWeek: 0.05 },
];

export function getFrequencyBucket(key) {
  return FREQUENCIES_SIMPLE.find((f) => f.key === key) || null;
}

// Scope — kept for backwards-compat per "cut nothing" decision.
export const SCOPES = ["Individual", "Department-wide", "Organization-wide"];

// Quality outcome — kept for backwards-compat.
export const QUALITY_OPTIONS = [
  "Better than original",
  "Equal to original",
  "Not as good as original",
];

// Leverage = volume × frequency × (saved minutes per execution).
// Returns minutes saved per week from this kind of work.
export function leveragePerWeek(entry) {
  const v = getVolumeBucket(entry?.volumePerDay)?.midpoint || 0;
  const f = getFrequencyBucket(entry?.frequency)?.perWeek || 0;
  const saved = Math.max(0, (entry?.timeBeforeAI || 0) - (entry?.timeWithAI || 0));
  return Math.round(v * f * saved);
}
