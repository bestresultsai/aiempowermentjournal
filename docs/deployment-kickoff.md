# Deployment Kickoff Checklist

**Goal:** get the external accounts + Netlify staging branch in place so the Phase 1 work in `docs/production-readiness.md` can land.

**Path chosen:** staging-first. We build a parallel Supabase project, point a Netlify branch deploy at it, validate end-to-end, then cut production over.

**Owner:** Josue (signups + DNS), Claude (code artifacts).

**Estimated time for this checklist:** 60–90 min, can be done in any order except where noted.

---

## How to use this doc

Each section is one external dependency. For each one:

1. Follow the steps in order.
2. When asked to copy a value, paste it into the **"Values to save"** block at the bottom of this doc (or a private password manager). We'll wire them into Netlify env vars at the end.
3. When you finish a section, check it off in the **Progress** block.

**Never paste secrets into chat with me.** I'll ask you to confirm a value is in place — that's enough. The actual keys stay in your password manager + Netlify env vars.

---

## 1. Supabase staging project (do this first — blocks everything else)

**Why first:** Phase 1 + 2 of the migration both need a Supabase project to point at. Until this exists I can write the SQL migrations and client wrappers but I can't apply or test them.

### Steps

1. Go to **https://supabase.com** and click **Start your project**.
2. Sign up with your Google account (`josue@bestresults.ai`).
3. Once signed in, create an **Organization** named `BestResults.AI` if you don't have one.
   - Plan: **Free** is fine for staging. We'll upgrade Production to Pro later.
4. Inside that org, click **New project**.
   - Name: `brai-staging`
   - Database password: **generate a strong one and save it** — you'll need it for the seed script.
   - Region: **East US (North Virginia)** — closest to most participants.
   - Pricing plan: **Free**.
5. Wait ~2 min for the project to provision.
6. Once provisioned, go to **Project Settings → API**.
   - Copy the **Project URL** (looks like `https://xxx.supabase.co`)
   - Copy the **`anon` `public` key** (the long JWT)
   - Copy the **`service_role` `secret` key** (the other long JWT — treat like a password)
7. Go to **Project Settings → Auth → Email**.
   - **Enable email signups:** turn this **off** for now. We'll use magic links only.
   - **Enable email confirmations:** off.
   - **Enable magic links:** on.
   - Site URL: leave blank for now (we'll fill in once Netlify staging exists).
8. Go to **Storage** in the left nav.
   - Create a bucket called `headshots` — **Private** (only authenticated users see them).
   - Create a bucket called `homework` — **Private**.
   - Create a bucket called `materials` — **Private**.
   - Create a bucket called `public` — **Public** (for brand assets that we want CDN-served).

### Values to save

```
SUPABASE_PROJECT_URL = https://___________.supabase.co
SUPABASE_ANON_KEY    = eyJhbGc...                  (long JWT)
SUPABASE_SERVICE_KEY = eyJhbGc...                  (long JWT, secret)
SUPABASE_DB_PASSWORD = ____________________        (the one you generated in step 4)
```

---

## 2. Resend (transactional email)

**Why:** the 13 email templates we built in Round G need a sending provider.

### Steps

1. Go to **https://resend.com** → **Sign up** with `josue@bestresults.ai`.
2. Verify your email.
3. Click **Domains** in the left nav → **Add Domain**.
   - Domain: `tools.bestresults.ai`
   - Region: **N. Virginia (us-east-1)**.
4. Resend will show you DNS records (SPF, DKIM, return-path). **Don't add them yet** — we'll batch the DNS work in section 6.
5. Click **API Keys** → **Create API Key**.
   - Name: `brai-staging`
   - Permission: **Sending access**
   - Domain: select `tools.bestresults.ai` (it's fine that the domain isn't verified yet — the key works from sandbox addresses)
   - Copy the key.

### Values to save

```
RESEND_API_KEY = re_xxxxx
```

---

## 3. Sentry (error reporting)

**Why:** `src/lib/observability.js` is already scaffolded to call Sentry when a DSN exists. This activates it.

### Steps

1. Go to **https://sentry.io/signup/** → sign up with `josue@bestresults.ai`.
2. Organization name: `BestResults`.
3. Skip the "pick a starter project" wizard and create the project manually:
   - **Projects** → **Create Project**
   - Platform: **React**
   - Alert frequency: **Alert me on every new issue** (we'll tune later)
   - Project name: `brai-platform`
   - Team: default
4. Sentry will show you a "Configure SDK" page. The piece we need is the **DSN** — a URL that looks like `https://xxx@yyy.ingest.sentry.io/zzz`. Copy it.
5. Skip the "Verify Setup" step — we wire it via env vars, not by editing app code.

### Values to save

```
SENTRY_DSN = https://xxx@yyy.ingest.sentry.io/zzz
```

---

## 4. PostHog (product analytics)

**Why:** same observability scaffold knows how to call PostHog when a key exists.

### Steps

1. Go to **https://posthog.com/signup** → sign up with `josue@bestresults.ai`.
2. Choose **US Cloud** (matches where most participants are).
3. Organization: `BestResults.AI`.
4. Project name: `BRAI Platform`.
5. After signup you land on the project overview. Go to **Project Settings** (gear icon, bottom-left) → **Project Variables**.
   - Copy the **Project API Key** (`phc_xxxxx`).
   - Note the **API Host** — should be `https://us.i.posthog.com` for US Cloud.

### Values to save

```
POSTHOG_KEY  = phc_xxxxx
POSTHOG_HOST = https://us.i.posthog.com
```

---

## 5. Netlify staging branch deploy

**Why:** we need a separate URL pointing at the staging Supabase project so we can validate without touching `tools.bestresults.ai`.

### Steps

1. Open your Netlify dashboard → the BRAI site.
2. Go to **Site configuration → Build & deploy → Branches and deploy contexts**.
3. Under **Branch deploys**, change from "Deploys from a Git branch" to **"Let me add individual branches"** and add `staging`.
4. Once you push a `staging` branch (we'll do that after I finish the code artifacts), Netlify will auto-deploy it to a URL like `staging--bestresults-platform.netlify.app`.
5. Now set per-context env vars. Go to **Site configuration → Environment variables**.
   - Click **Add a variable** (one per row below). For each one, click "Specific scopes / specific deploy contexts" and select **Branch deploys: staging** only.

| Key | Value | Scope |
|---|---|---|
| `VITE_SUPABASE_URL` | (from section 1) | staging branch |
| `VITE_SUPABASE_ANON_KEY` | (from section 1) | staging branch |
| `VITE_RESEND_API_KEY` | (from section 2) | staging branch — server-side only, used by Netlify Functions later |
| `VITE_SENTRY_DSN` | (from section 3) | staging branch |
| `VITE_POSTHOG_KEY` | (from section 4) | staging branch |
| `VITE_POSTHOG_HOST` | (from section 4) | staging branch |
| `VITE_ENV_NAME` | `staging` | staging branch |

**Note on `VITE_RESEND_API_KEY`:** Vite exposes any `VITE_*` env var to the browser bundle. Resend keys must NEVER end up in the bundle — they'll be moved to a Netlify Function during Phase 3. For now leave the variable defined but don't reference it from app code yet. Claude will set this up correctly in the email-send Netlify Function.

### Values to confirm

```
NETLIFY_STAGING_URL = https://__________--bestresults-platform.netlify.app   (auto-assigned)
```

---

## 6. DNS — no action this round

DNS will be touched in **Phase 3** of `docs/production-readiness.md`, not now. We'll add:

- The Resend SPF/DKIM/return-path records once we're ready to send real emails.
- A `CNAME` for `staging.tools.bestresults.ai` → Netlify if we want a friendlier staging URL (optional).

For now: **no DNS changes**. Just confirm you know where to make DNS changes when the time comes (Bluehost? Cloudflare? GoDaddy?).

### Note

```
DNS_PROVIDER = ____________________
DNS_LOGIN_OWNER = ____________________
```

---

## 7. Progress tracker

Mark each one when done:

- [ ] Supabase staging project created + keys saved
- [ ] Resend account created + key saved + DNS records noted
- [ ] Sentry project created + DSN saved
- [ ] PostHog project created + key + host saved
- [ ] Netlify staging branch enabled + env vars set
- [ ] DNS provider documented

---

## What I (Claude) am building in parallel

While you work through the above, I'm producing:

- `supabase/migrations/0001_initial_schema.sql` — all 13 tables.
- `supabase/migrations/0002_rls_policies.sql` — three-tier RLS.
- `src/lib/supabase.js` — env-gated client wrapper. Platform still runs without env vars.
- `src/lib/db.js` — unified query helper that overlay stores will swap into in Phase 2.
- `.env.example` — documents every var.
- `scripts/seed-staging.mjs` — idempotent Summit + PHS staging seed.

Once you've finished the checklist (or any subset), tell me which sections are done and I'll wire the corresponding pieces. We can run the schema against Supabase the moment section 1 is complete.

---

## Time estimate per section

| Section | Estimated time | Blocks the next step? |
|---|---|---|
| 1. Supabase | 10–15 min | Yes — start here |
| 2. Resend | 5 min | No |
| 3. Sentry | 5 min | No |
| 4. PostHog | 5 min | No |
| 5. Netlify env vars | 10 min | Only blocks first staging deploy |
| 6. DNS | 0 min (note only) | No |

**Total active work: ~35–45 min.** Provisioning waits add ~10 more.
