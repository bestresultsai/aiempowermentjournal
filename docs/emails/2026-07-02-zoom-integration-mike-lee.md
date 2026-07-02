# Email — Zoom integration plan (Mike + Lee)

**To:** Mike Burkesmith, Lee (@bestresults.ai)
**From:** Josue Acuña
**Subject:** How Zoom recordings + scheduling work now, and how they'll work soon

---

Hey Mike, Lee —

Quick note on where we've landed with session recordings and Zoom on the platform, and where we're going next. Two things to cover: what's live today (a stopgap you can start using immediately) and the full system we're building over the next couple of weeks.

## What's live on platform.bestresults.ai today

Right now, after a session wraps, you can add the recording to the platform in about 30 seconds without leaving your normal Zoom workflow.

When Zoom finishes processing a cloud recording, it sends you a confirmation email with something like this:

```
Duration: 00:49:24
Shareable link: https://us02web.zoom.us/rec/share/N433lgfNChPSZUJ1F7W2gK1OBwy_rhvnQz84i5IF2NwHJmrvIkmY0t3ROv-KX9A9.L34Rg65k2iQWFNoN
Passcode: 7Hq+bd9#
```

On the platform, go to your cohort → the session you just ran → **Edit session**. There's a new **Recording** block near the bottom with a **"Paste from Zoom"** helper. Drop that whole block of text in, click **Fill fields**, and the URL, passcode, and duration land automatically. Save, and participants can now watch the recording from `/session/2` (or whichever session it is).

On the participant side they see a branded card with a **Watch recording** button that opens Zoom in a new tab, and right next to it, the passcode with a one-click **Copy** button — so they don't have to fumble finding it. Duration shows as a small chip too ("49 min recording").

It's not perfect — they still open the recording in a new Zoom tab rather than watching it inline on the platform — but it's the fastest way to get real recordings in front of real participants without waiting on the bigger integration.

## Where we're going — the full Zoom integration

The stopgap works, but it's still asking you to manually copy three fields per session. And it doesn't help with meeting creation, invites, or attendance. Josue and I speced out a proper integration that fixes all of that at once. Here's the shape of it.

### For you as a facilitator, once it ships

Today's workflow (roughly):

1. Create a Zoom meeting in your Zoom app.
2. Copy the join link into the cohort's session.
3. Send participants a calendar invite (or hope they saw the email from us with the platform link).
4. Host the session.
5. Wait for Zoom to email you the recording.
6. Paste URL + passcode + duration into the session on the platform.

Future workflow, once the full integration ships:

1. **You do nothing until it's time to host.**
2. Host the session.
3. **You still do nothing.**

That's it. Every step in between happens automatically:

- When Josue (or an org admin) creates or updates a cohort in the platform, we call Zoom's API on your behalf and create the meetings on your Zoom account — one per session, with your account as the host, auto-record turned on, waiting room configured. Meeting names are consistent (`AIEW3 · IAHE Cohort · Yellow Belt · Session 2`) so they're easy to find in your Zoom app.
- Participants get a **branded email invite from BestResults.AI** (not Zoom's generic confirmation) with a calendar invite attached and the join link inline. If the session gets rescheduled later, they automatically get an updated invite that overwrites the old one on their calendar — no double-booking, no confused emails.
- After the session ends, Zoom processes the recording (5–30 min usually), and our platform picks it up automatically via a webhook. Within an hour, participants see the recording on the platform's session page — no manual paste from you.
- We then re-upload that recording to Vimeo behind the scenes so participants can watch it **inline on platform.bestresults.ai** — no passcode friction, no Zoom viewer, just a clean embedded player. Vimeo copies of the recordings live on our own account, privacy-restricted to embed only on platform.bestresults.ai (so a leaked link doesn't play anywhere else).
- (Bonus) Zoom's post-meeting API tells us who actually attended and for how long. We'll auto-mark attendance on the platform so you don't have to eyeball the participant list.

### What you'll need to do exactly once

To make all of this work with your `@bestresults.ai` Zoom account, you'll each need to click a single **Connect Zoom** button in your Settings page on the platform, sign in with your BRAI Zoom account, and approve the requested permissions (create meetings, read recordings, that's it). Takes about 30 seconds. After that, the platform can create meetings on your behalf and read recordings from your account. If you ever want to disconnect, there's a matching **Disconnect** button, or you can revoke access from `zoom.us/profile/apps` — Zoom's standard flow.

## Timeline

We're planning to build this in four rounds so we can ship the highest-value pieces first and stop between any of them without leaving the platform in a broken state. Full engineering estimate is roughly **7–8 working days** spread across the next 2–3 weeks:

- **Round 1 (~4 days) — Meeting lifecycle.** Zoom OAuth setup, auto-create meetings on cohort save, branded invite emails with calendar attachments, cascading edits when sessions get rescheduled. After this ships, you never manually create a Zoom meeting for a cohort session again.
- **Round 2 (~1 day) — Recording auto-populate.** The webhook that lands recordings on the platform on its own. After this ships, you never manually paste a recording URL again. Playback is still in a Zoom tab at this stage.
- **Round 3 (~2 days) — Vimeo transcoding.** Recordings get re-hosted on Vimeo automatically and play inline on the platform. After this ships, participants stop seeing Zoom's viewer entirely.
- **Round 4 (~1 day, optional) — Attendance auto-tracking.** Attendance rows populate from Zoom's participant list.

We'll test everything on staging with you two first before turning it on for real cohorts. The IAHE cohort that's currently running stays on the manual-paste stopgap for its remaining sessions — no mid-run switch.

## What we need from you

Two things, no rush:

1. **Any feedback on the shape of this?** Especially the "you connect your own Zoom account once" model — that's the industry-standard pattern and it gives you full control (meetings live in your Zoom history, you can start early, no shared service account weirdness), but if either of you has concerns I want to hear them before we start building.
2. **A sanity check that we're solving the right problem.** Is there anything else about how you run sessions today that this integration should account for — recurring 1:1 coaching sessions, office hours, non-cohort meetings you want tracked separately, etc.? Anything on your list that would be more valuable than one of the rounds above?

Full technical spec is at `docs/zoom-integration-spec.md` in the repo if either of you wants to nerd out on the details.

Talk soon,
Josue
