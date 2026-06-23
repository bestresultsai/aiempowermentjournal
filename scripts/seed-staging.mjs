#!/usr/bin/env node
// ============================================================================
// seed-staging.mjs — idempotent staging seed for the Supabase project.
//
// Run with:
//
//   SUPABASE_URL=https://xxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//   node scripts/seed-staging.mjs
//
// Or, more practically, after `cp .env.example .env.local` and filling in
// values, use a small wrapper:
//
//   node --env-file=.env.local scripts/seed-staging.mjs
//
// Safe to re-run. Every insert uses upsert on a natural key (slug, email,
// or a composite). Re-running picks up edits to this file.
//
// What gets seeded:
//
//   - 2 organizations:     summit-health, pacific-health-system
//   - 2 programs:          aiew3 (AI Empowerment Workshop Series),
//                          apfw  (AI Power Foundations Workshop)
//   - 4 cohorts:           Summit AIEW3 + APFW, PHS AIEW3 + APFW
//   - Core staff profiles: Mike (facilitator), Jordan (org admin), Josue (super)
//
// Does NOT seed participants — those come in via the cohort import UI
// (Phase 2) so we don't accidentally email a real test address. Once the
// import UI is wired, run it against a CSV in /scripts/fixtures/.
// ============================================================================

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
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
// 1. Organizations
// ----------------------------------------------------------------------------

async function seedOrganizations() {
  log("orgs", "upserting Summit Health + Pacific Health System");
  const orgs = await upsertBySlug("organizations", [
    {
      slug: "summit-health",
      name: "Summit Health",
      logo_url: null,
      primary_color: "#0F4F7A",
      notes: "First production cohort. Facilitated by Mike Burkesmith.",
    },
    {
      slug: "pacific-health-system",
      name: "Pacific Health System",
      logo_url: null,
      primary_color: "#1F7A4F",
      notes: "Second production cohort. Facilitated by Mike Burkesmith.",
    },
  ]);
  const byslug = Object.fromEntries(orgs.map((o) => [o.slug, o]));
  return byslug;
}

// ----------------------------------------------------------------------------
// 2. Programs
// ----------------------------------------------------------------------------

const AIEW3_SESSIONS = [
  { number: 1, title: "Mindset & Foundations" },
  { number: 2, title: "Prompt Engineering Basics" },
  { number: 3, title: "Document Workflows" },
  { number: 4, title: "Data + Spreadsheets" },
  { number: 5, title: "Meetings + Email" },
  { number: 6, title: "Building Your First Workflow" },
  { number: 7, title: "Agents Overview" },
  { number: 8, title: "Production Tier: From SOP to Swarm" },
  { number: 9, title: "Custom Use Cases — Workshop" },
  { number: 10, title: "Capstone + Certification" },
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
      name: "AI Empowerment Workshop Series",
      short_name: "AIEW3",
      description:
        "Ten-session cohort that takes participants from mindset to production-tier workflows.",
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
        "Six-session intro program. Designed for orgs new to AI workflows.",
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
// 3. Staff profiles
// Note: in real auth, these get created when the user first signs in via
// magic link. For the staging seed we create the auth.users entry too so
// admin pages have someone to display.
// ----------------------------------------------------------------------------

async function seedStaffUser({ email, name, capabilities, org_id = null }) {
  // Use the admin createUser API to make sure auth.users + profiles are
  // consistent. If the user already exists, we just upsert into profiles.
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
        org_id,
      },
      { onConflict: "id" }
    );
  if (upsertErr) {
    console.error(`Failed to upsert profile ${email}:`, upsertErr.message);
    process.exit(1);
  }

  return user;
}

async function seedStaff(orgs) {
  log("staff", "creating Josue (super), Mike (facilitator), Jordan (org admin)");

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

  const jordan = await seedStaffUser({
    email: "jordan@summithealth.example",
    name: "Jordan Park",
    capabilities: ["org_admin"],
    org_id: orgs["summit-health"].id,
  });

  return { josue, mike, jordan };
}

// ----------------------------------------------------------------------------
// 4. Cohorts
// ----------------------------------------------------------------------------

async function seedCohorts(orgs, programs, staff) {
  log("cohorts", "upserting Summit + PHS cohorts (AIEW3 + APFW each)");
  const cohorts = await upsertBySlug(
    "cohorts",
    [
      {
        slug: "summit-aiew3-2026q3",
        program_id: programs["aiew3"].id,
        org_id: orgs["summit-health"].id,
        name: "Summit Health · AIEW3 · 2026 Q3",
        start_date: "2026-07-09",
        end_date: "2026-10-15",
        meeting_day: "Thursday",
        meeting_time: "12:00 PT",
        facilitator_id: staff.mike.id,
        notes: "First production cohort. Lock down before kickoff.",
      },
      {
        slug: "summit-apfw-2026q3",
        program_id: programs["apfw"].id,
        org_id: orgs["summit-health"].id,
        name: "Summit Health · APFW · 2026 Q3",
        start_date: "2026-07-10",
        end_date: "2026-08-21",
        meeting_day: "Friday",
        meeting_time: "11:00 PT",
        facilitator_id: staff.mike.id,
      },
      {
        slug: "phs-aiew3-2026q3",
        program_id: programs["aiew3"].id,
        org_id: orgs["pacific-health-system"].id,
        name: "Pacific Health System · AIEW3 · 2026 Q3",
        start_date: "2026-07-16",
        end_date: "2026-10-22",
        meeting_day: "Thursday",
        meeting_time: "15:00 PT",
        facilitator_id: staff.mike.id,
      },
      {
        slug: "phs-apfw-2026q3",
        program_id: programs["apfw"].id,
        org_id: orgs["pacific-health-system"].id,
        name: "Pacific Health System · APFW · 2026 Q3",
        start_date: "2026-07-17",
        end_date: "2026-08-28",
        meeting_day: "Friday",
        meeting_time: "14:00 PT",
        facilitator_id: staff.mike.id,
      },
    ],
    "program_id,slug"
  );
  return Object.fromEntries(cohorts.map((c) => [c.slug, c]));
}

// ----------------------------------------------------------------------------
// Run
// ----------------------------------------------------------------------------

(async () => {
  console.log("");
  console.log("Seeding staging Supabase project at", SUPABASE_URL);
  console.log("");

  const orgs = await seedOrganizations();
  const programs = await seedPrograms();
  const staff = await seedStaff(orgs);
  const cohorts = await seedCohorts(orgs, programs, staff);

  console.log("");
  console.log("Seed complete.");
  console.log(`  Organizations: ${Object.keys(orgs).length}`);
  console.log(`  Programs:      ${Object.keys(programs).length}`);
  console.log(`  Cohorts:       ${Object.keys(cohorts).length}`);
  console.log(`  Staff:         3 (super: josue, facilitator: mike, org admin: jordan)`);
  console.log("");
  console.log("Next:");
  console.log("  1. Sign in to the staging URL as one of the staff emails");
  console.log("     (a magic link will be sent — check your inbox).");
  console.log("  2. Visit /admin/cohorts to confirm the four cohorts appear.");
  console.log("  3. Use the participant import UI to load real cohort rosters.");
  console.log("");
})();
