# BRAI Platform — Email Designs

Catalogue of every transactional email the platform sends. Each entry specifies:

- **Trigger** — what causes the email to fire
- **Recipient** — who receives it
- **Subject + preview text** — what they see in their inbox
- **Body** — markdown copy with `{{merge_tokens}}` for personalization
- **Send timing** — immediate, scheduled, or batched
- **Status** — Draft / Approved / Implemented

All emails follow the BRAI brand: warm + professional. Sender: `BestResults.AI <hello@bestresults.ai>`. Reply-to: `support@bestresults.ai`. Footer includes one-click unsubscribe (where legally appropriate — transactional emails are exempt but we'll include preference links).

---

## Inventory

| # | Trigger | Recipient | Template ID | Status |
|---|---|---|---|---|
| 1 | Participant added by admin | Participant | `welcome-to-cohort` | Draft |
| 2 | Onboarding completed | Participant | `onboarding-confirmed` | Draft |
| 3 | Session reminder (24h before) | Participant | `session-reminder-24h` | Draft |
| 4 | Session reminder (1h before) | Participant | `session-reminder-1h` | Draft |
| 5 | Homework reviewed | Participant | `homework-reviewed` | Draft |
| 6 | Belt earned | Participant | `belt-earned` | Draft |
| 7 | Program completed (certificate) | Participant | `program-complete` | Draft |
| 8 | Weekly digest (Sundays) | Participant | `weekly-digest` | Draft |
| 9 | New homework submission | Facilitator | `new-homework-submitted` | Draft |
| 10 | At-risk participant alert | Facilitator | `at-risk-alert` | Draft |
| 11 | New cohort assigned | Facilitator | `cohort-assigned` | Draft |
| 12 | Cohort leader invitation | Cohort leader | `leader-invitation` | Draft |
| 13 | Weekly cohort report | Org admin | `org-weekly-report` | Draft |

---

## 1. `welcome-to-cohort` — "You're in the cohort"

**Trigger:** Admin adds a participant to a cohort (or creates standalone).
**Send timing:** Immediate.
**Goal:** Get them to onboard (`/welcome`).

- **Subject:** `Welcome to {{cohort.name}} — let's get you set up`
- **Preview:** `Your AI Empowerment journey starts here.`

### Body

```
Hi {{participant.firstName}},

You've been added to {{cohort.name}}, facilitated by {{facilitator.name}}.

To get started:

  1. Complete your profile (takes ~3 minutes)
  2. Meet your facilitator
  3. Prep for {{firstSession.belt}} Belt on {{firstSession.date}}

  [Set up your profile →] (/welcome)

Your cohort meets {{cohort.meetingDay}} at {{cohort.meetingTime}}, starting {{cohort.startDate}}. The first session is {{firstSession.belt}} Belt — {{firstSession.title}}.

If you have questions before then, reply to this email or write to {{facilitator.email}}.

Looking forward to having you,
{{senderName}}
{{senderRole}}, BestResults.AI
```

**Merge tokens:** `participant.firstName`, `cohort.name`, `cohort.meetingDay`, `cohort.meetingTime`, `cohort.startDate`, `firstSession.belt`, `firstSession.title`, `firstSession.date`, `facilitator.name`, `facilitator.email`, `senderName`, `senderRole`.

---

## 2. `onboarding-confirmed` — "Welcome aboard"

**Trigger:** Participant submits the welcome wizard.
**Send timing:** Immediate.
**Goal:** Confirm + set expectations for the first session.

- **Subject:** `You're all set, {{participant.firstName}}`
- **Preview:** `What to expect before your first session.`

### Body

```
Hi {{participant.firstName}},

Your profile is in. Here's what happens next.

Your first session
{{firstSession.belt}} Belt — {{firstSession.title}}
{{firstSession.date}} · {{firstSession.time}} · {{cohort.timeZone}}

  [Add to calendar →] ({{addToCalendarUrl}})
  [View your Journey →] (/journey)

Before then
The Journey page has the program overview, your facilitator's contact info, and prep materials for each belt.

Your AI Empowerment Journal opens up after your first session — that's where you'll log every workflow you ship and watch your impact compound.

See you on {{firstSession.dayOfWeek}},
{{facilitator.firstName}}
```

---

## 3. `session-reminder-24h` — "Tomorrow at this time"

**Trigger:** Cron job 24 hours before a scheduled session.
**Send timing:** 24h before session start.
**Goal:** Calendar reminder + homework nudge.

- **Subject:** `Tomorrow: {{session.belt}} Belt at {{session.time}}`
- **Preview:** `{{session.title}}`

### Body

```
Hi {{participant.firstName}},

{{session.belt}} Belt is tomorrow.

When: {{session.date}} at {{session.time}} ({{cohort.timeZone}})
Topic: {{session.title}}
Duration: {{session.durationMinutes}} minutes

  [Join Zoom →] ({{session.zoomLink}})
  [View prep materials →] (/session/{{session.order}})

{{#if previousHomeworkPending}}
Heads up — your homework from {{previousSession.belt}} Belt is still pending. {{facilitator.firstName}} can give you feedback on it during or after the session.

  [Submit homework →] (/session/{{previousSession.order}})
{{/if}}

See you there,
{{facilitator.firstName}}
```

---

## 4. `session-reminder-1h` — "In one hour"

**Trigger:** Cron job 1 hour before scheduled session.
**Send timing:** 1h before session start.
**Goal:** Last-mile reminder with Zoom link front and center.

- **Subject:** `Starting in 1 hour: {{session.belt}} Belt`
- **Preview:** `Zoom link inside.`

### Body

```
{{participant.firstName}} —

{{session.belt}} Belt starts in 1 hour.

  [Join the session →] ({{session.zoomLink}})

{{session.title}}
{{session.time}} · {{cohort.timeZone}}

See you in a few,
{{facilitator.firstName}}
```

---

## 5. `homework-reviewed` — "Mike reviewed your submission"

**Trigger:** Facilitator submits feedback on a homework row in `/admin/homework`.
**Send timing:** Immediate (or batched if facilitator reviews 5+ in 60 seconds → digest).
**Goal:** Drive them back to read the feedback.

- **Subject:** `{{facilitator.firstName}} gave you feedback on {{session.belt}} Belt`
- **Preview:** `"{{feedback.preview}}"` (first 60 chars of feedback)

### Body

```
Hi {{participant.firstName}},

{{facilitator.firstName}} just left feedback on your {{session.belt}} Belt homework.

  [Read it →] (/session/{{session.order}})

> {{feedback.body}}

Keep shipping,
{{facilitator.firstName}}
```

---

## 6. `belt-earned` — "You earned your {{belt}} Belt"

**Trigger:** Participant completes the criteria for a belt (TBD in gamification round — currently "session marked complete + homework submitted").
**Send timing:** Immediate.
**Goal:** Celebrate + share.

- **Subject:** `🥋 You earned your {{belt}} Belt`
- **Preview:** `One more step on the maturity ladder.`

### Body

```
{{participant.firstName}} —

You just earned your **{{belt}} Belt**.

[Belt graphic — {{belt}} gradient — embedded as an image]

That's {{progress.completed}} of {{program.sessionsCount}} belts complete in {{cohort.name}}.

  [View your Journey →] (/journey)
  [Log a Journal entry →] (/journal/new)

Pro move: log a Journal entry today about something you shipped using what you learned in {{belt}}. That's where the leverage compounds.

Onward,
{{facilitator.firstName}}
```

---

## 7. `program-complete` — "Certificate ready"

**Trigger:** Participant completes the final session of their program.
**Send timing:** Within 1 hour of session completion (allows admin to mark complete first).
**Goal:** Deliver the cert + ask for testimonial.

- **Subject:** `🏆 You completed {{program.name}}`
- **Preview:** `Your certificate is ready to download.`

### Body

```
{{participant.firstName}} —

You did it.

You completed {{program.name}} — all {{program.sessionsCount}} belts, {{totalHoursSaved}} hours saved across {{totalEntries}} Journal entries.

  [Download your certificate →] ({{certificateUrl}})
  [Share on LinkedIn →] ({{linkedinShareUrl}})

The biggest move now is to keep your Journal alive. Cohort or no cohort, the participants who keep logging stay sharpest.

  [Open your Journal →] (/journal)

We'd love a quick testimonial if {{program.name}} was useful. Two sentences is plenty — just reply to this email.

Congratulations,
{{facilitator.name}} + the BestResults.AI team
```

---

## 8. `weekly-digest` — "This week in your cohort"

**Trigger:** Cron Sunday 9am cohort timezone.
**Send timing:** Weekly.
**Goal:** Keep participants engaged between sessions; surface peer wins.

- **Subject:** `Week {{weekNumber}} digest — {{cohort.name}}`
- **Preview:** `{{topWin.title}} · {{weeklyHoursSaved}}h saved this week`

### Body

```
Hi {{participant.firstName}},

Week {{weekNumber}} of {{cohort.name}}.

Your week
  - Sessions completed: {{participant.weeklySessions}}
  - Journal entries: {{participant.weeklyEntries}}
  - Hours saved: {{participant.weeklyHoursSaved}}

Cohort wins this week
  1. {{topWin1.participantName}} — "{{topWin1.title}}" — {{topWin1.hoursSaved}}h
  2. {{topWin2.participantName}} — "{{topWin2.title}}" — {{topWin2.hoursSaved}}h

Coming up
{{nextSession.belt}} Belt on {{nextSession.date}} — {{nextSession.title}}

  [View your Journey →] (/journey)
  [Log a Journal entry →] (/journal/new)

Have a good week,
{{facilitator.firstName}}
```

---

## 9. `new-homework-submitted` — Facilitator

**Trigger:** Participant submits homework.
**Send timing:** Batched every 30 minutes (so facilitator doesn't get spammed).
**Goal:** Get the facilitator to review + provide feedback.

- **Subject:** `{{submission.count}} new {{plural:submission}} to review`
- **Preview:** `{{first.participantName}} + {{others.count}} others`

### Body

```
Hi {{facilitator.firstName}},

{{submission.count}} new homework {{plural:submission}} ready for your review:

{{#each submissions}}
- {{participant.name}} — {{session.belt}} Belt ({{cohort.name}})
{{/each}}

  [Open review queue →] (/admin/homework)
```

---

## 10. `at-risk-alert` — Facilitator

**Trigger:** Cron daily. Fires when a participant goes 14+ days without a Journal entry OR misses 2+ consecutive sessions.
**Send timing:** Daily, batched.
**Goal:** Prompt facilitator outreach.

- **Subject:** `{{count}} {{plural:participant}} at risk in your cohorts`
- **Preview:** `Time for a quick check-in.`

### Body

```
Hi {{facilitator.firstName}},

These participants haven't journaled or attended in a while:

{{#each atRisk}}
- {{participant.name}} ({{cohort.name}}) — last activity {{lastActivity}} ago
{{/each}}

  [Open At-Risk view →] (/admin/users?status=at-risk)

A short personal note often turns this around. Want a draft? Reply with their name and I'll suggest one.
```

---

## 11. `cohort-assigned` — Facilitator

**Trigger:** Admin creates a cohort and assigns this facilitator.
**Send timing:** Immediate.
**Goal:** Brief them on the new cohort.

- **Subject:** `New cohort: {{cohort.name}}`
- **Preview:** `Starts {{cohort.startDate}} · {{rosterSize}} participants`

### Body

```
{{facilitator.firstName}} —

You've been assigned a new cohort:

{{cohort.name}}
Organization: {{cohort.organization.name}}
Start: {{cohort.startDate}}
Cadence: {{cohort.cadence}}
Roster: {{rosterSize}} {{plural:participant}}

  [Open cohort →] (/admin/cohorts/{{cohort.slug}})
  [Open calendar →] (/admin/calendar)

The session schedule is in. Zoom link defaults to your standard link — override on a per-session basis if needed.
```

---

## 12. `leader-invitation` — Cohort leader

**Trigger:** Admin toggles `isCohortLead` on a participant.
**Send timing:** Immediate.
**Goal:** Onboard them to the leader dashboard.

- **Subject:** `You're the Cohort Leader for {{cohort.name}}`
- **Preview:** `Here's what you can see.`

### Body

```
{{leader.firstName}} —

You've been set as the Cohort Leader for {{cohort.name}}. As a leader, you get access to:

  - Roster + journey progress for every participant
  - Cohort-wide homework completion %
  - Total hours saved + leverage per week
  - Upcoming sessions

Privacy first
You can NOT see individual Journal entries, individual homework responses, or facilitator feedback. Those stay private to each participant.

  [Open your Cohort Dashboard →] (/leader/cohort)

Reach out if anything's unclear.
```

---

## 13. `org-weekly-report` — Org admin

**Trigger:** Cron Mondays 9am organization timezone.
**Send timing:** Weekly.
**Goal:** Keep the customer org admin in the loop.

- **Subject:** `{{org.name}} — week {{weekNumber}} progress report`
- **Preview:** `{{rosterSize}} participants · {{totalHoursSaved}}h saved this week`

### Body

```
Hi {{orgAdmin.firstName}},

Weekly snapshot for {{org.name}} across {{cohortCount}} active {{plural:cohort}}:

This week
  - Sessions delivered: {{sessionsDelivered}}
  - Homework submitted: {{homeworkSubmitted}} ({{homeworkCompletionPct}}%)
  - Journal entries: {{journalEntries}}
  - Hours saved: {{weeklyHoursSaved}}

Cumulative this program
  - Total hours saved: {{totalHoursSaved}}
  - Top contributor: {{topContributor.name}} ({{topContributor.hours}}h)

  [Full report →] (/admin/orgs/{{org.slug}})

Have a great week,
The BestResults.AI team
```

---

## Implementation notes

- **Email provider:** Recommend **Resend** (developer-friendly, transactional, generous free tier). Fallback: SendGrid.
- **Template engine:** Resend supports React Email components. Build a `src/emails/` directory with one component per template; share a base `EmailLayout` for header/footer.
- **Send paths:** All sends go through `/api/email/send` Netlify Function. Adds `from`, `reply-to`, unsubscribe header, BCC to logging address. Rate limits per recipient per template per hour.
- **Unsubscribe + preferences:** `/preferences` page where participants can toggle weekly digest, session reminders, etc. Transactional emails (homework reviewed, certificate) cannot be disabled.
- **Localization:** Out of scope for v1. All emails English. Build the merge-token system so a future v2 can swap copy by locale.
- **A/B testing:** Out of scope for v1.

## Open questions

1. **Sender identity** — Do session reminders come from BRAI or from the facilitator's name + reply-to their email? (Recommend: facilitator's name with `reply-to` set to their email.)
2. **Leader emails** — Should cohort leaders get a weekly digest like participants do? (Recommend: yes, same as `org-weekly-report` but scoped to their cohort.)
3. **Certificate format** — PDF only, or also a shareable image card for LinkedIn? (Recommend: both.)
4. **Calendar attachment** — Should `welcome-to-cohort` include a `.ics` for all 8 sessions? (Recommend: yes, optional download link.)

## Next round (when email infra lands)

1. Pick provider (Resend recommended) + set up account
2. Add `RESEND_API_KEY` to Netlify env
3. Build `src/emails/` with React Email components for all 13 templates
4. Build `/api/email/send` Netlify Function with rate limiting
5. Wire triggers: cohort-write pubsub → trigger 1, 11, 12; cron → 3, 4, 8, 10, 13; in-app actions → 2, 5, 6, 7, 9
6. Build `/preferences` page + unsubscribe header
