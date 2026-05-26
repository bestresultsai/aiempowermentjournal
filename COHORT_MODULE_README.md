# Cohort + Sessions + Homework Module

**Purpose.** Replace LearnUpon. Move the workshop series, materials, and homework into the BestResults.AI in-house platform so AI Journal + the cohort experience live in one tool.

**Curriculum on display in the prototype.** Best Results AI Empowerment Workshop Series 3.0 (AIEW3) — 8 belt-ranked sessions, White → Black.

## What's in the prototype

```
src/
├── lib/
│   ├── mockCohort.js          ← AIEW3 cohort + 8 sessions + homework prompts + Mike as trainer
│   └── cohortApi.js           ← API client with USE_MOCK_DATA toggle
├── components/cohort/
│   ├── CohortHero.jsx         ← hero with trainer headshot (graceful fallback)
│   ├── ProgressRing.jsx
│   ├── SessionRow.jsx         ← belt color accent + Homework ✓ pill
│   ├── SessionPlayer.jsx      ← Vimeo + YouTube embed
│   └── HomeworkSubmission.jsx ← per-session homework form (text + optional link)
├── pages/cohort/
│   ├── CohortLanding.jsx      ← /cohort/:slug
│   └── SessionDetail.jsx      ← /cohort/:slug/session/:order  (with Homework tab)
└── dashboards/
    └── IndividualDashboard.jsx  ← now shows the Cohort card + Quick Actions
```

Plus two Netlify function stubs ready for live mode (`netlify/functions/cohort-by-slug.js`, `progress.js`). A third stub for homework will be added when we wire that to Notion.

## What changed from the v1 (BBWS) prototype

- **Curriculum.** Replaced 10 placeholder BBWS sessions with the real 8-session AIEW3 belt structure (White → Black). Each session has a real summary, objectives, and homework prompt.
- **Trainer.** Mike Acuna is now the trainer. `cohort.trainer.headshotUrl` is read by `CohortHero`. Drop a real photo at `public/headshots/mike.jpg` and the hero renders it automatically. Until then, the initials avatar fills in.
- **Homework.** Every session has `homework: { prompt, dueDate, submissionType }`. Participants submit via the new "Homework" tab on the session detail page. The session row gets a `HW ✓` pill when submitted. Submissions are in-memory in mock mode; the Notion schema for live mode is in the next section.
- **Belt colors.** Each session is accented with its belt color (White / Yellow / Orange / Green / Blue / Purple / Brown / Black) — on the session number badge, the row's left edge, and the session detail header pill.
- **Platform unification.** Logged-in users now land on `/dashboard` (not `/`), which shows a "My Cohort" card linking to the cohort, Quick Actions for the journal and cohort, and the existing journal metrics. The public `/` page keeps the no-login "Log a Journal Entry" CTA. The NavBar shows "My Cohort", "Dashboard", and "+ New Entry" for logged-in users.

## Going live: the Notion side

Three Notion DBs to add (plus six new fields on the existing Cohorts DB).

### 1. Sessions DB

| Property        | Type        | Notes                                                     |
|-----------------|-------------|-----------------------------------------------------------|
| Title           | Title       | "White — Full Role Matrices..."                           |
| Cohort          | Relation → Cohorts | Multiple sessions per cohort                       |
| Order           | Number      | 1–8                                                       |
| Belt            | Select      | White / Yellow / Orange / Green / Blue / Purple / Brown / Black |
| Date            | Date        | Live session datetime                                     |
| Duration (min)  | Number      | Default 75                                                |
| Summary         | Rich text   | Short paragraph for the cohort page                       |
| Objectives      | Rich text   | One bullet per line (newline-separated)                   |
| Video URL       | URL         | Vimeo / YouTube; embed conversion is automatic            |
| Materials       | Files & media | PDFs/Docs or external URLs                              |
| Homework Prompt | Rich text   | The assignment text                                       |
| Homework Due    | Date        | Submission due date                                       |

### 2. Session Progress DB

| Property        | Type        | Notes                                                     |
|-----------------|-------------|-----------------------------------------------------------|
| Name            | Title       | Auto-set: `email · slug · S{n}`                           |
| User            | Relation → Users   | Who completed                                      |
| Cohort          | Relation → Cohorts | Which cohort                                       |
| Session Order   | Number      | Mirrors `Sessions.Order`                                  |
| Completed       | Checkbox    | `true` = done                                             |
| Completed At    | Date        | Timestamp                                                 |

### 3. Homework Submissions DB (new)

| Property        | Type        | Notes                                                     |
|-----------------|-------------|-----------------------------------------------------------|
| Name            | Title       | Auto-set: `email · slug · S{n} · HW`                      |
| User            | Relation → Users   | Submitter                                          |
| Cohort          | Relation → Cohorts | Which cohort                                       |
| Session Order   | Number      | Which session's homework                                  |
| Response        | Rich text   | Long-form submission text                                 |
| Link            | URL         | Optional link to Google Doc / Notion / file              |
| Submitted At    | Date        | Timestamp                                                 |
| Trainer Reviewed| Checkbox    | (Future) trainer can mark reviewed                        |
| Trainer Notes   | Rich text   | (Future) feedback shown back to participant               |

### Cohorts DB additions

These six fields on the existing Cohorts DB need to exist before going live:

| Property        | Type        | Notes                                                     |
|-----------------|-------------|-----------------------------------------------------------|
| Slug            | Rich text   | URL slug, e.g. `iahe-aiew3-2026q1`                        |
| Program Code    | Select      | `AIEW3`, `BBWS`, etc.                                     |
| Meeting Day     | Rich text   | "Wednesdays"                                              |
| Meeting Time    | Rich text   | "12:00 PM CT"                                             |
| NDA Required    | Checkbox    | Toggles the NDA callout on the landing page               |
| Journey Intro   | Rich text   | The "Your AI Empowerment Journey" paragraph               |
| Coaching Note   | Rich text   | Text shown next to the "Book Coaching" CTA                |

### Cohorts DB — trainer headshot

Two options:
- **Simplest:** add a `Trainer Headshot URL` rich-text field on the Cohorts DB. Set it to a public image URL.
- **Cleaner:** add a `Trainers` DB with `Name`, `Title`, `Email`, `Headshot` (Files); relate `Cohorts.Trainer` to it. Recommended when you have multiple trainers.

## Flipping mock → live

1. Add the 3 Notion DBs (and the 6 cohort field additions) per the schemas above.
2. Add the new DB IDs to `src/lib/cohortApi.js`-and-related Netlify functions (see `netlify/functions/notion-client.js`):

   ```js
   export const DB_IDS = {
     JOURNAL_ENTRIES: "0d984418-48bd-4f1e-adf0-f71c1f0e1dbb",
     PARTICIPANTS:    "2fb2af88-8f34-80ce-a486-d8f8f39bdfab",
     COHORTS:         "2fa2af88-8f34-8036-beb8-e894172c6a89",
     USERS:           "937dfd19-8afa-4e07-bdf3-9974f4fb1093",
     SESSIONS:        "<paste-new-id>",
     SESSION_PROGRESS:"<paste-new-id>",
     HOMEWORK_SUBMISSIONS: "<paste-new-id>",
   };
   ```

3. Flip `USE_MOCK_DATA = false` in `src/lib/cohortApi.js`.
4. Populate IAHE AIEW3 cohort + 8 sessions in Notion. Mike's headshot URL on Cohorts (or Trainers DB).

The components themselves don't change — they always call `getCohortBySlug()`, `markSessionComplete()`, `submitHomework()`. Only the API client decides mock vs. live.

## Deploy

Same as everything else: `./deploy.sh "..."` → Netlify auto-builds. The new module ships at `/cohort/iahe-aiew3-2026q1` on whichever URL the build deploys to.

## Decisions still owed before "real participants"

1. **Lock the AIEW3 syllabus.** Session summaries, objectives, and homework prompts in `mockCohort.js` are first drafts based on the program outline. Mike should review and tweak the wording before this goes to live participants.
2. **Mike's headshot.** Drop a square JPG at `public/headshots/mike.jpg` (or set a public URL on the trainer record once we go live).
3. **Where do the recordings live?** Vimeo? YouTube unlisted? If they were inside LearnUpon, plan the export.
4. **Login gate on `/cohort/*`?** Today the route renders regardless of auth (easy demo). For real participants, gate it.
5. **Trainer review of homework.** The DB has `Trainer Reviewed` + `Trainer Notes` fields ready, but the UI doesn't surface them yet. Worth a TrainerDashboard view in a follow-up phase.
6. **Cohort slug convention.** Using `org-program-yyyyQq` (e.g. `iahe-aiew3-2026q1`). Confirm before populating the DB.
