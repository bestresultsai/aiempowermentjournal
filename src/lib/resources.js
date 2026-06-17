import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Resources library — the source of truth for /resources content.
//
// A RESOURCE is a curated link / asset (video, prompt file, template, etc.)
// shown to participants. Scoping is hierarchical:
//   - global              (programCode = null, cohortSlug = null)
//   - program-specific    (programCode = "AIEW3", cohortSlug = null)
//   - cohort-specific     (programCode = "AIEW3", cohortSlug = "summit-…")
//                          Cohort scope implies the program — participants
//                          only see cohort-scoped resources if they're in
//                          that exact cohort.
//
// `url` is a real link OR a base64 data URL for an uploaded file (matches
// MaterialsEditor pattern). `fileName` is set only on uploads.
//
// Shape:
//   {
//     id, title, description, type,
//     url,            // link OR data URL
//     fileName?,      // present only on uploads
//     programCode | null,
//     cohortSlug | null,
//     category,
//     addedAt, updatedAt?
//   }
//
// type ∈ {"video", "pdf", "template", "link", "prompt", "doc"}
// category is a free-text bucket the admin sets (e.g. "Prompts",
//   "Bonus Videos", "Templates", "Reading"). Participant view groups by
//   category so adding new buckets doesn't require a code change.
//
// Like the cohorts + programs stores, persistence is overlay-based
// (localStorage) so the UI can ship without a backend. Real persistence
// swaps to Supabase under the same shape.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "brai_resource_overlays";

export const RESOURCE_TYPES = [
  { value: "video", label: "Video" },
  { value: "pdf", label: "PDF" },
  { value: "template", label: "Template" },
  { value: "prompt", label: "Prompt file" },
  { value: "doc", label: "Doc" },
  { value: "link", label: "Link" },
];

// Seed resources — always present, can't be archived but can be overridden
// by an overlay edit. Mix of global + AIEW3-specific so demos are populated.
export const SEED_RESOURCES = [
  {
    id: "seed-bestpractices-prompts",
    title: "Prompt patterns cheat sheet",
    description:
      "The 12 prompt structures we lean on across every workshop, with examples for each.",
    type: "pdf",
    url: "https://example.com/prompts.pdf",
    programCode: null,
    category: "Prompts",
    addedAt: "2026-01-15T00:00:00.000Z",
  },
  {
    id: "seed-rolematrix-template",
    title: "Role matrix template",
    description:
      "Sortable spreadsheet for mapping every task in a role to AI leverage tier.",
    type: "template",
    url: "https://example.com/role-matrix.xlsx",
    programCode: null,
    category: "Templates",
    addedAt: "2026-01-12T00:00:00.000Z",
  },
  {
    id: "seed-changemgmt-video",
    title: "AI change management — 18 min deep dive",
    description:
      "Mike walks through the change-management playbook used inside healthcare orgs.",
    type: "video",
    url: "https://example.com/change-mgmt",
    programCode: null,
    category: "Bonus Videos",
    addedAt: "2026-01-20T00:00:00.000Z",
  },
  {
    id: "seed-aiew3-greenbelt-prep",
    title: "AIEW3 · Green Belt prep brief",
    description:
      "What to bring to Session 4 — Reliability Lab. One real workflow you'd like to harden.",
    type: "doc",
    url: "https://example.com/aiew3-green-prep",
    programCode: "AIEW3",
    category: "Session prep",
    addedAt: "2026-01-22T00:00:00.000Z",
  },
  {
    id: "seed-aiew3-bluebelt-prompts",
    title: "AIEW3 · Blue Belt — Agent prompt pack",
    description:
      "Starter prompts for autonomous agent workflows. Drop into Claude or GPT and adapt.",
    type: "prompt",
    url: "https://example.com/aiew3-blue-prompts",
    programCode: "AIEW3",
    category: "Prompts",
    addedAt: "2026-01-24T00:00:00.000Z",
  },
  {
    id: "seed-reading-list",
    title: "Recommended reading",
    description:
      "Books + essays the BestResults.AI team returns to when shaping the curriculum.",
    type: "link",
    url: "https://example.com/reading-list",
    programCode: null,
    category: "Reading",
    addedAt: "2026-01-08T00:00:00.000Z",
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

let resourceOverlays = readOverlays();

const listeners = new Set();
function emit() {
  for (const fn of listeners) {
    try { fn(); } catch { /* ignore */ }
  }
}
export function subscribeResourceChanges(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useResourceVersion() {
  const [v, setV] = useState(0);
  useEffect(() => subscribeResourceChanges(() => setV((x) => x + 1)), []);
  return v;
}

// ---------------------------------------------------------------------------
// Public readers
// ---------------------------------------------------------------------------

// All resources visible to admins (seed + overlays, minus archived).
export function getAllResourcesForAdmin() {
  const baseById = Object.fromEntries(SEED_RESOURCES.map((r) => [r.id, r]));
  const merged = { ...baseById };
  for (const [id, overlay] of Object.entries(resourceOverlays)) {
    if (overlay?.archivedAt) {
      delete merged[id];
      continue;
    }
    merged[id] = { ...(merged[id] || {}), ...overlay };
  }
  return Object.values(merged).sort(
    (a, b) => new Date(b.addedAt || 0) - new Date(a.addedAt || 0),
  );
}

// All resources a participant should see, given their program + cohort.
// Returns:
//   - every global resource (programCode null, cohortSlug null)
//   - every resource scoped to their program (programCode match, cohortSlug null)
//   - every resource scoped to their specific cohort (cohortSlug match)
//
// Pass nulls for "no program / no cohort" — gets only globals.
export function getResourcesForParticipant(programCode, cohortSlug) {
  return getAllResourcesForAdmin().filter((r) => {
    if (!r.programCode && !r.cohortSlug) return true; // global
    if (r.cohortSlug) return cohortSlug && r.cohortSlug === cohortSlug;
    return programCode && r.programCode === programCode;
  });
}

export function getResourceById(id) {
  return getAllResourcesForAdmin().find((r) => r.id === id) || null;
}

// ---------------------------------------------------------------------------
// Writers
// ---------------------------------------------------------------------------

function genId() {
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createResource(payload) {
  const now = new Date().toISOString();
  const id = payload.id || genId();
  const resource = normalize({ ...payload, id, addedAt: now, updatedAt: now });
  resourceOverlays = { ...resourceOverlays, [id]: resource };
  writeOverlays(resourceOverlays);
  emit();
  return resource;
}

export function updateResource(id, patch) {
  if (!id) throw new Error("updateResource: id is required");
  // Start from the existing (seed or overlay) record so a patch never wipes
  // unrelated fields.
  const existing = getResourceById(id) || {};
  const merged = normalize({
    ...existing,
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  });
  resourceOverlays = { ...resourceOverlays, [id]: merged };
  writeOverlays(resourceOverlays);
  emit();
  return merged;
}

export function archiveResource(id) {
  const existing = resourceOverlays[id] || getResourceById(id) || { id };
  resourceOverlays = {
    ...resourceOverlays,
    [id]: { ...existing, archivedAt: new Date().toISOString() },
  };
  writeOverlays(resourceOverlays);
  emit();
}

function normalize(r) {
  return {
    id: r.id,
    title: (r.title || "").trim(),
    description: (r.description || "").trim(),
    type: RESOURCE_TYPES.some((t) => t.value === r.type) ? r.type : "link",
    // Uploaded files use a base64 data URL which is far too long to trim
    // safely — only trim plain http(s) links.
    url: (r.url || "").startsWith("data:") ? r.url : (r.url || "").trim(),
    fileName: r.fileName || null,
    programCode: r.programCode || null,
    // Cohort scope implies program scope. If a caller sends a cohortSlug
    // without a programCode it's a bug, but we tolerate it and trust the
    // slug — the participant query checks slug equality directly.
    cohortSlug: r.cohortSlug || null,
    category: (r.category || "Uncategorized").trim() || "Uncategorized",
    addedAt: r.addedAt || new Date().toISOString(),
    updatedAt: r.updatedAt,
  };
}
