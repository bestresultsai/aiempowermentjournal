// Lightweight gamification logic for the AI Journal.
// Computes streaks, totals, and the next badge milestone from a participant's
// entries. Pure functions — no React, no side effects.

// Badge tiers — count-based for now. Adjust thresholds as the program grows.
export const BADGES = [
  { count: 1,   icon: "🌱", name: "First Step",     blurb: "You logged your first AI win." },
  { count: 5,   icon: "🔁", name: "Habit Forming",  blurb: "Five entries — the practice is sticking." },
  { count: 10,  icon: "🔟", name: "Decade",         blurb: "Ten wins. Real momentum." },
  { count: 25,  icon: "🚀", name: "Compounder",     blurb: "Twenty-five wins. You're a power user." },
  { count: 50,  icon: "🏆", name: "Half-Century",   blurb: "Fifty wins. Cohort leader territory." },
  { count: 100, icon: "👑", name: "Centurion",      blurb: "One hundred wins. AI-native." },
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
