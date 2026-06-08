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
function entry({ days, title, description, before, after }) {
  return {
    id: `${days}-${title.slice(0, 8)}`,
    date: daysAgoISO(days),
    title,
    description,
    timeBeforeAI: before,
    timeWithAI: after,
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
    progress: [1, 2, 3, 4],
    lastJournalDaysAgo: 2,
    submissions: {
      1: { response: "Mapped my full team's role matrix in Notion.", link: "https://notion.so/example", submittedAt: daysAgoISO(28), reviewedAt: daysAgoISO(26), feedback: "Strong matrix. Try ranking by ROI next time." },
      2: { response: "Built a 5-step prompt-chained workflow for cohort retention analysis.", link: "https://chat.openai.com/share/abc", submittedAt: daysAgoISO(21) },
      3: { response: "Spun up a custom GPT for facilitator post-session notes.", link: "", submittedAt: daysAgoISO(14) },
    },
    journalEntries: [
      entry({ days: 2,  title: "Cohort retention pivot tables from raw Notion export", description: "Pulled a messy Notion export and let Claude build the pivots + write the exec summary.", before: 240, after: 35 }),
      entry({ days: 9,  title: "Facilitator post-session note GPT", description: "Custom GPT structures raw post-session notes + drafts the participant follow-up email.", before: 45, after: 8 }),
      entry({ days: 16, title: "Gong transcripts → 6-week content calendar", description: "Extracted recurring participant questions from transcripts and turned them into a LinkedIn calendar.", before: 180, after: 25 }),
      entry({ days: 23, title: "Competitive teardown — LearnUpon vs Thinkific vs Mighty", description: "Side-by-side feature matrix built in a single afternoon.", before: 360, after: 60 }),
      entry({ days: 30, title: "Magic-link auth design doc + sequence diagram", description: "Drafted the whole doc in 45 minutes.", before: 180, after: 45 }),
    ],
  },
  {
    id: "user-iahe-2",
    name: "Sarah Patel",
    email: "sarah.patel@iahe.org",
    title: "Director of Education",
    organization: "IAHE",
    cohortSlug: COHORT_IAHE,
    progress: [1, 2, 3],
    lastJournalDaysAgo: 5,
    submissions: {
      1: { response: "Documented my team's role matrix and prioritized 3 use cases.", link: "https://docs.google.com/x", submittedAt: daysAgoISO(27), reviewedAt: daysAgoISO(25), feedback: "Great prioritization framework." },
      2: { response: "Built a workflow but still hitting hallucination issues — need to chat.", link: "", submittedAt: daysAgoISO(20) },
    },
    journalEntries: [
      entry({ days: 5,  title: "Credentialing intake email drafts", description: "Cut a recurring 4-hour task to 25 minutes with a custom GPT.", before: 240, after: 25 }),
      entry({ days: 12, title: "CE program needs assessment from raw survey data", description: "Claude clustered open-ended responses and surfaced 6 priority themes.", before: 180, after: 30 }),
      entry({ days: 19, title: "Board prep deck from quarterly KPI dashboard", description: "Three iteration loops with Claude got the deck board-ready.", before: 240, after: 60 }),
      entry({ days: 26, title: "Conference RFP responses, drafted in parallel", description: "Drafted 3 RFPs simultaneously by parameterizing a single prompt.", before: 480, after: 90 }),
    ],
  },
  {
    id: "user-iahe-3",
    name: "Marcus Williams",
    email: "marcus.w@iahe.org",
    title: "Program Manager",
    organization: "IAHE",
    cohortSlug: COHORT_IAHE,
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
    progress: [1, 2, 3, 4, 5],
    lastJournalDaysAgo: 1,
    submissions: {
      1: { response: "Role matrix complete; identified 4 high-value use cases.", link: "https://notion.so/y", submittedAt: daysAgoISO(28), reviewedAt: daysAgoISO(26), feedback: "Best matrix in the cohort." },
      2: { response: "Built a content-grading workflow with 3 reusable prompt chains.", link: "https://chat.openai.com/share/y", submittedAt: daysAgoISO(21), reviewedAt: daysAgoISO(19), feedback: "Loved the chain-of-thought template." },
      3: { response: "Custom GPT for plain-language patient education rewrites.", link: "https://chat.openai.com/g/x", submittedAt: daysAgoISO(14), reviewedAt: daysAgoISO(12), feedback: "Ship-ready." },
      4: { response: "Three high-reliability workflows live with my team.", link: "https://notion.so/z", submittedAt: daysAgoISO(7) },
    },
    journalEntries: [
      entry({ days: 1,  title: "Patient education rewrite at 6th-grade reading level", description: "Built an internal GPT that consistently hits the reading-level target.", before: 60, after: 5 }),
      entry({ days: 7,  title: "Three high-reliability content-grading workflows shipped", description: "Reusable prompt chains that the whole team now leans on.", before: 180, after: 30 }),
      entry({ days: 15, title: "Curriculum review checklist generator", description: "Claude generates a per-module review checklist from the syllabus alone.", before: 120, after: 20 }),
      entry({ days: 22, title: "CME activity outline drafting", description: "Pivot from blank page to draft in under 15 minutes.", before: 90, after: 15 }),
      entry({ days: 29, title: "Faculty feedback synthesis", description: "30+ open-ended responses clustered + summarized.", before: 150, after: 25 }),
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

// Cohort-level aggregates (entries, total minutes saved, top contributor).
export function getCohortJournalStats(slug) {
  const roster = getParticipantsForCohort(slug);
  const allEntries = roster.flatMap((p) =>
    (p.journalEntries || []).map((e) => ({ ...e, participantId: p.id, participantName: p.name })),
  );
  const minutesSaved = totalTimeSaved(allEntries);

  let topContributor = null;
  let topMinutes = 0;
  for (const p of roster) {
    const m = totalTimeSaved(p.journalEntries || []);
    if (m > topMinutes) {
      topMinutes = m;
      topContributor = p;
    }
  }

  // Newest entry across cohort (used as "last activity" anchor).
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
export function getScopeJournalStats(cohortSlugs) {
  const allowed = new Set(cohortSlugs);
  const roster = ADMIN_MOCK_PARTICIPANTS.filter((p) => allowed.has(p.cohortSlug));
  const allEntries = roster.flatMap((p) => p.journalEntries || []);
  return {
    totalEntries: allEntries.length,
    totalMinutesSaved: totalTimeSaved(allEntries),
  };
}

// Leaderboard — top time-savers across scope.
export function getTopContributorsInScope(cohortSlugs, limit = 5) {
  const allowed = new Set(cohortSlugs);
  return ADMIN_MOCK_PARTICIPANTS
    .filter((p) => allowed.has(p.cohortSlug))
    .map((p) => ({
      id: p.id,
      name: p.name,
      title: p.title,
      organization: p.organization,
      cohortSlug: p.cohortSlug,
      entriesCount: p.journalEntries?.length || 0,
      minutesSaved: totalTimeSaved(p.journalEntries || []),
    }))
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

// Most recent entries across scope (for the dashboard activity feed).
export function getRecentEntriesInScope(cohortSlugs, limit = 6) {
  const allowed = new Set(cohortSlugs);
  return ADMIN_MOCK_PARTICIPANTS
    .filter((p) => allowed.has(p.cohortSlug))
    .flatMap((p) =>
      (p.journalEntries || []).map((e) => ({
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
