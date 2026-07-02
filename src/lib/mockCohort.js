// ---------------------------------------------------------------------------
// Mock data for the AIEW3 cohort + sessions module.
// Swap to live Notion data by setting USE_MOCK_DATA = false in cohortApi.js.
//
// Curriculum:  Best Results AI Empowerment Workshop Series 3.0 (AIEW3)
//              — 8 belt-ranked sessions (White → Black).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Dynamic date helper.
// In the prototype we want the cohort to always feel "mid-program" — a few
// sessions completed, one up next, several upcoming — regardless of when the
// page is opened. So we calculate session dates relative to TODAY rather than
// hardcoding 2026 dates that drift into the past.
//
// `weekOffset = 0` = THIS week's Wednesday.
// `weekOffset = -4` = 4 weeks ago Wednesday.
// `weekOffset = +3` = 3 weeks from now Wednesday.
// ---------------------------------------------------------------------------
function weekdayDate(weekOffset, dayOfWeek = 3 /* Wed */) {
  const d = new Date();
  const currentDay = d.getDay();
  const diff = dayOfWeek - currentDay;
  d.setDate(d.getDate() + diff + weekOffset * 7);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

// Cohort hero gradient (the top dark/blue banner). Exported so both the hero
// itself and the design-reference page can share a single source of truth.
export const HERO_GRADIENT = "linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)";

// Belt color palette. Used as accent on session rows and in the hero.
// Each belt defines:
//   `hex`         — solid base color (legacy reference + small accents)
//   `contrast`    — text/icon color readable on top of the gradient
//   `gradient`    — deep→light pair used on Next Live countdown,
//                   curriculum number badges, and the Next Milestone card
//   `needsBorder` — true for very light belts (White, Gray) so the badge gets
//                   a thin outline against light card backgrounds
//
// Picking one palette per belt keeps the system consistent regardless of
// which session is up next.
export const BELT_COLORS = {
  // Near-white. Needs a border to read on the warm off-white page background.
  White:  { hex: "#FFFFFF", text: "#0A0A0A", contrast: "#0A0A0A", needsBorder: true,  gradient: "linear-gradient(135deg, #E5E7EB 0%, #FFFFFF 100%)" },
  // Cool slate gray — sits between White and Yellow. Light enough that it also
  // needs a border to read against the off-white page background.
  Gray:   { hex: "#94A3B8", text: "#0A0A0A", contrast: "#0A0A0A", needsBorder: true,  gradient: "linear-gradient(135deg, #94A3B8 0%, #E2E8F0 100%)" },
  // Saturated yellow — clearly distinguishable from amber/orange.
  Yellow: { hex: "#FACC15", text: "#0A0A0A", contrast: "#0A0A0A", needsBorder: false, gradient: "linear-gradient(135deg, #EAB308 0%, #FDE047 100%)" },
  // Orange family — bright orange end, deep-orange start (NOT brown).
  Orange: { hex: "#F97316", text: "#FFFFFF", contrast: "#FFFFFF", needsBorder: false, gradient: "linear-gradient(135deg, #C2410C 0%, #FB923C 100%)" },
  Green:  { hex: "#22C55E", text: "#FFFFFF", contrast: "#FFFFFF", needsBorder: false, gradient: "linear-gradient(135deg, #14532D 0%, #22C55E 100%)" },
  Blue:   { hex: "#3B82F6", text: "#FFFFFF", contrast: "#FFFFFF", needsBorder: false, gradient: "linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)" },
  Purple: { hex: "#A855F7", text: "#FFFFFF", contrast: "#FFFFFF", needsBorder: false, gradient: "linear-gradient(135deg, #4C1D95 0%, #A855F7 100%)" },
  // True coffee/chocolate brown — desaturated, no orange in it.
  Brown:  { hex: "#78350F", text: "#FFFFFF", contrast: "#FFFFFF", needsBorder: false, gradient: "linear-gradient(135deg, #3F2317 0%, #78350F 100%)" },
  // Red — sits between Brown and Black on longer programs (APFW).
  Red:    { hex: "#DC2626", text: "#FFFFFF", contrast: "#FFFFFF", needsBorder: false, gradient: "linear-gradient(135deg, #7F1D1D 0%, #EF4444 100%)" },
  Black:  { hex: "#0A0A0A", text: "#FFFFFF", contrast: "#FFFFFF", needsBorder: false, gradient: "linear-gradient(135deg, #0A0A0A 0%, #374151 100%)" },
  // Gold — capstone tier above Black, used on the longer APFW program.
  Gold:   { hex: "#D4AF37", text: "#1F1409", contrast: "#1F1409", needsBorder: false, gradient: "linear-gradient(135deg, #B8860B 0%, #FCD34D 100%)" },
};

export const MOCK_COHORT = {
  id: "cohort-iahe-aiew3-2026q1",
  slug: "iahe-aiew3-2026q1",
  name: "AIEW3 — IAHE Cohort",
  // The name the Journal Entries DB tags entries with. We filter the cohort
  // dashboard by this value via /api/entries?cohort=...  In live mode this is
  // the same as `name` (or a relation to the Cohorts DB).
  journalCohortName: "IAHE Cohort",
  // Three-level naming:
  //   methodName   — the overarching framework (largest brand identity)
  //   programName  — a specific delivery / version of the method
  //   name         — the specific cohort (group of participants)
  methodName: "AI Empowerment Method",
  programCode: "AIEW3",
  programName: "Best Results AI Empowerment Workshop Series 3.0",
  organization: {
    id: "org-iahe",
    name: "International Alliance of Healthcare Educators",
    shortName: "IAHE",
  },
  // `trainer` retained as the data field name (it's a public API used by Notion
  // schema + Netlify functions). The UI labels everything as "Facilitator".
  trainer: {
    name: "Mike Burkesmith",
    title: "Lead Facilitator, BestResults.AI",
    email: "mike@bestresults.ai",
    headshotUrl:
      "https://48031831.fs1.hubspotusercontent-na1.net/hubfs/48031831/Design/Headshots/Mike%20Burkesmith%20Headshot%201X1.png",
    // Coaching hook displayed in the facilitator card. NOT styled as a quote —
    // it's a direct invitation to book a 1:1.
    coachingHeadline: "Feeling stuck?",
    coachingBody: "Bring your hardest workflow to office hours — we'll turn it into something you'll actually use every week.",
  },
  // Cohort spans 8 weeks, centered around "now" so the prototype always shows
  // a realistic mid-cohort state with an upcoming live session.
  startDate: weekdayDate(-4),
  endDate: weekdayDate(3),
  meetingDay: "Wednesdays",
  meetingTime: "12:00 PM CT",
  duration: "75 minutes",
  ndaRequired: true,
  journeyIntro:
    "Eight workshops, eight belts. You'll move from your first prompts to running professional AI teams that get real work done. Bring real workplace projects to every session — you'll leave with real, deployed wins.",
  coachingNote:
    "Office hours are held every Friday at 11 AM CT. Use the Coaching link to book a 1:1 with your trainer.",
};

// ---------------------------------------------------------------------------
// MOCK_SESSIONS — the AIEW3 curriculum with demo dates pinned around "today".
//
// The curriculum (titles, materials, homework prompts, belts) lives in
// src/lib/programs.js — single source of truth. This array layers the demo
// schedule on top so the page always looks "mid-program" (4 sessions done,
// session 5 up next, 3 upcoming) regardless of when it's opened.
//
// Real cohorts get their dates from cohort.sessionDates at create time; this
// constant is kept only for legacy imports and for the default IAHE demo
// cohort. New code should pull sessions via getSessionsForCohort(slug).
// ---------------------------------------------------------------------------
import { PROGRAMS } from "./programs.js";

// Pin a demo session date per session order so the IAHE demo always looks
// healthy: 4 done, session 5 = "this week", 3 upcoming.
const AIEW3_DEMO_OFFSETS = [-4, -3, -2, -1, 0, 1, 2, 3];

export const MOCK_SESSIONS = PROGRAMS[0].sessions.map((s, i) => ({
  ...s,
  date: weekdayDate(AIEW3_DEMO_OFFSETS[i] ?? i - 4),
  // Homework due dates land on the Tuesday after each session.
  homework: s.homework
    ? {
        ...s.homework,
        dueDate: weekdayDate((AIEW3_DEMO_OFFSETS[i] ?? i - 4) + 1, 2),
      }
    : s.homework,
}));

// Per-user state. Keys = user email; values = arrays of session orders / submissions.
// Replaced by Notion DBs (Session Progress + Homework Submissions) in live mode.
export const MOCK_PROGRESS = {};
export const MOCK_HOMEWORK = {};
// Shape: MOCK_HOMEWORK["user@x.com"] = { 1: { response, link, submittedAt }, ... }

// How many days before a session's date participants can open it.
// Change here + they update everywhere: session detail, cohort landing,
// and the participant-facing "unlocks on <date>" copy.
export const UNLOCK_LEAD_DAYS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Is the session materials/content available to the participant?
//
//   1. If a facilitator/admin has manually locked or unlocked it via the
//      per-cohort override (session.manualLockState), that wins.
//   2. Otherwise the session unlocks UNLOCK_LEAD_DAYS days before its
//      scheduled date. Before that, materials are hidden and the row
//      shows an "Unlocks <date>" note.
export function isSessionUnlocked(session, today = new Date()) {
  if (!session?.date) return true;
  if (session?.manualLockState === "locked") return false;
  if (session?.manualLockState === "unlocked") return true;
  const start = new Date(session.date).getTime();
  if (Number.isNaN(start)) return true;
  const unlockAt = start - UNLOCK_LEAD_DAYS * MS_PER_DAY;
  return today.getTime() >= unlockAt;
}

// The exact date at which a session unlocks under the default rule.
// Returns null when the session has no scheduled date. Used by the
// participant UI to show "Unlocks Mar 24" copy on locked rows.
export function getSessionUnlockDate(session) {
  if (!session?.date) return null;
  const start = new Date(session.date).getTime();
  if (Number.isNaN(start)) return null;
  return new Date(start - UNLOCK_LEAD_DAYS * MS_PER_DAY);
}
