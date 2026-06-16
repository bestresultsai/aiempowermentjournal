import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Programs catalog — the source of truth for curriculum + belt taxonomy.
//
// A PROGRAM is the reusable curriculum template a cohort runs. It owns:
//
//   code                    — short identifier ("AIEW3", "APFW")
//   name                    — human-readable program name
//   methodName              — the umbrella framework label
//   tagline                 — short paragraph for the cohort hero / Journey page
//   sessionDurationMinutes  — program-level default session length
//   belts                   — ordered sequence of belt color names from
//                             BELT_COLORS, one per session. Programs that
//                             don't use belts pass `null` and the UI falls
//                             back to plain session numbers
//   sessions                — the curriculum, one entry per session. Each
//                             entry describes the session content (title,
//                             materials, homework prompt) but has NO date —
//                             dates are per-cohort
//
// A COHORT picks a program (via cohort.programCode), then overrides:
//   - sessionDates  — when each session actually runs
//   - zoomLink      — per-cohort default Zoom (or per-session override)
//   - meetingDay/Time/timeZone
//
// Adding a new program here automatically flows through every consumer:
// admin views, participant views, calendar, gamification, certificates.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// AIEW3 — Best Results AI Empowerment Workshop Series 3.0 (8 sessions)
// ---------------------------------------------------------------------------
const AIEW3_BELTS = ["White", "Yellow", "Orange", "Green", "Blue", "Purple", "Brown", "Black"];

const AIEW3_SESSIONS = [
  {
    order: 1,
    belt: "White",
    title: "White — Full Role Matrices, Prioritized Use Cases, Change Management",
    summary:
      "Set the foundation. Introductions, BRAI Platform overview, expectations, and the Critical Thinking framework for AI-driven decision making. Build your Role Matrix and prioritize use cases by % time saved and ease.",
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
      // Due date is computed at the cohort level (session date + cadence)
      submissionType: "text-or-link",
    },
  },
  {
    order: 2,
    belt: "Yellow",
    title: "Yellow — Power AI-Driven Workflows",
    summary:
      "Move from one-off prompts to powerful workflows. Master Comprehensive Context and Prompt Building done by AI, plus AI Self-Enhancement (3 Accelerators).",
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
      submissionType: "text-or-link",
    },
  },
  {
    order: 3,
    belt: "Orange",
    title: "Orange — 100,000 Experts Enhancing Every AI Workflow",
    summary:
      "Stop being a one-person operation. Integrate Expert Advisors into your workflows and learn how to draw out the right context for advanced work (2 Accelerators).",
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
      submissionType: "text-or-link",
    },
  },
  {
    order: 4,
    belt: "Green",
    title: "Green — High-Reliability Repeatable Workflows, Assistants, Agents",
    summary:
      "Build workflows you can trust to run again and again. Apply the Agent Building Templates and Best Practices to design assistants and agents for repeatable, high-stakes work.",
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
      submissionType: "text-or-link",
    },
  },
  {
    order: 5,
    belt: "Blue",
    title: "Blue — Professional AI Teams Doing Sophisticated Projects",
    summary:
      "Compose teams of professional AI personas to take on sophisticated projects — true 'insourcing' (Accelerator Collection). Move from individual contributor to AI manager.",
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
      submissionType: "text-or-link",
    },
  },
  {
    order: 6,
    belt: "Purple",
    title: "Purple — Autonomous Agent Functions",
    summary:
      "Agents that actually do the work. Cover autonomous task execution, deep autonomous research, scheduled/recurring agents, custom personas, connectors, computer/browser controls, persistent workspace context, artifact/doc/app creation, and coding tools.",
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
      submissionType: "text-or-link",
    },
  },
  {
    order: 7,
    belt: "Brown",
    title: "Brown — Agent Quality Assurance and Orchestration",
    summary:
      "Once you have agents working, you need to keep them working. Cover Agent Quality Assurance and Orchestration — the prep for transitioning into a CEO AI OS posture.",
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
      submissionType: "text-or-link",
    },
  },
  {
    order: 8,
    belt: "Black",
    title: "Black — Progress, Plans, Getting Future Results",
    summary:
      "Capstone. Reflect on the journey, commit to forward plans, and earn your Black Belt. Custom assistants remember how to behave, agents do the work, scheduled agents do work later, connected agents touch real systems — yours, now.",
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
      submissionType: "text-or-link",
    },
  },
];

// ---------------------------------------------------------------------------
// APFW — AI Power Foundations Workshop (10 sessions)
//
// A LONGER program seeded to PROVE the platform handles variable lengths.
// Uses 10 belts: AIEW3's 8 plus Red (between Brown and Black) and Gold (at
// the very end as the capstone). Drives every UI element that derived its
// "8" from MOCK_SESSIONS.length — if anything still hardcodes 8, an APFW
// cohort will visibly break.
// ---------------------------------------------------------------------------
const APFW_BELTS = ["White", "Yellow", "Orange", "Green", "Blue", "Purple", "Brown", "Red", "Black", "Gold"];

const APFW_SESSIONS = [
  { order: 1,  belt: "White",  title: "White — AI Foundations + Mindset",            summary: "Set the foundation. Tools overview, posture, expectations.", durationMinutes: 60, materials: [], objectives: ["Set up your AI stack", "Understand the maturity ladder"], homework: { prompt: "Pick one workflow you'd love to automate. Describe it in 3 lines.", submissionType: "text-or-link" } },
  { order: 2,  belt: "Yellow", title: "Yellow — Prompting Like a Pro",                summary: "Move from one-off prompts to comprehensive context and self-enhancement.", durationMinutes: 60, materials: [], objectives: ["Run a Comprehensive Context workflow", "Ship one working prompt"], homework: { prompt: "Apply one prompting accelerator to a real task.", submissionType: "text-or-link" } },
  { order: 3,  belt: "Orange", title: "Orange — Expert Advisors",                     summary: "Convene a panel of AI experts to challenge your thinking.", durationMinutes: 60, materials: [], objectives: ["Run an Expert Advisor session"], homework: { prompt: "Run an Expert Advisor session on a real decision.", submissionType: "text-or-link" } },
  { order: 4,  belt: "Green",  title: "Green — Reliable Workflows",                   summary: "Build workflows you can trust to run again and again.", durationMinutes: 60, materials: [], objectives: ["Build a custom assistant"], homework: { prompt: "Build a custom assistant for one prioritized use case.", submissionType: "text-or-link" } },
  { order: 5,  belt: "Blue",   title: "Blue — Professional AI Teams",                 summary: "Compose teams of AI personas for sophisticated projects.", durationMinutes: 60, materials: [], objectives: ["Compose a 3-role AI team"], homework: { prompt: "Scope a project that needs a small AI team.", submissionType: "text-or-link" } },
  { order: 6,  belt: "Purple", title: "Purple — Autonomous Agents",                   summary: "Agents that actually do the work.", durationMinutes: 60, materials: [], objectives: ["Launch one scheduled agent"], homework: { prompt: "Set up one autonomous agent.", submissionType: "text-or-link" } },
  { order: 7,  belt: "Brown",  title: "Brown — Agent QA + Orchestration",             summary: "Keep agents working over time.", durationMinutes: 60, materials: [], objectives: ["Define QA for one agent"], homework: { prompt: "Document QA + orchestration for one live agent.", submissionType: "text-or-link" } },
  { order: 8,  belt: "Red",    title: "Red — AI Risk + Governance",                   summary: "Risk frameworks, governance posture, ethical guardrails.", durationMinutes: 60, materials: [], objectives: ["Draft a personal AI governance policy"], homework: { prompt: "Draft your team's AI governance policy.", submissionType: "text-or-link" } },
  { order: 9,  belt: "Black",  title: "Black — Capstone Project",                     summary: "Ship a project end-to-end using everything from the program.", durationMinutes: 75, materials: [], objectives: ["Ship your capstone project"], homework: { prompt: "Submit your capstone project.", submissionType: "text-or-link" } },
  { order: 10, belt: "Gold",   title: "Gold — Graduation + 90-Day Plan",              summary: "Reflect, commit to a forward plan, earn your Gold Belt.", durationMinutes: 60, materials: [], objectives: ["Commit to a 90-day forward plan"], homework: { prompt: "Submit your 90-day plan + reflection.", submissionType: "text-or-link" } },
];

// ---------------------------------------------------------------------------
// PROGRAMS catalog — every program the platform knows about.
// ---------------------------------------------------------------------------

// Default certificate config every program inherits unless it overrides.
// Three signatories: the cohort's facilitator (dynamic), Mike Burkesmith
// (CEO), Lee Mosby (Co-founder). Slots tagged "facilitator" pull the
// cohort's actual facilitator at generation time.
export const DEFAULT_CERTIFICATE = {
  signatories: [
    { slot: "facilitator", title: "Facilitator" },
    { slot: "static", name: "Mike Burkesmith", title: "CEO, BestResults.AI" },
    { slot: "static", name: "Lee Truax", title: "Co-founder, BestResults.AI" },
  ],
  // "all-sessions-completed" — participant marked every session done
  // "homework-required"      — every session has a submitted homework
  // "manual"                 — facilitator awards manually (no auto unlock)
  completionCriteria: "all-sessions-completed",
  bodyCopy:
    "has successfully completed the program and demonstrated mastery of every belt in the AI Empowerment Method.",
};

export const PROGRAMS = [
  {
    code: "AIEW3",
    name: "AI Empowerment Workshop Series 3.0",
    methodName: "AI Empowerment Method",
    // tagline is the short paragraph shown on the cohort hero / Journey
    // page. Lives on the program so adding a new program ships its own copy.
    tagline:
      "Eight workshops, eight belts. You'll move from your first prompts to running professional AI teams that get real work done. Bring real workplace projects to every session — you'll leave with real, deployed wins.",
    // Program-level default session length. Sessions can still override
    // individually via session.durationMinutes; cohorts can derive their
    // calendar from this.
    sessionDurationMinutes: 75,
    belts: AIEW3_BELTS,
    sessions: AIEW3_SESSIONS,
    get sessionsCount() { return AIEW3_SESSIONS.length; },
    certificate: DEFAULT_CERTIFICATE,
  },
  {
    code: "APFW",
    name: "AI Power Foundations Workshop",
    methodName: "AI Empowerment Method",
    tagline:
      "Ten focused sessions to take your team from curious to confident with AI. Build the foundations, ship real workflows, and walk away with a playbook you can run with on day one.",
    sessionDurationMinutes: 75,
    belts: APFW_BELTS,
    sessions: APFW_SESSIONS,
    get sessionsCount() { return APFW_SESSIONS.length; },
    certificate: DEFAULT_CERTIFICATE,
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers — single source of truth for "what curriculum does this
// cohort run?" Every admin/participant component should go through these
// rather than reading MOCK_SESSIONS directly.
// ---------------------------------------------------------------------------

// Returns a program by code, preferring any admin-edited overlay (live UI
// edits) over the seeded baseline. Falls through to the seed-only PROGRAMS
// array so non-admin paths that pre-date overlays still resolve.
export function getProgramByCode(code) {
  if (!code) return null;
  const overlayed = getAllProgramsForAdmin().find((p) => p.code === code);
  if (overlayed) return overlayed;
  return PROGRAMS.find((p) => p.code === code) || null;
}

// Returns the program assigned to a cohort. Falls back to AIEW3 for legacy
// cohorts that pre-date the programs catalog. Admin edits to AIEW3 (or any
// other code) flow through here automatically because getProgramByCode now
// reads the overlay-merged catalog.
export function getProgramForCohort(cohort) {
  if (!cohort) return null;
  const byCode = cohort.programCode ? getProgramByCode(cohort.programCode) : null;
  return byCode || getProgramByCode("AIEW3") || PROGRAMS[0];
}

export function getSessionsForProgram(program) {
  return program?.sessions || [];
}

export function getSessionsCountForCohort(cohort) {
  const program = getProgramForCohort(cohort);
  return program?.sessionsCount || 0;
}

export function getBeltsForProgram(program) {
  return program?.belts || [];
}

// Returns the belt name at a given session order, or null if the program
// doesn't use belts (e.g. a future numbered program).
export function getBeltAtOrder(program, order) {
  const belts = getBeltsForProgram(program);
  if (!belts.length) return null;
  return belts[order - 1] || null;
}

// ---------------------------------------------------------------------------
// Certificate config + resolution
// ---------------------------------------------------------------------------

// Returns the certificate config for a program. Falls back to DEFAULT_CERTIFICATE
// when the program doesn't have a cert section yet (e.g. legacy data).
export function getCertificateConfig(program) {
  return program?.certificate || DEFAULT_CERTIFICATE;
}

// Resolves the signatory list against a cohort, filling in the dynamic
// "facilitator" slot with the cohort's facilitator. Returns an array of
// { name, title } ready to render.
export function resolveSignatories(program, cohort) {
  const cfg = getCertificateConfig(program);
  const facilitator = cohort?.facilitator || cohort?.trainer || {};
  return (cfg.signatories || []).map((s) => {
    if (s.slot === "facilitator") {
      return {
        name: facilitator.name || "Your facilitator",
        title: s.title || "Facilitator",
      };
    }
    return { name: s.name || "", title: s.title || "" };
  });
}

// Has this participant met the program's completion criteria for the
// certificate? Pass the participant record + their cohort's sessions.
export function isParticipantCertified(program, participant, sessions = []) {
  if (!participant) return false;
  const cfg = getCertificateConfig(program);
  const total = sessions.length || program?.sessionsCount || 0;
  const completed = (participant.progress || []).length;
  if (cfg.completionCriteria === "homework-required") {
    // Every session must be completed AND have a homework submission.
    if (completed < total) return false;
    const submissions = participant.submissions || {};
    return sessions.every((s) => submissions[s.order]?.submittedAt);
  }
  if (cfg.completionCriteria === "manual") {
    return !!participant.certificateAwardedAt;
  }
  // Default: all sessions completed.
  return total > 0 && completed >= total;
}

// ---------------------------------------------------------------------------
// Program writes — mock localStorage-backed editing for the /admin/programs UI.
//
// Mirrors the cohort overlay pattern (see cohortAdmin.js): a `programOverlays`
// object keyed by program code holds any admin edits + brand-new programs
// created through the UI. getAllProgramsForAdmin() merges the seed PROGRAMS
// array with the overlay so consumers see live edits.
//
// Real persistence is a backend swap — this is intentionally light so we can
// ship the UI without coupling to data infrastructure.
// ---------------------------------------------------------------------------

const PROGRAMS_STORAGE_KEY = "brai_program_overlays";

function readProgramOverlays() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PROGRAMS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeProgramOverlays(overlays) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROGRAMS_STORAGE_KEY, JSON.stringify(overlays));
  } catch {
    /* ignore — quota / private mode */
  }
}

// In-memory cache, hydrated on first read; updated synchronously on writes.
let programOverlays = readProgramOverlays();

// Pubsub so React components re-render after a program write.
const programListeners = new Set();
function emitProgramChange() {
  for (const fn of programListeners) {
    try { fn(); } catch { /* ignore listener errors */ }
  }
}
export function subscribeProgramChanges(fn) {
  programListeners.add(fn);
  return () => programListeners.delete(fn);
}

// React hook: increments on every program write. Use it inside components
// that read programs, to force re-render after a save.
export function useProgramVersion() {
  const [v, setV] = useState(0);
  useEffect(() => subscribeProgramChanges(() => setV((x) => x + 1)), []);
  return v;
}

// Returns the merged catalog (seed + overlay) the admin UI should read.
export function getAllProgramsForAdmin() {
  const baseByCode = Object.fromEntries(PROGRAMS.map((p) => [p.code, p]));
  const merged = { ...baseByCode };
  for (const [code, overlay] of Object.entries(programOverlays)) {
    if (overlay?.archivedAt) {
      delete merged[code];
      continue;
    }
    const base = merged[code] || {};
    merged[code] = {
      ...base,
      ...overlay,
      // Derived: sessions array can come from overlay; if so, sessionsCount
      // follows it. Otherwise fall back to the base getter.
      sessions: overlay.sessions || base.sessions || [],
      get sessionsCount() {
        const s = overlay.sessions || base.sessions || [];
        return s.length;
      },
    };
  }
  return Object.values(merged);
}

export function getProgramForAdminByCode(code) {
  return getAllProgramsForAdmin().find((p) => p.code === code) || null;
}

// Counts how many cohorts reference each program. Used by the list page.
// `cohorts` is passed in to avoid circular imports between programs and
// cohortAdmin.
export function countCohortsByProgram(cohorts) {
  const counts = {};
  for (const c of cohorts || []) {
    if (!c?.programCode) continue;
    counts[c.programCode] = (counts[c.programCode] || 0) + 1;
  }
  return counts;
}

// Create a new program. Throws on duplicate code.
export function createProgram(payload) {
  const code = String(payload?.code || "").trim().toUpperCase();
  if (!code) throw new Error("Program code is required.");
  // Check both seed PROGRAMS and existing overlays.
  if (PROGRAMS.some((p) => p.code === code) || programOverlays[code]) {
    throw new Error(`A program with code "${code}" already exists.`);
  }
  const now = new Date().toISOString();
  const overlay = {
    code,
    name: (payload.name || "").trim() || `Program ${code}`,
    methodName: payload.methodName || "AI Empowerment Method",
    description: payload.description || "",
    tagline: payload.tagline || "",
    sessionDurationMinutes: Number(payload.sessionDurationMinutes) || 75,
    belts: Array.isArray(payload.belts) ? payload.belts.filter(Boolean) : [],
    sessions: normalizeSessions(payload.sessions || []),
    // Certificate config — every program ships with three signatories +
    // the "all-sessions-completed" criterion unless the form sends overrides.
    certificate: payload.certificate || DEFAULT_CERTIFICATE,
    createdAt: now,
    updatedAt: now,
    isCustom: true, // marker so UI can tag user-created vs seeded programs
  };
  programOverlays = { ...programOverlays, [code]: overlay };
  writeProgramOverlays(programOverlays);
  emitProgramChange();
  return overlay;
}

// Patch an existing program. Pass only the fields that are changing.
export function updateProgram(code, patch) {
  if (!code) throw new Error("Program code is required.");
  const existing = programOverlays[code] || {};
  const next = {
    ...existing,
    ...patch,
    sessions: patch.sessions
      ? normalizeSessions(patch.sessions)
      : existing.sessions,
    updatedAt: new Date().toISOString(),
  };
  programOverlays = { ...programOverlays, [code]: next };
  writeProgramOverlays(programOverlays);
  emitProgramChange();
  return getProgramForAdminByCode(code);
}

// Soft-archive: programs with archivedAt are hidden from admin views and
// no longer offered when creating cohorts.
export function archiveProgram(code) {
  const existing = programOverlays[code] || { code };
  programOverlays = {
    ...programOverlays,
    [code]: { ...existing, archivedAt: new Date().toISOString() },
  };
  writeProgramOverlays(programOverlays);
  emitProgramChange();
}

// Restore an archived program (clears archivedAt).
export function restoreProgram(code) {
  const existing = programOverlays[code];
  if (!existing) return;
  const { archivedAt: _archived, ...rest } = existing;
  programOverlays = { ...programOverlays, [code]: rest };
  writeProgramOverlays(programOverlays);
  emitProgramChange();
}

// Normalize a sessions array — ensure order is 1-based + monotonic, and
// every session has the required fields the UI assumes.
function normalizeSessions(sessions) {
  return (sessions || []).map((s, idx) => ({
    order: idx + 1,
    belt: s.belt || null,
    title: s.title || `Session ${idx + 1}`,
    summary: s.summary || s.description || "",
    description: s.description || s.summary || "",
    durationMinutes: Number(s.durationMinutes) || null,
    materials: normalizeMaterialArray(s.materials),
    homework: s.homework || "",
  }));
}

// Materials may arrive as strings, legacy {label, type, url} objects, or
// the new {title, type, url, fileName?} shape. Coerce everything into the
// canonical new shape so downstream consumers can render uniformly.
function normalizeMaterialArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((m) => {
      if (m == null) return null;
      if (typeof m === "string") {
        const trimmed = m.trim();
        if (!trimmed) return null;
        return { title: trimmed, type: "link", url: "" };
      }
      return {
        title: (m.title || m.label || "").trim(),
        type: m.type || "link",
        url: (m.url || "").trim(),
        fileName: m.fileName || null,
      };
    })
    .filter((m) => m && (m.title || m.url));
}
