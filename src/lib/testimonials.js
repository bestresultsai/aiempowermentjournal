import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Testimonials — program-completion testimonials with admin approval flow.
//
// Workflow:
//   1. Participant earns their certificate (isParticipantCertified === true).
//   2. CohortLanding shows the "Share your testimonial" prompt.
//   3. Participant submits → status "pending".
//   4. Super or admin reviews on /admin/testimonials → "approved" or "declined".
//   5. Approved testimonials flow into marketing surfaces (case studies,
//      public showcase pages — future work).
//
// Shape:
//   {
//     id,
//     participantId, participantName, participantEmail,
//     cohortSlug, programCode,
//     quote,           // the testimonial body
//     role,            // job title at the time
//     organization,    // company / org name
//     allowMarketingUse, // boolean — participant consent for external use
//     status,          // "pending" | "approved" | "declined"
//     submittedAt, updatedAt?,
//     approvedAt?, approvedBy?, declinedAt?, declinedBy?
//   }
//
// Persistence: localStorage overlay + pubsub, matching feedbacks / resources.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "brai_testimonial_overlays";

export const TESTIMONIAL_STATUSES = ["pending", "approved", "declined"];

// ---------------------------------------------------------------------------
// Seed testimonials — give /admin/testimonials demo content out of the gate.
// All from current Summit + PHS demo participants. Summit/PHS are mid-program
// in the demo data, but these read as testimonials from earlier cohort runs.
// Mix of statuses so admins see what the approval workflow looks like.
// ---------------------------------------------------------------------------

function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(14, 0, 0, 0);
  return d.toISOString();
}

export const SEED_TESTIMONIALS = [
  {
    id: "seed-tm-brett",
    participantId: "user-summit-1",
    participantName: "Brett Wilson",
    participantEmail: "brett.wilson@summithealth.com",
    cohortSlug: "summit-aiew3-2026q3",
    programCode: "AIEW3",
    quote:
      "We took our after-visit summaries from 30 minutes to under 5 across all 14 clinics. That's hours of clinician time clawed back every single day. The Empowerment Workshop wasn't just AI training — it was a change-management playbook.",
    role: "Director of Clinical Operations",
    organization: "Summit Health",
    allowMarketingUse: true,
    status: "approved",
    submittedAt: daysAgoISO(40),
    approvedAt: daysAgoISO(38),
    approvedBy: "mike@bestresults.ai",
  },
  {
    id: "seed-tm-diane",
    participantId: "user-phs-1",
    participantName: "Diane Park",
    participantEmail: "diane.park@pacifichealth.org",
    cohortSlug: "phs-apfw-2026q2",
    programCode: "APFW",
    quote:
      "By session three we had three production workflows live. By session five we had a multi-agent pilot routing referrals end-to-end. The ROI conversation with our CFO got dramatically easier.",
    role: "Chief Innovation Officer",
    organization: "Pacific Health System",
    allowMarketingUse: true,
    status: "approved",
    submittedAt: daysAgoISO(35),
    approvedAt: daysAgoISO(33),
    approvedBy: "mike@bestresults.ai",
  },
  {
    id: "seed-tm-james",
    participantId: "user-summit-3",
    participantName: "James Chen",
    participantEmail: "james.chen@summithealth.com",
    cohortSlug: "summit-aiew3-2026q3",
    programCode: "AIEW3",
    quote:
      "Quarterly audit prep used to consume my whole month. With the workflow I built in Session 3, I now generate the prep packet in 90 minutes. My compliance team thinks I'm a wizard.",
    role: "Compliance Officer",
    organization: "Summit Health",
    allowMarketingUse: false,
    status: "pending",
    submittedAt: daysAgoISO(2),
  },
];

// ---------------------------------------------------------------------------
// Overlay store
// ---------------------------------------------------------------------------

function readOverlays() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeOverlays(overlays) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overlays));
  } catch {
    /* ignore */
  }
}

let testimonialOverlays = readOverlays();

const listeners = new Set();
function emit() {
  for (const fn of listeners) {
    try { fn(); } catch { /* ignore */ }
  }
}

export function subscribeTestimonialChanges(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useTestimonialVersion() {
  const [v, setV] = useState(0);
  useEffect(() => subscribeTestimonialChanges(() => setV((x) => x + 1)), []);
  return v;
}

// ---------------------------------------------------------------------------
// Readers
// ---------------------------------------------------------------------------

function getAllTestimonials() {
  const byId = Object.fromEntries(SEED_TESTIMONIALS.map((t) => [t.id, t]));
  for (const [id, overlay] of Object.entries(testimonialOverlays)) {
    if (overlay?.deletedAt) {
      delete byId[id];
      continue;
    }
    byId[id] = { ...(byId[id] || {}), ...overlay };
  }
  return Object.values(byId).sort(
    (a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0),
  );
}

// Returns all testimonials within scope. Pass empty cohortSlugs to get nothing.
// `status` filters by status (or "all" to skip filtering).
export function getTestimonialsInScope(cohortSlugs, status = "all") {
  const allowed = new Set(cohortSlugs || []);
  return getAllTestimonials().filter((t) => {
    if (!allowed.has(t.cohortSlug)) return false;
    if (status !== "all" && t.status !== status) return false;
    return true;
  });
}

// One participant + one cohort = at most one testimonial. Returns null if
// the participant hasn't submitted yet.
export function getTestimonialForParticipant(participantEmail, cohortSlug) {
  const email = (participantEmail || "").toLowerCase();
  return getAllTestimonials().find(
    (t) =>
      (t.participantEmail || "").toLowerCase() === email &&
      t.cohortSlug === cohortSlug,
  ) || null;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

function genId() {
  return `tm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// Create or update — keyed by (participantEmail, cohortSlug). Re-submitting
// resets status to "pending" so the admin re-approves edits.
export function submitTestimonial(payload) {
  if (!payload?.participantEmail) {
    throw new Error("submitTestimonial: participantEmail is required.");
  }
  if (!payload?.cohortSlug) {
    throw new Error("submitTestimonial: cohortSlug is required.");
  }
  if (!payload?.quote?.trim()) {
    throw new Error("submitTestimonial: quote is required.");
  }

  const existing = getTestimonialForParticipant(
    payload.participantEmail,
    payload.cohortSlug,
  );
  const now = new Date().toISOString();

  if (existing) {
    const next = {
      ...existing,
      quote: payload.quote.trim(),
      role: (payload.role || existing.role || "").trim(),
      organization: (payload.organization || existing.organization || "").trim(),
      allowMarketingUse: !!payload.allowMarketingUse,
      // Edits reset the approval state — admin should re-review.
      status: "pending",
      approvedAt: null,
      approvedBy: null,
      declinedAt: null,
      declinedBy: null,
      updatedAt: now,
    };
    testimonialOverlays = { ...testimonialOverlays, [existing.id]: next };
    writeOverlays(testimonialOverlays);
    emit();
    return next;
  }

  const id = genId();
  const tm = {
    id,
    participantId: payload.participantId || null,
    participantName: (payload.participantName || "").trim(),
    participantEmail: payload.participantEmail.trim(),
    cohortSlug: payload.cohortSlug,
    programCode: payload.programCode || null,
    quote: payload.quote.trim(),
    role: (payload.role || "").trim(),
    organization: (payload.organization || "").trim(),
    allowMarketingUse: !!payload.allowMarketingUse,
    status: "pending",
    submittedAt: now,
  };
  testimonialOverlays = { ...testimonialOverlays, [id]: tm };
  writeOverlays(testimonialOverlays);
  emit();
  return tm;
}

export function approveTestimonial(id, approverEmail) {
  const existing = getAllTestimonials().find((t) => t.id === id);
  if (!existing) return null;
  const now = new Date().toISOString();
  const next = {
    ...existing,
    status: "approved",
    approvedAt: now,
    approvedBy: approverEmail || existing.approvedBy || null,
    declinedAt: null,
    declinedBy: null,
  };
  testimonialOverlays = { ...testimonialOverlays, [id]: next };
  writeOverlays(testimonialOverlays);
  emit();
  return next;
}

export function declineTestimonial(id, declinerEmail) {
  const existing = getAllTestimonials().find((t) => t.id === id);
  if (!existing) return null;
  const now = new Date().toISOString();
  const next = {
    ...existing,
    status: "declined",
    declinedAt: now,
    declinedBy: declinerEmail || null,
    approvedAt: null,
    approvedBy: null,
  };
  testimonialOverlays = { ...testimonialOverlays, [id]: next };
  writeOverlays(testimonialOverlays);
  emit();
  return next;
}

// Soft-delete. Seed testimonials are shadowed by overlay.
export function deleteTestimonial(id) {
  const existing = testimonialOverlays[id] || getAllTestimonials().find((t) => t.id === id);
  if (!existing) return;
  testimonialOverlays = {
    ...testimonialOverlays,
    [id]: { ...existing, deletedAt: new Date().toISOString() },
  };
  writeOverlays(testimonialOverlays);
  emit();
}
