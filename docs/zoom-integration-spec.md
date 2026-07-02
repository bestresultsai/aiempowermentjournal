# Zoom Integration Spec

> **Status:** Draft — for review before build kickoff.
> **Owner:** Josue
> **Last updated:** July 2, 2026
> **Related:** #409 (Zoom recording auto-upload), #384 (per-cohort session customization)

---

## 1. Executive summary

The platform currently treats Zoom as a passive external system: facilitators create meetings in Zoom by hand, copy the join URL into the admin session form, and copy the recording URL after each session. That workflow is fragile, undignified, and doesn't scale past a handful of concurrent cohorts.

This spec replaces that model with a bidirectional Zoom integration where the platform is the source of truth for cohort schedules and Zoom becomes a downstream execution layer:

- When an admin creates or edits a cohort session, the platform creates or updates the matching Zoom meeting via the Meeting API.
- Participants receive branded invite emails from Resend with an `.ics` attachment and the join URL — no Zoom-branded emails ever reach them.
- When a session ends and Zoom finishes processing the cloud recording, a webhook fires; the platform pulls the recording, transcodes it to Vimeo, and attaches the playback URL to the session.
- (Bonus) When a session ends, Zoom's `meeting.ended` webhook returns the participant list; the platform auto-marks attendance.

**Total estimated effort:** ~7 days of engineering, split into four rounds so we can ship the highest-value pieces first and defer polish.

**Facilitator work per session after full rollout:** zero. Mike, Lee, and Bethany host the session in Zoom as usual. Everything else — meeting creation, invites, reschedules, recording playback, attendance — happens on its own.

---

## 2. Goals and non-goals

### 2.1 Goals

1. **Auto-create Zoom meetings** when admin sessions are scheduled. One Zoom meeting per session, owned by the assigned facilitator's Zoom account.
2. **Branded participant invites** from Resend with a native BRAI look, containing an `.ics` calendar attachment and the Zoom join URL. Never expose participants to Zoom's default confirmation emails.
3. **Cascade edits** — when an admin changes a session date/time/facilitator, Zoom + calendars + participant emails all update from a single edit.
4. **Auto-populate recordings** — the recording URL and passcode land on the session row in Supabase within an hour of the session ending, with no facilitator action.
5. **Beautiful playback** — recordings render inline via a Vimeo embed on `/session/:order`, not as a "click out to Zoom" link with a passcode.
6. **Auto-mark attendance** (bonus round) — Zoom's `meeting.ended` webhook drives an attendance record so facilitators don't have to eyeball who showed up.

### 2.2 Non-goals

- **Not building a distributable Zoom Marketplace app.** This is an internal integration for BRAI's own Zoom Teams accounts. No public marketplace listing, no Zoom app review process.
- **Not replacing manual Zoom meetings for 1:1 coaching sessions.** Facilitators still book those via Calendly + their personal Zoom room. Only cohort sessions flow through this integration.
- **Not migrating historical recordings.** Sessions that ran before this integration ships keep their manually-set `videoUrl`. We only auto-populate going forward.
- **Not building attendance-based automation** in this project. We surface attendance data; downstream (belt-gating, at-risk alerts) is out of scope.
- **Not supporting non-Zoom video conferencing.** Meet/Teams/Webex are not on the roadmap.

---

## 3. Rounds and phasing

We ship in four rounds so we can stop between any of them without leaving the platform in a broken state.

| Round | Scope | Est. effort | Value delivered |
|---|---|---|---|
| **1. Meeting lifecycle** | Zoom Marketplace app, facilitator OAuth, meeting create/update/cancel, branded invite email + .ics | 4 days | Admins stop managing Zoom links. Participants get pretty invites. |
| **2. Recording auto-populate** | `recording.completed` webhook → save `videoUrl` + `passcode` + `duration` on the session | 1 day | Recordings appear on the platform without facilitator action (Zoom-hosted playback). |
| **3. Vimeo transcoding pipeline** | Auto-download recording from Zoom, upload to Vimeo, save Vimeo URL, delete Zoom copy after retention window | 2 days | Inline embedded playback. Zoom viewer is bypassed entirely. |
| **4. Attendance auto-tracking (bonus)** | `meeting.ended` webhook → match participant emails to platform users → write attendance rows | 1 day | Facilitators see who showed up without checking Zoom's post-meeting report. |

Rounds 1 and 2 should ship together as one project. Round 3 is a separate go/no-go decision after we see how Zoom's viewer feels in practice. Round 4 is a nice-to-have any time after Round 1.

---

## 4. Zoom Marketplace app + OAuth architecture

### 4.1 App type

**User-managed OAuth app**, single-account install scope, distributed only to `bestresults.ai` domain users. No Marketplace listing. Configured in the Zoom Marketplace admin panel under BRAI's Zoom Teams account.

### 4.2 OAuth scopes

Requested during the facilitator's OAuth handshake:

- `meeting:write:admin` — create, update, delete meetings on behalf of the user
- `meeting:read:admin` — read meeting details (needed for post-hoc lookups)
- `recording:read:admin` — read cloud recording metadata and download URLs
- `user:read:admin` — resolve the connected user's Zoom user ID
- `webinar:*` — **not requested** (we don't use webinars for cohort sessions)

### 4.3 Token storage

Per-facilitator OAuth tokens land in a new `zoom_connections` table (see §5.2). Access tokens live 1 hour; refresh tokens don't expire unless the user revokes access from `zoom.us/profile/apps`.

Refresh strategy: **lazy**. When the platform is about to call the Zoom API on behalf of a facilitator, we check `token_expires_at`; if it's less than 5 minutes away, we refresh first. No background refresh cron — simpler and avoids race conditions.

### 4.4 Facilitator "Connect Zoom" flow

New Settings section, gated by `hasCapability(user, 'facilitator')`:

1. Facilitator clicks **Connect Zoom account** in Settings.
2. We redirect to `https://zoom.us/oauth/authorize?response_type=code&client_id={ZOOM_CLIENT_ID}&redirect_uri=https://platform.bestresults.ai/auth/zoom/callback`.
3. Zoom bounces back with `?code=…` at our Netlify Function `/auth/zoom/callback`.
4. Function exchanges the code for access + refresh tokens, hits `/users/me` to get the Zoom user ID and email, upserts a row into `zoom_connections`.
5. UI shows a green "Connected as {zoom_email}" chip and a **Disconnect** button.

If a facilitator's connection is missing or revoked when we try to create a meeting, we fail gracefully: the admin UI surfaces a blocking banner ("Mike hasn't connected his Zoom account — sessions can't be scheduled until he does. Nudge him.") and blocks cohort save.

### 4.5 Webhook subscriptions

Two events, both delivered to `https://platform.bestresults.ai/api/zoom/webhook`:

- `recording.completed` — fires ~5–30 min after a session ends, once Zoom finishes processing the cloud recording
- `meeting.ended` — fires seconds after the host ends the meeting; payload includes the participant list

Signature verification via Zoom's `x-zm-signature` HMAC header + a shared secret stored in `ZOOM_WEBHOOK_SECRET` env var. Fail closed if verification fails.

Also handle Zoom's URL validation ping (`endpoint.url_validation` event) — required to activate a webhook endpoint in the Marketplace app config.

---

## 5. Data model changes

### 5.1 Migration `0005_zoom_integration.sql`

```sql
-- Zoom OAuth connections, one per facilitator.
create table public.zoom_connections (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  zoom_user_id        text not null,
  zoom_email          text not null,
  zoom_account_id     text,
  access_token        text not null,           -- encrypted at rest via pgcrypto (see §11.2)
  refresh_token       text not null,           -- encrypted at rest
  token_expires_at    timestamptz not null,
  scopes              text[] not null,
  connected_at        timestamptz not null default now(),
  last_used_at        timestamptz,
  revoked_at          timestamptz,
  unique (user_id)
);

-- Zoom meeting metadata per cohort session.
alter table public.sessions
  add column zoom_meeting_id       bigint,
  add column zoom_join_url         text,
  add column zoom_start_url        text,           -- host-only URL, never shown to participants
  add column zoom_passcode         text,
  add column zoom_sync_state       text default 'idle'
    check (zoom_sync_state in ('idle','pending','synced','failed')),
  add column zoom_sync_error       text,
  add column zoom_last_synced_at   timestamptz;

-- Recording lands here once processed.
alter table public.sessions
  add column recording_source      text
    check (recording_source in ('zoom','vimeo','youtube','manual')),
  add column recording_url         text,        -- rename target of the existing video_url
  add column recording_passcode    text,        -- Zoom recording passcode (not the meeting passcode)
  add column recording_duration_sec int,
  add column recording_ready_at    timestamptz;

-- Attendance rows, one per participant per session.
create table public.session_attendance (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references public.sessions(id) on delete cascade,
  participant_id      uuid references public.profiles(id) on delete set null,
  matched_by          text check (matched_by in ('email','name','manual','unmatched')),
  zoom_participant    jsonb not null,          -- raw Zoom payload for auditability
  joined_at           timestamptz,
  left_at             timestamptz,
  duration_sec        int,
  created_at          timestamptz not null default now(),
  unique (session_id, participant_id)
);

-- Zoom webhook receipts, used for idempotency + audit.
create table public.zoom_webhook_events (
  id                  uuid primary key default gen_random_uuid(),
  event_type          text not null,
  zoom_event_id       text unique,             -- Zoom's own dedup token when present
  meeting_id          bigint,
  received_at         timestamptz not null default now(),
  processed_at        timestamptz,
  payload             jsonb not null,
  error               text
);

create index on public.sessions (zoom_meeting_id);
create index on public.session_attendance (session_id);
create index on public.zoom_webhook_events (meeting_id, event_type);
```

### 5.2 RLS

- `zoom_connections` — only the connection's owner + `super`/`admin` capabilities can select; nobody except the owner can write.
- `session_attendance` — participants can read their own row; facilitators of the cohort can read all rows for their sessions; admins can read everything.
- `zoom_webhook_events` — service-role only (Netlify Function). Never surfaced to the client.

### 5.3 Existing field migration

The existing `sessions.video_url` field is renamed to `recording_url` and a compat view is kept for 30 days after ship to avoid a coordinated deploy. The `recording_source = 'manual'` value is written for any legacy row where we can't tell the provider.

---

## 6. Round 1: Meeting lifecycle

### 6.1 Create meeting on cohort save

Trigger: `POST /admin/cohorts` or `PATCH /admin/cohorts/:slug` writes new session rows.

For each session with no `zoom_meeting_id`:

1. Look up the facilitator's `zoom_connections` row. If missing, mark session `zoom_sync_state='failed'` with a "Facilitator not connected" error and continue with the next session — do not block the cohort save.
2. Refresh the access token if expiring soon.
3. Call `POST https://api.zoom.us/v2/users/me/meetings` with:

```json
{
  "topic": "AIEW3 · IAHE Cohort · Yellow Belt · Session 2",
  "type": 2,
  "start_time": "2026-07-08T17:00:00Z",
  "duration": 75,
  "timezone": "America/Chicago",
  "agenda": "Power AI-Driven Workflows",
  "settings": {
    "join_before_host": false,
    "waiting_room": true,
    "mute_upon_entry": true,
    "auto_recording": "cloud",
    "meeting_authentication": false,
    "approval_type": 2,
    "audio": "both",
    "host_video": true,
    "participant_video": false
  }
}
```

4. Store `id`, `join_url`, `start_url`, `password` on the session row. Set `zoom_sync_state='synced'` and `zoom_last_synced_at=now()`.
5. Enqueue a branded invite email job for every participant in the cohort (see §6.4).

The topic follows the format `{programCode} · {cohortName} · {beltName} Belt · Session {order}` — deterministic, human-readable, and useful for facilitators scanning their Zoom app.

### 6.2 Update meeting on session edit

Trigger: admin edits a session's `date`, `duration`, `title`, or `belt` — anything that changes what the participant sees.

1. Call `PATCH https://api.zoom.us/v2/meetings/{zoom_meeting_id}` with only the changed fields.
2. If the response is 404, the meeting was deleted from Zoom manually. Recreate via §6.1 and warn the admin.
3. If the response is 200, update `zoom_last_synced_at`.
4. If the date or time changed, send an updated `.ics` (see §6.4).

**Confirmation modal in the admin UI:**
> Changing this session's time will send an updated calendar invite to all {N} enrolled participants. Continue?

### 6.3 Cancel meeting on session/cohort delete

Trigger: session removed or cohort archived.

1. Call `DELETE https://api.zoom.us/v2/meetings/{zoom_meeting_id}?occurrence_id=` (empty occurrence_id = whole meeting).
2. Send a "session cancelled" email to enrolled participants.
3. Null out the Zoom fields on the session row; keep the row itself for historical reference.

### 6.4 Branded invite email + `.ics`

- Template: new `emailTemplates.js` entry `sessionInvite({ participant, cohort, session, joinUrl })` — designed to match the existing branded email pattern (BRAI logo header, belt-colored accent bar for the session, cohort name, facilitator headshot + name, session title + date + time + Zoom link, `.ics` attachment).
- `.ics` generation: extend the existing `icsExport` helper with per-participant UIDs of the form `sess-{sessionId}@platform.bestresults.ai` so that update emails collapse into the same calendar event on the participant's client instead of creating a duplicate.
- Sent via the existing `send-email` Netlify Function.
- Trigger points:
  - Meeting created → **New invite** email
  - Session date/time changed → **Updated invite** email (same UID, `SEQUENCE` incremented)
  - Session cancelled → **Cancellation** email (`METHOD:CANCEL` in the ics)
  - Participant added to cohort mid-run → **New invite** email for all remaining upcoming sessions

### 6.5 Admin UI changes

**`/admin/cohorts/:slug/edit`** — no visible change. The Zoom sync happens transparently on save. A footer chip shows `Zoom: X of Y sessions synced` with a warning icon if any failed.

**`/admin/cohorts/:slug/sessions/:order/edit`** — the existing manual "Zoom Link" field becomes read-only, displayed as a chip with a **Copy** button and a **View in Zoom** link (opens `start_url` in a new tab for the host). A small "Regenerate" action is available if the meeting somehow got out of sync.

**`/settings`** for facilitators — new "Zoom account" section with **Connect Zoom** / **Disconnect** buttons and a green connected-state indicator.

### 6.6 Feature flag

Behind `FEATURE_ZOOM_SCHEDULING=true` in env. When off, cohort saves skip the Zoom sync entirely and the manual "Zoom Link" field remains editable. Lets us roll out on staging first without breaking anything in production.

---

## 7. Round 2: Recording auto-populate

### 7.1 Webhook handler

`POST /api/zoom/webhook` handles all Zoom events. On `event = "recording.completed"`:

1. Verify Zoom signature. Fail closed if invalid.
2. Check `zoom_webhook_events` for an existing row with the same `zoom_event_id` — if found, return 200 without reprocessing (idempotent).
3. Extract `object.id` (the Zoom meeting ID) from the payload.
4. Look up the session in `sessions` where `zoom_meeting_id = payload.object.id`. If no match, log and drop — probably a non-cohort meeting (a 1:1 or an ad-hoc meeting on the same Zoom account).
5. Filter the payload's `recording_files` array to the `MP4` file with the largest `file_size` — that's the composite recording. Ignore audio-only, chat, and transcript files.
6. Update the session row:
   - `recording_url = recording_files[i].play_url` (the passcode-protected `/rec/share/` URL)
   - `recording_passcode = payload.object.password` (the recording passcode, not the meeting passcode)
   - `recording_duration_sec = round(recording_files[i].recording_end - recording_files[i].recording_start)`
   - `recording_source = 'zoom'`
   - `recording_ready_at = now()`
7. Emit a `sessionRecordingReady` event on the participant/cohort pubsub so open browser tabs refresh.
8. Mark the webhook event `processed_at = now()`.

### 7.2 Participant surface

`SessionPlayer.jsx` gets a new `zoom` rendering branch. Because Zoom's `/rec/share/` URLs don't reliably embed in iframes (X-Frame-Options is inconsistent across Zoom accounts + subject to change), we render:

- The belt-colored thumbnail card we already use for the awaiting-recording state
- Duration chip (`49 min`)
- **Watch recording** button → opens the Zoom URL in a new tab
- Passcode pill with a **Copy passcode** button right below the CTA
- Small "Recorded on {date}" text
- A "Get AI summary + transcript" secondary link if Read.AI integration is later added (out of scope this round)

This is a temporary experience — Round 3 replaces it with an inline Vimeo embed. But shipping Round 2 without Round 3 is valid — the recording still lands automatically, just with the passcode friction.

### 7.3 Edge case — multi-part recordings

Long sessions or ones where the host toggled Record can produce multiple recording files. If we get more than one MP4:

- Save the largest as the primary recording (as above).
- Store all `recording_files` in a new `sessions.recording_extras` JSONB column (add via same migration as §5.1).
- Surface a warning to the admin: "This recording came back as {N} parts. We showed the longest. Adjust from the session edit page if you want a different one."

---

## 8. Round 3: Vimeo transcoding pipeline

### 8.1 Overview

Recording auto-populated as a Zoom URL is a fine floor, but the participant UX is measurably worse than an inline Vimeo embed. Round 3 closes the loop:

1. Once the `recording.completed` webhook processes, enqueue a background job.
2. Job downloads the MP4 from Zoom's download URL (requires Zoom OAuth Bearer token in the request headers).
3. Job pipes the stream directly to Vimeo's `POST /me/videos` tus upload endpoint — no local disk buffering, so we don't need a beefy Netlify Function.
4. On upload success, Vimeo returns a video URI (e.g., `/videos/1234567890`).
5. Update the session row: `recording_url = "https://vimeo.com/1234567890"`, `recording_source = 'vimeo'`.
6. Optionally delete the Zoom cloud recording after a retention window (default 7 days) to free Zoom cloud storage. Behind a `ZOOM_DELETE_AFTER_TRANSCODE` env flag.

### 8.2 Vimeo configuration

- Vimeo Standard plan account owned by BRAI (`recordings@bestresults.ai` or similar).
- Videos uploaded with:
  - `privacy.view = 'disable'` initially, upgraded to `'unlisted'` after processing completes
  - `privacy.embed = 'whitelist'` with `platform.bestresults.ai` as the only allowed domain
  - `folder_uri` = a Vimeo folder per cohort (created lazily on first recording), so Mike can browse them by cohort in Vimeo's dashboard
  - `name` = the same topic string as the Zoom meeting
- Vimeo processing takes 1–3× the video length; we don't block on it. The session card shows "Recording processing — check back in a few minutes" until Vimeo reports `status = 'available'`.

### 8.3 Failure handling

- Download from Zoom fails → retry 3× with exponential backoff, then leave `recording_source='zoom'` and surface a "Vimeo transcoding failed — participants will see the Zoom link" chip to admins with a **Retry** button.
- Upload to Vimeo fails → same pattern, retry queue.
- Vimeo processing stuck for >6 hours → alert Sentry.

The rule is: **the Zoom recording URL always lands on the session in Round 2**, so if Vimeo transcoding fails or is behind, the participant experience gracefully degrades to the Zoom link + passcode. Never a broken state.

### 8.4 Participant surface

`SessionPlayer.jsx` gains a `vimeo` branch that renders the existing inline embed — same experience as if Mike had manually uploaded to Vimeo. No new component work, we already parse Vimeo URLs.

### 8.5 Cost model

- Vimeo Standard: ~$20/mo, 5TB storage cap.
- ~500MB per 75-min recording × 8 sessions per cohort × 4 concurrent cohorts × 4 quarters = ~250GB/year. Comfortably under Vimeo's cap.
- Vimeo egress is unlimited and included.
- Netlify Function egress for the Zoom → Vimeo passthrough: negligible if we stream (no disk buffering).

---

## 9. Round 4 (bonus): Attendance auto-tracking

### 9.1 Webhook handler

On `event = "meeting.ended"`:

1. Verify signature. Check idempotency.
2. Look up the session by `zoom_meeting_id`.
3. Zoom's `meeting.ended` payload doesn't include the participant list directly — we have to call `GET /past_meetings/{meetingId}/participants` in a follow-up API call to get it. Do this within the webhook handler (participant lists are usually ready immediately).
4. For each participant in the response:
   - Try to match by email → `profiles.email` (case-insensitive).
   - Fallback: match by name → `profiles.name` (fuzzy).
   - If no match: create the attendance row with `participant_id = NULL` and `matched_by = 'unmatched'` so the admin can resolve manually.
5. Insert into `session_attendance` with join/leave timestamps and duration.

### 9.2 Admin surface

`/admin/cohorts/:slug/sessions/:order/edit` gets an "Attendance" tab showing:

- Roster with attended/didn't-attend indicators
- Join time + duration per participant
- Unmatched Zoom participants at the bottom with a "match to participant" dropdown

`/admin/participants/:id` gets an attendance chip on the participant's timeline.

### 9.3 Participant surface

None in this round. Downstream uses (belt gating on attendance, at-risk alerts) are out of scope.

---

## 10. Failure modes and retry strategy

### 10.1 Categorized failures

| Failure | Detection | Response | User-visible outcome |
|---|---|---|---|
| Facilitator hasn't connected Zoom | `zoom_connections` row missing on cohort save | Skip Zoom sync, mark session `zoom_sync_state='failed'`, surface admin banner | Admin sees "Facilitator not connected" chip on the affected sessions; cohort save succeeds |
| Zoom access token expired mid-call | 401 response | Refresh token, retry once | Silent to admin |
| Zoom refresh token revoked (user hit Uninstall in Zoom Marketplace) | 401 on refresh | Mark `zoom_connections.revoked_at`, email facilitator, block future syncs | Facilitator sees "Zoom disconnected — please reconnect" banner in Settings |
| Zoom API rate limit (30 req/sec) | 429 response | Exponential backoff, retry up to 3× | Silent unless all retries fail |
| Zoom API 5xx | 500+ response | Retry with backoff, then leave session in `zoom_sync_state='failed'` | Admin sees a warning chip; **Retry sync** button available |
| Webhook signature invalid | HMAC mismatch | Return 401, log to Sentry | Silent — likely spoofing attempt |
| Webhook duplicate delivery | `zoom_event_id` already in `zoom_webhook_events` | Return 200 without reprocessing | Silent — expected Zoom behavior |
| Recording not matched to any session | No session with `zoom_meeting_id` = payload id | Log + drop | Silent — likely a non-cohort meeting on the same account |
| Vimeo upload fails | Vimeo API error | Retry 3×, then leave `recording_source='zoom'` | Participants see the Zoom recording link with passcode instead of the inline embed |
| Vimeo processing hangs >6h | Cron-checked | Sentry alert | Admin manually intervenes |

### 10.2 Retry infrastructure

For jobs that might fail (meeting creation on save, Vimeo transcoding), we use a lightweight retry queue backed by a `background_jobs` table:

```sql
create table public.background_jobs (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null,             -- 'zoom_create_meeting' | 'zoom_update_meeting' | 'vimeo_transcode' etc
  payload       jsonb not null,
  attempts      int not null default 0,
  next_run_at   timestamptz not null default now(),
  last_error    text,
  completed_at  timestamptz,
  failed_at     timestamptz,
  created_at    timestamptz not null default now()
);
```

Processed by a Netlify Scheduled Function running every 2 minutes.

---

## 11. Security and privacy

### 11.1 What we store

- Zoom OAuth access + refresh tokens (per facilitator)
- Zoom meeting IDs, join URLs, start URLs, passcodes (per session)
- Recording URLs + passcodes (per session)
- Participant email + join/leave timestamps (per attendance row)

### 11.2 Token encryption at rest

Zoom access + refresh tokens are stored **encrypted** in the `zoom_connections` table using Supabase's `pgcrypto` extension. Encryption key stored in `ZOOM_TOKEN_ENCRYPTION_KEY` env var, rotated annually.

The `start_url` field on `sessions` grants host access to the meeting — it must never appear in a payload readable by participants. Enforce via RLS: participants can select `join_url` and `passcode` but not `start_url`.

### 11.3 Vimeo access control

Vimeo videos are set to `privacy.view = 'unlisted'` (not `public`) and `privacy.embed = 'whitelist'` with `platform.bestresults.ai` as the only allowed domain. Direct traffic to the Vimeo URL from another site or from vimeo.com search won't play. Participants who bookmark the video URL and share it externally will find it doesn't work off-platform.

Note: this isn't cryptographic security — someone determined to leak a video can screen-record from the platform. It's the same posture we'd have with any embedded video hosting.

### 11.4 Webhook secret

Zoom webhook shared secret in `ZOOM_WEBHOOK_SECRET`, rotated whenever the Marketplace app config is touched.

### 11.5 Data subject requests

If a participant requests deletion of their data:

- Attendance rows referencing them get `participant_id = NULL` (audit trail preserved but disassociated).
- Recording URLs are untouched — recordings capture the whole session, not per-participant data. Removing a specific participant from a recording isn't feasible.
- This is called out in the Privacy Policy update accompanying rollout.

---

## 12. Rollout plan

### 12.1 Sequence

1. **Week 1 — Backend prep.** Migration 0005 lands on staging. Zoom Marketplace app created + configured against a staging redirect URI. Netlify env vars set on staging.
2. **Week 1 — Round 1 build.** OAuth flow + meeting create/update/cancel + branded invite email. Josue + Mike test end-to-end on staging: create a fake cohort, connect Mike's Zoom, verify the meeting shows up in his Zoom app + Mike gets the branded invite email.
3. **Week 2 — Round 2 build.** Recording webhook handler. Run a real 75-min test session on staging with Mike hosting; verify recording lands on the session card within an hour.
4. **Week 2 — Feature-flag enable on production.** `FEATURE_ZOOM_SCHEDULING=true` for BRAI staff cohorts only (Josue's own test cohort). Existing IAHE cohort keeps its manually-set Zoom link untouched (the flag is per-session-creation, not per-session-read).
5. **Week 3 — Round 3 build + roll.** Vimeo pipeline. Watch a real session recording play back inline on the platform.
6. **Week 4 — Round 4 build (optional).** Attendance webhook. Non-blocking.
7. **Week 5 — Rollout to all future cohorts.** New cohorts created via the admin UI get Zoom-synced by default. Old cohorts keep their manual state.

### 12.2 Killswitch

Setting `FEATURE_ZOOM_SCHEDULING=false` in production reverts new cohort creation to the manual model. It does not affect already-synced cohorts (their Zoom meetings persist and continue to work), so it's a safe rollback if Round 1 misbehaves.

### 12.3 Migration of the currently-live IAHE cohort

Explicit non-goal. The current IAHE cohort has Mike's Zoom Personal Meeting Room as the `zoomLink` on every session. Leave it alone. Round 1 only applies to cohorts created after the feature flag flips.

---

## 13. Open questions

1. **Which Zoom account creates the webhook subscriptions?** Marketplace apps subscribe once at the app level, and events fire for all installed users. That means one webhook endpoint receives events for every facilitator's meetings. Confirmed correct model, but calling it out.

2. **Do we care about Zoom's meeting registration flow at all?** Current spec bypasses it entirely (we send our own invite). If we ever want per-participant join URLs (for attendance-quality analytics), we'd have to revisit. Recommend deferring.

3. **What happens when a facilitator is swapped mid-cohort?** Round 1 spec covers "session facilitator changed" as a cascade edit — but do we DELETE the old facilitator's Zoom meeting and CREATE a new one on the new facilitator's account, or transfer ownership via Zoom's alternative-host mechanism? Cleanest is delete-and-recreate but participants get a "cancelled then rescheduled" pair of emails. Recommend delete-and-recreate with a single combined email ("Facilitator changed — updated invite attached").

4. **What if a facilitator hosts a cohort session from their phone / desktop client without Zoom's cloud recording enabled?** Round 2 assumes cloud recording. Zoom's `settings.auto_recording: 'cloud'` on meeting creation should enforce it, but facilitators can toggle Record off mid-meeting. Round 2 gracefully handles the no-recording case (session stays in the "awaiting recording" state indefinitely; admin can manually paste a recording URL as before).

5. **Do we surface the Zoom start URL to facilitators, or is opening the meeting from their Zoom desktop client the intended flow?** Current spec: `start_url` shown as a "Start as host" link on `/admin/cohorts/:slug/sessions/:order/edit` for facilitators, so they can one-click into the meeting from the platform if they want. Fine either way — call this out for review.

6. **What's our Zoom cloud storage posture?** Zoom Teams accounts have a per-user recording storage cap. If we're transcoding to Vimeo (Round 3), we can auto-delete Zoom copies after 7 days to keep the cap comfortable. Defaults set behind `ZOOM_DELETE_AFTER_TRANSCODE=true`. Confirm.

7. **Read.AI as a secondary link?** You already record everything with Read.AI. Adding a "Get AI summary + transcript" secondary link on the session card is ~1 hour of extra work per session (Mike would paste the Read.AI share link) and a nice value add — but out of scope for this integration. Call it a separate ticket.

---

## 14. Task breakdown

Rough task list, to be broken into per-round tickets when we start:

**Round 1 (~4 days):**

- SQL migration 0005 (schemas + RLS)
- Zoom Marketplace app registration + config
- `/auth/zoom/callback` Netlify Function (OAuth code exchange)
- `zoom_connections` write API + refresh helper
- Settings UI: Connect Zoom section
- `zoomMeetings.js` — create / update / delete wrappers around Zoom Meeting API
- Cohort save cascade: enqueue meeting-create jobs
- Cohort session edit cascade: enqueue meeting-update jobs
- `background_jobs` scheduled runner (Netlify Scheduled Function)
- `emailTemplates.sessionInvite` + `.ics` UID stability
- Cascade on send: new invite / updated invite / cancellation
- Admin UI: read-only Zoom link chip + sync-status footer
- Feature flag `FEATURE_ZOOM_SCHEDULING`
- End-to-end test on staging with Mike

**Round 2 (~1 day):**

- `/api/zoom/webhook` Netlify Function (signature verify + dedup)
- `recording.completed` handler → save recording fields on session
- `SessionPlayer.jsx` — Zoom rendering branch (link + passcode)
- `zoom_webhook_events` audit table + admin viewer

**Round 3 (~2 days):**

- `vimeoUpload.js` — Vimeo tus upload wrapper
- Background job `vimeo_transcode` — Zoom → Vimeo pipeline
- Session card processing state ("Recording processing")
- Vimeo folder auto-create per cohort
- `ZOOM_DELETE_AFTER_TRANSCODE` cleanup path
- `SessionPlayer.jsx` — Vimeo branch (already parses)

**Round 4 (~1 day):**

- `meeting.ended` handler → fetch participant list
- `session_attendance` write
- Admin UI: Attendance tab with unmatched-participant resolver
- Participant profile attendance chip

**Env vars added:**

- `ZOOM_CLIENT_ID`
- `ZOOM_CLIENT_SECRET`
- `ZOOM_WEBHOOK_SECRET`
- `ZOOM_TOKEN_ENCRYPTION_KEY`
- `FEATURE_ZOOM_SCHEDULING` (default `false` in production until rollout)
- `ZOOM_DELETE_AFTER_TRANSCODE` (default `true`)
- `VIMEO_ACCESS_TOKEN`
- `VIMEO_ACCOUNT_ID`

---

## 15. Approval checklist

- [ ] Round-by-round scope confirmed (§3)
- [ ] Facilitator-owned Zoom account model confirmed (§4)
- [ ] Meeting topic naming convention approved (§6.1)
- [ ] Reschedule confirmation modal copy approved (§6.2)
- [ ] Vimeo Standard plan procured (§8.5)
- [ ] Zoom Marketplace app slot approved by IT (§4.1)
- [ ] Privacy Policy update planned to cover Vimeo + attendance data (§11.5)
- [ ] Rollout sequence + killswitch confirmed (§12)
- [ ] Open questions §13 answered

Once these boxes are checked we start Round 1 build.
