// ---------------------------------------------------------------------------
// send-email — server-side endpoint for transactional email delivery.
//
// Renders the requested template via src/lib/emailTemplates.js (single
// source of truth for content), posts to Resend, and logs the attempt to
// the email_sends audit table.
//
// POST body:
//   {
//     template:  string   — id from emailTemplates.js (e.g. "magic-link")
//     to:        string|{email,name}
//     data:      object   — merge data for the template
//     cohortSlug: string|null  — optional, attaches the send to a cohort
//     replyTo:   string|null
//   }
//
// Response 200: { id, providerMessageId, status }
// Response 4xx/5xx: { error, details? }
//
// Env vars consumed:
//   RESEND_API_KEY       — required
//   RESEND_FROM_EMAIL    — optional override; defaults to BRAND.sender
//   PUBLIC_SITE_URL      — used in template links
// ---------------------------------------------------------------------------

// NOTE: We deliberately avoid `import { Resend } from "resend"` here. The 6.x
// SDK has been crashing at module load on Netlify Functions (bare 502 with no
// diagnostic). Calling Resend's REST API directly with fetch is simpler,
// avoids the SDK dependency entirely, and gives us first-class error
// surfaces.
import { getAdminClient, requireAdmin, requireAuthenticated, parseJson, ok, bad, HttpError } from "./_helpers.js";
import { sendMailInternal } from "./_mailer.js";

// Templates any authenticated user can trigger as part of their own
// lifecycle — as long as the recipient is themselves (or their assigned
// facilitator, for new-homework-submitted). Any template NOT in this set
// still requires admin/super capabilities to prevent abuse.
const USER_LIFECYCLE_TEMPLATES = new Set([
  "onboarding-confirmed",
  "homework-reviewed",
  "new-homework-submitted",
  "belt-earned",
  "program-complete",
]);

export const handler = async (event) => {
  // Bullet-proof outer wrapper. Any uncaught throw inside the inner handler
  // would otherwise surface to the user as a Netlify 502 with no diagnostic.
  // We log to console (Netlify Function logs) and surface a structured 500
  // with the real error so the browser Network panel shows what broke.
  try {
    return await _innerHandler(event);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[send-email] uncaught error:", err?.stack || err?.message || err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: err?.message || "Internal error",
        stack: process.env.NODE_ENV === "production" ? undefined : err?.stack,
        envCheck: {
          hasSupabaseUrl: !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
          hasSupabaseSecret: !!process.env.SUPABASE_SECRET_KEY,
          hasResendKey: !!process.env.RESEND_API_KEY,
        },
      }),
    };
  }
};

async function _innerHandler(event) {
  // eslint-disable-next-line no-console
  console.log("[send-email] invoked", { method: event.httpMethod });

  if (event.httpMethod !== "POST") {
    return bad(new HttpError(405, "Method not allowed."));
  }

  let logRow = null;
  let adminClient = null;

  try {
    const payload = parseJson(event);
    const template = String(payload.template || "").trim();
    if (!template) throw new HttpError(400, "template id is required.");

    const recipient =
      typeof payload.to === "string"
        ? { email: payload.to }
        : payload.to || {};
    if (!recipient.email) throw new HttpError(400, "to.email is required.");

    // Two-tier auth: user-lifecycle templates just need a valid session
    // and constrain who the recipient can be. Anything else still requires
    // admin. Prevents a participant from spamming arbitrary inboxes while
    // still letting the WelcomeWizard fire onboarding-confirmed from a
    // plain-participant session, and letting submitHomework ping the
    // facilitator (new-homework-submitted).
    // eslint-disable-next-line no-console
    console.log("[send-email] step 1: auth check for template", template);
    if (USER_LIFECYCLE_TEMPLATES.has(template)) {
      const { profile } = await requireAuthenticated(event);
      const caps = Array.isArray(profile.capabilities) ? profile.capabilities : [];
      const isAdmin = caps.includes("admin") || caps.includes("super");
      const selfEmail = (profile.email || "").toLowerCase();
      const toEmail = (recipient.email || "").toLowerCase();
      const isSelf = selfEmail === toEmail;
      // For new-homework-submitted, the recipient must be a facilitator
      // (or admin/super) — verify against profiles.capabilities before
      // letting the send through. Any other user-lifecycle template
      // stays self-only.
      let recipientAllowed = isAdmin || isSelf;
      if (!recipientAllowed && template === "new-homework-submitted") {
        const admin2 = getAdminClient();
        const { data: toProfile } = await admin2
          .from("profiles")
          .select("capabilities")
          .eq("email", recipient.email)
          .maybeSingle();
        const recCaps = Array.isArray(toProfile?.capabilities) ? toProfile.capabilities : [];
        recipientAllowed =
          recCaps.includes("facilitator") ||
          recCaps.includes("admin") ||
          recCaps.includes("super");
      }
      if (!recipientAllowed) {
        throw new HttpError(
          403,
          "Non-admin callers can only send lifecycle emails to themselves or their facilitator.",
        );
      }
    } else {
      await requireAdmin(event);
    }
    // eslint-disable-next-line no-console
    console.log("[send-email] step 1 OK");

    // Render + log + Resend live inside the shared _mailer helper now.
    // Same behavior as before; extracted so the scheduled reminder function
    // can reuse it without duplicating the retry/logging plumbing.
    adminClient = getAdminClient();
    try {
      const result = await sendMailInternal({
        template,
        to: recipient,
        data: payload.data || {},
        cohortSlug: payload.cohortSlug || null,
        replyTo: payload.replyTo || null,
        adminClient,
      });
      logRow = result.logRow;
      return ok({
        id: result.logRow?.id || null,
        providerMessageId: result.providerMessageId || null,
        status: result.status,
      });
    } catch (err) {
      // sendMailInternal throws on render failures + Resend rejections.
      // Keep the caller-facing status codes stable — render errors are
      // 400 (template-authoring bug), everything else is 502 (upstream).
      if (err?.message?.startsWith("Resend rejected")) {
        throw new HttpError(502, err.message);
      }
      throw new HttpError(400, err?.message || "Template render failed");
    }
  } catch (err) {
    // If a log row exists and we haven't already updated it, mark failed.
    if (logRow && adminClient && err instanceof HttpError && err.status !== 502) {
      try {
        await adminClient
          .from("email_sends")
          .update({ status: "failed", error_message: err.message })
          .eq("id", logRow.id);
      } catch { /* ignore */ }
    }
    return bad(err);
  }
};
