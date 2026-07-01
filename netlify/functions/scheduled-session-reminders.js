// ---------------------------------------------------------------------------
// scheduled-session-reminders — Netlify Scheduled Function.
//
// Runs every 10 minutes. On each tick:
//   1. Fetch every active cohort + its session_overrides (which carry the
//      real per-cohort session dates).
//   2. Bucket sessions into two windows:
//        - session-reminder-24h : starts in ~23.5-24.5h from now
//        - session-reminder-1h  : starts in ~45-75 min from now
//   3. For each bucketed session, enumerate active cohort_participants and
//      fire the reminder — unless the same {template, recipient, cohort,
//      session-order} has already been logged in email_sends within the
//      last 48h (dedup).
//
// The dedup pass is what makes the "every 10 minutes" cadence safe. Even
// though a session sits inside the 24h window for 60 minutes of ticks, we
// only send once per participant.
//
// Configured in netlify.toml:
//   [functions."scheduled-session-reminders"]
//     schedule = "*/10 * * * *"
//
// Netlify Scheduled Functions run in a locked-down context — no HTTP entry
// point, invoked by Netlify's cron. That's why this file exports handler
// with the standard signature but doesn't accept a body.
// ---------------------------------------------------------------------------

import { getAdminClient } from "./_helpers.js";
import { sendMailInternal, hasBeenSentRecently } from "./_mailer.js";

// Reminder rules keyed by template id. All windows are milliseconds from
// "now" until the session's scheduled start time.
const REMINDERS = [
  {
    template: "session-reminder-24h",
    // 23.5h → 24.5h window. A 10-min tick guarantees at least one hit for
    // any session sitting in this window, and dedup handles overlap.
    windowStartMs: 23.5 * 60 * 60 * 1000,
    windowEndMs: 24.5 * 60 * 60 * 1000,
  },
  {
    template: "session-reminder-1h",
    // 45 → 75 min window. Wider than 60min ± 5min so a slightly late tick
    // still catches the session.
    windowStartMs: 45 * 60 * 1000,
    windowEndMs: 75 * 60 * 1000,
  },
];

function firstNameFrom(name, email) {
  const src = (name || "").trim();
  if (src) return src.split(/\s+/)[0];
  const local = (email || "").split("@")[0] || "";
  return local.split(/[._-]+/)[0] || "there";
}

export const handler = async () => {
  const started = Date.now();
  const admin = getAdminClient();

  const summary = {
    startedAt: new Date(started).toISOString(),
    cohortsScanned: 0,
    windowMatches: 0,
    sends: 0,
    skippedDedupe: 0,
    errors: [],
  };

  try {
    // 1. Fetch active cohorts with the fields we need.
    const { data: cohorts, error: cohortErr } = await admin
      .from("cohorts")
      .select("id, slug, name, meeting_zoom_url, session_overrides")
      .is("archived_at", null);
    if (cohortErr) throw cohortErr;
    summary.cohortsScanned = (cohorts || []).length;

    // 2. Bucket every session into whichever reminder window it sits in.
    const now = Date.now();
    const tasks = [];
    for (const cohort of cohorts || []) {
      const sessions = Array.isArray(cohort.session_overrides)
        ? cohort.session_overrides
        : [];
      for (const s of sessions) {
        if (!s?.date) continue;
        const startMs = new Date(s.date).getTime();
        if (Number.isNaN(startMs)) continue;
        const untilStartMs = startMs - now;
        for (const rule of REMINDERS) {
          if (
            untilStartMs >= rule.windowStartMs &&
            untilStartMs <= rule.windowEndMs
          ) {
            tasks.push({ cohort, session: s, rule });
          }
        }
      }
    }
    summary.windowMatches = tasks.length;

    // 3. Fire each reminder against the cohort's participant roster.
    for (const task of tasks) {
      // Roster — join to profiles for email + name.
      const { data: links, error: linkErr } = await admin
        .from("cohort_participants")
        .select("profile_id, profiles(id, email, name)")
        .eq("cohort_id", task.cohort.id)
        .is("removed_at", null);
      if (linkErr) {
        summary.errors.push({
          step: "roster",
          cohort: task.cohort.slug,
          message: linkErr.message,
        });
        continue;
      }

      for (const link of links || []) {
        const p = link?.profiles;
        if (!p?.email) continue;

        // Dedup — has this exact reminder already been logged recently?
        const already = await hasBeenSentRecently({
          admin,
          template: task.rule.template,
          toEmail: p.email,
          cohortId: task.cohort.id,
          sessionOrder: task.session.order,
        });
        if (already) {
          summary.skippedDedupe++;
          continue;
        }

        const zoomLink = task.session.zoomLink || task.cohort.meeting_zoom_url || null;
        try {
          await sendMailInternal({
            template: task.rule.template,
            to: { name: p.name || p.email, email: p.email },
            data: {
              participant: {
                firstName: firstNameFrom(p.name, p.email),
                name: p.name || "",
                email: p.email,
              },
              cohort: {
                name: task.cohort.name,
                slug: task.cohort.slug,
                zoomLink,
              },
              session: {
                order: task.session.order,
                title: task.session.title,
                belt: task.session.belt,
                date: task.session.date,
              },
              zoomLink,
            },
            cohortSlug: task.cohort.slug,
            adminClient: admin,
          });
          summary.sends++;
        } catch (err) {
          summary.errors.push({
            step: "send",
            cohort: task.cohort.slug,
            session: task.session.order,
            recipient: p.email,
            template: task.rule.template,
            message: err?.message || String(err),
          });
        }
      }
    }
  } catch (err) {
    summary.errors.push({ step: "outer", message: err?.message || String(err) });
  }

  summary.finishedAt = new Date().toISOString();
  summary.durationMs = Date.now() - started;

  // eslint-disable-next-line no-console
  console.log("[scheduled-session-reminders]", JSON.stringify(summary));

  return {
    statusCode: 200,
    body: JSON.stringify(summary),
  };
};
