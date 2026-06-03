// ---------------------------------------------------------------------------
// Mock data powering the /admin views.
//
// 10 participants spread across the 3 demo cohorts so roster + homework queue
// views have something realistic to render. Each participant has:
//   - progress: an array of completed session orders [1..8]
//   - lastJournalDaysAgo: int (used to compute "last activity")
//   - submissions: { [order]: { response, link, submittedAt, reviewedAt?, feedback? } }
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
