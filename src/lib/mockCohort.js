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
//   `needsBorder` — true for very light belts (White, future Gray) so the
//                   badge gets a thin outline against light card backgrounds
//
// Picking one palette per belt keeps the system consistent regardless of
// which session is up next.
export const BELT_COLORS = {
  // Near-white. Needs a border to read on the warm off-white page background.
  White:  { hex: "#FFFFFF", text: "#0A0A0A", contrast: "#0A0A0A", needsBorder: true,  gradient: "linear-gradient(135deg, #E5E7EB 0%, #FFFFFF 100%)" },
  // Saturated yellow — clearly distinguishable from amber/orange.
  Yellow: { hex: "#FACC15", text: "#0A0A0A", contrast: "#0A0A0A", needsBorder: false, gradient: "linear-gradient(135deg, #EAB308 0%, #FDE047 100%)" },
  // Orange family — bright orange end, deep-orange start (NOT brown).
  Orange: { hex: "#F97316", text: "#FFFFFF", contrast: "#FFFFFF", needsBorder: false, gradient: "linear-gradient(135deg, #C2410C 0%, #FB923C 100%)" },
  Green:  { hex: "#22C55E", text: "#FFFFFF", contrast: "#FFFFFF", needsBorder: false, gradient: "linear-gradient(135deg, #14532D 0%, #22C55E 100%)" },
  Blue:   { hex: "#3B82F6", text: "#FFFFFF", contrast: "#FFFFFF", needsBorder: false, gradient: "linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)" },
  Purple: { hex: "#A855F7", text: "#FFFFFF", contrast: "#FFFFFF", needsBorder: false, gradient: "linear-gradient(135deg, #4C1D95 0%, #A855F7 100%)" },
  // True coffee/chocolate brown — desaturated, no orange in it.
  Brown:  { hex: "#78350F", text: "#FFFFFF", contrast: "#FFFFFF", needsBorder: false, gradient: "linear-gradient(135deg, #3F2317 0%, #78350F 100%)" },
  Black:  { hex: "#0A0A0A", text: "#FFFFFF", contrast: "#FFFFFF", needsBorder: false, gradient: "linear-gradient(135deg, #0A0A0A 0%, #374151 100%)" },
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

// AIEW3 curriculum (as of 5-21-26).
export const MOCK_SESSIONS = [
  {
    order: 1,
    belt: "White",
    title: "White — Full Role Matrices, Prioritized Use Cases, Change Management",
    summary:
      "Set the foundation. Introductions, BRAI Platform overview, expectations, and the Critical Thinking framework for AI-driven decision making. Build your Role Matrix and prioritize use cases by % time saved and ease.",
    date: weekdayDate(-4), /* 4 weeks ago — completed */
    durationMinutes: 75,
    videoUrl: "https://player.vimeo.com/video/76979871",
    materials: [
      { label: "White Belt Slides", url: "#", type: "pdf" },
      { label: "Role Matrix Template", url: "#", type: "doc" },
      { label: "Change Management Best-Practice Model", url: "#", type: "pdf" },
    ],
    objectives: [
      "Build your personal Role Matrix",
      "Prioritize 3 use cases by % time saved and ease of adoption",
      "Apply the Critical Thinking framework to one workplace decision",
    ],
    homework: {
      prompt:
        "Build your Role Matrix and pick your top 3 prioritized use cases (by % time saved × ease). Submit it as a Google Doc, Notion page, or paste the content directly below.",
      dueDate: weekdayDate(-3, 2), // Tuesday after session 1
      submissionType: "text-or-link",
    },
  },
  {
    order: 2,
    belt: "Yellow",
    title: "Yellow — Power AI-Driven Workflows",
    summary:
      "Move from one-off prompts to powerful workflows. Master Comprehensive Context and Prompt Building done by AI, plus AI Self-Enhancement (3 Accelerators).",
    date: weekdayDate(-3), /* 3 weeks ago — completed */
    durationMinutes: 75,
    videoUrl: "https://player.vimeo.com/video/76979871",
    materials: [
      { label: "Yellow Belt Slides", url: "#", type: "pdf" },
      { label: "Context & Prompt Building Accelerators", url: "#", type: "doc" },
    ],
    objectives: [
      "Run a Comprehensive Context workflow on one of your prioritized use cases",
      "Use the AI Self-Enhancement Accelerator to improve a prompt over 3 iterations",
      "Ship one working AI-driven workflow this week",
    ],
    homework: {
      prompt:
        "Apply one of the Yellow Belt Accelerators to a real workplace task. Share the original prompt, the final prompt after Self-Enhancement, and a 2-sentence reflection on what changed.",
      dueDate: weekdayDate(-2, 2),
      submissionType: "text-or-link",
    },
  },
  {
    order: 3,
    belt: "Orange",
    title: "Orange — 100,000 Experts Enhancing Every AI Workflow",
    summary:
      "Stop being a one-person operation. Integrate Expert Advisors into your workflows and learn how to draw out the right context for advanced work (2 Accelerators).",
    date: weekdayDate(-2), /* 2 weeks ago — completed */
    durationMinutes: 75,
    videoUrl: "https://player.vimeo.com/video/76979871",
    materials: [
      { label: "Orange Belt Slides", url: "#", type: "pdf" },
      { label: "Expert Advisor Templates", url: "#", type: "doc" },
    ],
    objectives: [
      "Convene a virtual panel of 3 Expert Advisors on a real decision",
      "Use the Context Drawing Accelerator to surface assumptions you didn't know you had",
      "Identify when to use one expert vs. a panel",
    ],
    homework: {
      prompt:
        "Run an Expert Advisor session on a real workplace question. Share who was on your panel, the question, and the most surprising insight that came out.",
      dueDate: weekdayDate(-1, 2),
      submissionType: "text-or-link",
    },
  },
  {
    order: 4,
    belt: "Green",
    title: "Green — High-Reliability Repeatable Workflows, Assistants, Agents",
    summary:
      "Build workflows you can trust to run again and again. Apply the Agent Building Templates and Best Practices to design assistants and agents for repeatable, high-stakes work.",
    date: weekdayDate(-1), /* last week — completed */
    durationMinutes: 75,
    videoUrl: "https://player.vimeo.com/video/76979871",
    materials: [
      { label: "Green Belt Slides", url: "#", type: "pdf" },
      { label: "Agent Building Templates", url: "#", type: "doc" },
      { label: "Reliability Checklist", url: "#", type: "pdf" },
    ],
    objectives: [
      "Specify one repeatable workflow using the Agent Building Template",
      "Build a custom assistant that captures your role's context",
      "Define reliability checks for a high-stakes workflow",
    ],
    homework: {
      prompt:
        "Build a custom assistant or repeatable workflow for one of your prioritized use cases. Share the spec, link to the assistant (or screenshot), and what reliability checks you put in place.",
      dueDate: weekdayDate(0, 2),
      submissionType: "text-or-link",
    },
  },
  {
    order: 5,
    belt: "Blue",
    title: "Blue — Professional AI Teams Doing Sophisticated Projects",
    summary:
      "Compose teams of professional AI personas to take on sophisticated projects — true 'insourcing' (Accelerator Collection). Move from individual contributor to AI manager.",
    date: weekdayDate(0), /* THIS week — UP NEXT */
    durationMinutes: 75,
    videoUrl: "https://player.vimeo.com/video/76979871",
    materials: [
      { label: "Blue Belt Slides", url: "#", type: "pdf" },
      { label: "AI Team Composition Guide", url: "#", type: "doc" },
    ],
    objectives: [
      "Compose a 3–5 role AI team for a real project",
      "Coordinate hand-offs between team members",
      "Identify when insourcing beats hiring or outsourcing",
    ],
    homework: {
      prompt:
        "Scope a sophisticated project that would normally take a small team. Describe the AI team you'd compose (roles, responsibilities, hand-offs) and what the first hand-off looks like.",
      dueDate: weekdayDate(1, 2),
      submissionType: "text-or-link",
    },
  },
  {
    order: 6,
    belt: "Purple",
    title: "Purple — Autonomous Agent Functions",
    summary:
      "Agents that actually do the work. Cover autonomous task execution, deep autonomous research, scheduled/recurring agents, custom personas, connectors, computer/browser controls, persistent workspace context, artifact/doc/app creation, and coding tools.",
    date: weekdayDate(1), /* next week — locked */
    durationMinutes: 75,
    videoUrl: "https://player.vimeo.com/video/76979871",
    materials: [
      { label: "Purple Belt Slides", url: "#", type: "pdf" },
      { label: "Autonomous Agent Patterns", url: "#", type: "doc" },
    ],
    objectives: [
      "Launch a scheduled/recurring agent for one weekly task",
      "Run a deep autonomous research project end-to-end",
      "Connect an agent to a real system (calendar, Slack, file system) safely",
    ],
    homework: {
      prompt:
        "Set up one autonomous agent that runs without you. Share what it does, what trigger fires it, and what it produced on its first run.",
      dueDate: weekdayDate(2, 2),
      submissionType: "text-or-link",
    },
  },
  {
    order: 7,
    belt: "Brown",
    title: "Brown — Agent Quality Assurance and Orchestration",
    summary:
      "Once you have agents working, you need to keep them working. Cover Agent Quality Assurance and Orchestration — the prep for transitioning into a CEO AI OS posture.",
    date: weekdayDate(2), /* 2 weeks out — locked */
    durationMinutes: 75,
    videoUrl: "https://player.vimeo.com/video/76979871",
    materials: [
      { label: "Brown Belt Slides", url: "#", type: "pdf" },
      { label: "Agent QA Framework", url: "#", type: "doc" },
    ],
    objectives: [
      "Define QA checks for one of your agents",
      "Set up orchestration across 2+ agents",
      "Draft your personal AI OS structure",
    ],
    homework: {
      prompt:
        "Document the QA checks and orchestration for one of your live agents. Include the failure modes you're guarding against and the recovery action for each.",
      dueDate: weekdayDate(3, 2),
      submissionType: "text-or-link",
    },
  },
  {
    order: 8,
    belt: "Black",
    title: "Black — Progress, Plans, Getting Future Results",
    summary:
      "Capstone. Reflect on the journey, commit to forward plans, and earn your Black Belt. Custom assistants remember how to behave, agents do the work, scheduled agents do work later, connected agents touch real systems — yours, now.",
    date: weekdayDate(3), /* 3 weeks out — capstone, locked */
    durationMinutes: 75,
    videoUrl: "https://player.vimeo.com/video/76979871",
    materials: [
      { label: "Black Belt Slides", url: "#", type: "pdf" },
      { label: "Capstone Submission Template", url: "#", type: "doc" },
      { label: "Certification Guide", url: "#", type: "pdf" },
    ],
    objectives: [
      "Present your top 3 AI-empowered workflows from the program",
      "Capture cumulative impact in the AI Journal",
      "Commit to a 90-day plan to keep compounding gains",
    ],
    homework: {
      prompt:
        "Capstone. Submit your Black Belt portfolio: 3 deployed workflows, total time saved, and your 90-day plan. Link a Google Doc / Notion page with the full write-up.",
      dueDate: weekdayDate(4, 2),
      submissionType: "text-or-link",
    },
  },
];

// Per-user state. Keys = user email; values = arrays of session orders / submissions.
// Replaced by Notion DBs (Session Progress + Homework Submissions) in live mode.
export const MOCK_PROGRESS = {};
export const MOCK_HOMEWORK = {};
// Shape: MOCK_HOMEWORK["user@x.com"] = { 1: { response, link, submittedAt }, ... }

export function isSessionUnlocked(session, today = new Date()) {
  if (!session?.date) return true;
  return new Date(session.date) <= today;
}
