// ---------------------------------------------------------------------------
// Demo / preview mode.
// Visiting URLs with a `?demo=` query param activates demo mode:
//   ?demo=1           → single-cohort participant ("Josue Acuna", IAHE cohort)
//   ?demo=multi       → multi-cohort participant — enrolled in 3 cohorts.
//                       Used to preview the cohort switcher in NavBar.
//   ?demo=onboarding  → fresh participant who has NOT completed onboarding.
//                       Lands on /welcome so the wizard can be previewed.
//
// In all demo modes the data is mocked locally — nothing touches the real
// magic-link / JWT / Notion auth flow.
// ---------------------------------------------------------------------------

// Base demo user — already onboarded. The AuthContext clones this and clears
// `onboardingCompletedAt` when the URL says ?demo=onboarding so the gate
// fires the wizard instead of the normal app.
export const DEMO_USER = {
  email: "josueacuna@me.com",
  name: "Josue Acuna",
  // Default to participant — admin demo modes override this via DEMO_USER_OVERRIDES.
  role: "participant",
  organization: "BestResults.AI",
  assignedCohorts: ["IAHE Cohort"],
  userId: "demo-josue-acuna",
  // Profile fields the wizard captures. Pre-populated for the already-onboarded
  // demo flows so /settings has something to render.
  title: "Director of AI Strategy",
  linkedin: "https://www.linkedin.com/in/josueacuna/",
  whyAi: "I want healthcare educators to redirect 10+ hours a week away from busywork and toward the things only humans can do.",
  mainGoal: "Ship our internal AI Empowerment platform and onboard the first 30 IAHE participants before the end of Q2.",
  headshotUrl: null, // when null, NavBar/Settings fall back to initials avatar
  onboardingCompletedAt: "2026-05-15T10:30:00.000Z",
};

// Helper — N days ago as ISO date.
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 30, 0, 0); // mid-morning so it groups predictably by week
  return d.toISOString();
}

// 5 mock entries from the demo user, plus a few from peer participants so the
// cohort dashboard's "By Participant" + "Innovation Spotlight" sections populate.
export const DEMO_JOURNAL_ENTRIES = [
  // Demo user — 5 entries across 5 consecutive weeks → 5-week streak
  {
    id: "demo-1",
    participantName: DEMO_USER.name,
    participantEmail: DEMO_USER.email,
    cohort: "IAHE Cohort",
    organization: DEMO_USER.organization,
    date: daysAgo(2),
    title: "Cohort retention analysis from raw Notion data",
    description: "Asked Claude to pull cohort retention stats, build pivot tables, and write the exec summary — all from a messy Notion export.",
    timeBeforeAI: 240,
    timeWithAI: 35,
    frequency: "Multiple times a month",
    hourlyRate: 75,
    qualityVsOriginal: "Better",
    innovationTitle: "",
    innovationDescription: "",
  },
  {
    id: "demo-2",
    participantName: DEMO_USER.name,
    participantEmail: DEMO_USER.email,
    cohort: "IAHE Cohort",
    organization: DEMO_USER.organization,
    date: daysAgo(9),
    title: "Custom GPT for facilitator notes after every session",
    description: "Built a GPT that takes raw post-session notes, structures them, and drafts the participant follow-up email.",
    timeBeforeAI: 45,
    timeWithAI: 8,
    frequency: "Once a week",
    hourlyRate: 75,
    qualityVsOriginal: "Better",
    innovationTitle: "Session Recap Agent",
    innovationDescription: "Turns 5 minutes of voice notes into a structured recap + personalized email per participant. Saves ~30 min after every workshop.",
  },
  {
    id: "demo-3",
    participantName: DEMO_USER.name,
    participantEmail: DEMO_USER.email,
    cohort: "IAHE Cohort",
    organization: DEMO_USER.organization,
    date: daysAgo(16),
    title: "Repurposed cohort transcripts into a content calendar",
    description: "Fed Gong transcripts into Claude to extract recurring participant questions → built a 6-week content calendar of LinkedIn posts.",
    timeBeforeAI: 180,
    timeWithAI: 25,
    frequency: "Multiple times a quarter",
    hourlyRate: 75,
    qualityVsOriginal: "Better",
    innovationTitle: "",
    innovationDescription: "",
  },
  {
    id: "demo-4",
    participantName: DEMO_USER.name,
    participantEmail: DEMO_USER.email,
    cohort: "IAHE Cohort",
    organization: DEMO_USER.organization,
    date: daysAgo(23),
    title: "AI-assisted competitive teardown",
    description: "Built a side-by-side feature matrix of LearnUpon, Thinkific, and Mighty Networks in a single afternoon.",
    timeBeforeAI: 360,
    timeWithAI: 60,
    frequency: "Once a quarter",
    hourlyRate: 75,
    qualityVsOriginal: "Equal",
    innovationTitle: "",
    innovationDescription: "",
  },
  {
    id: "demo-5",
    participantName: DEMO_USER.name,
    participantEmail: DEMO_USER.email,
    cohort: "IAHE Cohort",
    organization: DEMO_USER.organization,
    date: daysAgo(30),
    title: "Magic-link auth design doc",
    description: "Drafted the entire auth design doc + sequence diagram in 45 minutes.",
    timeBeforeAI: 180,
    timeWithAI: 45,
    frequency: "Once a year",
    hourlyRate: 75,
    qualityVsOriginal: "Better",
    innovationTitle: "",
    innovationDescription: "",
  },

  // A handful of peer participants — so "By Participant" has rows and the
  // Innovation Spotlight has multiple authors.
  {
    id: "demo-peer-1",
    participantName: "Sarah Henning",
    participantEmail: "sarah.henning@iahe.example",
    cohort: "IAHE Cohort",
    organization: "Iowa Methodist",
    date: daysAgo(4),
    title: "Auto-drafted credentialing intake emails",
    description: "Cut a recurring 4-hour task to under 25 minutes using a custom GPT.",
    timeBeforeAI: 240,
    timeWithAI: 25,
    frequency: "Once a week",
    hourlyRate: 75,
    qualityVsOriginal: "Better",
    innovationTitle: "Credentialing Drafting Agent",
    innovationDescription: "Auto-drafts intake emails for new credentialing requests, pulls relevant policy snippets, and flags missing fields before send.",
  },
  {
    id: "demo-peer-2",
    participantName: "Derek Kim",
    participantEmail: "derek.kim@iahe.example",
    cohort: "IAHE Cohort",
    organization: "SUNY Healthcare",
    date: daysAgo(6),
    title: "Plain-language patient education rewrite",
    description: "Built an internal GPT that rewrites complex medical content at a 6th-grade reading level.",
    timeBeforeAI: 60,
    timeWithAI: 5,
    frequency: "Multiple times a week",
    hourlyRate: 75,
    qualityVsOriginal: "Better",
    innovationTitle: "Educator Editor",
    innovationDescription: "Plain-language rewriter for patient-facing materials. Used by 14 colleagues at SUNY Healthcare.",
  },
  {
    id: "demo-peer-3",
    participantName: "Maria Alvarez",
    participantEmail: "maria.alvarez@iahe.example",
    cohort: "IAHE Cohort",
    organization: "UCLA Health",
    date: daysAgo(11),
    title: "Grant proposal red team",
    description: "Spun up three AI personas (skeptical reviewer, budget hawk, patient advocate) to pressure-test a grant draft.",
    timeBeforeAI: 120,
    timeWithAI: 30,
    frequency: "Once a quarter",
    hourlyRate: 75,
    qualityVsOriginal: "Better",
    innovationTitle: "Grant Pod",
    innovationDescription: "A 3-role agent team that drafts, reviews, and red-teams grant proposals end-to-end.",
  },
  {
    id: "demo-peer-4",
    participantName: "Raj Patel",
    participantEmail: "raj.patel@iahe.example",
    cohort: "IAHE Cohort",
    organization: "Mayo Clinic Education",
    date: daysAgo(14),
    title: "Weekly clinical learning digest",
    description: "Automated a Friday digest from Slack + email + Notion into a polished one-pager.",
    timeBeforeAI: 75,
    timeWithAI: 10,
    frequency: "Once a week",
    hourlyRate: 75,
    qualityVsOriginal: "Equal",
    innovationTitle: "",
    innovationDescription: "",
  },
];

// ---------------------------------------------------------------------------
// Multi-cohort demo identity.
//
// Three mock cohorts used by ?demo=multi. They all map back to MOCK_COHORT's
// session data in mock mode (so navigating into any of them shows a working
// cohort page). What differs is the cohort identity — name, organization,
// program. Enough to make the switcher feel real.
// ---------------------------------------------------------------------------
export const DEMO_COHORTS = [
  {
    facilitator: {
      id: "fac-mike",
      name: "Mike Burkesmith",
      email: "mike@bestresults.ai",
      headshotUrl: "https://48031831.fs1.hubspotusercontent-na1.net/hubfs/48031831/Design/Headshots/Mike%20Burkesmith%20Headshot%201X1.png",
    },
    slug: "iahe-aiew3-2026q1",
    name: "AIEW3 — IAHE Cohort",
    methodName: "AI Empowerment Method",
    programCode: "AIEW3",
    organization: {
      id: "org-iahe",
      name: "International Alliance of Healthcare Educators",
      shortName: "IAHE",
    },
  },
  {
    facilitator: { id: "fac-jess", name: "Jess Lee", email: "jess@bestresults.ai" },
    slug: "mayo-aiew3-2026q2",
    name: "AIEW3 — Mayo Clinic Education",
    methodName: "AI Empowerment Method",
    programCode: "AIEW3",
    organization: {
      id: "org-mayo",
      name: "Mayo Clinic Education",
      shortName: "Mayo Clinic",
    },
  },
  {
    facilitator: { id: "fac-carlos", name: "Carlos Mendez", email: "carlos@bestresults.ai" },
    slug: "ucla-apfw-2026q1",
    name: "APFW — UCLA Health",
    methodName: "AI Empowerment Method",
    programCode: "APFW",
    organization: {
      id: "org-ucla",
      name: "UCLA Health",
      shortName: "UCLA",
    },
  },
];

// ---------------------------------------------------------------------------
// Demo mode helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "brai_demo_mode";
// Stored values:
//   "1"           — single-cohort participant
//   "multi"       — multi-cohort participant (switcher visible)
//   "onboarding"  — un-onboarded participant (lands on /welcome)
//   "super"       — Super Admin (Josue) — sees every cohort + org
//   "admin"       — BRAI staff admin — sees every cohort + org
//   "org"         — IAHE org admin — sees only IAHE cohorts
//   "facilitator" — Mike Burkesmith — sees only IAHE cohort, can grade

const VALID_VALUES = new Set([
  "1", "multi", "onboarding", "super", "admin", "org", "facilitator",
]);

export function isDemoModeActive() {
  if (typeof window === "undefined") return false;
  try {
    return VALID_VALUES.has(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
}

function readDemoFlavor() {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return VALID_VALUES.has(v) ? v : null;
  } catch {
    return null;
  }
}

export function isMultiCohortDemo()  { return readDemoFlavor() === "multi"; }
export function isOnboardingDemo()   { return readDemoFlavor() === "onboarding"; }
export function isSuperDemo()        { return readDemoFlavor() === "super"; }
export function isAdminDemo()        { return readDemoFlavor() === "admin"; }
export function isOrgDemo()          { return readDemoFlavor() === "org"; }
export function isFacilitatorDemo()  { return readDemoFlavor() === "facilitator"; }

// True when the demo flavor is any admin-tier role.
export function isAnyAdminDemo() {
  const v = readDemoFlavor();
  return v === "super" || v === "admin" || v === "org" || v === "facilitator";
}

export function getDemoFlavor() { return readDemoFlavor(); }

export function activateDemoMode({
  multi = false,
  onboarding = false,
  role = null, // "super" | "admin" | "org" | "facilitator"
} = {}) {
  if (typeof window === "undefined") return;
  let value = "1";
  if (role && ["super", "admin", "org", "facilitator"].includes(role)) value = role;
  else if (onboarding) value = "onboarding";
  else if (multi) value = "multi";
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}

export function deactivateDemoMode() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Demo user templates for each admin role. The AuthContext spreads DEMO_USER
// then merges these to override role + scoping fields.
// ---------------------------------------------------------------------------

export const DEMO_USER_OVERRIDES = {
  super: {
    name: "Josue Acuna",
    email: "josueacuna@me.com",
    title: "Founder, BestResults.AI",
    organization: "BestResults.AI",
    role: "super",
    assignedOrgs: [],
    assignedCohorts: [],
  },
  admin: {
    name: "Alex Rivera",
    email: "alex.rivera@bestresults.ai",
    title: "Head of Programs",
    organization: "BestResults.AI",
    role: "admin",
    assignedOrgs: [],
    assignedCohorts: [],
  },
  org: {
    name: "Sarah Patel",
    email: "sarah.patel@iahe.org",
    title: "Director of Education",
    organization: "IAHE",
    role: "org",
    assignedOrgs: ["org-iahe"],
    assignedCohorts: [],
  },
  facilitator: {
    name: "Mike Burkesmith",
    email: "mike@bestresults.ai",
    title: "Lead Facilitator, BestResults.AI",
    organization: "BestResults.AI",
    role: "facilitator",
    assignedOrgs: [],
    assignedCohorts: ["iahe-aiew3-2026q1"],
  },
};
