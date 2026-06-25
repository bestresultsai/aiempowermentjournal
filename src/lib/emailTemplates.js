// ---------------------------------------------------------------------------
// Email templates — the 13 transactional emails the platform sends.
//
// Source of truth for the design is docs/email-designs.md. This file turns
// each spec into a JS function that takes a merge-data object and returns:
//
//   { subject, preview, text, html }
//
// `subject` + `preview` are the inbox-visible strings.
// `text` is the plain-text fallback.
// `html` is brand-styled HTML wrapped by renderShell() below.
//
// Every template lives in TEMPLATES with metadata so /admin/emails can list,
// preview, and test each one without hard-coding anything.
// ---------------------------------------------------------------------------

export const BRAND = {
  appUrl: "https://platform.bestresults.ai",
  // Resend has bestresults.ai verified at root. DKIM signs with the root key,
  // bounces route through send.bestresults.ai (Resend's standard pattern).
  // From + Reply-To both land in the Google Workspace inbox.
  sender: "BestResults.AI <hello@bestresults.ai>",
  replyTo: "hello@bestresults.ai",
  // Horizontal color logo (no tagline). SVG renders fine in all modern web
  // mail clients (Gmail, Apple Mail, Outlook web, mobile). For Outlook
  // *desktop*, host a PNG mirror alongside the SVG before production
  // sending and swap this URL — Outlook desktop ignores SVG.
  logoUrl: "https://platform.bestresults.ai/brand/horizontal-color-no-tagline.svg",
};

// ---------------------------------------------------------------------------
// Shell — every email body is wrapped in this branded HTML chrome.
// ---------------------------------------------------------------------------
export function renderShell({ title, bodyHtml, footerNote }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#F7F4EF;font-family:Inter,system-ui,sans-serif;color:#1B1F23;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7F4EF;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid #E5E1DA;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid #E5E1DA;">
                <a href="${BRAND.appUrl}" style="text-decoration:none;display:inline-block;">
                  <img
                    src="${BRAND.logoUrl}"
                    alt="BestResults.AI"
                    width="200"
                    style="display:block;height:auto;border:0;outline:none;max-width:200px;"
                  />
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;line-height:1.6;font-size:15px;color:#1B1F23;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;background:#F7F4EF;border-top:1px solid #E5E1DA;font-size:12px;color:#6B7280;line-height:1.5;">
                ${footerNote || "You're receiving this because you're part of an active BestResults.AI cohort."}
                <br/>
                Questions? Reply to this email or write to <a href="mailto:${BRAND.replyTo}" style="color:#2563EB;">${BRAND.replyTo}</a>.
                <br/>
                <a href="${BRAND.appUrl}/settings" style="color:#6B7280;text-decoration:underline;">Manage email preferences</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// Button + paragraph helpers — keep the templates readable.
function button(label, href) {
  return `<a href="${href}" style="display:inline-block;background:#1B1F23;color:#FFFFFF;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;font-size:14px;">${escapeHtml(label)}</a>`;
}
function p(html) { return `<p style="margin:0 0 14px;">${html}</p>`; }
function ol(items) {
  return `<ol style="margin:0 0 14px;padding-left:22px;">${items.map((i) => `<li style="margin-bottom:6px;">${i}</li>`).join("")}</ol>`;
}
function strong(html) { return `<strong style="color:#1B1F23;">${html}</strong>`; }

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function firstName(name) {
  return String(name || "there").trim().split(/\s+/)[0];
}

function fmtDate(iso) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}
function fmtTime(iso) {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ---------------------------------------------------------------------------
// PARTICIPANT TEMPLATES
// ---------------------------------------------------------------------------

function welcomeToCohort({ participant, cohort, facilitator, firstSession }) {
  const name = firstName(participant?.name);
  const subject = `Welcome to ${cohort?.name || "your cohort"} — let's get you set up`;
  const preview = "Your AI Empowerment journey starts here.";
  const text = `Hi ${name},

You've been added to ${cohort?.name}, facilitated by ${facilitator?.name}.

To get started:
  1. Complete your profile (takes ~3 minutes)
  2. Meet your facilitator
  3. Prep for ${firstSession?.belt || ""} Belt on ${fmtDate(firstSession?.date)}

Set up your profile: ${BRAND.appUrl}/welcome

Your cohort meets ${cohort?.meetingDay || "[day]"} at ${cohort?.meetingTime || "[time]"}, starting ${fmtDate(cohort?.startDate)}. The first session is ${firstSession?.belt || ""} Belt — ${firstSession?.title || ""}.

—BRAI Team`;
  const html = renderShell({
    title: subject,
    bodyHtml: `
      ${p(`Hi ${escapeHtml(name)},`)}
      ${p(`You've been added to ${strong(escapeHtml(cohort?.name || ""))}, facilitated by ${escapeHtml(facilitator?.name || "")}.`)}
      ${p("To get started:")}
      ${ol([
        "Complete your profile (takes ~3 minutes)",
        "Meet your facilitator",
        `Prep for ${escapeHtml(firstSession?.belt || "")} Belt on ${escapeHtml(fmtDate(firstSession?.date))}`,
      ])}
      <p style="margin:20px 0;">${button("Set up your profile", `${BRAND.appUrl}/welcome`)}</p>
      ${p(`Your cohort meets ${escapeHtml(cohort?.meetingDay || "[day]")} at ${escapeHtml(cohort?.meetingTime || "[time]")}, starting ${escapeHtml(fmtDate(cohort?.startDate))}.`)}
    `,
  });
  return { subject, preview, text, html };
}

function onboardingConfirmed({ participant, cohort, facilitator, firstSession }) {
  const name = firstName(participant?.name);
  const subject = `You're set, ${name} — ${cohort?.name} kicks off ${fmtDate(firstSession?.date)}`;
  const preview = "Profile complete. Here's what comes next.";
  const text = `Hi ${name},

Profile complete — thank you. Your facilitator (${facilitator?.name}) now has the context they need.

Up next: ${firstSession?.belt} Belt — ${firstSession?.title}
${fmtDate(firstSession?.date)} at ${fmtTime(firstSession?.date)}

Open your cohort home: ${BRAND.appUrl}/home

—BRAI Team`;
  const html = renderShell({
    title: subject,
    bodyHtml: `
      ${p(`Hi ${escapeHtml(name)},`)}
      ${p(`Profile complete — thank you. Your facilitator (${strong(escapeHtml(facilitator?.name || ""))}) now has the context they need to tailor the cohort to you.`)}
      ${p(`Up next: ${strong(escapeHtml(firstSession?.belt || "") + " Belt — " + escapeHtml(firstSession?.title || ""))}`)}
      ${p(`${escapeHtml(fmtDate(firstSession?.date))} at ${escapeHtml(fmtTime(firstSession?.date))}.`)}
      <p style="margin:20px 0;">${button("Open your cohort home", `${BRAND.appUrl}/home`)}</p>
    `,
  });
  return { subject, preview, text, html };
}

function sessionReminder24h({ participant, cohort, session, zoomLink }) {
  const name = firstName(participant?.name);
  const subject = `Tomorrow: ${session?.belt} Belt — ${session?.title}`;
  const preview = `${cohort?.name} meets ${fmtDate(session?.date)}.`;
  const text = `Hi ${name},

${session?.belt} Belt — ${session?.title}
${fmtDate(session?.date)} at ${fmtTime(session?.date)}

Zoom: ${zoomLink || cohort?.zoomLink || "[link in cohort home]"}

Open your cohort: ${BRAND.appUrl}/home

—BRAI Team`;
  const html = renderShell({
    title: subject,
    bodyHtml: `
      ${p(`Hi ${escapeHtml(name)},`)}
      ${p(`Tomorrow at ${escapeHtml(fmtTime(session?.date))}: ${strong(escapeHtml(session?.belt || "") + " Belt — " + escapeHtml(session?.title || ""))}`)}
      ${p("A few minutes of prep makes the session pay off. The Materials tab on your session page has anything your facilitator wants you to skim ahead of time.")}
      <p style="margin:20px 0;">
        ${button("Join Zoom", zoomLink || cohort?.zoomLink || `${BRAND.appUrl}/home`)}
      </p>
    `,
    footerNote: `You receive session reminders because you're enrolled in ${escapeHtml(cohort?.name || "this cohort")}.`,
  });
  return { subject, preview, text, html };
}

function sessionReminder1h({ participant, cohort, session, zoomLink }) {
  const name = firstName(participant?.name);
  const subject = `Starting in 1 hour: ${session?.belt} Belt`;
  const preview = `${session?.title}`;
  const text = `Hi ${name},

Session in 1 hour. Zoom: ${zoomLink || cohort?.zoomLink || ""}

—BRAI Team`;
  const html = renderShell({
    title: subject,
    bodyHtml: `
      ${p(`Hi ${escapeHtml(name)} — your session starts in about an hour.`)}
      <p style="margin:20px 0;">
        ${button("Join Zoom now", zoomLink || cohort?.zoomLink || `${BRAND.appUrl}/home`)}
      </p>
      ${p("See you there.")}
    `,
  });
  return { subject, preview, text, html };
}

function homeworkReviewed({ participant, session, facilitator, feedback }) {
  const name = firstName(participant?.name);
  const subject = `${facilitator?.name?.split(" ")[0] || "Your facilitator"} reviewed your homework`;
  const preview = `${session?.belt} Belt — feedback inside.`;
  const text = `Hi ${name},

${facilitator?.name} reviewed your homework for ${session?.belt} Belt:

${feedback || "—"}

Open: ${BRAND.appUrl}/session/${session?.order}?tab=homework

—BRAI Team`;
  const html = renderShell({
    title: subject,
    bodyHtml: `
      ${p(`Hi ${escapeHtml(name)},`)}
      ${p(`${strong(escapeHtml(facilitator?.name || "Your facilitator"))} reviewed your homework for ${strong(escapeHtml(session?.belt || "") + " Belt")}:`)}
      <blockquote style="margin:0 0 14px;padding:12px 14px;background:#F7F4EF;border-left:3px solid #F59E0B;border-radius:6px;color:#1B1F23;font-style:italic;">
        ${escapeHtml(feedback || "—")}
      </blockquote>
      <p style="margin:20px 0;">
        ${button("Read the feedback", `${BRAND.appUrl}/session/${session?.order || ""}?tab=homework`)}
      </p>
    `,
  });
  return { subject, preview, text, html };
}

function beltEarned({ participant, session }) {
  const name = firstName(participant?.name);
  const subject = `${session?.belt} Belt earned — nice work.`;
  const preview = `${session?.title}`;
  const text = `Hi ${name},

You earned your ${session?.belt} Belt. ${session?.title} is officially behind you.

Next up — visit your cohort home for what's coming: ${BRAND.appUrl}/home

—BRAI Team`;
  const html = renderShell({
    title: subject,
    bodyHtml: `
      ${p(`${escapeHtml(name)} — you earned your ${strong(escapeHtml(session?.belt || "") + " Belt")}.`)}
      ${p(`${escapeHtml(session?.title || "")} is officially behind you. Onward.`)}
      <p style="margin:20px 0;">${button("See what's next", `${BRAND.appUrl}/home`)}</p>
    `,
  });
  return { subject, preview, text, html };
}

function programComplete({ participant, cohort }) {
  const name = firstName(participant?.name);
  const subject = `Certificate inside — ${cohort?.name} complete`;
  const preview = "You did it. Download your certificate.";
  const text = `Hi ${name},

You completed ${cohort?.name}. Your certificate is waiting on your cohort home.

Download: ${BRAND.appUrl}/home

We'd love your testimonial — it appears on the home page once you sign in.

—BRAI Team`;
  const html = renderShell({
    title: subject,
    bodyHtml: `
      ${p(`Hi ${escapeHtml(name)} — congratulations.`)}
      ${p(`You completed ${strong(escapeHtml(cohort?.name || ""))}. Your certificate is ready to download.`)}
      <p style="margin:20px 0;">${button("Download your certificate", `${BRAND.appUrl}/home`)}</p>
      ${p("One last ask — your testimonial helps the next cohort understand what's possible. It's on your home page.")}
    `,
  });
  return { subject, preview, text, html };
}

function weeklyDigest({ participant, cohort, streak, hoursSaved, nextSession }) {
  const name = firstName(participant?.name);
  const subject = `${cohort?.name} — your week in review`;
  const preview = `Streak ${streak} · ${hoursSaved} hours saved`;
  const text = `Hi ${name},

Week recap:
  • Streak: ${streak} weeks
  • Hours saved: ${hoursSaved}
  • Next session: ${nextSession?.belt} Belt on ${fmtDate(nextSession?.date)}

Open your home: ${BRAND.appUrl}/home

—BRAI Team`;
  const html = renderShell({
    title: subject,
    bodyHtml: `
      ${p(`Hi ${escapeHtml(name)} — here's your week in ${strong(escapeHtml(cohort?.name || ""))}.`)}
      ${p(`${strong("Streak")} · ${escapeHtml(String(streak))} week${streak === 1 ? "" : "s"}`)}
      ${p(`${strong("Hours saved")} · ${escapeHtml(String(hoursSaved))}`)}
      ${p(`${strong("Next session")} · ${escapeHtml(nextSession?.belt || "")} Belt on ${escapeHtml(fmtDate(nextSession?.date))}`)}
      <p style="margin:20px 0;">${button("Open your home", `${BRAND.appUrl}/home`)}</p>
    `,
  });
  return { subject, preview, text, html };
}

// ---------------------------------------------------------------------------
// FACILITATOR TEMPLATES
// ---------------------------------------------------------------------------

function newHomeworkSubmitted({ facilitator, participant, session, cohort, count }) {
  const fname = firstName(facilitator?.name);
  const subject = count > 1
    ? `${count} new homework submissions — ${cohort?.name}`
    : `New homework from ${participant?.name}`;
  const preview = "Your review queue grew.";
  const text = `Hi ${fname},

${count > 1
  ? `${count} new homework submissions arrived for ${cohort?.name}.`
  : `${participant?.name} submitted homework for ${session?.belt} Belt.`}

Open the queue: ${BRAND.appUrl}/admin/homework

—BRAI Team`;
  const html = renderShell({
    title: subject,
    bodyHtml: `
      ${p(`Hi ${escapeHtml(fname)},`)}
      ${p(count > 1
        ? `${strong(String(count))} new homework submissions arrived for ${strong(escapeHtml(cohort?.name || ""))}.`
        : `${strong(escapeHtml(participant?.name || ""))} submitted homework for ${strong(escapeHtml(session?.belt || "") + " Belt")}.`,
      )}
      <p style="margin:20px 0;">${button("Open the queue", `${BRAND.appUrl}/admin/homework`)}</p>
    `,
  });
  return { subject, preview, text, html };
}

function atRiskAlert({ facilitator, participants, cohort }) {
  const fname = firstName(facilitator?.name);
  const count = participants?.length || 0;
  const subject = `${count} at-risk participant${count === 1 ? "" : "s"} — ${cohort?.name}`;
  const preview = "Flagged for a check-in.";
  const text = `Hi ${fname},

${count} participant${count === 1 ? " is" : "s are"} at risk in ${cohort?.name}:

${(participants || []).map((p) => `  • ${p.name} — ${p.reason || "no recent activity"}`).join("\n")}

Open the dashboard: ${BRAND.appUrl}/facilitator/home

—BRAI Team`;
  const html = renderShell({
    title: subject,
    bodyHtml: `
      ${p(`Hi ${escapeHtml(fname)},`)}
      ${p(`${strong(String(count))} participant${count === 1 ? " is" : "s are"} at risk in ${strong(escapeHtml(cohort?.name || ""))}:`)}
      <ul style="margin:0 0 14px;padding-left:22px;">
        ${(participants || []).map((p) => `<li style="margin-bottom:6px;">${strong(escapeHtml(p.name))} — ${escapeHtml(p.reason || "no recent activity")}</li>`).join("")}
      </ul>
      <p style="margin:20px 0;">${button("Open the dashboard", `${BRAND.appUrl}/facilitator/home`)}</p>
    `,
  });
  return { subject, preview, text, html };
}

function cohortAssigned({ facilitator, cohort, participants, firstSession }) {
  const fname = firstName(facilitator?.name);
  const subject = `New cohort: ${cohort?.name}`;
  const preview = "You're facilitating. Here's the brief.";
  const text = `Hi ${fname},

You've been assigned to facilitate ${cohort?.name}.

  • Organization: ${cohort?.organization?.name || "—"}
  • Participants: ${participants?.length || 0}
  • Kickoff: ${firstSession?.belt} Belt on ${fmtDate(firstSession?.date)}

Open the cohort: ${BRAND.appUrl}/admin/cohorts/${cohort?.slug || ""}

—BRAI Team`;
  const html = renderShell({
    title: subject,
    bodyHtml: `
      ${p(`Hi ${escapeHtml(fname)} — you've been assigned to facilitate ${strong(escapeHtml(cohort?.name || ""))}.`)}
      ${p(`${strong("Organization")} · ${escapeHtml(cohort?.organization?.name || "—")}`)}
      ${p(`${strong("Participants")} · ${escapeHtml(String(participants?.length || 0))}`)}
      ${p(`${strong("Kickoff")} · ${escapeHtml(firstSession?.belt || "")} Belt on ${escapeHtml(fmtDate(firstSession?.date))}`)}
      <p style="margin:20px 0;">${button("Open the cohort", `${BRAND.appUrl}/admin/cohorts/${cohort?.slug || ""}`)}</p>
    `,
  });
  return { subject, preview, text, html };
}

function leaderInvitation({ participant, cohort, organization }) {
  const name = firstName(participant?.name);
  const subject = `You've been named cohort leader for ${cohort?.name}`;
  const preview = "Read-only roster + ROI signal.";
  const text = `Hi ${name},

${organization?.name || "Your organization"} has named you the cohort leader for ${cohort?.name}. You'll see the roster and program ROI for your team.

Open the dashboard: ${BRAND.appUrl}/leader/cohort

—BRAI Team`;
  const html = renderShell({
    title: subject,
    bodyHtml: `
      ${p(`Hi ${escapeHtml(name)},`)}
      ${p(`${strong(escapeHtml(organization?.name || "Your organization"))} has named you the cohort leader for ${strong(escapeHtml(cohort?.name || ""))}.`)}
      ${p("You get a read-only roster view + the program's ROI signals across your team. Everyone keeps the privacy of their journal entries — you see aggregates, not raw drafts.")}
      <p style="margin:20px 0;">${button("Open the dashboard", `${BRAND.appUrl}/leader/cohort`)}</p>
    `,
  });
  return { subject, preview, text, html };
}

function orgWeeklyReport({ admin, organization, kpis, cohorts }) {
  const name = firstName(admin?.name);
  const subject = `${organization?.shortName || organization?.name} — weekly cohort report`;
  const preview = `${kpis?.totalHoursSaved || 0} hours saved across ${cohorts?.length || 0} cohort${cohorts?.length === 1 ? "" : "s"}.`;
  const text = `Hi ${name},

This week across ${cohorts?.length || 0} cohort(s):
  • Hours saved: ${kpis?.totalHoursSaved || 0}
  • Active journalers: ${kpis?.activeJournalers || 0}
  • At-risk participants: ${kpis?.atRiskCount || 0}

Open the dashboard: ${BRAND.appUrl}/org/home

—BRAI Team`;
  const html = renderShell({
    title: subject,
    bodyHtml: `
      ${p(`Hi ${escapeHtml(name)} — this week across ${strong(String(cohorts?.length || 0))} cohort${cohorts?.length === 1 ? "" : "s"}:`)}
      ${p(`${strong("Hours saved")} · ${escapeHtml(String(kpis?.totalHoursSaved || 0))}`)}
      ${p(`${strong("Active journalers")} · ${escapeHtml(String(kpis?.activeJournalers || 0))}`)}
      ${p(`${strong("At-risk participants")} · ${escapeHtml(String(kpis?.atRiskCount || 0))}`)}
      <p style="margin:20px 0;">${button("Open the dashboard", `${BRAND.appUrl}/org/home`)}</p>
    `,
  });
  return { subject, preview, text, html };
}

// ---------------------------------------------------------------------------
// Registry — every template the platform sends. Each entry exposes a
// `sampleData` payload so the admin preview surface can render without real
// participant data.
// ---------------------------------------------------------------------------

const SAMPLE_PARTICIPANT = { name: "Brett Wilson", email: "brett.wilson@summithealth.com", title: "Director of Clinical Operations" };
const SAMPLE_FACILITATOR = { name: "Mike Burkesmith", email: "mike@bestresults.ai" };
const SAMPLE_COHORT = {
  slug: "summit-aiew3-2026q3",
  name: "Summit Health — AIEW3 Q3",
  meetingDay: "Wednesdays",
  meetingTime: "9:00 AM PT",
  startDate: new Date(Date.now() + 14 * 86400000).toISOString(),
  zoomLink: "https://zoom.us/j/sample",
  organization: { name: "Summit Health", shortName: "Summit" },
};
const SAMPLE_SESSION = {
  order: 1,
  belt: "White",
  title: "Full Role Matrices, Prioritized Use Cases, Change Management",
  date: new Date(Date.now() + 86400000).toISOString(),
};

export const TEMPLATES = [
  {
    id: "welcome-to-cohort",
    audience: "participant",
    label: "Welcome to cohort",
    description: "Sent when an admin adds a participant to a cohort.",
    render: welcomeToCohort,
    sampleData: { participant: SAMPLE_PARTICIPANT, cohort: SAMPLE_COHORT, facilitator: SAMPLE_FACILITATOR, firstSession: SAMPLE_SESSION },
  },
  {
    id: "onboarding-confirmed",
    audience: "participant",
    label: "Onboarding confirmed",
    description: "Sent when a participant finishes /welcome.",
    render: onboardingConfirmed,
    sampleData: { participant: SAMPLE_PARTICIPANT, cohort: SAMPLE_COHORT, facilitator: SAMPLE_FACILITATOR, firstSession: SAMPLE_SESSION },
  },
  {
    id: "session-reminder-24h",
    audience: "participant",
    label: "Session reminder · 24h",
    description: "24 hours before a scheduled session.",
    render: sessionReminder24h,
    sampleData: { participant: SAMPLE_PARTICIPANT, cohort: SAMPLE_COHORT, session: SAMPLE_SESSION, zoomLink: SAMPLE_COHORT.zoomLink },
  },
  {
    id: "session-reminder-1h",
    audience: "participant",
    label: "Session reminder · 1h",
    description: "60 minutes before a scheduled session.",
    render: sessionReminder1h,
    sampleData: { participant: SAMPLE_PARTICIPANT, cohort: SAMPLE_COHORT, session: SAMPLE_SESSION, zoomLink: SAMPLE_COHORT.zoomLink },
  },
  {
    id: "homework-reviewed",
    audience: "participant",
    label: "Homework reviewed",
    description: "Sent when a facilitator publishes feedback.",
    render: homeworkReviewed,
    sampleData: { participant: SAMPLE_PARTICIPANT, session: SAMPLE_SESSION, facilitator: SAMPLE_FACILITATOR, feedback: "Strong matrix. Curious how you'd rank by ROI." },
  },
  {
    id: "belt-earned",
    audience: "participant",
    label: "Belt earned",
    description: "Sent when participant completes a session.",
    render: beltEarned,
    sampleData: { participant: SAMPLE_PARTICIPANT, session: SAMPLE_SESSION },
  },
  {
    id: "program-complete",
    audience: "participant",
    label: "Program complete · certificate",
    description: "Sent when participant earns the program certificate.",
    render: programComplete,
    sampleData: { participant: SAMPLE_PARTICIPANT, cohort: SAMPLE_COHORT },
  },
  {
    id: "weekly-digest",
    audience: "participant",
    label: "Weekly digest",
    description: "Sundays. Streak + hours saved + next session.",
    render: weeklyDigest,
    sampleData: { participant: SAMPLE_PARTICIPANT, cohort: SAMPLE_COHORT, streak: 3, hoursSaved: 18, nextSession: { ...SAMPLE_SESSION, belt: "Yellow" } },
  },
  {
    id: "new-homework-submitted",
    audience: "facilitator",
    label: "New homework submitted",
    description: "Sent to facilitator when participant submits homework.",
    render: newHomeworkSubmitted,
    sampleData: { facilitator: SAMPLE_FACILITATOR, participant: SAMPLE_PARTICIPANT, session: SAMPLE_SESSION, cohort: SAMPLE_COHORT, count: 1 },
  },
  {
    id: "at-risk-alert",
    audience: "facilitator",
    label: "At-risk participant alert",
    description: "Sent when participants haven't logged or shipped for 14+ days.",
    render: atRiskAlert,
    sampleData: { facilitator: SAMPLE_FACILITATOR, cohort: SAMPLE_COHORT, participants: [
      { name: "Tyler Brooks", reason: "20 days since last journal entry" },
      { name: "Aisha Williams", reason: "no homework on last two sessions" },
    ] },
  },
  {
    id: "cohort-assigned",
    audience: "facilitator",
    label: "Cohort assigned",
    description: "Sent when a facilitator is named to a new cohort.",
    render: cohortAssigned,
    sampleData: { facilitator: SAMPLE_FACILITATOR, cohort: SAMPLE_COHORT, participants: new Array(6), firstSession: SAMPLE_SESSION },
  },
  {
    id: "leader-invitation",
    audience: "leader",
    label: "Cohort leader invitation",
    description: "Sent when an org admin names a participant as cohort leader.",
    render: leaderInvitation,
    sampleData: { participant: SAMPLE_PARTICIPANT, cohort: SAMPLE_COHORT, organization: SAMPLE_COHORT.organization },
  },
  {
    id: "org-weekly-report",
    audience: "org-admin",
    label: "Org weekly report",
    description: "Sundays. Sent to each org admin.",
    render: orgWeeklyReport,
    sampleData: { admin: { name: "Jordan Park" }, organization: SAMPLE_COHORT.organization, kpis: { totalHoursSaved: 142, activeJournalers: 11, atRiskCount: 2 }, cohorts: [SAMPLE_COHORT] },
  },
];

export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) || null;
}

export function renderTemplate(id, data) {
  const tpl = getTemplate(id);
  if (!tpl) throw new Error(`Unknown email template: ${id}`);
  return tpl.render(data || tpl.sampleData || {});
}
