// ---------------------------------------------------------------------------
// Mock data for the BBWS cohort + sessions module.
// Swap to live Notion data by setting USE_MOCK_DATA = false in cohortApi.js.
// Session titles below are PLACEHOLDERS — replace with the actual BBWS
// curriculum once Mike/Lee confirm the syllabus.
// ---------------------------------------------------------------------------

export const MOCK_COHORT = {
  id: "cohort-iahe-bbws-2026q1",
  slug: "iahe-bbws-2026q1",
  name: "AI BlackBelt — IAHE Cohort",
  programCode: "BBWS",
  programName: "AI BlackBelt Workshop Series",
  organization: {
    id: "org-iahe",
    name: "Iowa Association of Health Executives",
    shortName: "IAHE",
  },
  trainer: {
    name: "Leila Anderson",
    title: "BestResults.AI Trainer",
    email: "leila@bestresults.ai",
  },
  startDate: "2026-01-14",
  endDate: "2026-03-25",
  meetingDay: "Wednesdays",
  meetingTime: "12:00 PM CT",
  duration: "75 minutes",
  ndaRequired: true,
  journeyIntro:
    "Over the next 10 weeks you'll move from AI-curious to AI-empowered. Every session pairs hands-on practice with a workplace-ready use case. Bring real work; leave with real wins.",
  coachingNote:
    "Office hours are held every Friday at 11 AM CT. Use the Coaching link to book a 1:1 with your trainer.",
};

export const MOCK_SESSIONS = [
  {
    order: 1,
    title: "Welcome & AI Foundations",
    summary:
      "Set the stage for the program. How modern AI actually works, what it's good and bad at, and how to think about it as a teammate rather than a tool.",
    date: "2026-01-14",
    durationMinutes: 75,
    videoUrl: "https://player.vimeo.com/video/76979871",
    materials: [
      { label: "Session 1 Slides (PDF)", url: "#", type: "pdf" },
      { label: "Foundations Worksheet", url: "#", type: "doc" },
    ],
    objectives: [
      "Explain what an LLM is in plain language",
      "Recognize where AI fits in your daily workflow",
      "Set your personal program goal",
    ],
  },
  {
    order: 2,
    title: "Prompt Engineering Fundamentals",
    summary:
      "The single highest-leverage skill in AI. Frameworks for writing prompts that actually work, plus what to do when they don't.",
    date: "2026-01-21",
    durationMinutes: 75,
    videoUrl: "https://player.vimeo.com/video/76979871",
    materials: [
      { label: "Prompt Patterns Cheatsheet", url: "#", type: "pdf" },
      { label: "10 Practice Prompts", url: "#", type: "doc" },
    ],
    objectives: [
      "Apply the CRAFT prompt framework",
      "Diagnose why a prompt is failing",
      "Build a reusable prompt library for your role",
    ],
  },
  {
    order: 3,
    title: "Building Your First AI Workflow",
    summary:
      "Move from one-off prompts to repeatable, multi-step workflows. Pick a real task and rebuild it with AI in the loop.",
    date: "2026-01-28",
    durationMinutes: 75,
    videoUrl: "https://player.vimeo.com/video/76979871",
    materials: [
      { label: "Workflow Canvas Template", url: "#", type: "doc" },
    ],
    objectives: [
      "Map a current workflow into discrete steps",
      "Identify which steps AI should own vs. which you should",
      "Ship one new AI-assisted workflow this week",
    ],
  },
  {
    order: 4,
    title: "AI for Research & Synthesis",
    summary:
      "Turn AI into your research analyst. Long-context reading, source citation, comparison tables, and the safety checks you need.",
    date: "2026-02-04",
    durationMinutes: 75,
    videoUrl: "https://player.vimeo.com/video/76979871",
    materials: [
      { label: "Research Workflow Guide", url: "#", type: "pdf" },
    ],
    objectives: [
      "Run a multi-document synthesis",
      "Verify AI-generated sources",
      "Decide when NOT to trust the model",
    ],
  },
  {
    order: 5,
    title: "AI for Writing & Communication",
    summary:
      "Your voice, amplified. Drafting, editing, tone control, and how to keep AI-assisted writing sounding like you.",
    date: "2026-02-11",
    durationMinutes: 75,
    videoUrl: "https://player.vimeo.com/video/76979871",
    materials: [
      { label: "Voice & Tone Guide", url: "#", type: "pdf" },
    ],
    objectives: [
      "Build a personal style prompt",
      "Edit AI output without flattening it",
      "Use AI for executive-level communication",
    ],
  },
  {
    order: 6,
    title: "AI for Data & Analysis",
    summary:
      "Spreadsheets stop being scary. Use AI to clean, summarize, and visualize data without writing code.",
    date: "2026-02-18",
    durationMinutes: 75,
    videoUrl: "https://player.vimeo.com/video/76979871",
    materials: [
      { label: "Data Prompts Workbook", url: "#", type: "doc" },
    ],
    objectives: [
      "Clean a messy dataset with AI",
      "Generate the right chart for the question",
      "Spot when AI is hallucinating numbers",
    ],
  },
  {
    order: 7,
    title: "AI for Decision Support",
    summary:
      "Frameworks for using AI to pressure-test your thinking — not to make decisions for you.",
    date: "2026-02-25",
    durationMinutes: 75,
    videoUrl: "https://player.vimeo.com/video/76979871",
    materials: [
      { label: "Decision Brief Template", url: "#", type: "doc" },
    ],
    objectives: [
      "Use AI to argue both sides of a decision",
      "Write a one-page decision brief with AI",
      "Avoid the over-reliance trap",
    ],
  },
  {
    order: 8,
    title: "Custom GPTs & Agents",
    summary:
      "Stop pasting context every time. Build a custom GPT (or equivalent) that knows your work and shows up ready.",
    date: "2026-03-04",
    durationMinutes: 75,
    videoUrl: "https://player.vimeo.com/video/76979871",
    materials: [
      { label: "Custom GPT Build Guide", url: "#", type: "pdf" },
    ],
    objectives: [
      "Scope a custom GPT for your role",
      "Upload knowledge files safely",
      "Share a GPT with your team",
    ],
  },
  {
    order: 9,
    title: "AI Policy & Governance",
    summary:
      "What's safe to share, what isn't, and how to give your organization (or your team) a sensible AI policy.",
    date: "2026-03-11",
    durationMinutes: 75,
    videoUrl: "https://player.vimeo.com/video/76979871",
    materials: [
      { label: "Policy Framework One-Pager", url: "#", type: "pdf" },
    ],
    objectives: [
      "Classify data sensitivity for AI use",
      "Draft a starter AI policy",
      "Know when to escalate to legal",
    ],
  },
  {
    order: 10,
    title: "Capstone Project & Certification",
    summary:
      "Pull it all together. Present the AI-empowered workflow you built during the program and earn your BlackBelt.",
    date: "2026-03-25",
    durationMinutes: 75,
    videoUrl: "https://player.vimeo.com/video/76979871",
    materials: [
      { label: "Capstone Submission Template", url: "#", type: "doc" },
      { label: "Certification Guide", url: "#", type: "pdf" },
    ],
    objectives: [
      "Present a working AI workflow",
      "Capture impact in the AI Journal",
      "Plan what's next after the program",
    ],
  },
];

// Mock per-user progress. Keyed by user email so the in-memory store mimics
// what the live Session Progress DB will look like.
export const MOCK_PROGRESS = {
  // "demo@bestresults.ai": [1, 2, 3]
};

export function isSessionUnlocked(session, today = new Date()) {
  if (!session?.date) return true;
  return new Date(session.date) <= today;
}
