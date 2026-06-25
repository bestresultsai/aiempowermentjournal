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
import { getAdminClient, requireAdmin, parseJson, ok, bad, HttpError } from "./_helpers.js";
import { renderTemplate, BRAND } from "../../src/lib/emailTemplates.js";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || BRAND.sender;

// POST to https://api.resend.com/emails — returns { data, error } shape so
// the rest of the handler can stay unchanged.
async function resendSend({ from, to, reply_to, subject, html, text }) {
  if (!RESEND_API_KEY) {
    throw new HttpError(500, "RESEND_API_KEY is not configured.");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, reply_to, subject, html, text }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { data: null, error: { message: body?.message || `Resend HTTP ${res.status}`, name: body?.name, statusCode: res.status } };
  }
  return { data: body, error: null };
}

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
    // eslint-disable-next-line no-console
    console.log("[send-email] step 1: requireAdmin");
    await requireAdmin(event);
    // eslint-disable-next-line no-console
    console.log("[send-email] step 1 OK");
    const payload = parseJson(event);

    const template = String(payload.template || "").trim();
    if (!template) throw new HttpError(400, "template id is required.");

    const recipient =
      typeof payload.to === "string"
        ? { email: payload.to }
        : payload.to || {};
    if (!recipient.email) throw new HttpError(400, "to.email is required.");

    let rendered;
    try {
      rendered = renderTemplate(template, payload.data || {});
    } catch (err) {
      throw new HttpError(400, `Template render failed: ${err.message}`);
    }

    // ----- Log the send attempt before posting to Resend so a Resend
    // outage still leaves a trail with status='queued' or 'failed'.
    adminClient = getAdminClient();
    try {
      // Resolve to_profile_id by email lookup, best-effort.
      const { data: profile } = await adminClient
        .from("profiles")
        .select("id")
        .eq("email", recipient.email)
        .maybeSingle();
      // Resolve cohort_id from slug, optional.
      let cohortId = null;
      if (payload.cohortSlug) {
        const { data: cohort } = await adminClient
          .from("cohorts")
          .select("id")
          .eq("slug", payload.cohortSlug)
          .maybeSingle();
        cohortId = cohort?.id || null;
      }
      const { data: inserted, error: logErr } = await adminClient
        .from("email_sends")
        .insert({
          template,
          to_email: recipient.email,
          to_profile_id: profile?.id || null,
          cohort_id: cohortId,
          subject: rendered.subject,
          provider: "resend",
          status: "queued",
          payload: payload.data || {},
        })
        .select()
        .maybeSingle();
      if (logErr) {
        // eslint-disable-next-line no-console
        console.warn("[send-email] failed to insert email_sends row:", logErr.message);
      } else {
        logRow = inserted;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[send-email] log step error:", err?.message || err);
    }

    // ----- Hand off to Resend (direct REST call, no SDK) -----
    // eslint-disable-next-line no-console
    console.log("[send-email] step 3: posting to Resend");
    const sent = await resendSend({
      from: RESEND_FROM_EMAIL,
      to: recipient.email,
      reply_to: payload.replyTo || BRAND.replyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    // eslint-disable-next-line no-console
    console.log("[send-email] step 3 done", { hasError: !!sent?.error });

    if (sent?.error) {
      // Update log with failure if we have a log row.
      if (logRow && adminClient) {
        await adminClient
          .from("email_sends")
          .update({
            status: "failed",
            error_message: sent.error.message || String(sent.error),
          })
          .eq("id", logRow.id);
      }
      throw new HttpError(502, "Resend rejected the message.", sent.error);
    }

    // ----- Mark log row as sent -----
    if (logRow && adminClient) {
      await adminClient
        .from("email_sends")
        .update({
          status: "sent",
          provider_message_id: sent?.data?.id || null,
          sent_at: new Date().toISOString(),
        })
        .eq("id", logRow.id);
    }

    return ok({
      id: logRow?.id || null,
      providerMessageId: sent?.data?.id || null,
      status: "sent",
    });
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
