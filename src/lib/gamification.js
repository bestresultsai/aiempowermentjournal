// Lightweight gamification logic for the AI Journal.
// Computes streaks, totals, and the next badge milestone from a participant's
// entries. Pure functions — no React, no side effects.

import { PRODUCTION_METHODS } from "./journalConstants";

// Default badge ladder. Programs can OVERRIDE this — every consumer should
// accept an optional `badges` argument and fall back to BADGES if nothing
// program-specific is in scope. Kept here (rather than in programs.js) so
// gamification math stays a pure function free of program-config imports.
export const BADGES = [
  { count: 1,   icon: "Sprout",   name: "First Step",     blurb: "You logged your first AI win." },
  { count: 5,   icon: "Repeat",   name: "Habit Forming",  blurb: "Five entries — the practice is sticking." },
  { count: 10,  icon: "Flame",    name: "Decade",         blurb: "Ten wins. Real momentum." },
  { count: 25,  icon: "Rocket",   name: "Compounder",     blurb: "Twenty-five wins. You're a power user." },
  { count: 50,  icon: "Trophy",   name: "Half-Century",   blurb: "Fifty wins. Cohort leader territory." },
  { count: 100, icon: "Crown",    name: "Centurion",      blurb: "One hundred wins. AI-native." },
];

// Pulls a usable badge ladder out of an optional override. Falls back to
// the default BADGES array if `override` is null / empty.
function resolveBadges(override) {
  return Array.isArray(override) && override.length ? override : BADGES;
}

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

export function nextBadge(totalEntries, badges) {
  const ladder = resolveBadges(badges);
  return ladder.find((b) => b.count > totalEntries) || null;
}

export function earnedBadges(totalEntries, badges) {
  const ladder = resolveBadges(badges);
  return ladder.filter((b) => b.count <= totalEntries);
}

export function progressToNext(totalEntries, badges) {
  const ladder = resolveBadges(badges);
  const next = nextBadge(totalEntries, ladder);
  if (!next) return { pct: 100, current: totalEntries, target: totalEntries, next: null };
  // Previous badge threshold (or 0) defines the bottom of this segment.
  const prev = [...ladder].reverse().find((b) => b.count <= totalEntries);
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

// Mirrors PRODUCTION_METHODS from journalConstants.js — keeping the keys
// in lockstep so journal entries can be tier-checked without a separate
// mapping. Sourced from PRODUCTION_METHODS (imported at top) rather than
// duplicated here so adding a new method (or renaming one) flows through.
export const PRODUCTION_TIERS = PRODUCTION_METHODS.map((m) => ({
  key: m.key,
  tier: m.rank,
  label: m.label,
  blurb: m.description,
}));

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

// ---------------------------------------------------------------------------
// Cohort-level rollups — used by CohortStats to surface gamification signal
// across the whole cohort, not just one participant. Each helper groups the
// raw entries by participantEmail first, then aggregates.
// ---------------------------------------------------------------------------

function groupEntriesByParticipant(entries) {
  const map = new Map();
  for (const e of entries || []) {
    const key = (e?.participantEmail || "").toLowerCase();
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(e);
  }
  return map;
}

// Returns { activeCount, totalParticipants, maxStreak }.
//   activeCount       — participants with streak >= 1 (logged this/last week)
//   totalParticipants — distinct emails with any entry at all
//   maxStreak         — longest streak in the cohort
export function cohortStreakSummary(entries) {
  const groups = groupEntriesByParticipant(entries);
  let activeCount = 0;
  let maxStreak = 0;
  for (const list of groups.values()) {
    const s = calculateStreakWeeks(list);
    if (s >= 1) activeCount++;
    if (s > maxStreak) maxStreak = s;
  }
  return { activeCount, totalParticipants: groups.size, maxStreak };
}

// Returns the count of distinct participants who've ever reached each tier.
// Shape: { byTier: { [tierKey]: count }, topTier: tierObj | null,
//          topTierCount: number }
export function cohortTierBreakdown(entries) {
  const groups = groupEntriesByParticipant(entries);
  const byTier = Object.fromEntries(PRODUCTION_TIERS.map((t) => [t.key, 0]));
  let topTier = null;
  for (const list of groups.values()) {
    const top = highestProductionTier(list);
    if (!top) continue;
    byTier[top.key] = (byTier[top.key] || 0) + 1;
    if (!topTier || top.tier > topTier.tier) topTier = top;
  }
  const topTierCount = topTier ? byTier[topTier.key] : 0;
  return { byTier, topTier, topTierCount };
}

// Sum of badges earned across the whole cohort, against a given ladder.
// Useful as a single "cohort celebration counter" chip.
export function cohortBadgesEarned(entries, badges) {
  const groups = groupEntriesByParticipant(entries);
  let total = 0;
  for (const list of groups.values()) {
    total += earnedBadges(list.length, badges).length;
  }
  return total;
}
