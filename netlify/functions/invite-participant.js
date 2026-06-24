// ---------------------------------------------------------------------------
// invite-participant — server-side admin endpoint to add a new participant.
//
// Steps:
//   1. Verify caller is admin/super.
//   2. Create (or find) the Supabase auth user via auth.admin.createUser.
//   3. Upsert the profiles row with name + capabilities + preferences.
//   4. If cohortSlug is provided, upsert the cohort_participants link row.
//   5. Optionally generate a magic-link sign-in URL and return it so the
//      caller (admin UI) can email or share it.
//
// POST body:
//   {
//     email:        string (required)
//     name:         string (required)
//     cohortSlug:   string|null
//     capabilities: string[]   — beyond the implicit "participant"
//     title:        string|null
//     organization: string|null
//     isCohortLead: boolean
//     sendMagicLink: boolean   — if true, returns a magic-link URL
//   }
//
// Response 200:
//   { profile, cohortLink, magicLink? }
//
// Response 4xx/5xx: { error, details? }
// ---------------------------------------------------------------------------

import { getAdminClient, requireAdmin, parseJson, ok, bad, HttpError } from "./_helpers.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return bad(new HttpError(405, "Method not allowed."));
  }

  try {
    await requireAdmin(event);
    const payload = parseJson(event);

    const email = String(payload.email || "").trim().toLowerCase();
    const name = String(payload.name || "").trim();
    if (!email) throw new HttpError(400, "email is required.");
    if (!name) throw new HttpError(400, "name is required.");

    const cohortSlug = payload.cohortSlug || null;
    const capabilities = Array.isArray(payload.capabilities) ? payload.capabilities : [];
    const isCohortLead = !!payload.isCohortLead;
    const sendMagicLink = !!payload.sendMagicLink;

    const admin = getAdminClient();

    // ----- Step 1+2: ensure the auth user exists -----
    let authUserId = null;
    {
      const { data: listed, error: listErr } = await admin.auth.admin.listUsers();
      if (listErr) throw new HttpError(500, "Failed to list auth users.", listErr.message);
      const existing = listed?.users?.find(
        (u) => u.email?.toLowerCase() === email,
      );
      if (existing) {
        authUserId = existing.id;
      } else {
        const { data, error } = await admin.auth.admin.createUser({
          email,
          email_confirm: true, // skip the confirmation email; magic link is the entry
          user_metadata: { name },
        });
        if (error) throw new HttpError(500, "Failed to create auth user.", error.message);
        authUserId = data.user?.id || null;
      }
    }
    if (!authUserId) throw new HttpError(500, "Auth user creation returned no id.");

    // ----- Step 3: upsert profiles row -----
    // Capabilities always include "participant" so RLS treats this user as
    // at least a participant. Strip duplicates and "cohort-leader" since
    // that's derived from cohort_participants.role.
    const capsToStore = [
      ...new Set([
        ...capabilities.filter((c) => c && c !== "cohort-leader"),
        "participant",
      ]),
    ];

    const prefs = {
      title: payload.title || undefined,
      organization: payload.organization || undefined,
    };

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .upsert(
        {
          id: authUserId,
          email,
          name,
          capabilities: capsToStore,
          preferences: prefs,
        },
        { onConflict: "id" },
      )
      .select()
      .maybeSingle();
    if (profileErr) {
      throw new HttpError(500, "Failed to upsert profile.", profileErr.message);
    }

    // ----- Step 4: cohort_participants link (optional) -----
    let cohortLink = null;
    if (cohortSlug) {
      const { data: cohort, error: cohortErr } = await admin
        .from("cohorts")
        .select("id")
        .eq("slug", cohortSlug)
        .maybeSingle();
      if (cohortErr) {
        throw new HttpError(500, "Failed to look up cohort.", cohortErr.message);
      }
      if (!cohort) {
        throw new HttpError(404, `Cohort not found: ${cohortSlug}`);
      }
      const { data: link, error: linkErr } = await admin
        .from("cohort_participants")
        .upsert(
          {
            cohort_id: cohort.id,
            profile_id: authUserId,
            role: isCohortLead ? "cohort_leader" : "participant",
          },
          { onConflict: "cohort_id,profile_id" },
        )
        .select()
        .maybeSingle();
      if (linkErr) {
        throw new HttpError(500, "Failed to upsert cohort link.", linkErr.message);
      }
      cohortLink = link;
    }

    // ----- Step 5: magic link (optional) -----
    let magicLink = null;
    if (sendMagicLink) {
      try {
        const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: {
            redirectTo: `${process.env.PUBLIC_SITE_URL || ""}/auth/verify?next=/home`,
          },
        });
        if (linkErr) {
          // Not fatal — the participant can still get a link via the login page.
          // eslint-disable-next-line no-console
          console.warn("[invite-participant] generateLink failed:", linkErr.message);
        } else {
          magicLink = link?.properties?.action_link || null;
        }
      } catch (err) {
        // Same: non-fatal.
        // eslint-disable-next-line no-console
        console.warn("[invite-participant] generateLink threw:", err?.message || err);
      }
    }

    return ok({ profile, cohortLink, magicLink });
  } catch (err) {
    return bad(err);
  }
};
