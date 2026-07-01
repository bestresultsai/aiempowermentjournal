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

import { useEffect, useState } from "react";
import { MOCK_SESSIONS as MOCK_SESSIONS_FOR_HELPERS } from "./mockCohort";
import { initSupabase, isSupabaseEnabled } from "./supabase";
import { db, SupabaseNotReady } from "./db";
import { captureError } from "./observability";
import { getAllCohortsForAdmin, getSessionsForCohort } from "./cohortAdmin";
import { shouldUseSeedData } from "./demoData";
import { sendEmail } from "./mailer";

// ---------------------------------------------------------------------------
// Participant pubsub (task #550)
//
// A tiny in-memory event bus so every page that displays participants —
// AdminUsers, AdminCohortRoster, AdminHomeworkQueue, AdminJournalDashboard,
// AdminDashboard, /leader/cohort — re-renders as soon as a mutation lands
// or a Realtime event fires from Supabase. Mirrors the pattern in
// cohortAdmin.js's subscribeCohortChanges/useCohortVersion.
//
// Every mutation that touches ADMIN_MOCK_PARTICIPANTS (or its nested
// journalEntries / submissions / progress arrays) must call
// emitParticipantChange() so consumers know their data went stale.
// ---------------------------------------------------------------------------
const _participantListeners = new Set();
export function subscribeParticipantChanges(fn) {
  _participantListeners.add(fn);
  return () => _participantListeners.delete(fn);
}
function emitParticipantChange() {
  for (const fn of _participantListeners) {
    try { fn(); } catch { /* swallow — one bad listener shouldn't break the rest */ }
  }
}

// React hook: increments on every participant-touching write. Bind it into
// a useMemo dep array or a bare re-render trigger. Cheap to call from many
// components at once — listeners are added once per mount and removed on
// unmount.
export function useParticipantVersion() {
  const [v, setV] = useState(0);
  useEffect(() => subscribeParticipantChanges(() => setV((x) => x + 1)), []);
  return v;
}

// Filter the underlying ADMIN_MOCK_PARTICIPANTS array so seed-only entries
// drop out in clean-slate mode (Supabase wired + not in demo mode). Real
// admins should only see Supabase-sourced + admin-created participants.
// Seed entries are recognizable by NOT having _source === 'supabase' AND
// NOT having an addedAt field (admin-created participants always have one).
export function getEffectiveParticipants() {
  if (shouldUseSeedData()) return ADMIN_MOCK_PARTICIPANTS;
  return ADMIN_MOCK_PARTICIPANTS.filter(
    (p) => p._source === "supabase" || p._supabaseProfileId || p.addedAt,
  );
}

const COHORT_IAHE = "iahe-aiew3-2026q1";
const COHORT_MAYO = "mayo-aiew3-2026q1";
const COHORT_UCLA = "ucla-apfw-2026q1";
const COHORT_SUMMIT = "summit-aiew3-2026q3";
const COHORT_PHS = "phs-apfw-2026q2";

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
    location: { country: "US", state: "TX", city: "Austin" },
    defaultTimeZone: "America/Chicago",
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
    location: { country: "US", state: "MA", city: "Boston" },
    defaultTimeZone: "America/New_York",
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

  // -------- Summit Health (AIEW3 — Jordan Park's cohort) --------
  {
    id: "user-summit-1",
    name: "Brett Wilson",
    email: "brett.wilson@summithealth.com",
    title: "Director of Clinical Operations",
    organization: "Summit Health",
    cohortSlug: COHORT_SUMMIT,
    isCohortLead: true,
    whyAi: "I run a service line that's drowning in documentation. AI is the only path I can see.",
    mainGoal: "Get our after-visit summaries down from 30 minutes to under 5 — across all 14 clinics.",
    progress: [1, 2, 3, 4],
    lastJournalDaysAgo: 3,
    submissions: {
      1: { response: "Full role matrix delivered + top 3 use cases prioritized.", link: "https://notion.so/summit-1", submittedAt: daysAgoISO(26), reviewedAt: daysAgoISO(24), feedback: "Strong matrix. Curious how you'd rank by ROI." },
      2: { response: "AI Workflow live for after-visit summaries — 30 → 5 min.", link: "https://chat.openai.com/share/sm2", submittedAt: daysAgoISO(19), reviewedAt: daysAgoISO(17) },
      3: { response: "Custom GPT for staff Q&A pulled from policy manuals.", link: "", submittedAt: daysAgoISO(12) },
    },
    journalEntries: [
      entry({ days: 3,  title: "After-visit summaries — 30→5 min across all clinics", description: "Built an AI Workflow that drafts the AVS from raw notes; clinicians edit only.", before: 30, after: 5, productionMethod: "ai-workflow", volumePerDay: "10+", frequency: "daily", scope: "Organization-wide", qualityOutcome: "Equal to original", innovationTitle: "Cross-clinic AVS template", innovationDescription: "Same workflow now runs at all 14 Summit clinics." }),
      entry({ days: 10, title: "Policy Q&A bot for front-desk staff", description: "Custom GPT trained on every policy doc; answers in seconds.", before: 12, after: 2, productionMethod: "ai-agent", volumePerDay: "6-10", frequency: "daily", scope: "Department-wide" }),
      entry({ days: 17, title: "Patient appeal letter drafts", description: "Insurance appeals drafted in a structured workflow.", before: 90, after: 25, productionMethod: "ai-workflow", volumePerDay: "2-5", frequency: "weekly", scope: "Department-wide" }),
      entry({ days: 24, title: "Quarterly board prep — bottom-up rollup", description: "Pulled site-level data and synthesized via a workflow.", before: 240, after: 60, productionMethod: "with-sop", volumePerDay: "1", frequency: "rare", scope: "Organization-wide" }),
    ],
  },
  {
    id: "user-summit-2",
    name: "Priya Sharma",
    email: "priya.sharma@summithealth.com",
    title: "Data Analyst",
    organization: "Summit Health",
    cohortSlug: COHORT_SUMMIT,
    whyAi: "Half my time is glue work between dashboards. I want AI to be the glue.",
    mainGoal: "Replace my Monday rollup routine with an agent that does the first 80%.",
    progress: [1, 2],
    lastJournalDaysAgo: 9,
    submissions: {
      1: { response: "Role matrix with the analyst lens — heavy on data ops.", link: "", submittedAt: daysAgoISO(26), reviewedAt: daysAgoISO(24) },
      2: { response: "Prompt chain v1 for weekly rollup. Still iterating.", link: "https://notion.so/summit-2", submittedAt: daysAgoISO(19) },
    },
    journalEntries: [
      entry({ days: 9,  title: "Weekly rollup deck — prompt chain v1", description: "Chained Claude calls pull KPI numbers + write the narrative.", before: 240, after: 75, productionMethod: "ai-workflow", volumePerDay: "1", frequency: "weekly", scope: "Department-wide", qualityOutcome: "Equal to original" }),
      entry({ days: 21, title: "Ad-hoc data pull → SQL → chart", description: "Plain-English requests turn into SQL + a matplotlib chart.", before: 60, after: 12, productionMethod: "ai-workflow", volumePerDay: "2-5", frequency: "weekly", scope: "Individual" }),
      entry({ days: 28, title: "Glossary of internal metrics", description: "Started a metric dictionary with Claude's help.", before: 180, after: 45 }),
    ],
  },
  {
    id: "user-summit-3",
    name: "James Chen",
    email: "james.chen@summithealth.com",
    title: "Compliance Officer",
    organization: "Summit Health",
    cohortSlug: COHORT_SUMMIT,
    whyAi: "Audit prep eats my year. I have to stop reinventing the wheel every quarter.",
    mainGoal: "Stand up a repeatable audit-readiness workflow before Q3.",
    progress: [1, 2, 3, 4, 5],
    lastJournalDaysAgo: 1,
    submissions: {
      1: { response: "Compliance role matrix — heavy regulatory load.", link: "", submittedAt: daysAgoISO(28), reviewedAt: daysAgoISO(26) },
      2: { response: "Drafted three audit-prep prompts.", link: "", submittedAt: daysAgoISO(21), reviewedAt: daysAgoISO(19) },
      3: { response: "Repeatable audit-readiness workflow v1 live.", link: "https://notion.so/summit-3", submittedAt: daysAgoISO(14), reviewedAt: daysAgoISO(12), feedback: "Ship-worthy." },
      4: { response: "Custom GPT for policy gap analysis.", link: "", submittedAt: daysAgoISO(7) },
    },
    journalEntries: [
      entry({ days: 1,  title: "Audit readiness — quarterly checklist generator", description: "Workflow generates the entire prep packet from the audit calendar.", before: 480, after: 90, productionMethod: "ai-workflow", volumePerDay: "1", frequency: "monthly", scope: "Organization-wide", qualityOutcome: "Better than original" }),
      entry({ days: 8,  title: "Policy gap analysis — custom GPT", description: "GPT compares our policies against the new regulatory text.", before: 360, after: 60, productionMethod: "ai-agent", volumePerDay: "1", frequency: "monthly", scope: "Department-wide" }),
      entry({ days: 15, title: "Risk register summary for board", description: "Claude condensed the 80-row register into a one-pager.", before: 90, after: 20, productionMethod: "ai-workflow", volumePerDay: "1", frequency: "rare", scope: "Organization-wide" }),
    ],
  },
  {
    id: "user-summit-4",
    name: "Maria Lopez",
    email: "maria.lopez@summithealth.com",
    title: "Operations Lead",
    organization: "Summit Health",
    cohortSlug: COHORT_SUMMIT,
    whyAi: "Trying to keep my team afloat. I need them to spend less time on docs and more on patients.",
    mainGoal: "Ship two AI workflows my team adopts daily.",
    progress: [1, 2, 3],
    lastJournalDaysAgo: 6,
    submissions: {
      1: { response: "Matrix done.", link: "", submittedAt: daysAgoISO(26) },
      2: { response: "Weekly huddle deck via prompt chain.", link: "", submittedAt: daysAgoISO(19), reviewedAt: daysAgoISO(17) },
    },
    journalEntries: [
      entry({ days: 6,  title: "Weekly huddle deck — auto-built", description: "Prompt chain pulls metrics + drafts the deck before Monday.", before: 120, after: 25, productionMethod: "ai-workflow", volumePerDay: "1", frequency: "weekly", scope: "Department-wide" }),
      entry({ days: 18, title: "Onboarding checklist generator", description: "New-hire packet built in minutes from role + start date.", before: 60, after: 10, productionMethod: "ai-workflow", volumePerDay: "1", frequency: "monthly", scope: "Department-wide" }),
    ],
  },
  {
    id: "user-summit-5",
    name: "Tyler Brooks",
    email: "tyler.brooks@summithealth.com",
    title: "Marketing Manager",
    organization: "Summit Health",
    cohortSlug: COHORT_SUMMIT,
    whyAi: "I'm late to AI and I know it. Catching up before my next campaign cycle.",
    mainGoal: "Ship a campaign cycle that uses AI end-to-end — brief, copy, creative routing.",
    progress: [1],
    lastJournalDaysAgo: 20,
    submissions: {
      1: { response: "First draft of role matrix — mostly campaign ops.", link: "", submittedAt: daysAgoISO(26) },
    },
    journalEntries: [
      entry({ days: 20, title: "Quick blog post draft", description: "Used Claude to draft a 600-word piece. Still needs heavy editing.", before: 90, after: 35 }),
    ],
  },
  {
    id: "user-summit-6",
    name: "Alex Rivera",
    email: "alex.rivera@summithealth.com",
    title: "Tech Lead",
    organization: "Summit Health",
    cohortSlug: COHORT_SUMMIT,
    whyAi: "I'm the engineer everyone calls when something AI-ish needs to ship. Time to formalize that practice.",
    mainGoal: "Stand up two production agents that run nightly with no babysitting.",
    progress: [1, 2, 3, 4],
    lastJournalDaysAgo: 2,
    submissions: {
      1: { response: "Engineering matrix done.", link: "https://github.com/alex/summit-matrix", submittedAt: daysAgoISO(28), reviewedAt: daysAgoISO(26), feedback: "Strong engineering rigor." },
      2: { response: "Multi-step refactor workflow — saved hours.", link: "", submittedAt: daysAgoISO(21), reviewedAt: daysAgoISO(19) },
      3: { response: "Two production agents in dev — almost there.", link: "", submittedAt: daysAgoISO(14) },
    },
    journalEntries: [
      entry({ days: 2,  title: "Two production agents — nightly cron", description: "Inventory reconciliation + on-call summary agents running unattended.", before: 240, after: 0, productionMethod: "ai-swarm", volumePerDay: "1", frequency: "daily", scope: "Organization-wide", qualityOutcome: "Better than original", innovationTitle: "Unattended nightly agents", innovationDescription: "Two distinct agents handle reconciliation + escalations end-to-end while we sleep." }),
      entry({ days: 9,  title: "Multi-step code refactor workflow", description: "Refactor → tests → review loop semi-automated.", before: 180, after: 40, productionMethod: "ai-workflow", volumePerDay: "2-5", frequency: "weekly", scope: "Department-wide" }),
      entry({ days: 16, title: "PR description templates from diff", description: "Claude writes a sane PR description from the diff.", before: 20, after: 4, productionMethod: "ai-workflow", volumePerDay: "6-10", frequency: "daily", scope: "Individual" }),
      entry({ days: 23, title: "On-call runbook auto-update", description: "After each incident, Claude updates the runbook.", before: 60, after: 8, productionMethod: "ai-agent", volumePerDay: "1", frequency: "weekly", scope: "Department-wide" }),
    ],
  },

  // -------- Pacific Health System (APFW — Jordan Park's cohort) --------
  {
    id: "user-phs-1",
    name: "Diane Park",
    email: "diane.park@pacifichealth.org",
    title: "Chief Innovation Officer",
    organization: "Pacific Health System",
    cohortSlug: COHORT_PHS,
    isCohortLead: true,
    whyAi: "Innovation budget is real. I need to show ROI by end of fiscal.",
    mainGoal: "Document and roll out 5 reusable workflows that 60% of the org adopts.",
    progress: [1, 2, 3, 4, 5],
    lastJournalDaysAgo: 2,
    submissions: {
      1: { response: "Strategic matrix with org-wide use cases ranked.", link: "https://notion.so/phs-1", submittedAt: daysAgoISO(28), reviewedAt: daysAgoISO(26), feedback: "Best cohort matrix." },
      2: { response: "Three workflows shipping at the same time.", link: "", submittedAt: daysAgoISO(21), reviewedAt: daysAgoISO(19) },
      3: { response: "Five workflows live; adoption metrics tracking.", link: "https://notion.so/phs-1-3", submittedAt: daysAgoISO(14), reviewedAt: daysAgoISO(12) },
      4: { response: "First multi-agent pilot running this week.", link: "", submittedAt: daysAgoISO(7) },
    },
    journalEntries: [
      entry({ days: 2,  title: "Multi-agent referral routing pilot", description: "Three agents collaborating to route referrals to the right specialist.", before: 90, after: 8, productionMethod: "ai-swarm", volumePerDay: "10+", frequency: "daily", scope: "Organization-wide", qualityOutcome: "Better than original", innovationTitle: "Agent-orchestrated referrals", innovationDescription: "Triage agent → specialist matcher → notifier. End-to-end, no human touch." }),
      entry({ days: 9,  title: "Quarterly innovation report — auto-drafted", description: "Pulls KPIs + narrative drafts together.", before: 480, after: 90, productionMethod: "ai-workflow", volumePerDay: "1", frequency: "rare", scope: "Organization-wide" }),
      entry({ days: 16, title: "Provider-credentialing intake — fully agentic", description: "Custom agent handles credentialing intake end-to-end.", before: 240, after: 15, productionMethod: "ai-agent", volumePerDay: "2-5", frequency: "daily", scope: "Organization-wide", innovationTitle: "Credentialing autopilot", innovationDescription: "Agent ingests credentialing packets, flags gaps, drafts outreach." }),
      entry({ days: 23, title: "Standardized RFP responses", description: "Three reusable prompt chains for different RFP types.", before: 360, after: 60, productionMethod: "ai-workflow", volumePerDay: "1", frequency: "monthly", scope: "Department-wide" }),
    ],
  },
  {
    id: "user-phs-2",
    name: "Carlos Mendez",
    email: "carlos.mendez@pacifichealth.org",
    title: "Senior Project Manager",
    organization: "Pacific Health System",
    cohortSlug: COHORT_PHS,
    whyAi: "I run six projects at once and I'm drowning in status meetings.",
    mainGoal: "Get to zero manual status reports.",
    progress: [1, 2, 3],
    lastJournalDaysAgo: 4,
    submissions: {
      1: { response: "PM matrix — heavy reporting load.", link: "", submittedAt: daysAgoISO(26), reviewedAt: daysAgoISO(24) },
      2: { response: "Reusable status report workflow live.", link: "", submittedAt: daysAgoISO(19) },
    },
    journalEntries: [
      entry({ days: 4,  title: "Status report generator — workflow", description: "Drafts six different reports from a single weekly check-in form.", before: 180, after: 30, productionMethod: "ai-workflow", volumePerDay: "6-10", frequency: "weekly", scope: "Department-wide" }),
      entry({ days: 11, title: "Risk log triage", description: "Claude clusters new risks into existing categories.", before: 45, after: 8, productionMethod: "ai-workflow", volumePerDay: "1", frequency: "weekly", scope: "Individual" }),
      entry({ days: 18, title: "Meeting note → action items extractor", description: "Action items pulled and assigned in seconds.", before: 30, after: 5, productionMethod: "ai-workflow", volumePerDay: "2-5", frequency: "daily", scope: "Individual" }),
    ],
  },
  {
    id: "user-phs-3",
    name: "Lin Wang",
    email: "lin.wang@pacifichealth.org",
    title: "Patient Care Coordinator",
    organization: "Pacific Health System",
    cohortSlug: COHORT_PHS,
    whyAi: "Care coordination has a lot of busywork I'd love to delegate.",
    mainGoal: "Cut my admin workload in half so I can focus on the actual coordination.",
    progress: [1, 2, 3, 4],
    lastJournalDaysAgo: 5,
    submissions: {
      1: { response: "Care coordination matrix.", link: "", submittedAt: daysAgoISO(26), reviewedAt: daysAgoISO(24) },
      2: { response: "Patient outreach templates with prompt chain.", link: "", submittedAt: daysAgoISO(19), reviewedAt: daysAgoISO(17) },
      3: { response: "Auto-summary of care plans.", link: "", submittedAt: daysAgoISO(12) },
    },
    journalEntries: [
      entry({ days: 5,  title: "Care plan summaries for handoffs", description: "Claude summarizes care plans in 2 paragraphs for handoffs.", before: 30, after: 5, productionMethod: "ai-workflow", volumePerDay: "10+", frequency: "daily", scope: "Department-wide", qualityOutcome: "Equal to original" }),
      entry({ days: 13, title: "Personalized patient outreach", description: "Prompt chain personalizes per-patient outreach at scale.", before: 60, after: 10, productionMethod: "ai-workflow", volumePerDay: "6-10", frequency: "daily", scope: "Department-wide" }),
      entry({ days: 20, title: "Resource referral matcher", description: "AI matches patients to community resources.", before: 45, after: 8, productionMethod: "ai-agent", volumePerDay: "2-5", frequency: "weekly", scope: "Department-wide" }),
    ],
  },
  {
    id: "user-phs-4",
    name: "Robert Davis",
    email: "robert.davis@pacifichealth.org",
    title: "IT Director",
    organization: "Pacific Health System",
    cohortSlug: COHORT_PHS,
    whyAi: "Every IT request reads the same. The team is tired.",
    mainGoal: "Build a tier-1 IT support agent that resolves 60% of tickets autonomously.",
    progress: [1, 2, 3, 4, 5],
    lastJournalDaysAgo: 3,
    submissions: {
      1: { response: "IT matrix mapped.", link: "", submittedAt: daysAgoISO(28), reviewedAt: daysAgoISO(26) },
      2: { response: "Triage prompt chain — promising.", link: "", submittedAt: daysAgoISO(21), reviewedAt: daysAgoISO(19) },
      3: { response: "Custom GPT live for tier-1 password resets.", link: "", submittedAt: daysAgoISO(14), reviewedAt: daysAgoISO(12) },
      4: { response: "60% ticket deflection holding for two weeks.", link: "https://notion.so/phs-4-4", submittedAt: daysAgoISO(7), reviewedAt: daysAgoISO(5), feedback: "Big win. Document for replication." },
    },
    journalEntries: [
      entry({ days: 3,  title: "Tier-1 IT agent — 60% deflection", description: "Custom agent resolves password resets + common ticket types end-to-end.", before: 25, after: 3, productionMethod: "ai-agent", volumePerDay: "10+", frequency: "daily", scope: "Organization-wide", qualityOutcome: "Better than original", innovationTitle: "Autonomous tier-1 desk", innovationDescription: "60% of inbound tickets never reach a human." }),
      entry({ days: 11, title: "Outage postmortem first draft", description: "Claude drafts the postmortem from the incident channel.", before: 90, after: 20, productionMethod: "ai-workflow", volumePerDay: "1", frequency: "weekly", scope: "Department-wide" }),
      entry({ days: 19, title: "Vendor email triage", description: "Workflow sorts inbound vendor email into priority buckets.", before: 45, after: 8, productionMethod: "ai-workflow", volumePerDay: "6-10", frequency: "daily", scope: "Individual" }),
    ],
  },
  {
    id: "user-phs-5",
    name: "Aisha Williams",
    email: "aisha.williams@pacifichealth.org",
    title: "Training Coordinator",
    organization: "Pacific Health System",
    cohortSlug: COHORT_PHS,
    whyAi: "I want to be the person who actually uses what we just trained on.",
    mainGoal: "Ship one workflow per session — six by program end.",
    progress: [1, 2],
    lastJournalDaysAgo: 11,
    submissions: {
      1: { response: "Training role matrix.", link: "", submittedAt: daysAgoISO(26) },
      2: { response: "Quick template for training feedback emails.", link: "", submittedAt: daysAgoISO(19) },
    },
    journalEntries: [
      entry({ days: 11, title: "Training feedback summarizer", description: "Drafted with Claude, two iterations.", before: 60, after: 18, productionMethod: "ai-workflow", volumePerDay: "1", frequency: "weekly", scope: "Individual" }),
      entry({ days: 25, title: "Onboarding deck refresh", description: "Outline + draft from old materials.", before: 240, after: 60 }),
    ],
  },
  {
    id: "user-phs-6",
    name: "Kevin Murphy",
    email: "kevin.murphy@pacifichealth.org",
    title: "Quality Assurance Manager",
    organization: "Pacific Health System",
    cohortSlug: COHORT_PHS,
    whyAi: "QA is pattern-matching all day. AI should be eating this.",
    mainGoal: "Stand up one assistant that pre-flags compliance gaps before audit.",
    progress: [1, 2, 3],
    lastJournalDaysAgo: 6,
    submissions: {
      1: { response: "QA matrix mapped.", link: "", submittedAt: daysAgoISO(26), reviewedAt: daysAgoISO(24) },
      2: { response: "Workflow for chart review checklist.", link: "", submittedAt: daysAgoISO(19) },
    },
    journalEntries: [
      entry({ days: 6,  title: "Chart review checklist — workflow", description: "Workflow generates per-chart compliance checklist.", before: 45, after: 10, productionMethod: "ai-workflow", volumePerDay: "6-10", frequency: "daily", scope: "Department-wide", qualityOutcome: "Equal to original" }),
      entry({ days: 17, title: "Sample audit report from raw findings", description: "Findings → draft audit report.", before: 120, after: 30, productionMethod: "ai-workflow", volumePerDay: "1", frequency: "weekly", scope: "Department-wide" }),
    ],
  },
];

// ---------------------------------------------------------------------------
// Derived helpers — these are what the admin pages actually consume.
// ---------------------------------------------------------------------------

export function getParticipantsForCohort(slug) {
  return getEffectiveParticipants().filter((p) => p.cohortSlug === slug);
}

export function getParticipantById(id) {
  return getEffectiveParticipants().find((p) => p.id === id) || null;
}

// Lookup by email — used by the participant-facing flow to find the same
// participant record the admin sees. Lets one demo write reflect in both views.
export function getParticipantByEmail(email) {
  if (!email) return null;
  const lc = email.toLowerCase();
  return getEffectiveParticipants().find((p) => p.email?.toLowerCase() === lc) || null;
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

// Identity-first default for user.role given a capability list. Kept inline
// (rather than imported from viewAs.js) to avoid a circular import — this
// file is itself referenced by adminRoles/permissions/viewAs.
function defaultPrimaryRoleFromCaps(capabilities) {
  const caps = Array.isArray(capabilities) ? capabilities : [...capabilities];
  if (caps.includes("facilitator")) return "facilitator";
  if (caps.includes("org")) return "org";
  if (caps.includes("cohort-leader")) return "cohort-leader";
  if (caps.includes("participant")) return "participant";
  if (caps.includes("super")) return "super";
  if (caps.includes("admin")) return "admin";
  return "participant";
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

  // Best-effort mirror each new participant.
  for (const p of added) mirrorParticipantToSupabase(p);

  if (added.length) emitParticipantChange();
  return { added, skipped };
}

// ---------------------------------------------------------------------------
// createStandaloneUser — unified entry point for the /admin/users/new flow.
//
// "Users" is the parent concept on the platform. Every other role —
// Participant, Cohort Leader, Facilitator, Org Admin, Admin, Super Admin —
// is just a capability layered on top of the user record.
//
// Implementation today (demo): every user is stored as a standalone
// participant (cohortSlug = null) carrying the capabilities[] list. Roles
// like "facilitator" or "org" don't require a separate record for the demo —
// AdminUsers reads capabilities directly from each participant record.
//
// payload: {
//   name, email, title, organization, phone, headshotUrl,
//   capabilities: string[]   // e.g. ["admin"], ["facilitator","admin"]
//   cohortSlug: string|null  // only used when "participant" capability is set
// }
//
// Returns { user, errors[] } — errors is non-empty on validation failure.
// ---------------------------------------------------------------------------
export function createStandaloneUser(payload) {
  const errors = [];
  const name = (payload.name || "").trim();
  const email = (payload.email || "").trim().toLowerCase();
  const caps = Array.isArray(payload.capabilities) ? payload.capabilities : [];

  if (!email) errors.push("Email is required.");
  if (!name) errors.push("Name is required.");
  if (!caps.length) errors.push("Pick at least one role.");

  // Duplicate check — if this email is already on the platform (as a
  // standalone participant, or unassigned), refuse to create another.
  const existing = ADMIN_MOCK_PARTICIPANTS.find(
    (p) => p.email?.toLowerCase() === email,
  );
  if (existing) errors.push(`A user with ${email} already exists.`);

  if (errors.length) return { user: null, errors };

  // "participant" and "cohort-leader" are derived from the record itself
  // (cohortSlug present + isCohortLead boolean), so we strip them from the
  // stored capabilities[] to avoid double-storage.
  const isParticipant = caps.includes("participant");
  const isLeader = caps.includes("cohort-leader");
  const storedCaps = caps.filter((c) => c !== "participant" && c !== "cohort-leader");

  const cohortSlug = isParticipant ? (payload.cohortSlug || null) : null;
  const idSeed = cohortSlug || "user";
  const id = `user-${idSeed}-${email.replace(/[^a-z0-9]/g, "-").slice(0, 32)}-${Date.now().toString(36).slice(-4)}`;

  // Primary role — explicit identity field. If the admin picked one in the
  // form (payload.role), respect it. Otherwise default to the identity-
  // first heuristic from defaultPrimaryRole(): facilitator > org >
  // cohort-leader > participant > super > admin.
  const explicitRole = payload.role && typeof payload.role === "string" ? payload.role : null;
  const role = explicitRole || defaultPrimaryRoleFromCaps(caps);

  const user = {
    id,
    name,
    email,
    title: (payload.title || "").trim(),
    organization: (payload.organization || "").trim(),
    phone: (payload.phone || "").trim(),
    headshotUrl: (payload.headshotUrl || "").trim() || null,
    location: payload.location || { country: "", state: "", city: "" },
    defaultTimeZone: (payload.defaultTimeZone || "").trim() || null,
    role,
    isCohortLead: isLeader,
    capabilities: storedCaps,
    cohortSlug,
    whyAi: "",
    mainGoal: "",
    progress: [],
    lastJournalDaysAgo: 999,
    submissions: {},
    journalEntries: [],
  };
  ADMIN_MOCK_PARTICIPANTS.push(user);
  const stored = loadAddedParticipants();
  persistAddedParticipants([...stored, user]);
  // Best-effort mirror. If this email already has a Supabase auth user
  // (e.g. an admin re-registering an existing user), the mirror updates
  // the profile. If not, the mirror is a no-op and the local record
  // becomes the only source — the user can be invited to Supabase later
  // via a server endpoint.
  mirrorParticipantToSupabase(user);
  emitParticipantChange();
  return { user, errors: [] };
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
  for (const p of updated) mirrorParticipantToSupabase(p);
  if (updated.length) emitParticipantChange();
  return updated;
}

// Pending = submitted but no reviewedAt. Returns rows flattened across all
// scoped cohorts so the queue can render in one table.
export function getPendingHomework(cohortSlugs) {
  const allowed = new Set(cohortSlugs);
  const rows = [];
  for (const p of getEffectiveParticipants()) {
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
  // Track whether this is a NEW submission vs an edit — we only want to
  // ping the facilitator the first time. Subsequent edits stay silent so
  // participants can revise without spamming the review queue's inbox.
  const isFirstSubmission = !existing.submittedAt;
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
  mirrorHomeworkToSupabase(p, order, p.submissions[order]);
  emitParticipantChange();
  if (isFirstSubmission) {
    _fireNewHomeworkSubmittedEmail(p, order).catch((err) =>
      captureError(err, { source: "submitHomeworkAsParticipant.email" }),
    );
  }
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
  mirrorJournalEntryToSupabase(p, newEntry);
  emitParticipantChange();
  return newEntry;
}

// Mark a session complete for a participant identified by email.
export function markSessionCompleteForParticipant(email, sessionOrder, completed = true) {
  const p = getParticipantByEmail(email);
  if (!p) return null;
  const ord = Number(sessionOrder);
  const alreadyDone = (p.progress || []).includes(ord);
  const set = new Set(p.progress || []);
  if (completed) set.add(ord); else set.delete(ord);
  p.progress = [...set].sort((a, b) => a - b);
  mirrorSessionProgressToSupabase(p, ord, completed);
  emitParticipantChange();
  // Only fire the belt-earned + program-complete emails on the transition
  // from incomplete → complete, not when a participant untoggles/retoggles
  // (which would spam their inbox).
  if (completed && !alreadyDone) {
    _fireBeltEarnedEmail(p, ord).catch((err) =>
      captureError(err, { source: "markSessionCompleteForParticipant.beltEarned" }),
    );
    _fireProgramCompleteEmailIfLast(p).catch((err) =>
      captureError(err, { source: "markSessionCompleteForParticipant.programComplete" }),
    );
  }
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
  mirrorHomeworkToSupabase(p, sessionOrder, p.submissions[sessionOrder]);
  emitParticipantChange();
  // Notify the participant that their homework was reviewed. Fire-and-forget
  // — a bounce from Resend shouldn't roll back the review write.
  _fireHomeworkReviewedEmail(p, sessionOrder, feedback).catch((err) =>
    captureError(err, { source: "markHomeworkReviewed.email" }),
  );
  return p.submissions[sessionOrder];
}

async function _fireHomeworkReviewedEmail(participant, sessionOrder, feedback) {
  if (!participant?.email || !participant?.cohortSlug) return;
  const cohort = getAllCohortsForAdmin().find((c) => c.slug === participant.cohortSlug);
  if (!cohort) return;
  const sessions = getSessionsForCohort(participant.cohortSlug) || [];
  const session = sessions.find((s) => s.order === Number(sessionOrder));
  if (!session) return;
  const firstName =
    (participant.name || "").trim().split(/\s+/)[0] || "there";
  await sendEmail({
    template: "homework-reviewed",
    to: { name: participant.name || participant.email, email: participant.email },
    data: {
      participant: { firstName, email: participant.email, name: participant.name || "" },
      session: { order: session.order, title: session.title, belt: session.belt },
      facilitator: cohort.facilitator || cohort.trainer || null,
      feedback: (feedback || "").trim(),
      cohortSlug: participant.cohortSlug,
    },
  });
}

// Notify the facilitator that a fresh homework submission is waiting for
// review. Runs from the participant session, so the send-email Function has
// to accept the participant's token — see the `new-homework-submitted`
// branch in netlify/functions/send-email.js which checks the recipient is
// the cohort's actual facilitator before allowing the send.
async function _fireNewHomeworkSubmittedEmail(participant, sessionOrder) {
  if (!participant?.email || !participant?.cohortSlug) return;
  const cohort = getAllCohortsForAdmin().find((c) => c.slug === participant.cohortSlug);
  if (!cohort) return;
  const facilitator = cohort.facilitator || cohort.trainer;
  if (!facilitator?.email) return;
  const sessions = getSessionsForCohort(participant.cohortSlug) || [];
  const session = sessions.find((s) => s.order === Number(sessionOrder));
  if (!session) return;
  await sendEmail({
    template: "new-homework-submitted",
    to: { name: facilitator.name || facilitator.email, email: facilitator.email },
    data: {
      facilitator,
      participant: { name: participant.name || participant.email, email: participant.email },
      session: { order: session.order, title: session.title, belt: session.belt },
      cohort: { name: cohort.name, slug: cohort.slug },
      count: 1,
      cohortSlug: participant.cohortSlug,
    },
  });
}

// Belt earned — fires on every fresh session completion (each session in
// AIEW3/APFW is its own belt boundary). Kept to the participant themselves
// so the send-email USER_LIFECYCLE_TEMPLATES self-send rule covers it.
async function _fireBeltEarnedEmail(participant, sessionOrder) {
  if (!participant?.email || !participant?.cohortSlug) return;
  const sessions = getSessionsForCohort(participant.cohortSlug) || [];
  const session = sessions.find((s) => s.order === Number(sessionOrder));
  if (!session?.belt) return; // no belt = don't send (some seed rows have no belt)
  const firstName =
    (participant.name || "").trim().split(/\s+/)[0] || "there";
  await sendEmail({
    template: "belt-earned",
    to: { name: participant.name || participant.email, email: participant.email },
    data: {
      participant: { firstName, email: participant.email, name: participant.name || "" },
      session: { order: session.order, title: session.title, belt: session.belt },
      cohortSlug: participant.cohortSlug,
    },
  });
}

// Program complete — fires only when the freshly-completed session was the
// last one in the participant's cohort's program. Uses program.sessionsCount
// as the source of truth so APFW (10 sessions) and AIEW3 (8 sessions) both
// trigger at the right moment.
async function _fireProgramCompleteEmailIfLast(participant) {
  if (!participant?.email || !participant?.cohortSlug) return;
  const cohort = getAllCohortsForAdmin().find((c) => c.slug === participant.cohortSlug);
  if (!cohort) return;
  const sessions = getSessionsForCohort(participant.cohortSlug) || [];
  const total = sessions.length;
  if (!total) return;
  const completedCount = (participant.progress || []).length;
  if (completedCount < total) return; // not there yet
  const firstName =
    (participant.name || "").trim().split(/\s+/)[0] || "there";
  await sendEmail({
    template: "program-complete",
    to: { name: participant.name || participant.email, email: participant.email },
    data: {
      participant: { firstName, email: participant.email, name: participant.name || "" },
      cohort: { name: cohort.name, slug: cohort.slug, programCode: cohort.programCode },
      cohortSlug: participant.cohortSlug,
    },
  });
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
  mirrorHomeworkToSupabase(p, sessionOrder, sub);
  emitParticipantChange();
  return sub;
}

// Generic submission rows by status across a set of cohort slugs.
// status: "pending" | "reviewed" | "all"
export function getHomeworkRows(cohortSlugs, status = "pending") {
  const allowed = new Set(cohortSlugs);
  const rows = [];
  for (const p of getEffectiveParticipants()) {
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
  mirrorParticipantToSupabase(p);
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
  mirrorParticipantToSupabase(p);
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

  for (const p of getEffectiveParticipants()) {
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

  for (const p of getEffectiveParticipants()) {
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
  const roster = getEffectiveParticipants().filter((p) => allowed.has(p.cohortSlug));
  const allEntries = roster.flatMap((p) => entriesInRange(p, sinceMs));
  return {
    totalEntries: allEntries.length,
    totalMinutesSaved: totalTimeSaved(allEntries),
  };
}

// Leaderboard — top time-savers across scope (optionally inside a time window).
export function getTopContributorsInScope(cohortSlugs, limit = 5, sinceMs = null) {
  const allowed = new Set(cohortSlugs);
  return getEffectiveParticipants()
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
  return getEffectiveParticipants()
    .filter((p) => allowed.has(p.cohortSlug))
    .filter((p) => (p.lastJournalDaysAgo ?? 0) > daysThreshold)
    .sort((a, b) => (b.lastJournalDaysAgo ?? 0) - (a.lastJournalDaysAgo ?? 0));
}

// Biggest individual time-savers across scope — the "wins worth celebrating".
// Returns every journal entry that has an innovationTitle, scoped to the
// given cohort slugs and (optionally) a time window. Each entry is stamped
// with participant + cohort context so the consumer doesn't need a join.
// `sort` accepts "saved" (default, descending hours saved) or "date"
// (descending recency). `limit` caps the result; pass null/0 for "all".
export function getInnovationsInScope(cohortSlugs, sinceMs = null, sort = "saved", limit = 0) {
  const allowed = new Set(cohortSlugs);
  const rows = getEffectiveParticipants()
    .filter((p) => allowed.has(p.cohortSlug))
    .flatMap((p) =>
      entriesInRange(p, sinceMs)
        .filter((e) => (e.innovationTitle || "").trim())
        .map((e) => ({
          ...e,
          participantId: p.id,
          participantName: p.name,
          participantEmail: p.email,
          organization: p.organization,
          cohortSlug: p.cohortSlug,
          saved: timeSavedFor(e),
        })),
    );
  rows.sort((a, b) => {
    if (sort === "date") return new Date(b.date) - new Date(a.date);
    // "saved" default — break ties by date so newer wins float up.
    if (b.saved !== a.saved) return b.saved - a.saved;
    return new Date(b.date) - new Date(a.date);
  });
  return limit > 0 ? rows.slice(0, limit) : rows;
}

export function getBiggestWinsInScope(cohortSlugs, limit = 3, sinceMs = null) {
  const allowed = new Set(cohortSlugs);
  return getEffectiveParticipants()
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

  for (const p of getEffectiveParticipants()) {
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
  for (const p of getEffectiveParticipants()) {
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
  for (const p of getEffectiveParticipants()) {
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
  for (const p of getEffectiveParticipants()) {
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
  return getEffectiveParticipants()
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

// ===========================================================================
// Supabase hydration — Phase 2 Round A of #399.
//
// Pulls profiles + cohort_participants from Supabase and merges them into
// ADMIN_MOCK_PARTICIPANTS. Three cases per row:
//
//   1. Email matches an existing seed participant → attach Supabase IDs
//      so future writes target the right row, otherwise defer to seed.
//   2. Email matches a participant already added via the admin UI → same.
//   3. Email is brand new (Supabase-only) → push a new participant entry.
//
// For writes, the mirror skips gracefully if a participant's email doesn't
// already have a Supabase auth user. Creating profiles from the browser
// requires a server endpoint (separate task) because profiles.id must
// reference auth.users(id).
// ===========================================================================

let participantsHydrated = false;
let participantHydratePromise = null;
let _supabaseProfileByEmail = new Map();  // email (lc) → { id, capabilities }

function profileRowToParticipant(row, { cohortBySupabaseId, cohortLinkRow }) {
  if (!row) return null;
  const cohort = cohortLinkRow?.cohort_id ? cohortBySupabaseId[cohortLinkRow.cohort_id] : null;
  const isLeader = cohortLinkRow?.role === "cohort_leader";
  return {
    _supabaseProfileId: row.id,
    _supabaseCohortLinkId: cohortLinkRow?.id || null,
    _source: "supabase",
    id: `user-supabase-${row.id.slice(0, 8)}`,
    name: row.name || "",
    email: (row.email || "").toLowerCase(),
    title: row.preferences?.title || "",
    organization: row.preferences?.organization || "",
    phone: row.phone || "",
    headshotUrl: row.avatar_url || null,
    location: row.preferences?.location || { country: "", state: "", city: "" },
    defaultTimeZone: row.time_zone || null,
    role: row.preferences?.role || null,
    isCohortLead: isLeader,
    capabilities: Array.isArray(row.capabilities)
      ? row.capabilities.filter((c) => c !== "participant" && c !== "cohort-leader")
      : [],
    cohortSlug: cohort?.slug || null,
    belt: cohortLinkRow?.belt || null,
    productionTier: cohortLinkRow?.production_tier || null,
    whyAi: row.preferences?.whyAi || "",
    mainGoal: row.preferences?.mainGoal || "",
    // Activity data (progress / submissions / journalEntries) lands in
    // Round B when journal_entries + homework_submissions + session_progress
    // migrate. For now they stay empty for Supabase-only participants.
    progress: [],
    lastJournalDaysAgo: 999,
    submissions: {},
    journalEntries: [],
  };
}

export async function hydrateParticipantsFromSupabase({ force = false } = {}) {
  if (!isSupabaseEnabled()) return;
  if (participantHydratePromise && !force) return participantHydratePromise;

  participantHydratePromise = (async () => {
    try {
      const [profiles, links, cohorts] = await Promise.all([
        db.list("profiles", { includeArchived: false }),
        db.list("cohort_participants", { includeArchived: true }),
        Promise.resolve(getAllCohortsForAdmin()),
      ]);

      // Lookup maps.
      const cohortBySupabaseId = {};
      for (const c of cohorts || []) {
        if (c._supabaseId) cohortBySupabaseId[c._supabaseId] = c;
      }
      const linkByProfile = {};
      for (const l of links || []) {
        // A profile can be in multiple cohorts; we keep the most recent active.
        const existing = linkByProfile[l.profile_id];
        if (!existing || (l.joined_at && new Date(l.joined_at) > new Date(existing.joined_at))) {
          linkByProfile[l.profile_id] = l;
        }
      }

      // Rebuild email lookup so writes can find profiles by email.
      const nextByEmail = new Map();
      for (const p of profiles || []) {
        if (p.email) {
          nextByEmail.set(p.email.toLowerCase(), {
            id: p.id,
            capabilities: p.capabilities || [],
          });
        }
      }
      _supabaseProfileByEmail = nextByEmail;

      // Merge into ADMIN_MOCK_PARTICIPANTS by email match.
      for (const row of profiles || []) {
        if (!row.email) continue;
        const lc = row.email.toLowerCase();
        const cohortLinkRow = linkByProfile[row.id];
        const supParticipant = profileRowToParticipant(row, {
          cohortBySupabaseId,
          cohortLinkRow,
        });
        if (!supParticipant) continue;

        const existing = ADMIN_MOCK_PARTICIPANTS.find(
          (p) => (p.email || "").toLowerCase() === lc,
        );
        if (existing) {
          // Attach Supabase IDs + capabilities; defer to seed for activity.
          existing._supabaseProfileId = supParticipant._supabaseProfileId;
          existing._supabaseCohortLinkId = supParticipant._supabaseCohortLinkId;
          existing._source = "supabase";
          if (supParticipant.capabilities?.length && !existing.capabilities?.length) {
            existing.capabilities = supParticipant.capabilities;
          }
        } else {
          // Net-new Supabase participant.
          ADMIN_MOCK_PARTICIPANTS.push(supParticipant);
        }
      }

      participantsHydrated = true;
      emitParticipantChange();
    } catch (err) {
      if (!(err instanceof SupabaseNotReady)) {
        captureError(err, { source: "hydrateParticipantsFromSupabase" });
      }
    }
  })();

  return participantHydratePromise;
}

// ---------------------------------------------------------------------------
// refreshParticipantsFromSupabase — force a re-hydrate + notify subscribers.
//
// Called after invite-participant, or on Realtime events, to pick up fresh
// rows without a full page reload. Safe to call redundantly; the underlying
// hydrate() short-circuits on the participantHydratePromise cache when not
// forced, so callers who really want a fresh pull must pass force=true.
// ---------------------------------------------------------------------------
export async function refreshParticipantsFromSupabase() {
  if (!isSupabaseEnabled()) return;
  // Force a fresh Postgres read (bypasses the module-scoped cache).
  participantHydratePromise = null;
  await hydrateParticipantsFromSupabase({ force: true });
  // hydrateParticipantsFromSupabase already emits at the end, but we emit
  // again in case a caller wants to attach a subscriber right before the
  // await resolves — the second emit is cheap.
  emitParticipantChange();
}

// ---------------------------------------------------------------------------
// setupParticipantRealtime — subscribe to Supabase Realtime channels on the
// profiles + cohort_participants tables and rehydrate on any change.
//
// Returns an unsubscribe function. Idempotent — calling twice returns the
// same channel handle. Intended to be mounted once at the app level (e.g.
// from AdminLayout). Silent no-op when Supabase isn't wired.
//
// This is what makes the roster feel "live" — as soon as another admin
// invites a participant in a different tab, this admin's roster grows a
// row on its own, no reload required.
// ---------------------------------------------------------------------------
let _realtimeChannel = null;
let _realtimeUnsubscribe = null;
let _realtimeRefreshTimer = null;
export function setupParticipantRealtime() {
  if (_realtimeUnsubscribe) return _realtimeUnsubscribe;
  if (!isSupabaseEnabled()) return () => {};

  // Debounce a burst of writes into one rehydrate — e.g. a bulk-invite of
  // 20 participants would otherwise fire 20 back-to-back Postgres reads.
  function scheduleRefresh() {
    if (_realtimeRefreshTimer) return;
    _realtimeRefreshTimer = setTimeout(() => {
      _realtimeRefreshTimer = null;
      refreshParticipantsFromSupabase().catch(() => { /* swallow */ });
    }, 400);
  }

  // Activity writes (homework, journals, session progress) come from the
  // participant side. Debounced separately + rehydrate activity so admins
  // see Bethany's just-submitted homework without a reload.
  let _activityTimer = null;
  function scheduleActivityRefresh() {
    if (_activityTimer) return;
    _activityTimer = setTimeout(() => {
      _activityTimer = null;
      hydrateActivityFromSupabase({ force: true })
        .then(() => emitParticipantChange())
        .catch(() => { /* swallow */ });
    }, 400);
  }

  (async () => {
    try {
      const client = await initSupabase();
      if (!client || _realtimeChannel) return;
      _realtimeChannel = client
        .channel("brai-participants-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, scheduleRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "cohort_participants" }, scheduleRefresh)
        // Participant activity — admin views need this to update when a
        // participant submits homework, logs a journal entry, or marks a
        // session complete in another session.
        .on("postgres_changes", { event: "*", schema: "public", table: "homework_submissions" }, scheduleActivityRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "journal_entries" }, scheduleActivityRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "session_progress" }, scheduleActivityRefresh)
        .subscribe();
    } catch (err) {
      captureError(err, { source: "setupParticipantRealtime" });
    }
  })();

  _realtimeUnsubscribe = () => {
    if (_realtimeRefreshTimer) {
      clearTimeout(_realtimeRefreshTimer);
      _realtimeRefreshTimer = null;
    }
    if (_realtimeChannel) {
      try {
        _realtimeChannel.unsubscribe();
      } catch { /* ignore */ }
      _realtimeChannel = null;
    }
    _realtimeUnsubscribe = null;
  };
  return _realtimeUnsubscribe;
}

// ---------------------------------------------------------------------------
// Write mirrors
// ---------------------------------------------------------------------------

function resolveSupabaseProfileId(email) {
  if (!email) return null;
  const hit = _supabaseProfileByEmail.get(email.toLowerCase());
  return hit?.id || null;
}

function resolveSupabaseCohortId(slug) {
  if (!slug) return null;
  const cohort = getAllCohortsForAdmin().find((c) => c.slug === slug);
  return cohort?._supabaseId || null;
}

// Update the matching profile + (optionally) upsert the cohort_participants
// link row. Only runs for participants whose email already has a Supabase
// profile — net-new auth users need a server endpoint.
// ---------------------------------------------------------------------------
// Round B — activity hydration: journal entries, homework submissions,
// session progress. Each table is hydrated in parallel, grouped by
// profile_id, then attached to the matching participant via their
// _supabaseProfileId. Best-effort write mirrors run on submit/review/
// mark-complete.
//
// IMPORTANT: legacy participants (those without _supabaseProfileId) keep
// their seed activity unchanged. Only Supabase-hydrated participants get
// their activity arrays populated from Postgres.
// ---------------------------------------------------------------------------

let activityHydrated = false;
let activityHydratePromise = null;

function journalRowToEntry(row) {
  return {
    id: row.id,
    _supabaseId: row.id,
    date: row.created_at,
    title: row.title || "",
    description: row.body || "",
    timeBeforeAI: row.time_before_ai,
    timeWithAI: row.time_with_ai,
    productionMethod: row.production_method,
    volumePerDay: row.volume_per_day,
    frequency: row.frequency,
    scope: row.scope,
    qualityOutcome: row.quality_outcome,
    innovationTitle: row.innovation_title,
    innovationDescription: row.innovation_description,
    link: row.link,
    attachment: null, // attachments JSONB lands when storage uploads ship
    cohortId: row.cohort_id,
    sessionNumber: row.session_number,
  };
}

function homeworkRowToSubmission(row) {
  return {
    _supabaseId: row.id,
    response: row.body || "",
    link: row.link || "",
    attachment: null,
    submittedAt: row.submitted_at || row.created_at,
    updatedAt: row.updated_at,
    reviewedAt: row.reviewed_at || undefined,
    feedback: row.reviewer_notes || undefined,
  };
}

export async function hydrateActivityFromSupabase({ force = false } = {}) {
  if (!isSupabaseEnabled()) return;
  if (activityHydratePromise && !force) return activityHydratePromise;

  activityHydratePromise = (async () => {
    try {
      const [journals, homework, progress] = await Promise.all([
        db.list("journal_entries", {
          order: { column: "created_at", ascending: false },
        }),
        db.list("homework_submissions", { includeArchived: true }),
        db.list("session_progress", { includeArchived: true }),
      ]);

      // Group all three by profile_id.
      const journalByProfile = {};
      for (const r of journals || []) {
        if (!journalByProfile[r.profile_id]) journalByProfile[r.profile_id] = [];
        journalByProfile[r.profile_id].push(journalRowToEntry(r));
      }
      const homeworkByProfile = {};
      for (const r of homework || []) {
        if (!homeworkByProfile[r.profile_id]) homeworkByProfile[r.profile_id] = {};
        homeworkByProfile[r.profile_id][String(r.session_number)] = homeworkRowToSubmission(r);
      }
      const progressByProfile = {};
      for (const r of progress || []) {
        if (!progressByProfile[r.profile_id]) progressByProfile[r.profile_id] = new Set();
        if (r.completed_at) progressByProfile[r.profile_id].add(Number(r.session_number));
      }

      // Attach to participants. Only participants with _supabaseProfileId
      // get their activity overwritten — seed-only participants keep their
      // seed entries.
      for (const p of getEffectiveParticipants()) {
        const profileId = p._supabaseProfileId;
        if (!profileId) continue;
        const supJournal = journalByProfile[profileId] || [];
        const supHomework = homeworkByProfile[profileId] || {};
        const supProgress = progressByProfile[profileId];

        if (supJournal.length) {
          p.journalEntries = supJournal;
          // Recompute lastJournalDaysAgo for the seed-derived helpers.
          const newest = supJournal.reduce((max, e) => {
            const ts = new Date(e.date).getTime();
            return ts > max ? ts : max;
          }, 0);
          p.lastJournalDaysAgo = newest ? Math.floor((Date.now() - newest) / 86400000) : 999;
        }
        if (Object.keys(supHomework).length) {
          // Merge with existing seed submissions — Supabase wins per session.
          p.submissions = { ...(p.submissions || {}), ...supHomework };
        }
        if (supProgress && supProgress.size) {
          p.progress = [...supProgress].sort((a, b) => a - b);
        }
      }

      activityHydrated = true;
    } catch (err) {
      if (!(err instanceof SupabaseNotReady)) {
        captureError(err, { source: "hydrateActivityFromSupabase" });
      }
    }
  })();

  return activityHydratePromise;
}

// ---------------------------------------------------------------------------
// Activity write mirrors
// ---------------------------------------------------------------------------

async function mirrorJournalEntryToSupabase(participant, entry) {
  if (!isSupabaseEnabled() || !participant?._supabaseProfileId || !entry) return;
  try {
    const cohortUuid = participant.cohortSlug
      ? resolveSupabaseCohortId(participant.cohortSlug)
      : null;
    const row = {
      id: entry._supabaseId || undefined,
      profile_id: participant._supabaseProfileId,
      cohort_id: cohortUuid,
      title: entry.title || null,
      body: entry.description || "",
      link: entry.link || null,
      time_before_ai: entry.timeBeforeAI ?? null,
      time_with_ai: entry.timeWithAI ?? null,
      production_method: entry.productionMethod || null,
      volume_per_day: entry.volumePerDay || null,
      frequency: entry.frequency || null,
      scope: entry.scope || null,
      quality_outcome: entry.qualityOutcome || null,
      innovation_title: entry.innovationTitle || null,
      innovation_description: entry.innovationDescription || null,
      visibility: "cohort",
    };
    if (!row.id) {
      const inserted = await db.insert("journal_entries", row);
      if (inserted?.id) entry._supabaseId = inserted.id;
    } else {
      await db.upsert("journal_entries", row, { onConflict: "id" });
    }
  } catch (err) {
    if (!(err instanceof SupabaseNotReady)) {
      captureError(err, { source: "mirrorJournalEntryToSupabase" });
    }
  }
}

async function mirrorHomeworkToSupabase(participant, sessionOrder, submission) {
  if (!isSupabaseEnabled() || !participant?._supabaseProfileId || !submission) return;
  try {
    const cohortUuid = resolveSupabaseCohortId(participant.cohortSlug);
    if (!cohortUuid) return;
    const row = {
      id: submission._supabaseId || undefined,
      profile_id: participant._supabaseProfileId,
      cohort_id: cohortUuid,
      session_number: Number(sessionOrder),
      status: submission.reviewedAt ? "reviewed" : "submitted",
      body: submission.response || "",
      link: submission.link || null,
      submitted_at: submission.submittedAt || null,
      reviewed_at: submission.reviewedAt || null,
      reviewer_notes: submission.feedback || null,
    };
    if (!row.id) {
      const inserted = await db.insert("homework_submissions", row);
      if (inserted?.id) submission._supabaseId = inserted.id;
    } else {
      await db.upsert("homework_submissions", row, { onConflict: "id" });
    }
  } catch (err) {
    if (!(err instanceof SupabaseNotReady)) {
      captureError(err, { source: "mirrorHomeworkToSupabase" });
    }
  }
}

async function mirrorSessionProgressToSupabase(participant, sessionOrder, completed) {
  if (!isSupabaseEnabled() || !participant?._supabaseProfileId) return;
  try {
    const cohortUuid = resolveSupabaseCohortId(participant.cohortSlug);
    if (!cohortUuid) return;
    await db.upsert(
      "session_progress",
      {
        profile_id: participant._supabaseProfileId,
        cohort_id: cohortUuid,
        session_number: Number(sessionOrder),
        status: completed ? "completed" : "not_started",
        completed_at: completed ? new Date().toISOString() : null,
      },
      { onConflict: "profile_id,cohort_id,session_number" },
    );
  } catch (err) {
    if (!(err instanceof SupabaseNotReady)) {
      captureError(err, { source: "mirrorSessionProgressToSupabase" });
    }
  }
}

/**
 * Generate a magic-link URL for a participant via the invite-participant
 * Function. Returns { ok, magicLink, error }. Called from the admin UI
 * "Send sign-in link" button — admin can copy the link to clipboard, share
 * it directly, or trigger the magic-link email template through sendEmail.
 *
 * Idempotent: invite-participant returns the existing profile if the email
 * already has an auth user, so calling this twice doesn't duplicate
 * anything.
 */
export async function sendMagicLinkForParticipant(participant) {
  if (!isSupabaseEnabled() || !participant?.email) {
    return { ok: false, error: "Supabase isn't configured." };
  }
  try {
    const client = await (await import("./supabase")).initSupabase();
    if (!client) return { ok: false, error: "Supabase client unavailable." };
    const { data: sessionData } = await client.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) return { ok: false, error: "You aren't signed in as an admin." };

    const res = await fetch("/.netlify/functions/invite-participant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        email: participant.email,
        name: participant.name || "",
        cohortSlug: participant.cohortSlug || null,
        capabilities: participant.capabilities || [],
        title: participant.title || null,
        organization: participant.organization || null,
        isCohortLead: !!participant.isCohortLead,
        sendMagicLink: true,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: body?.error || `Function returned ${res.status}` };
    }
    if (body?.profile?.id) {
      // Persist the resolved IDs onto the local record same as
      // mirrorParticipantToSupabase does.
      participant._supabaseProfileId = body.profile.id;
      participant._supabaseCohortLinkId = body.cohortLink?.id || null;
      if (participant.email) {
        _supabaseProfileByEmail.set(participant.email.toLowerCase(), {
          id: body.profile.id,
          capabilities: body.profile.capabilities || [],
        });
      }
    }
    return { ok: true, magicLink: body?.magicLink || null };
  } catch (err) {
    captureError(err, { source: "sendMagicLinkForParticipant", email: participant?.email });
    return { ok: false, error: err.message || String(err) };
  }
}

// Best-effort server-side invite. POSTs to the invite-participant Netlify
// Function with the current admin's access token. Function creates the
// Supabase auth user + profile + cohort link with the service-role key
// and returns the resolved IDs.
async function _inviteViaFunction(participant) {
  if (!isSupabaseEnabled() || !participant?.email) return null;
  try {
    const client = await (await import("./supabase")).initSupabase();
    if (!client) return null;
    const { data: sessionData } = await client.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) return null;

    const res = await fetch("/.netlify/functions/invite-participant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        email: participant.email,
        name: participant.name || "",
        cohortSlug: participant.cohortSlug || null,
        capabilities: participant.capabilities || [],
        title: participant.title || null,
        organization: participant.organization || null,
        isCohortLead: !!participant.isCohortLead,
        // Adding a participant IS inviting them — auto-send the branded
        // magic link email so they can sign in on their next visit. Was
        // false in Phase 3 so we could stage users without spamming;
        // now that we're onboarding real cohorts we always want the
        // invite email to fire.
        sendMagicLink: true,
      }),
    });
    if (!res.ok) {
      if (res.status >= 500) {
        const body = await res.json().catch(() => ({}));
        captureError(new Error(`invite-participant ${res.status}: ${body?.error || ""}`), {
          source: "_inviteViaFunction",
          email: participant.email,
        });
      }
      return null;
    }
    const result = await res.json();
    if (result?.profile?.id) {
      participant._supabaseProfileId = result.profile.id;
      participant._supabaseCohortLinkId = result.cohortLink?.id || null;
      if (participant.email) {
        _supabaseProfileByEmail.set(participant.email.toLowerCase(), {
          id: result.profile.id,
          capabilities: result.profile.capabilities || [],
        });
      }
      // Broadcast so any admin page currently displaying the roster picks
      // up the freshly-invited participant without a manual reload. Also
      // trigger a background rehydrate so we catch any fields the server
      // set that weren't echoed back in the response body (e.g. capabilities
      // rewrites, cohort role defaults). Fire-and-forget — we already have
      // enough on `participant` for the immediate render.
      emitParticipantChange();
      refreshParticipantsFromSupabase().catch(() => { /* swallow */ });
    }
    return result;
  } catch (err) {
    captureError(err, { source: "_inviteViaFunction", email: participant.email });
    return null;
  }
}

async function mirrorParticipantToSupabase(participant) {
  if (!isSupabaseEnabled() || !participant) return;
  try {
    let profileId =
      participant._supabaseProfileId || resolveSupabaseProfileId(participant.email);
    if (!profileId) {
      // No auth user yet — fall through to the server-side invite Function.
      const invited = await _inviteViaFunction(participant);
      profileId = invited?.profile?.id || null;
      if (!profileId) return; // invite failed or caller wasn't an admin
    }

    // Squeeze fields the profiles schema doesn't have its own column for
    // into the preferences JSONB blob.
    const prefsPatch = {
      title: participant.title || undefined,
      organization: participant.organization || undefined,
      location: participant.location || undefined,
      role: participant.role || undefined,
      whyAi: participant.whyAi || undefined,
      mainGoal: participant.mainGoal || undefined,
    };

    await db.update("profiles", profileId, {
      name: participant.name || "",
      avatar_url: participant.headshotUrl || null,
      phone: participant.phone || null,
      time_zone: participant.defaultTimeZone || null,
      capabilities:
        Array.isArray(participant.capabilities) && participant.capabilities.length
          ? [...new Set([...participant.capabilities, "participant"])]
          : ["participant"],
      preferences: prefsPatch,
    });

    // Stash the resolved id back on the in-memory record so future writes
    // skip the email lookup.
    participant._supabaseProfileId = profileId;

    // Upsert the cohort link if the participant is in a cohort.
    if (participant.cohortSlug) {
      const cohortId = resolveSupabaseCohortId(participant.cohortSlug);
      if (cohortId) {
        const linkRow = {
          cohort_id: cohortId,
          profile_id: profileId,
          role: participant.isCohortLead ? "cohort_leader" : "participant",
          belt: participant.belt || "white",
          production_tier: participant.productionTier || "no-sop",
        };
        await db.upsert("cohort_participants", linkRow, {
          onConflict: "cohort_id,profile_id",
        });
      }
    }
  } catch (err) {
    if (!(err instanceof SupabaseNotReady)) {
      captureError(err, {
        source: "mirrorParticipantToSupabase",
        email: participant?.email,
      });
    }
  }
}
