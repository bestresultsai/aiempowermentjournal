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

// ---------------------------------------------------------------------------
// Branded invite email — inlined here to avoid pulling in the whole
// emailTemplates.js file at cold-start (its bundle is heavier and we only
// need this one template server-side). If we ever add more admin-triggered
// emails we should promote this into a shared function.
// ---------------------------------------------------------------------------

const SITE_URL = "https://platform.bestresults.ai";
const LOGO_URL = `${SITE_URL}/brand/horizontal-color-no-tagline.svg`;

function firstName(name) {
  return String(name || "there").trim().split(/\s+/)[0];
}
function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function renderInviteEmail({ name, magicLink }) {
  const first = escapeHtml(firstName(name));
  const link = escapeHtml(magicLink);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/><title>You're invited to BestResults.AI</title></head>
<body style="margin:0;padding:0;background:#F7F4EF;font-family:Inter,system-ui,sans-serif;color:#1B1F23;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7F4EF;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid #E5E1DA;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:24px 28px;border-bottom:1px solid #E5E1DA;">
          <a href="${SITE_URL}" style="text-decoration:none;display:inline-block;">
            <img src="${LOGO_URL}" alt="BestResults.AI" width="200" style="display:block;height:auto;border:0;outline:none;max-width:200px;"/>
          </a>
        </td></tr>
        <tr><td style="padding:28px;line-height:1.6;font-size:15px;color:#1B1F23;">
          <p style="margin:0 0 14px;">Hi ${first},</p>
          <p style="margin:0 0 14px;">You've been invited to the <strong>BestResults.AI Platform</strong> — our cohort training hub for AI Empowerment. Click below to sign in. No password needed.</p>
          <p style="margin:20px 0;">
            <a href="${link}" style="display:inline-block;background:#1B1F23;color:#FFFFFF;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;font-size:14px;">Sign in to BestResults.AI</a>
          </p>
          <p style="margin:0 0 14px;font-size:13px;color:#6B7280;">If the button doesn't work, paste this URL into your browser:<br/>
            <a href="${link}" style="color:#2563EB;word-break:break-all;">${link}</a>
          </p>
          <p style="margin:24px 0 0;font-size:13px;color:#6B7280;">This link expires in one hour and can only be used once. If you weren't expecting this invitation, you can safely ignore it.</p>
        </td></tr>
        <tr><td style="padding:20px 28px;background:#F7F4EF;border-top:1px solid #E5E1DA;font-size:12px;color:#6B7280;line-height:1.5;">
          You're receiving this because someone at BestResults.AI added you to a cohort.<br/>
          Questions? Reply to this email or write to <a href="mailto:hello@bestresults.ai" style="color:#2563EB;">hello@bestresults.ai</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function renderInviteText({ name, magicLink }) {
  return `Hi ${firstName(name)},

You've been invited to the BestResults.AI Platform — our cohort training hub for AI Empowerment. Click below to sign in. No password needed.

${magicLink}

This link expires in one hour and can only be used once. If you weren't expecting this invitation, you can safely ignore it.

Questions? Reply to this email or write to hello@bestresults.ai.

—BRAI Team`;
}

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

    // ----- Step 5: magic link + branded invite email (optional) -----
    let magicLink = null;
    let emailSent = false;
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
          console.warn("[invite-participant] generateLink failed:", linkErr.message);
        } else {
          magicLink = link?.properties?.action_link || null;
        }
      } catch (err) {
        console.warn("[invite-participant] generateLink threw:", err?.message || err);
      }

      // Actually email the participant — send-email lives in a different
      // function, so we inline the Resend REST call here. Non-fatal: if the
      // send fails we still return the magicLink so the admin can copy it.
      if (magicLink && process.env.RESEND_API_KEY) {
        try {
          const inviteSubject = `You've been invited to BestResults.AI`;
          const html = renderInviteEmail({ name, magicLink });
          const text = renderInviteText({ name, magicLink });
          const resendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "BestResults.AI <hello@bestresults.ai>",
              to: email,
              reply_to: "hello@bestresults.ai",
              subject: inviteSubject,
              html,
              text,
            }),
          });
          const resendBody = await resendRes.json().catch(() => ({}));
          if (resendRes.ok) {
            emailSent = true;
            // Log to email_sends audit table. Best-effort — a failure here
            // doesn't affect the response.
            try {
              await admin.from("email_sends").insert({
                template: "cohort-invite",
                to_email: email,
                to_profile_id: authUserId,
                cohort_id: cohortLink?.cohort_id || null,
                subject: inviteSubject,
                provider: "resend",
                provider_message_id: resendBody?.id || null,
                status: "sent",
                sent_at: new Date().toISOString(),
                payload: { name, cohortSlug: cohortSlug || null },
              });
            } catch { /* swallow — audit best-effort */ }
          } else {
            console.warn("[invite-participant] Resend rejected:", resendBody);
          }
        } catch (err) {
          console.warn("[invite-participant] email send threw:", err?.message || err);
        }
      }
    }

    return ok({ profile, cohortLink, magicLink, emailSent });
  } catch (err) {
    return bad(err);
  }
};
