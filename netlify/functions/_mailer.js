// ---------------------------------------------------------------------------
// _mailer.js — shared render + Resend + audit helper for Netlify Functions.
//
// Used by:
//   - send-email.js               (user + admin triggered transactional)
//   - scheduled-session-reminders (cron)
//   - future scheduled digests
//
// Renders through src/lib/emailTemplates.js so every path uses the same
// content, posts directly to Resend (no SDK — see the comment in
// send-email.js for why), and writes an audit row to public.email_sends
// so /admin/emails shows the send history and repeat sends can be deduped.
// ---------------------------------------------------------------------------

import { renderTemplate, BRAND } from "../../src/lib/emailTemplates.js";
import { getAdminClient } from "./_helpers.js";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || BRAND.sender;

// POST to https://api.resend.com/emails. Same shape send-email.js was using
// inline; extracted here so scheduled functions share the same behavior.
async function resendSend({ from, to, reply_to, subject, html, text }) {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured.");
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
    return {
      data: null,
      error: {
        message: body?.message || `Resend HTTP ${res.status}`,
        name: body?.name,
        statusCode: res.status,
      },
    };
  }
  return { data: body, error: null };
}

// Render + log + send. Returns { logRow, providerMessageId, status } on
// success or throws on failure. Callers can wrap in a try/catch to control
// whether a Resend failure bubbles up (send-email) or is swallowed and
// logged (scheduled jobs).
export async function sendMailInternal({
  template,
  to,
  data,
  cohortSlug = null,
  replyTo = null,
  adminClient: providedAdmin = null,
}) {
  if (!template) throw new Error("sendMailInternal: template required.");
  const recipient = typeof to === "string" ? { email: to } : to || {};
  if (!recipient.email) throw new Error("sendMailInternal: to.email required.");

  const rendered = renderTemplate(template, data || {});
  const admin = providedAdmin || getAdminClient();

  // Log the attempt BEFORE posting to Resend so we always have a trail,
  // even if the network call blows up mid-flight.
  let logRow = null;
  try {
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", recipient.email)
      .maybeSingle();
    let cohortId = null;
    if (cohortSlug) {
      const { data: cohort } = await admin
        .from("cohorts")
        .select("id")
        .eq("slug", cohortSlug)
        .maybeSingle();
      cohortId = cohort?.id || null;
    }
    const { data: inserted, error: logErr } = await admin
      .from("email_sends")
      .insert({
        template,
        to_email: recipient.email,
        to_profile_id: profile?.id || null,
        cohort_id: cohortId,
        subject: rendered.subject,
        provider: "resend",
        status: "queued",
        payload: data || {},
      })
      .select()
      .maybeSingle();
    if (!logErr) logRow = inserted;
  } catch {
    // Non-fatal — proceed with the send even if logging failed.
  }

  const sent = await resendSend({
    from: RESEND_FROM_EMAIL,
    to: recipient.email,
    reply_to: replyTo || BRAND.replyTo,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });

  if (sent?.error) {
    if (logRow) {
      await admin
        .from("email_sends")
        .update({
          status: "failed",
          error_message: sent.error.message || String(sent.error),
        })
        .eq("id", logRow.id);
    }
    const err = new Error(`Resend rejected the message: ${sent.error.message}`);
    err.cause = sent.error;
    throw err;
  }

  if (logRow) {
    await admin
      .from("email_sends")
      .update({
        status: "sent",
        provider_message_id: sent?.data?.id || null,
        sent_at: new Date().toISOString(),
      })
      .eq("id", logRow.id);
  }

  return {
    logRow,
    providerMessageId: sent?.data?.id || null,
    status: "sent",
  };
}

// Has this exact (template, recipient, cohort, session-order) already been
// sent within the given lookback window? Used by the scheduled job to
// dedupe so a re-run every 10 minutes doesn't spam participants.
export async function hasBeenSentRecently({
  admin,
  template,
  toEmail,
  cohortId,
  sessionOrder,
  lookbackMs = 48 * 60 * 60 * 1000,
}) {
  if (!template || !toEmail || !cohortId) return false;
  const sinceIso = new Date(Date.now() - lookbackMs).toISOString();
  // We match session order out of payload.session.order — that's how the
  // scheduled reminders shape their data, so the check stays specific to
  // the exact session the reminder is about.
  const { data } = await admin
    .from("email_sends")
    .select("id")
    .eq("template", template)
    .eq("to_email", toEmail)
    .eq("cohort_id", cohortId)
    .contains("payload", { session: { order: Number(sessionOrder) } })
    .gte("created_at", sinceIso)
    .limit(1)
    .maybeSingle();
  return !!data;
}
