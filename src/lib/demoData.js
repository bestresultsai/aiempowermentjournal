// ---------------------------------------------------------------------------
// Demo / preview mode.
// Visiting any URL with `?demo=1` activates demo mode: a fake "Josue Acuna"
// user is signed in, and the cohort dashboard is populated with mock journal
// entries scoped to that user (so the streak badge + cohort metrics light up).
//
// Demo mode is intended for design previews. It's NOT a real auth path —
// nothing about it touches the magic-link / JWT / Notion auth flow.
// ---------------------------------------------------------------------------

export const DEMO_USER = {
  email: "josueacuna@me.com",
  name: "Josue Acuna",
  role: "individual",
  organization: "BestResults.AI",
  assignedCohorts: ["IAHE Cohort"],
  userId: "demo-josue-acuna",
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
// Demo mode helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "brai_demo_mode";

export function isDemoModeActive() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function activateDemoMode() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
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
