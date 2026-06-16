// Lightweight gamification logic for the AI Journal.
// Computes streaks, totals, and the next badge milestone from a participant's
// entries. Pure functions — no React, no side effects.

// Badge tiers — count-based for now. Adjust thresholds as the program grows.
// `icon` is the Lucide icon NAME (matched in JournalGameCard) so we keep this
// module free of React/JSX imports.
export const BADGES = [
  { count: 1,   icon: "Sprout",   name: "First Step",     blurb: "You logged your first AI win." },
  { count: 5,   icon: "Repeat",   name: "Habit Forming",  blurb: "Five entries — the practice is sticking." },
  { count: 10,  icon: "Flame",    name: "Decade",         blurb: "Ten wins. Real momentum." },
  { count: 25,  icon: "Rocket",   name: "Compounder",     blurb: "Twenty-five wins. You're a power user." },
  { count: 50,  icon: "Trophy",   name: "Half-Century",   blurb: "Fifty wins. Cohort leader territory." },
  { count: 100, icon: "Crown",    name: "Centurion",      blurb: "One hundred wins. AI-native." },
];

// Returns the Monday of the week containing the given Date.
function startOfISOWeek(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = (date.getDay() + 6) % 7; // 0 = Monday
  date.setDate(date.getDate() - day);
  return date;
}

function isoWeekKey(d) {
  return startOfISOWeek(d).toISOString().slice(0, 10);
}

// Counts consecutive weeks (ending in the current week) with at least one entry.
// If there's no entry this week BUT there was one last week, we still count
// the streak ending last week as the "current" streak (otherwise streaks
// reset every Monday morning, which feels punishing).
export function calculateStreakWeeks(entries) {
  if (!entries?.length) return 0;
  const weeks = new Set(
    entries
      .map((e) => e.date && new Date(e.date))
      .filter((d) => d && !isNaN(d))
      .map(isoWeekKey)
  );

  if (weeks.size === 0) return 0;

  const today = new Date();
  const thisWeek = isoWeekKey(today);
  const lastWeek = isoWeekKey(new Date(today.getTime() - 7 * 24 * 3600 * 1000));

  // Pick the anchor — this week if any entry, else last week, else 0.
  let cursor;
  if (weeks.has(thisWeek)) cursor = startOfISOWeek(today);
  else if (weeks.has(lastWeek)) cursor = startOfISOWeek(new Date(today.getTime() - 7 * 24 * 3600 * 1000));
  else return 0;

  let count = 0;
  while (weeks.has(isoWeekKey(cursor))) {
    count++;
    cursor = new Date(cursor.getTime() - 7 * 24 * 3600 * 1000);
  }
  return count;
}

export function nextBadge(totalEntries) {
  return BADGES.find((b) => b.count > totalEntries) || null;
}

export function earnedBadges(totalEntries) {
  return BADGES.filter((b) => b.count <= totalEntries);
}

export function progressToNext(totalEntries) {
  const next = nextBadge(totalEntries);
  if (!next) return { pct: 100, current: totalEntries, target: totalEntries, next: null };
  // Previous badge threshold (or 0) defines the bottom of this segment.
  const prev = [...BADGES].reverse().find((b) => b.count <= totalEntries);
  const start = prev?.count ?? 0;
  const span = next.count - start || 1;
  const pct = Math.min(100, Math.max(0, Math.round(((totalEntries - start) / span) * 100)));
  return { pct, current: totalEntries, target: next.count, next };
}

// ---------------------------------------------------------------------------
// Hours saved — the brand promise. Surfaced as a top-level stat on
// JournalGameCard so participants always see the time they've reclaimed,
// not just an abstract entry count.
// ---------------------------------------------------------------------------

// Minutes saved on a single entry. Mirror of adminMockData.timeSavedFor so
// the participant-facing card doesn't need to import the admin module.
function minutesSavedForEntry(e) {
  return Math.max(0, (e?.timeBeforeAI || 0) - (e?.timeWithAI || 0));
}

export function totalMinutesSaved(entries) {
  if (!entries?.length) return 0;
  return entries.reduce((sum, e) => sum + minutesSavedForEntry(e), 0);
}

export function formatHoursSaved(minutes) {
  if (!minutes || minutes <= 0) return "0";
  const hours = minutes / 60;
  if (hours < 1) return `${Math.round(minutes)}m`;
  if (hours < 10) return `${hours.toFixed(1)}h`;
  return `${Math.round(hours)}h`;
}

// ---------------------------------------------------------------------------
// Production-method tier — the AI Empowerment ladder.
//
// The journal entry form lets participants tag their work with the production
// method they used. That's literally the curriculum's progression model: each
// tier demonstrates a higher level of leverage. Gamification rewards the
// FIRST entry that crosses into each tier — a "tier unlocked" moment that's
// separate from the cumulative count badges.
// ---------------------------------------------------------------------------

export const PRODUCTION_TIERS = [
  { key: "single-shot", tier: 1, label: "Single-shot",  blurb: "One-off prompts." },
  { key: "chained",     tier: 2, label: "Chained",      blurb: "Multi-step workflows." },
  { key: "repeatable",  tier: 3, label: "Repeatable",   blurb: "Workflows you can hand off." },
  { key: "assistant",   tier: 4, label: "Assistant",    blurb: "A persistent helper you built." },
  { key: "agent",       tier: 5, label: "Agent",        blurb: "Runs without you." },
];

const PRODUCTION_TIER_BY_KEY = Object.fromEntries(
  PRODUCTION_TIERS.map((t) => [t.key, t]),
);

export function productionTierFor(method) {
  return PRODUCTION_TIER_BY_KEY[method] || null;
}

// Returns the highest tier the participant has reached (an object), or null.
export function highestProductionTier(entries) {
  if (!entries?.length) return null;
  let best = null;
  for (const e of entries) {
    const t = productionTierFor(e?.productionMethod);
    if (!t) continue;
    if (!best || t.tier > best.tier) best = t;
  }
  return best;
}

// Returns the set of tiers (objects) that have at least one entry. Used to
// drive a "X of 5 tiers unlocked" microbar.
export function unlockedTiers(entries) {
  const set = new Set();
  for (const e of entries || []) {
    const t = productionTierFor(e?.productionMethod);
    if (t) set.add(t.key);
  }
  return PRODUCTION_TIERS.filter((t) => set.has(t.key));
}

// ---------------------------------------------------------------------------
// Innovations — the highest-stakes wins. Surfaced as their own counter so
// rare, meaningful entries get distinct recognition.
// ---------------------------------------------------------------------------

export function innovationsCount(entries) {
  if (!entries?.length) return 0;
  return entries.filter((e) => (e?.innovationTitle || "").trim()).length;
}
