#!/usr/bin/env node
// ============================================================================
// seed-staging.mjs — idempotent platform seed for Supabase.
//
// Run with:
//
//   SUPABASE_URL=https://xxx.supabase.co \
//   SUPABASE_SECRET_KEY=sb_secret_xxx \
//   node scripts/seed-staging.mjs
//
// Or, after `cp .env.example .env.local` and filling in values:
//
//   node --env-file=.env.local scripts/seed-staging.mjs
//
// Safe to re-run — every insert uses upsert on a natural key (slug, id, or
// email).
//
// What gets seeded (clean-slate config):
//
//   - 2 programs:
//       aiew3 — AI Empowerment Workshop Series 3.0
//       apfw  — AI Power Foundations Workshop
//
//   - 4 staff profiles:
//       Josue Acuna    (josue@bestresults.ai)    super + admin
//       Mike Burkesmith (mike@bestresults.ai)    admin + facilitator
//       Lee Truax       (lee@bestresults.ai)     admin + facilitator
//       Bethany Truax   (bethany@bestresults.ai) admin
//
// Does NOT seed organizations, cohorts, or participants. Those are created
// via the admin UI (/admin/orgs, /admin/cohorts/new, /admin/users/new) once
// the platform is live.
// ============================================================================

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
// Accept either the new "secret key" (sb_secret_*) or the legacy
// service_role JWT. Both have the same privileges from the SDK's perspective.
const SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY in env.");
  console.error("(SUPABASE_SERVICE_ROLE_KEY also accepted for legacy keys.)");
  console.error("Set them in .env.local, then run with --env-file=.env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function log(stage, msg) {
  console.log(`  [${stage.padEnd(10)}] ${msg}`);
}

async function upsertBySlug(table, rows, conflictKey = "slug") {
  const { data, error } = await supabase
    .from(table)
    .upsert(rows, { onConflict: conflictKey })
    .select();
  if (error) {
    console.error(`Failed to upsert ${table}:`, error.message);
    process.exit(1);
  }
  return data;
}

// ----------------------------------------------------------------------------
// Programs
// ----------------------------------------------------------------------------

const AIEW3_SESSIONS = [
  { number: 1, title: "White Belt — Full Role Matrices, Prioritized Use Cases, Change Management" },
  { number: 2, title: "Yellow Belt — Power AI-Driven Workflows" },
  { number: 3, title: "Orange Belt — 100,000 Experts Enhancing Every AI Workflow" },
  { number: 4, title: "Green Belt — High-Reliability Repeatable Workflows, Assistants, Agents" },
  { number: 5, title: "Blue Belt — Professional AI Teams Doing Sophisticated Projects" },
  { number: 6, title: "Purple Belt — Autonomous Agent Functions" },
  { number: 7, title: "Brown Belt — Agent Quality Assurance and Orchestration" },
  { number: 8, title: "Black Belt — Progress, Plans, Getting Future Results" },
];

const APFW_SESSIONS = [
  { number: 1, title: "AI Power Foundations — Orientation" },
  { number: 2, title: "Working with Documents" },
  { number: 3, title: "Working with Spreadsheets" },
  { number: 4, title: "Working with Meetings" },
  { number: 5, title: "Building Your First Mini-Workflow" },
  { number: 6, title: "Capstone Demo" },
];

async function seedPrograms() {
  log("programs", "upserting AIEW3 + APFW");
  const programs = await upsertBySlug("programs", [
    {
      slug: "aiew3",
      name: "AI Empowerment Workshop Series 3.0",
      short_name: "AIEW3",
      description:
        "Eight-session belt-ranked program. Participants move from mindset + role matrix through autonomous agents and orchestration.",
      production_tiers: ["no-sop", "with-sop", "ai-workflow", "ai-agent", "ai-swarm"],
      sessions: AIEW3_SESSIONS,
      badges: [],
      completion_criteria: {
        sessions_completed_min: 8,
        homework_submitted_min: 6,
      },
      belt_order: ["white", "yellow", "orange", "green", "blue", "purple", "brown", "black"],
      branding: { color: "#0F4F7A" },
    },
    {
      slug: "apfw",
      name: "AI Power Foundations Workshop",
      short_name: "APFW",
      description:
        "Six-session intro program. Foundations for teams new to AI workflows.",
      production_tiers: ["no-sop", "with-sop", "ai-workflow"],
      sessions: APFW_SESSIONS,
      badges: [],
      completion_criteria: {
        sessions_completed_min: 5,
        homework_submitted_min: 3,
      },
      belt_order: ["white", "yellow", "orange", "green"],
      branding: { color: "#1F7A4F" },
    },
  ]);
  return Object.fromEntries(programs.map((p) => [p.slug, p]));
}

// ----------------------------------------------------------------------------
// Staff profiles. Each one has both an auth.users entry and a profiles row.
// ----------------------------------------------------------------------------

async function seedStaffUser({ email, name, capabilities }) {
  const { data: existing } = await supabase.auth.admin.listUsers();
  let user = existing?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { name },
    });
    if (error) {
      console.error(`Failed to create auth user ${email}:`, error.message);
      process.exit(1);
    }
    user = data.user;
  }

  const { error: upsertErr } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email,
        name,
        capabilities,
      },
      { onConflict: "id" }
    );
  if (upsertErr) {
    console.error(`Failed to upsert profile ${email}:`, upsertErr.message);
    process.exit(1);
  }

  return user;
}

async function seedStaff() {
  log("staff", "Josue (super+admin), Mike (admin+facilitator), Lee (admin+facilitator), Bethany (admin)");

  const josue = await seedStaffUser({
    email: "josue@bestresults.ai",
    name: "Josue Acuna",
    capabilities: ["super", "admin"],
  });

  const mike = await seedStaffUser({
    email: "mike@bestresults.ai",
    name: "Mike Burkesmith",
    capabilities: ["admin", "facilitator"],
  });

  const lee = await seedStaffUser({
    email: "lee@bestresults.ai",
    name: "Lee Truax",
    capabilities: ["admin", "facilitator"],
  });

  const bethany = await seedStaffUser({
    email: "bethany@bestresults.ai",
    name: "Bethany Truax",
    capabilities: ["admin"],
  });

  return { josue, mike, lee, bethany };
}

// ----------------------------------------------------------------------------
// Run
// ----------------------------------------------------------------------------

(async () => {
  console.log("");
  console.log("Seeding Supabase project at", SUPABASE_URL);
  console.log("");

  const programs = await seedPrograms();
  const staff = await seedStaff();

  console.log("");
  console.log("Seed complete.");
  console.log(`  Programs:      ${Object.keys(programs).length} (${Object.keys(programs).join(", ")})`);
  console.log(`  Staff:         4 (josue, mike, lee, bethany)`);
  console.log(`  Organizations: 0 (create via /admin/orgs)`);
  console.log(`  Cohorts:       0 (create via /admin/cohorts/new)`);
  console.log(`  Participants:  0 (create via /admin/users/new)`);
  console.log("");
  console.log("Next:");
  console.log("  1. Sign in to the platform as one of the staff emails");
  console.log("     (a magic link will be sent — check your Workspace inbox).");
  console.log("  2. Visit /admin/orgs to create your first organization.");
  console.log("  3. Visit /admin/cohorts/new to launch the first cohort.");
  console.log("");
})();
