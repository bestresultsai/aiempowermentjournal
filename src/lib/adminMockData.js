// ---------------------------------------------------------------------------
// Mock data powering the /admin views.
//
// 10 participants spread across the 3 demo cohorts so roster + homework queue
// views have something realistic to render. Each participant has:
//   - progress: completed session orders [1..8]
//   - lastJournalDaysAgo: int (used to compute "last activity")
//   - submissions: { [order]: { response, link, submittedAt, reviewedAt?, feedback? } }
//   - journalEntries: list of AI Journal entries with time-saved data
//
// All cohort slugs match DEMO_COHORTS so the scoping helpers work end-to-end.
// ---------------------------------------------------------------------------

import { MOCK_SESSIONS as MOCK_SESSIONS_FOR_HELPERS } from "./mockCohort";

const COHORT_IAHE = "iahe-aiew3-2026q1";
const COHORT_MAYO = "mayo-aiew3-2026q1";
const COHORT_UCLA = "ucla-apfw-2026q1";

function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(14, 0, 0, 0);
  return d.toISOString();
}

// Tiny helper for building journal entries with consistent shape.
function entry({
  days, title, description, before, after,
  productionMethod = null, // "no-sop" | "with-sop" | "ai-workflow" | "ai-agent" | "ai-swarm"
  volumePerDay = null,     // "1" | "2-5" | "6-10" | "10+"
  frequency = null,        // "multiple-per-day" | "daily" | "weekly" | "monthly" | "rare"
  scope = null,            // "Individual" | "Department-wide" | "Organization-wide"
  qualityOutcome = null,
  innovationTitle = null,
  innovationDescription = null,
  attachment = null,       // { name, dataUrl, sizeBytes, mimeType }
  link = null,
}) {
  return {
    id: `${days}-${title.slice(0, 8)}`,
    date: daysAgoISO(days),
    title,
    description,
    timeBeforeAI: before,
    timeWithAI: after,
    productionMethod,
    volumePerDay,
    frequency,
    scope,
    qualityOutcome,
    innovationTitle,
    innovationDescription,
    attachment,
    link,
  };
}

export const ADMIN_MOCK_PARTICIPANTS = [
  // -------- IAHE Cohort (4 participants) --------
  {
    id: "user-iahe-1",
    name: "Josue Acuna",
    email: "josueacuna@me.com",
    title: "Director of AI Strategy",
    organization: "BestResults.AI",
    cohortSlug: COHORT_IAHE,
    whyAi: "I want healthcare educators to redirect 10+ hours a week away from busywork and toward the things only humans can do.",
    mainGoal: "Ship our internal AI Empowerment platform and onboard the first 30 IAHE participants before the end of Q2.",
    progress: [1, 2, 3, 4],
    lastJournalDaysAgo: 2,
    submissions: {
      1: { response: "Mapped my full team's role matrix in Notion.", link: "https://notion.so/example", submittedAt: daysAgoISO(28), reviewedAt: daysAgoISO(26), feedback: "Strong matrix. Try ranking by ROI next time." },
      2: { response: "Built a 5-step prompt-chained workflow for cohort retention analysis.", link: "https://chat.openai.com/share/abc", submittedAt: daysAgoISO(21) },
      3: { response: "Spun up a custom GPT for facilitator post-session notes.", link: "", submittedAt: daysAgoISO(14) },
    },
    journalEntries: [
      entry({ days: 2,  title: "Cohort retention pivot tables from raw Notion export", description: "Pulled a messy Notion export and let Claude build the pivots + write the exec summary.", before: 240, after: 35, productionMethod: "ai-workflow", volumePerDay: "1", frequency: "weekly", scope: "Department-wide", qualityOutcome: "Better than original" }),
      entry({ days: 9,  title: "Facilitator post-session note GPT", description: "Custom GPT structures raw post-session notes + drafts the participant follow-up email.", before: 45, after: 8, productionMethod: "ai-agent", volumePerDay: "2-5", frequency: "weekly", scope: "Department-wide", qualityOutcome: "Better than original" }),
      entry({ days: 16, title: "Gong transcripts → 6-week content calendar", description: "Extracted recurring participant questions from transcripts and turned them into a LinkedIn calendar.", before: 180, after: 25, productionMethod: "ai-workflow", volumePerDay: "1", frequency: "monthly", scope: "Organization-wide" }),
      entry({ days: 23, title: "Competitive teardown — LearnUpon vs Thinkific vs Mighty", description: "Side-by-side feature matrix built in a single afternoon.", before: 360, after: 60, productionMethod: "ai-swarm", volumePerDay: "1", frequency: "rare", scope: "Organization-wide", innovationTitle: "Multi-agent feature scorecard", innovationDescription: "Researcher + writer + scorer agents collaborated on the full teardown." }),
      entry({ days: 30, title: "Magic-link auth design doc + sequence diagram", description: "Drafted the whole doc in 45 minutes.", before: 180, after: 45, productionMethod: "ai-workflow", volumePerDay: "1", frequency: "rare", scope: "Individual" }),
    ],
  },
  {
    id: "user-iahe-2",
    name: "Sarah Patel",
    email: "sarah.patel@iahe.org",
    title: "Director of Education",
    organization: "IAHE",
    cohortSlug: COHORT_IAHE,
    isCohortLead: true,
    whyAi: "Our credentialing intake is drowning the team. I'm convinced AI can take 70% of it off our plate without losing the human touch.",
    mainGoal: "Cut credentialing intake time by half before the next accreditation cycle.",
    progress: [1, 2, 3],
    lastJournalDaysAgo: 5,
    submissions: {
      1: { response: "Documented my team's role matrix and prioritized 3 use cases.", link: "https://docs.google.com/x", submittedAt: daysAgoISO(27), reviewedAt: daysAgoISO(25), feedback: "Great prioritization framework." },
      2: { response: "Built a workflow but still hitting hallucination issues — need to chat.", link: "", submittedAt: daysAgoISO(20) },
    },
    journalEntries: [
      entry({ days: 5,  title: "Credentialing intake email drafts", description: "Cut a recurring 4-hour task to 25 minutes with a custom GPT.", before: 240, after: 25, productionMethod: "ai-agent", volumePerDay: "6-10", frequency: "daily", scope: "Department-wide", qualityOutcome: "Better than original" }),
      entry({ days: 12, title: "CE program needs assessment from raw survey data", description: "Claude clustered open-ended responses and surfaced 6 priority themes.", before: 180, after: 30, productionMethod: "ai-workflow", volumePerDay: "1", frequency: "monthly", scope: "Organization-wide" }),
      entry({ days: 19, title: "Board prep deck from quarterly KPI dashboard", description: "Three iteration loops with Claude got the deck board-ready.", before: 240, after: 60, productionMethod: "with-sop", volumePerDay: "1", frequency: "rare", scope: "Organization-wide" }),
      entry({ days: 26, title: "Conference RFP responses, drafted in parallel", description: "Drafted 3 RFPs simultaneously by parameterizing a single prompt.", before: 480, after: 90, productionMethod: "ai-workflow", volumePerDay: "2-5", frequency: "rare", scope: "Department-wide", qualityOutcome: "Equal to original" }),
    ],
  },
  {
    id: "user-iahe-3",
    name: "Marcus Williams",
    email: "marcus.w@iahe.org",
    title: "Program Manager",
    organization: "IAHE",
    cohortSlug: COHORT_IAHE,
    whyAi: "I'm not technical and I'm tired of feeling left behind every time someone says \"AI\" in a meeting.",
    mainGoal: "Build one workflow my whole team uses weekly — proof I can lead this transition.",
    progress: [1, 2],
    lastJournalDaysAgo: 12,
    submissions: {
      1: { response: "Quick draft of the role matrix — need to refine.", link: "", submittedAt: daysAgoISO(26) },
    },
    journalEntries: [
      entry({ days: 12, title: "Weekly program report — auto-drafted", description: "Pulled raw activity logs and let Claude write the narrative.", before: 90, after: 20 }),
      entry({ days: 24, title: "Stakeholder update email cadence", description: "Templates + a Claude pass cut my Friday wrap-up time in half.", before: 60, after: 25 }),
    ],
  },
  {
    id: "user-iahe-4",
    name: "Dana Kim",
    email: "dana.kim@iahe.org",
    title: "Curriculum Designer",
    organization: "IAHE",
    cohortSlug: COHORT_IAHE,
    whyAi: "I already use AI daily but feel like I'm only scratching the surface. I want to go from hobbyist to actually shipping.",
    mainGoal: "Build three reusable workflows my whole curriculum team can adopt — and document them so they outlive me.",
    progress: [1, 2, 3, 4, 5],
    lastJournalDaysAgo: 1,
    submissions: {
      1: { response: "Role matrix complete; identified 4 high-value use cases.", link: "https://notion.so/y", submittedAt: daysAgoISO(28), reviewedAt: daysAgoISO(26), feedback: "Best matrix in the cohort." },
      2: { response: "Built a content-grading workflow with 3 reusable prompt chains.", link: "https://chat.openai.com/share/y", submittedAt: daysAgoISO(21), reviewedAt: daysAgoISO(19), feedback: "Loved the chain-of-thought template." },
      3: { response: "Custom GPT for plain-language patient education rewrites.", link: "https://chat.openai.com/g/x", submittedAt: daysAgoISO(14), reviewedAt: daysAgoISO(12), feedback: "Ship-ready." },
      4: { response: "Three high-reliability workflows live with my team.", link: "https://notion.so/z", submittedAt: daysAgoISO(7) },
    },
    journalEntries: [
      entry({ days: 1,  title: "Patient education rewrite at 6th-grade reading level", description: "Built an internal GPT that consistently hits the reading-level target.", before: 60, after: 5, productionMethod: "ai-agent", volumePerDay: "10+", frequency: "daily", scope: "Department-wide", qualityOutcome: "Better than original", innovationTitle: "Reading-level guardrail", innovationDescription: "Reusable verifier ensures every rewrite hits 6th-grade Flesch-Kincaid." }),
      entry({ days: 7,  title: "Three high-reliability content-grading workflows shipped", description: "Reusable prompt chains that the whole team now leans on.", before: 180, after: 30, productionMethod: "ai-swarm", volumePerDay: "2-5", frequency: "daily", scope: "Organization-wide", qualityOutcome: "Better than original" }),
      entry({ days: 15, title: "Curriculum review checklist generator", description: "Claude generates a per-module review checklist from the syllabus alone.", before: 120, after: 20, productionMethod: "ai-workflow", volumePerDay: "2-5", frequency: "weekly", scope: "Department-wide" }),
      entry({ days: 22, title: "CME activity outline drafting", description: "Pivot from blank page to draft in under 15 minutes.", before: 90, after: 15, productionMethod: "ai-workflow", volumePerDay: "1", frequency: "weekly", scope: "Individual" }),
      entry({ days: 29, title: "Faculty feedback synthesis", description: "30+ open-ended responses clustered + summarized.", before: 150, after: 25, productionMethod: "ai-workflow", volumePerDay: "1", frequency: "monthly", scope: "Organization-wide" }),
    ],
  },

  // -------- Mayo Clinic Education (3 participants) --------
  {
    id: "user-mayo-1",
    name: "Hannah Rodriguez",
    email: "hannah.r@mayo.edu",
    title: "VP of Clinical Learning",
    organization: "Mayo Clinic Education",
    cohortSlug: COHORT_MAYO,
    whyAi: "We're moving from 'AI is a project' to 'AI is how we work.' I have to set the bar for the rest of the org.",
    mainGoal: "Stand up a cross-functional AI guild with reusable playbooks by end of program.",
    progress: [1, 2, 3, 4, 5, 6],
    lastJournalDaysAgo: 3,
    submissions: {
      1: { response: "Mapped 30+ roles across our learning team.", link: "https://mayo.box.com/x", submittedAt: daysAgoISO(35), reviewedAt: daysAgoISO(33), feedback: "Comprehensive." },
      2: { response: "Built our weekly clinical learning digest workflow.", link: "https://chat.openai.com/share/a", submittedAt: daysAgoISO(28), reviewedAt: daysAgoISO(26), feedback: "Will share this pattern with the cohort." },
      3: { response: "Custom GPT for credentialing intake.", link: "https://chat.openai.com/g/y", submittedAt: daysAgoISO(21), reviewedAt: daysAgoISO(19), feedback: "Strong." },
      4: { response: "Three high-reliability workflows shipped to my team.", link: "", submittedAt: daysAgoISO(14), reviewedAt: daysAgoISO(12), feedback: "Great." },
      5: { response: "Stood up a 4-agent team for content review.", link: "", submittedAt: daysAgoISO(7) },
    },
    journalEntries: [
      entry({ days: 3,  title: "4-agent content review team", description: "Each agent has a distinct review role; they hand off cleanly.", before: 240, after: 35 }),
      entry({ days: 10, title: "Credentialing intake GPT v2", description: "Refined the prompt + added a verification step.", before: 240, after: 25 }),
      entry({ days: 17, title: "Mayo weekly clinical learning digest", description: "Slack + email + Notion → polished one-pager every Friday.", before: 75, after: 10 }),
      entry({ days: 24, title: "Faculty development needs assessment", description: "Cluster + summarize 50+ open-ended survey responses.", before: 180, after: 30 }),
      entry({ days: 31, title: "Quarterly board memo from raw data", description: "Pulled Looker exports and let Claude draft the narrative.", before: 240, after: 60 }),
    ],
  },
  {
    id: "user-mayo-2",
    name: "David Chen",
    email: "david.chen@mayo.edu",
    title: "Director, Faculty Development",
    organization: "Mayo Clinic Education",
    cohortSlug: COHORT_MAYO,
    whyAi: "Our faculty review process is broken. AI is the only thing that could let us scale it without doubling headcount.",
    mainGoal: "Ship a faculty review co-pilot that survives leadership change.",
    progress: [1, 2, 3],
    lastJournalDaysAgo: 8,
    submissions: {
      1: { response: "Role matrix done.", link: "", submittedAt: daysAgoISO(33), reviewedAt: daysAgoISO(31), feedback: "Solid." },
      2: { response: "Prompt chain for syllabus rewriting.", link: "", submittedAt: daysAgoISO(26) },
    },
    journalEntries: [
      entry({ days: 8,  title: "Syllabus rewrite prompt chain", description: "3-step chain: extract → restructure → tighten language.", before: 120, after: 25 }),
      entry({ days: 18, title: "Faculty 1:1 prep brief generator", description: "Claude pulls recent activity + drafts the talking points.", before: 45, after: 8 }),
      entry({ days: 28, title: "Annual review writeups, drafted in batch", description: "Templated structure + per-faculty Claude pass.", before: 360, after: 90 }),
    ],
  },
  {
    id: "user-mayo-3",
    name: "Aisha Khan",
    email: "aisha.khan@mayo.edu",
    title: "Senior Instructional Designer",
    organization: "Mayo Clinic Education",
    cohortSlug: COHORT_MAYO,
    whyAi: "Honestly? I'm here because my boss told me to. I'm skeptical but trying to keep an open mind.",
    mainGoal: "Find one thing AI actually does better than my current workflow. Just one.",
    progress: [1, 2],
    lastJournalDaysAgo: 16,
    submissions: {
      1: { response: "Drafted but not finalized.", link: "", submittedAt: daysAgoISO(34) },
    },
    journalEntries: [
      entry({ days: 16, title: "Course outline starter from learning objectives", description: "Claude turns 3-line learning objectives into a full module outline.", before: 90, after: 20 }),
    ],
  },

  // -------- UCLA Health (3 participants) --------
  {
    id: "user-ucla-1",
    name: "Robert Singh",
    email: "rsingh@uclahealth.edu",
    title: "Chief Learning Officer",
    organization: "UCLA Health",
    cohortSlug: COHORT_UCLA,
    whyAi: "We're an academic medical center. If we don't get AI right, our graduates will be a decade behind their peers in five years.",
    mainGoal: "Have a defensible AI literacy curriculum across all CME programs by end of fiscal year.",
    progress: [1, 2, 3, 4, 5, 6, 7],
    lastJournalDaysAgo: 1,
    submissions: {
      1: { response: "Role matrix + 5 prioritized use cases.", link: "https://ucla.box.com/x", submittedAt: daysAgoISO(40), reviewedAt: daysAgoISO(38), feedback: "Excellent." },
      2: { response: "Grant proposal red-team workflow.", link: "https://chat.openai.com/share/b", submittedAt: daysAgoISO(33), reviewedAt: daysAgoISO(31), feedback: "Reusable pattern." },
      3: { response: "Custom GPT for clinical SOP rewriting.", link: "", submittedAt: daysAgoISO(26), reviewedAt: daysAgoISO(24), feedback: "Strong." },
      4: { response: "Shipped 5 high-reliability workflows.", link: "", submittedAt: daysAgoISO(19), reviewedAt: daysAgoISO(17), feedback: "Best in cohort so far." },
      5: { response: "Built a 6-agent team for IRB review prep.", link: "", submittedAt: daysAgoISO(12), reviewedAt: daysAgoISO(10), feedback: "Impressive." },
      6: { response: "Autonomous research-summary agent deployed.", link: "", submittedAt: daysAgoISO(5) },
    },
    journalEntries: [
      entry({ days: 1,  title: "Autonomous research-summary agent live", description: "Agent pulls the day's pubs and produces a 5-bullet brief.", before: 120, after: 5 }),
      entry({ days: 6,  title: "IRB review prep 6-agent team", description: "Each agent reviews from a different perspective; output is consolidated.", before: 360, after: 60 }),
      entry({ days: 13, title: "Grant proposal red-team workflow", description: "Skeptical reviewer + budget hawk + patient advocate personas.", before: 120, after: 30 }),
      entry({ days: 20, title: "Clinical SOP rewriting GPT", description: "Tone, accuracy, and reading-level normalization in one pass.", before: 90, after: 15 }),
      entry({ days: 27, title: "Faculty conflict-of-interest screening", description: "Pulled disclosures + flagged anomalies for human review.", before: 150, after: 25 }),
      entry({ days: 34, title: "Site visit report generator", description: "From raw notes to a polished site report in 30 minutes.", before: 240, after: 40 }),
    ],
  },
  {
    id: "user-ucla-2",
    name: "Maria Lopez",
    email: "mlopez@uclahealth.edu",
    title: "Director, Continuing Education",
    organization: "UCLA Health",
    cohortSlug: COHORT_UCLA,
    whyAi: "CME accreditation is gobbling up my team's evenings. I refuse to keep asking people to work nights.",
    mainGoal: "Get CME activity reporting from weeks down to days, with the same audit quality.",
    progress: [1, 2, 3, 4],
    lastJournalDaysAgo: 4,
    submissions: {
      1: { response: "Done.", link: "", submittedAt: daysAgoISO(38), reviewedAt: daysAgoISO(36), feedback: "Good baseline." },
      2: { response: "CME activity grading workflow.", link: "https://chat.openai.com/share/c", submittedAt: daysAgoISO(31), reviewedAt: daysAgoISO(29), feedback: "Adopting this." },
      3: { response: "Custom GPT for accreditation report drafts.", link: "", submittedAt: daysAgoISO(24) },
    },
    journalEntries: [
      entry({ days: 4,  title: "Accreditation report draft GPT", description: "Custom GPT pulls last quarter's data + produces a clean draft.", before: 240, after: 45 }),
      entry({ days: 11, title: "CME activity grading workflow", description: "Reusable rubric + Claude-graded outputs for each activity.", before: 60, after: 10 }),
      entry({ days: 18, title: "Quarterly newsletter drafted in batch", description: "Five articles drafted simultaneously from a single brief.", before: 300, after: 60 }),
      entry({ days: 25, title: "Continuing-ed needs assessment summary", description: "150+ survey responses, clustered + ranked.", before: 180, after: 30 }),
    ],
  },
  {
    id: "user-ucla-3",
    name: "Tomás Vega",
    email: "tvega@uclahealth.edu",
    title: "Learning Experience Lead",
    organization: "UCLA Health",
    cohortSlug: COHORT_UCLA,
    whyAi: "Honestly stretched too thin right now. I want to be here but my calendar isn't cooperating.",
    mainGoal: "Finish the first 4 sessions and walk away with at least one workflow I actually use.",
    progress: [1],
    lastJournalDaysAgo: 22,
    submissions: {
      1: { response: "Partial.", link: "", submittedAt: daysAgoISO(35) },
    },
    journalEntries: [],
  },
];

// ---------------------------------------------------------------------------
// Derived helpers — these are what the admin pages actually consume.
// ---------------------------------------------------------------------------

export function getParticipantsForCohort(slug) {
  return ADMIN_MOCK_PARTICIPANTS.filter((p) => p.cohortSlug === slug);
}

export function getParticipantById(id) {
  return ADMIN_MOCK_PARTICIPANTS.find((p) => p.id === id) || null;
}

// Lookup by email — used by the participant-facing flow to find the same
// participant record the admin sees. Lets one demo write reflect in both views.
export function getParticipantByEmail(email) {
  if (!email) return null;
  const lc = email.toLowerCase();
  return ADMIN_MOCK_PARTICIPANTS.find((p) => p.email?.toLowerCase() === lc) || null;
}

// ---------------------------------------------------------------------------
// Add participants to a cohort — mock mode. Persists to localStorage so a
// refresh keeps them around during demos.
//
// Accepts either { email, name?, title? } or an array of those. Returns the
// created participants (skipping anyone whose email already exists in scope).
// ---------------------------------------------------------------------------

const PARTICIPANT_STORAGE_KEY = "brai_admin_participants_added";

function loadAddedParticipants() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PARTICIPANT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function persistAddedParticipants(list) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PARTICIPANT_STORAGE_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

// Hydrate on module load.
(function hydrateAddedParticipants() {
  for (const p of loadAddedParticipants()) {
    if (!ADMIN_MOCK_PARTICIPANTS.some((x) => x.id === p.id)) {
      ADMIN_MOCK_PARTICIPANTS.push(p);
    }
  }
})();

function nameFromEmail(email) {
  // Mirrors the welcome-wizard heuristic. Cheap derive when no name provided.
  if (!email) return "";
  const local = (email.split("@")[0] || "").trim();
  if (!/[._\-+]/.test(local)) return "";
  const parts = local
    .split(/[._+\-0-9]/)
    .filter(Boolean)
    .filter((p) => p.length >= 2 && /^[a-z]+$/i.test(p))
    .map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase());
  return parts.slice(0, 2).join(" ");
}

export function addParticipantsToCohort(cohortSlug, payloads) {
  if (!Array.isArray(payloads)) payloads = [payloads];
  const added = [];
  const skipped = [];

  for (const raw of payloads) {
    const email = (raw.email || "").trim().toLowerCase();
    if (!email) continue;

    // For standalone (cohortSlug=null) creation we just check email uniqueness
    // across all participants; for cohort-scoped, only within that cohort.
    const dup = cohortSlug
      ? ADMIN_MOCK_PARTICIPANTS.find(
          (p) => p.email?.toLowerCase() === email && p.cohortSlug === cohortSlug,
        )
      : ADMIN_MOCK_PARTICIPANTS.find(
          (p) => p.email?.toLowerCase() === email && !p.cohortSlug,
        );
    if (dup) {
      skipped.push({ email, reason: cohortSlug ? "already in cohort" : "already exists" });
      continue;
    }

    const idSeed = cohortSlug || "standalone";
    const id = `user-${idSeed}-${email.replace(/[^a-z0-9]/g, "-").slice(0, 32)}-${Date.now().toString(36).slice(-4)}`;
    const participant = {
      id,
      name: (raw.name || "").trim() || nameFromEmail(email) || email.split("@")[0],
      email,
      title: (raw.title || "").trim() || "",
      organization: (raw.organization || "").trim() || "",
      phone: (raw.phone || "").trim() || "",
      headshotUrl: (raw.headshotUrl || "").trim() || null,
      isCohortLead: !!raw.isCohortLead,
      cohortSlug: cohortSlug || null,
      whyAi: "",
      mainGoal: "",
      progress: [],
      lastJournalDaysAgo: 999,
      submissions: {},
      journalEntries: [],
      addedAt: new Date().toISOString(),
    };
    ADMIN_MOCK_PARTICIPANTS.push(participant);
    added.push(participant);
  }

  // Persist only the newly-added ones — base ADMIN_MOCK_PARTICIPANTS isn't
  // mutated on disk, so on next refresh hydration adds these back.
  const stored = loadAddedParticipants();
  persistAddedParticipants([...stored, ...added]);

  return { added, skipped };
}

// Bulk-assign existing participants to a cohort. Useful for moving standalone
// participants into a cohort, or migrating across cohorts.
export function assignParticipantsToCohort(participantIds, cohortSlug) {
  if (!Array.isArray(participantIds)) participantIds = [participantIds];
  const updated = [];
  const stored = loadAddedParticipants();
  for (const id of participantIds) {
    const p = ADMIN_MOCK_PARTICIPANTS.find((x) => x.id === id);
    if (!p) continue;
    p.cohortSlug = cohortSlug;
    updated.push(p);

    // Mirror into the persisted-added list so reassigns survive refresh.
    const idx = stored.findIndex((x) => x.id === id);
    if (idx >= 0) stored[idx] = { ...stored[idx], cohortSlug };
    else stored.push({ ...p });
  }
  persistAddedParticipants(stored);
  return updated;
}

// Pending = submitted but no reviewedAt. Returns rows flattened across all
// scoped cohorts so the queue can render in one table.
export function getPendingHomework(cohortSlugs) {
  const allowed = new Set(cohortSlugs);
  const rows = [];
  for (const p of ADMIN_MOCK_PARTICIPANTS) {
    if (!allowed.has(p.cohortSlug)) continue;
    for (const [orderStr, sub] of Object.entries(p.submissions || {})) {
      if (!sub.reviewedAt) {
        rows.push({
          participantId: p.id,
          participantName: p.name,
          participantEmail: p.email,
          cohortSlug: p.cohortSlug,
          sessionOrder: Number(orderStr),
          submittedAt: sub.submittedAt,
          response: sub.response,
          link: sub.link,
        });
      }
    }
  }
  // Sort oldest first — those are the most overdue for review.
  rows.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  return rows;
}

// Reviewed = has a reviewedAt + feedback. Used in the participant detail view.
export function getSubmissionsForParticipant(id) {
  const p = getParticipantById(id);
  if (!p) return [];
  return Object.entries(p.submissions || {})
    .map(([order, sub]) => ({ order: Number(order), ...sub }))
    .sort((a, b) => a.order - b.order);
}

// ---------------------------------------------------------------------------
// Homework write actions — mock-mode only.
//
// Mutates the in-memory participant + persists to localStorage so a refresh
// preserves the review state during demos. When real Notion writes ship, this
// should POST to /api/homework/{id}/review and the page state should refetch.
// ---------------------------------------------------------------------------

const HOMEWORK_STORAGE_KEY = "brai_admin_homework_reviews";

function loadStoredReviews() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(HOMEWORK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function persistStoredReviews(map) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HOMEWORK_STORAGE_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

// Hydrate on module load so a refresh shows previously-saved writes —
// both admin reviews and participant submissions.
(function hydrate() {
  const stored = loadStoredReviews();
  for (const [key, payload] of Object.entries(stored)) {
    if (key.startsWith("__participant__::")) {
      // Participant submission overlay.
      const parts = key.split("::");
      const participantId = parts[1];
      const orderStr = parts[2];
      const p = ADMIN_MOCK_PARTICIPANTS.find((x) => x.id === participantId);
      if (!p) continue;
      if (!p.submissions) p.submissions = {};
      p.submissions[orderStr] = {
        ...(p.submissions[orderStr] || {}),
        response: payload.response,
        link: payload.link,
        attachment: payload.attachment || null,
        submittedAt: payload.submittedAt,
        updatedAt: payload.updatedAt,
      };
      continue;
    }
    // Admin review overlay.
    const [participantId, orderStr] = key.split("::");
    const p = ADMIN_MOCK_PARTICIPANTS.find((x) => x.id === participantId);
    if (!p || !p.submissions || !p.submissions[orderStr]) continue;
    p.submissions[orderStr] = {
      ...p.submissions[orderStr],
      reviewedAt: payload.reviewedAt,
      feedback: payload.feedback,
    };
  }
})();

// ---------------------------------------------------------------------------
// Participant-side homework write — mirrors the admin write so both views see
// the same submission. Called from the participant SessionDetail.
// ---------------------------------------------------------------------------
export function submitHomeworkAsParticipant(email, sessionOrder, { response, link, attachment }) {
  const p = getParticipantByEmail(email);
  if (!p) return null;
  const order = String(sessionOrder);
  if (!p.submissions) p.submissions = {};
  const existing = p.submissions[order] || {};
  // Preserve any existing reviewedAt + feedback so an edit doesn't blow away
  // the facilitator's response. Updating only the user-editable fields.
  p.submissions[order] = {
    ...existing,
    response: (response || "").trim(),
    link: (link || "").trim(),
    attachment: attachment || null,
    submittedAt: existing.submittedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  // Persist alongside admin reviews under the same storage key so refresh
  // round-trips both directions.
  const stored = loadStoredReviews();
  stored[`__participant__::${p.id}::${order}`] = {
    response: p.submissions[order].response,
    link: p.submissions[order].link,
    attachment: p.submissions[order].attachment,
    submittedAt: p.submissions[order].submittedAt,
    updatedAt: p.submissions[order].updatedAt,
  };
  persistStoredReviews(stored);
  return p.submissions[order];
}

// Write a new journal entry from the participant side. Mirrors the same
// pattern as submitHomeworkAsParticipant — the entry shows up immediately
// on the admin views because they read from the same array.
export function submitJournalEntryAsParticipant(email, payload) {
  const p = getParticipantByEmail(email);
  if (!p) return null;
  const newEntry = {
    id: `local-${Date.now()}`,
    date: new Date().toISOString(),
    title: (payload?.projectName || "Untitled").trim(),
    description: (payload?.description || "").trim(),
    timeBeforeAI: Number(payload?.hoursWithoutAI || 0) * 60,
    timeWithAI: Number(payload?.hoursWithAI || 0) * 60,
    productionMethod: payload?.productionMethod || null,
    volumePerDay: payload?.volumePerDay || null,
    frequency: payload?.frequency || null,
    scope: payload?.scope || null,
    qualityOutcome: payload?.qualityOutcome || null,
    innovationTitle: payload?.innovationTitle || null,
    innovationDescription: payload?.innovationDescription || null,
    link: (payload?.link || "").trim() || null,
    attachment: payload?.attachment || null,
    notes: (payload?.notes || "").trim() || null,
  };
  if (!Array.isArray(p.journalEntries)) p.journalEntries = [];
  p.journalEntries = [newEntry, ...p.journalEntries];
  p.lastJournalDaysAgo = 0;
  return newEntry;
}

// Mark a session complete for a participant identified by email.
export function markSessionCompleteForParticipant(email, sessionOrder, completed = true) {
  const p = getParticipantByEmail(email);
  if (!p) return null;
  const ord = Number(sessionOrder);
  const set = new Set(p.progress || []);
  if (completed) set.add(ord); else set.delete(ord);
  p.progress = [...set].sort((a, b) => a - b);
  return p.progress;
}

export function markHomeworkReviewed(participantId, sessionOrder, feedback) {
  const p = getParticipantById(participantId);
  if (!p || !p.submissions?.[sessionOrder]) return null;
  const reviewedAt = new Date().toISOString();
  p.submissions[sessionOrder] = {
    ...p.submissions[sessionOrder],
    reviewedAt,
    feedback: (feedback || "").trim(),
  };
  const stored = loadStoredReviews();
  stored[`${participantId}::${sessionOrder}`] = { reviewedAt, feedback };
  persistStoredReviews(stored);
  return p.submissions[sessionOrder];
}

// Reverse — used by the toggle in the homework UI for demo control.
export function unmarkHomeworkReviewed(participantId, sessionOrder) {
  const p = getParticipantById(participantId);
  if (!p || !p.submissions?.[sessionOrder]) return null;
  const sub = { ...p.submissions[sessionOrder] };
  delete sub.reviewedAt;
  delete sub.feedback;
  p.submissions[sessionOrder] = sub;
  const stored = loadStoredReviews();
  delete stored[`${participantId}::${sessionOrder}`];
  persistStoredReviews(stored);
  return sub;
}

// Generic submission rows by status across a set of cohort slugs.
// status: "pending" | "reviewed" | "all"
export function getHomeworkRows(cohortSlugs, status = "pending") {
  const allowed = new Set(cohortSlugs);
  const rows = [];
  for (const p of ADMIN_MOCK_PARTICIPANTS) {
    if (!allowed.has(p.cohortSlug)) continue;
    for (const [orderStr, sub] of Object.entries(p.submissions || {})) {
      const reviewed = !!sub.reviewedAt;
      if (status === "pending" && reviewed) continue;
      if (status === "reviewed" && !reviewed) continue;
      rows.push({
        participantId: p.id,
        participantName: p.name,
        participantEmail: p.email,
        cohortSlug: p.cohortSlug,
        sessionOrder: Number(orderStr),
        submittedAt: sub.submittedAt,
        reviewedAt: sub.reviewedAt || null,
        response: sub.response,
        link: sub.link,
        attachment: sub.attachment || null,
        feedback: sub.feedback || "",
      });
    }
  }
  // Pending → oldest first (most overdue). Reviewed → newest first.
  if (status === "reviewed") {
    rows.sort((a, b) => new Date(b.reviewedAt) - new Date(a.reviewedAt));
  } else {
    rows.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Facilitator notes — private per participant, mock-only persistence.
// ---------------------------------------------------------------------------

const NOTES_STORAGE_KEY = "brai_admin_facilitator_notes";

function loadStoredNotes() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(NOTES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function persistStoredNotes(map) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

export function getFacilitatorNote(participantId) {
  const map = loadStoredNotes();
  return map[participantId] || null;
}

export function setFacilitatorNote(participantId, text) {
  const map = loadStoredNotes();
  const trimmed = (text || "").trim();
  if (!trimmed) {
    delete map[participantId];
  } else {
    map[participantId] = {
      text: trimmed,
      updatedAt: new Date().toISOString(),
    };
  }
  persistStoredNotes(map);
  return map[participantId] || null;
}

// ---------------------------------------------------------------------------
// Capabilities — per-participant role grants beyond the implicit "participant"
// + "cohort-leader" (which is still driven by p.isCohortLead).
//
// Super + Admin can grant a participant additional capabilities (admin, org,
// facilitator) from the participant profile. Persisted on the participant
// record so it round-trips through getParticipantById.
// ---------------------------------------------------------------------------
// Set a participant's headshot URL (http(s) or data: URL from upload).
export function setParticipantHeadshot(participantId, url) {
  const p = getParticipantById(participantId);
  if (!p) return null;
  p.headshotUrl = (url || "").trim() || null;
  return p.headshotUrl;
}

export function setParticipantCapabilities(participantId, capabilities) {
  const p = getParticipantById(participantId);
  if (!p) return null;
  const list = Array.isArray(capabilities) ? capabilities : [];
  // "participant" + "cohort-leader" are derived from the participant record,
  // not from explicit capabilities — strip them so we don't double-store.
  p.capabilities = list.filter((c) => c !== "participant" && c !== "cohort-leader");
  // Sync isCohortLead if it's being toggled via capability UI.
  if (list.includes("cohort-leader")) p.isCohortLead = true;
  return p.capabilities;
}

// ---------------------------------------------------------------------------
// Date range filter — used by /admin/journal selector.
//
// Returns { label, sinceMs } where sinceMs filters entries by `date >= sinceMs`
// (or null for "all time" → no filter).
// ---------------------------------------------------------------------------

export const DATE_RANGES = [
  { key: "week",     label: "This week",   days: 7 },
  { key: "month",    label: "Last 30 days", days: 30 },
  { key: "quarter",  label: "Last 90 days", days: 90 },
  { key: "all",      label: "All time",    days: null },
];

export function getSinceMs(rangeKey) {
  const range = DATE_RANGES.find((r) => r.key === rangeKey);
  if (!range || range.days === null) return null;
  return Date.now() - range.days * 86400000;
}

// Filter helper for entries — useful inside aggregate calls.
export function filterEntriesByRange(entries, sinceMs) {
  if (!sinceMs) return entries;
  return entries.filter((e) => new Date(e.date).getTime() >= sinceMs);
}

// ---------------------------------------------------------------------------
// Dashboard helpers — deltas, upcoming sessions, activity stream, sparklines.
// ---------------------------------------------------------------------------

// Compare current period vs previous period of the same length, in days.
// Returns counts + change for each metric.
export function getDeltaStats(cohortSlugs, periodDays = 7) {
  const allowed = new Set(cohortSlugs);
  const now = Date.now();
  const currentSince = now - periodDays * 86400000;
  const previousSince = now - 2 * periodDays * 86400000;

  let curEntries = 0, prevEntries = 0;
  let curMinutes = 0, prevMinutes = 0;
  let curHomework = 0, prevHomework = 0;
  let curReviews = 0, prevReviews = 0;

  for (const p of ADMIN_MOCK_PARTICIPANTS) {
    if (!allowed.has(p.cohortSlug)) continue;

    for (const e of p.journalEntries || []) {
      const t = new Date(e.date).getTime();
      const saved = Math.max(0, (e.timeBeforeAI || 0) - (e.timeWithAI || 0));
      if (t >= currentSince) {
        curEntries++;
        curMinutes += saved;
      } else if (t >= previousSince) {
        prevEntries++;
        prevMinutes += saved;
      }
    }

    for (const sub of Object.values(p.submissions || {})) {
      const t = sub.submittedAt ? new Date(sub.submittedAt).getTime() : 0;
      if (t >= currentSince) curHomework++;
      else if (t >= previousSince) prevHomework++;

      const r = sub.reviewedAt ? new Date(sub.reviewedAt).getTime() : 0;
      if (r >= currentSince) curReviews++;
      else if (r >= previousSince) prevReviews++;
    }
  }

  return {
    entries: { current: curEntries, previous: prevEntries, delta: curEntries - prevEntries },
    minutesSaved: { current: curMinutes, previous: prevMinutes, delta: curMinutes - prevMinutes },
    homework: { current: curHomework, previous: prevHomework, delta: curHomework - prevHomework },
    reviews: { current: curReviews, previous: prevReviews, delta: curReviews - prevReviews },
  };
}

// Sessions whose date falls in [today, today + daysAhead]. Sorted earliest first.
export function getUpcomingSessions(daysAhead = 14) {
  // Avoid circular import — pass MOCK_SESSIONS to caller instead.
  // (Caller wires this; we just expose the filter logic.)
  return (mockSessions) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayMs = now.getTime();
    const cutoffMs = todayMs + daysAhead * 86400000;
    return mockSessions
      .filter((s) => {
        const t = new Date(s.date).getTime();
        return t >= todayMs && t <= cutoffMs;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };
}

// Merged activity stream — journal entries + homework submissions + reviews.
// Returns events sorted newest first.
export function getActivityStream(cohortSlugs, limit = 20) {
  const allowed = new Set(cohortSlugs);
  const events = [];

  for (const p of ADMIN_MOCK_PARTICIPANTS) {
    if (!allowed.has(p.cohortSlug)) continue;
    for (const e of p.journalEntries || []) {
      events.push({
        kind: "journal",
        date: e.date,
        participantId: p.id,
        participantName: p.name,
        organization: p.organization,
        cohortSlug: p.cohortSlug,
        title: e.title,
        meta: { saved: Math.max(0, (e.timeBeforeAI || 0) - (e.timeWithAI || 0)) },
      });
    }
    for (const [orderStr, sub] of Object.entries(p.submissions || {})) {
      if (sub.submittedAt) {
        events.push({
          kind: "homework-submitted",
          date: sub.submittedAt,
          participantId: p.id,
          participantName: p.name,
          organization: p.organization,
          cohortSlug: p.cohortSlug,
          title: `Submitted Session ${orderStr} homework`,
          meta: { sessionOrder: Number(orderStr) },
        });
      }
      if (sub.reviewedAt) {
        events.push({
          kind: "homework-reviewed",
          date: sub.reviewedAt,
          participantId: p.id,
          participantName: p.name,
          organization: p.organization,
          cohortSlug: p.cohortSlug,
          title: `Session ${orderStr} homework reviewed`,
          meta: { sessionOrder: Number(orderStr) },
        });
      }
    }
  }
  events.sort((a, b) => new Date(b.date) - new Date(a.date));
  return events.slice(0, limit);
}

// Tiny per-cohort sparkline data — entries per week, last N weeks. Inline
// version of getWeeklyTrend for use on each cohort card.
export function getCohortSparkline(slug, weeks = 8) {
  const roster = getParticipantsForCohort(slug);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dayOfWeek = (now.getDay() + 6) % 7;
  now.setDate(now.getDate() - dayOfWeek);

  const buckets = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    buckets.push({ startMs: start.getTime(), endMs: end.getTime(), count: 0 });
  }
  for (const p of roster) {
    for (const e of p.journalEntries || []) {
      const t = new Date(e.date).getTime();
      const bucket = buckets.find((b) => t >= b.startMs && t < b.endMs);
      if (bucket) bucket.count++;
    }
  }
  return buckets.map((b) => b.count);
}

// ---------------------------------------------------------------------------
// AI Journal aggregates — used across the admin views to surface the journal
// data alongside session progress + homework.
// ---------------------------------------------------------------------------

// minutes → human label ("3h 20m", "45m"). Used in KPI cards and chips.
export function formatMinutes(min) {
  if (!min || min <= 0) return "0m";
  const hours = Math.floor(min / 60);
  const rest = min % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

// Time saved on a single entry (minutes). Negative = AI took longer (rare,
// but we surface it honestly).
export function timeSavedFor(e) {
  return Math.max(0, (e.timeBeforeAI || 0) - (e.timeWithAI || 0));
}

// Total time saved across an array of entries, in minutes.
export function totalTimeSaved(entries = []) {
  return entries.reduce((sum, e) => sum + timeSavedFor(e), 0);
}

// All entries for one participant, newest first.
export function getJournalEntriesForParticipant(id) {
  const p = getParticipantById(id);
  if (!p) return [];
  return [...(p.journalEntries || [])].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );
}

// Helper — pull entries for a participant inside an optional time window.
function entriesInRange(p, sinceMs) {
  const entries = p.journalEntries || [];
  if (!sinceMs) return entries;
  return entries.filter((e) => new Date(e.date).getTime() >= sinceMs);
}

// Cohort-level aggregates (entries, total minutes saved, top contributor).
// `sinceMs` (optional) filters to entries since a given timestamp.
export function getCohortJournalStats(slug, sinceMs = null) {
  const roster = getParticipantsForCohort(slug);
  const allEntries = roster.flatMap((p) =>
    entriesInRange(p, sinceMs).map((e) => ({ ...e, participantId: p.id, participantName: p.name })),
  );
  const minutesSaved = totalTimeSaved(allEntries);

  let topContributor = null;
  let topMinutes = 0;
  for (const p of roster) {
    const m = totalTimeSaved(entriesInRange(p, sinceMs));
    if (m > topMinutes) {
      topMinutes = m;
      topContributor = p;
    }
  }

  const latest = allEntries
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;

  return {
    totalEntries: allEntries.length,
    totalMinutesSaved: minutesSaved,
    topContributor,
    topContributorMinutes: topMinutes,
    latest,
  };
}

// Cross-cohort aggregate — what the admin dashboard KPI cards show.
export function getScopeJournalStats(cohortSlugs, sinceMs = null) {
  const allowed = new Set(cohortSlugs);
  const roster = ADMIN_MOCK_PARTICIPANTS.filter((p) => allowed.has(p.cohortSlug));
  const allEntries = roster.flatMap((p) => entriesInRange(p, sinceMs));
  return {
    totalEntries: allEntries.length,
    totalMinutesSaved: totalTimeSaved(allEntries),
  };
}

// Leaderboard — top time-savers across scope (optionally inside a time window).
export function getTopContributorsInScope(cohortSlugs, limit = 5, sinceMs = null) {
  const allowed = new Set(cohortSlugs);
  return ADMIN_MOCK_PARTICIPANTS
    .filter((p) => allowed.has(p.cohortSlug))
    .map((p) => {
      const inRange = entriesInRange(p, sinceMs);
      return {
        id: p.id,
        name: p.name,
        title: p.title,
        organization: p.organization,
        cohortSlug: p.cohortSlug,
        entriesCount: inRange.length,
        minutesSaved: totalTimeSaved(inRange),
      };
    })
    .filter((p) => p.entriesCount > 0)
    .sort((a, b) => b.minutesSaved - a.minutesSaved)
    .slice(0, limit);
}

// Participants who haven't journaled in N+ days — useful for nudges.
export function getStaleParticipantsInScope(cohortSlugs, daysThreshold = 14) {
  const allowed = new Set(cohortSlugs);
  return ADMIN_MOCK_PARTICIPANTS
    .filter((p) => allowed.has(p.cohortSlug))
    .filter((p) => (p.lastJournalDaysAgo ?? 0) > daysThreshold)
    .sort((a, b) => (b.lastJournalDaysAgo ?? 0) - (a.lastJournalDaysAgo ?? 0));
}

// Biggest individual time-savers across scope — the "wins worth celebrating".
export function getBiggestWinsInScope(cohortSlugs, limit = 3, sinceMs = null) {
  const allowed = new Set(cohortSlugs);
  return ADMIN_MOCK_PARTICIPANTS
    .filter((p) => allowed.has(p.cohortSlug))
    .flatMap((p) =>
      entriesInRange(p, sinceMs).map((e) => ({
        ...e,
        participantId: p.id,
        participantName: p.name,
        organization: p.organization,
        cohortSlug: p.cohortSlug,
        saved: timeSavedFor(e),
      })),
    )
    .filter((e) => e.saved > 0)
    .sort((a, b) => b.saved - a.saved)
    .slice(0, limit);
}

// Weekly trend — entries per week for the last N weeks.
// Returns array of { weekStart: ISO, weekLabel: "Aug 1", count, minutesSaved }.
export function getWeeklyTrend(cohortSlugs, weeks = 8) {
  const allowed = new Set(cohortSlugs);
  const buckets = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  // Anchor on Monday of current week.
  const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Monday
  now.setDate(now.getDate() - dayOfWeek);

  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    buckets.push({
      weekStart: start.toISOString(),
      weekLabel: start.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      startMs: start.getTime(),
      endMs: end.getTime(),
      count: 0,
      minutesSaved: 0,
    });
  }

  for (const p of ADMIN_MOCK_PARTICIPANTS) {
    if (!allowed.has(p.cohortSlug)) continue;
    for (const e of p.journalEntries || []) {
      const t = new Date(e.date).getTime();
      const bucket = buckets.find((b) => t >= b.startMs && t < b.endMs);
      if (bucket) {
        bucket.count++;
        bucket.minutesSaved += timeSavedFor(e);
      }
    }
  }
  return buckets;
}

// Production-method mix — how many entries used each production tier.
// Returns ordered slices ready to feed a donut chart.
export function getProductionMethodMix(cohortSlugs, sinceMs = null) {
  const allowed = new Set(cohortSlugs);
  const counts = {
    "no-sop":      { key: "no-sop",      label: "No SOP",      count: 0, color: "#94A3B8" },
    "with-sop":    { key: "with-sop",    label: "With SOP",    count: 0, color: "#F59E0B" },
    "ai-workflow": { key: "ai-workflow", label: "AI Workflow", count: 0, color: "#3B82F6" },
    "ai-agent":    { key: "ai-agent",    label: "AI Agent",    count: 0, color: "#10B981" },
    "ai-swarm":    { key: "ai-swarm",    label: "AI Swarm",    count: 0, color: "#A855F7" },
  };
  let unlabeled = 0;
  for (const p of ADMIN_MOCK_PARTICIPANTS) {
    if (!allowed.has(p.cohortSlug)) continue;
    for (const e of filterEntriesByRange(p.journalEntries || [], sinceMs)) {
      const key = e.productionMethod;
      if (key && counts[key]) counts[key].count++;
      else unlabeled++;
    }
  }
  const slices = Object.values(counts);
  return { slices, unlabeled };
}

// Engagement segmentation — group participants by entry count (optionally
// within a time window).
//   champion: 5+ entries
//   engaged: 2-4 entries
//   trying: 1 entry
//   absent: 0 entries
export function getEngagementSegments(cohortSlugs, sinceMs = null) {
  const allowed = new Set(cohortSlugs);
  const segments = {
    champion: { key: "champion", label: "Champion", count: 0, hint: "5+ entries", color: "#10B981" },
    engaged:  { key: "engaged",  label: "Engaged",  count: 0, hint: "2–4 entries", color: "#3B82F6" },
    trying:   { key: "trying",   label: "Trying",   count: 0, hint: "1 entry", color: "#F59E0B" },
    absent:   { key: "absent",   label: "Absent",   count: 0, hint: "0 entries", color: "#9CA3AF" },
  };
  for (const p of ADMIN_MOCK_PARTICIPANTS) {
    if (!allowed.has(p.cohortSlug)) continue;
    const n = entriesInRange(p, sinceMs).length;
    if (n >= 5)      segments.champion.count++;
    else if (n >= 2) segments.engaged.count++;
    else if (n === 1) segments.trying.count++;
    else              segments.absent.count++;
  }
  return [segments.champion, segments.engaged, segments.trying, segments.absent];
}

// At-risk = combination signal:
//   stale journal (>10 days) OR
//   progress significantly behind (<3 sessions when others have 4+) OR
//   late on homework (last submission >14 days but they're early in the program)
// Returns array of participants with `risks` array describing why.
export function getAtRiskParticipants(cohortSlugs) {
  const allowed = new Set(cohortSlugs);
  const rows = [];
  for (const p of ADMIN_MOCK_PARTICIPANTS) {
    if (!allowed.has(p.cohortSlug)) continue;
    const risks = [];
    if ((p.lastJournalDaysAgo ?? 0) > 10) {
      risks.push(`No journal in ${p.lastJournalDaysAgo}d`);
    }
    if ((p.progress?.length || 0) <= 2) {
      risks.push("Behind on belts");
    }
    // Latest homework submission timestamp.
    const subs = Object.values(p.submissions || {});
    const lastSubmit = subs.length
      ? Math.max(...subs.map((s) => new Date(s.submittedAt).getTime()))
      : 0;
    const daysSinceSubmit = lastSubmit
      ? Math.floor((Date.now() - lastSubmit) / 86400000)
      : 999;
    if (daysSinceSubmit > 14 && (p.progress?.length || 0) < 5) {
      risks.push("Homework stalled");
    }
    if (risks.length > 0) {
      rows.push({ ...p, risks });
    }
  }
  // Most-at-risk first (more risks = higher).
  rows.sort((a, b) => b.risks.length - a.risks.length);
  return rows;
}

// Per-participant journal stat snapshot used by /admin/users list rows.
export function getParticipantJournalStat(p) {
  const entries = p.journalEntries || [];
  return {
    entriesCount: entries.length,
    minutesSaved: totalTimeSaved(entries),
  };
}

// Engagement bucket for a single participant — used by status filter.
// Strictly journal-volume based. Cohort progression is a separate signal
// (see getParticipantCurrentSession + getParticipantHomeworkStats).
export function getEngagementBucket(p) {
  const n = p.journalEntries?.length || 0;
  if (n >= 5)      return "champion";
  if (n >= 2)      return "engaged";
  if (n === 1)     return "trying";
  return "absent";
}

// Current session pointer for a participant — the next un-completed session.
// Returns null if the cohort has been completed (all 8 done).
export function getParticipantCurrentSession(p) {
  const completed = new Set(p?.progress || []);
  for (const s of MOCK_SESSIONS_FOR_HELPERS) {
    if (!completed.has(s.order)) return { order: s.order, belt: s.belt };
  }
  return null; // completed every session
}

// Homework stats for a participant — submitted, reviewed, pending.
// Pending = submitted but not yet reviewed.
export function getParticipantHomeworkStats(p) {
  const subs = Object.values(p?.submissions || {});
  const submitted = subs.length;
  const reviewed = subs.filter((s) => s.reviewedAt).length;
  return {
    submitted,
    reviewed,
    pending: submitted - reviewed,
  };
}

// Most recent entries across scope (for the dashboard activity feed).
export function getRecentEntriesInScope(cohortSlugs, limit = 6, sinceMs = null) {
  const allowed = new Set(cohortSlugs);
  return ADMIN_MOCK_PARTICIPANTS
    .filter((p) => allowed.has(p.cohortSlug))
    .flatMap((p) =>
      entriesInRange(p, sinceMs).map((e) => ({
        ...e,
        participantId: p.id,
        participantName: p.name,
        organization: p.organization,
        cohortSlug: p.cohortSlug,
      })),
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}
