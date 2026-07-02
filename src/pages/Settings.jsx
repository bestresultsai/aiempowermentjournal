import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  User, Mail, Phone, Briefcase, Building2, Camera, ArrowRight, Check, GraduationCap,
  Video, Globe, Calendar as CalendarIcon, RefreshCw, Link2Off, Loader2,
  MessageCircle, Clock, ExternalLink,
} from "lucide-react";
import NavBar from "../components/NavBar";
import Select from "../components/Select";
import { useAuth } from "../context/AuthContext";
import { useUserCohorts } from "../lib/cohortResolution";
import { groupTimeZones } from "../lib/timeZones";
import { useGoogleCalendarConnection } from "../lib/googleCalendar";
import { hasCapability } from "../lib/adminRoles";
import { initSupabase, isSupabaseEnabled } from "../lib/supabase";
import { captureError } from "../lib/observability";

// ---------------------------------------------------------------------------
// SETTINGS PAGE — /settings
//
// Profile basics + headshot upload. Writes are stubbed for the prototype —
// when the Notion `Users` DB is wired for editing, point the save handler at
// PATCH /api/users/me (or whichever endpoint Mike + team build).
// ---------------------------------------------------------------------------

export default function Settings() {
  const { user } = useAuth();
  const fileRef = useRef(null);

  // Form state — seeded from the JWT user, then editable in-place.
  // Reads onboarding-captured fields (title, headshot, etc.) so the profile
  // page shows what the user filled in via /welcome.
  const [form, setForm] = useState({
    name: user?.name || "",
    title: user?.preferences?.title || user?.title || "",  // captured during onboarding
    phone: user?.phone || "",
    organization: user?.preferences?.organization || user?.organization || "",
    headshotPreview: user?.headshotUrl || null,
    // Cohort defaults used by the admin cohort form. Facilitators set these
    // so new cohorts come pre-filled with the right time zone + Zoom link.
    defaultTimeZone: user?.defaultTimeZone || "America/New_York",
    defaultZoomLink: user?.preferences?.defaultZoomLink || user?.defaultZoomLink || "",
    // Facilitator profile — surfaced on the participant CohortLanding
    // "Your Facilitator" card. Editable by facilitators / admins / super.
    // Defaults kick in on the read side (buildTrainer in cohortApi.js)
    // so cards don't look empty when a facilitator hasn't filled these in yet.
    coachingHeadline: user?.preferences?.coachingHeadline || "",
    coachingBody: user?.preferences?.coachingBody || "",
    officeHours: user?.preferences?.officeHours || "",
    calendlyUrl: user?.preferences?.calendlyUrl || "",
  });

  // Show the cohort-defaults section to anyone who could run a cohort —
  // facilitators, org admins, BRAI admins, super admins.
  const showCohortDefaults =
    user?.role && ["super", "admin", "org", "facilitator"].includes(user.role);
  // Show the facilitator profile section to anyone who could be the
  // "Your Facilitator" card for a participant — i.e. anyone with facilitator
  // capability (or the higher admin/super tiers that inherit it).
  const showFacilitatorProfile =
    hasCapability(user, "facilitator") ||
    hasCapability(user, "admin") ||
    hasCapability(user, "super");
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleHeadshotPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, headshotPreview: reader.result }));
    reader.readAsDataURL(file);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaveState("saving");
    try {
      if (isSupabaseEnabled()) {
        const client = await initSupabase();
        if (client) {
          const { data: sessionData } = await client.auth.getSession();
          const authUser = sessionData?.session?.user;
          if (authUser?.id) {
            // Read current preferences so we merge instead of clobbering
            // fields written elsewhere (whyAi, mainGoal, location, etc.).
            const { data: existing } = await client
              .from("profiles")
              .select("preferences")
              .eq("id", authUser.id)
              .maybeSingle();
            const nextPrefs = {
              ...(existing?.preferences || {}),
              title: form.title || undefined,
              organization: form.organization || undefined,
              defaultZoomLink: form.defaultZoomLink || undefined,
              // Facilitator profile block. Store empty strings as undefined
              // so the default template on the read side kicks back in when
              // a facilitator clears the field.
              coachingHeadline: form.coachingHeadline || undefined,
              coachingBody: form.coachingBody || undefined,
              officeHours: form.officeHours || undefined,
              calendlyUrl: form.calendlyUrl || undefined,
            };
            const update = {
              preferences: nextPrefs,
              time_zone: form.defaultTimeZone || undefined,
              phone: form.phone || null,
            };
            if (form.name) update.name = form.name;
            // Chain .select() so we detect the 0-row silent-success case
            // that Postgres returns when RLS blocks the update. Without
            // this the save would appear to succeed while nothing changed.
            const { data: updated, error } = await client
              .from("profiles")
              .update(update)
              .eq("id", authUser.id)
              .select("id");
            if (error) throw new Error(error.message || "Failed to save profile.");
            if (!updated || updated.length === 0) {
              throw new Error("Profile save didn't persist (no row updated).");
            }
          }
        }
      }
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2400);
    } catch (err) {
      captureError(err, { source: "Settings.handleSave" });
      // eslint-disable-next-line no-console
      console.error("[Settings] save failed:", err);
      setSaveState("idle");
      // Surface the error to the user. Simple alert for now; nicer toast later.
      // eslint-disable-next-line no-alert
      alert(`Save failed: ${err?.message || "Unknown error"}`);
    }
  }

  // Shared hook — falls back to the Supabase direct query when the
  // in-memory participant record misses. Was calling the plain
  // getUserCohorts(user), which is why Settings said "not in a cohort"
  // while /home successfully resolved the same user's cohort.
  const cohorts = useUserCohorts(user);
  const initials = (form.name || user?.name || "?")
    .split(" ").filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join("").toUpperCase();

  if (!user) {
    return (
      <div className="min-h-screen bg-surface-paper">
        <NavBar />
        <main className="max-w-[1180px] mx-auto px-6 lg:px-8 py-16 text-center">
          <h2 className="font-heading text-[22px] font-extrabold text-ink mb-2">
            You need to sign in to view your profile.
          </h2>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 mt-4 text-[14px] font-heading font-semibold text-brand-600 hover:text-brand-700 transition-colors"
          >
            Go to sign in
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-paper">
      <NavBar />
      <main className="max-w-[920px] mx-auto px-6 lg:px-8 py-8">
        <header className="mb-8 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <User className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="h-eyebrow">Settings</div>
          </div>
          <h1 className="font-heading text-[32px] lg:text-[36px] font-extrabold tracking-tight text-ink leading-tight">
            Your profile.
          </h1>
          <p className="text-[14.5px] text-ink-muted mt-2 max-w-2xl leading-relaxed">
            Keep your details up to date so your facilitator and cohort can recognize you and your work.
          </p>
        </header>

        <form onSubmit={handleSave} className="space-y-6 animate-fade-in-up delay-100">
          {/* ============ HEADSHOT ============ */}
          <Section title="Headshot" icon={Camera}>
            <div className="flex items-center gap-6 flex-wrap">
              <HeadshotPreview src={form.headshotPreview} initials={initials} />
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleHeadshotPick}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-soft text-[14px] font-heading font-semibold text-ink hover:bg-surface-soft hover:border-brand-500 transition-all duration-200"
                >
                  <Camera className="w-4 h-4 text-brand-600" strokeWidth={2.5} />
                  {form.headshotPreview ? "Change photo" : "Upload photo"}
                </button>
                <p className="text-[12px] text-ink-muted mt-2">
                  Square JPG, PNG, or WebP. Up to 5 MB.
                </p>
              </div>
            </div>
          </Section>

          {/* ============ NAME + TITLE ============ */}
          <Section title="About you" icon={Briefcase}>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label="Full name"
                icon={User}
                value={form.name}
                onChange={(v) => update("name", v)}
                placeholder="Full name"
              />
              <Field
                label="Title"
                icon={Briefcase}
                value={form.title}
                onChange={(v) => update("title", v)}
                placeholder="Job title"
              />
            </div>
          </Section>

          {/* ============ CONTACT ============ */}
          <Section title="Contact" icon={Mail}>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label="Email"
                icon={Mail}
                value={user.email || ""}
                onChange={() => {}}
                placeholder=""
                readOnly
                hint="Email is locked because it's tied to your sign-in. Contact your facilitator to change it."
              />
              <Field
                label="Phone"
                icon={Phone}
                value={form.phone}
                onChange={(v) => update("phone", v)}
                placeholder="+1 (555) 234-5678"
                type="tel"
              />
            </div>
          </Section>

          {/* ============ ORGANIZATION ============ */}
          <Section title="Organization" icon={Building2}>
            <Field
              label="Organization"
              icon={Building2}
              value={form.organization}
              onChange={(v) => update("organization", v)}
              placeholder="Company"
            />
          </Section>

          {/* ============ COHORT DEFAULTS (facilitators / admins) ============ */}
          {showCohortDefaults && (
            <Section title="Cohort defaults" icon={Video}>
              <p className="text-[12.5px] text-ink-muted leading-relaxed mb-3">
                These pre-fill new cohorts you create or are assigned to facilitate.
                Override per cohort or per session in the cohort form.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <TimeZoneField
                  label="Default time zone"
                  value={form.defaultTimeZone}
                  onChange={(v) => update("defaultTimeZone", v)}
                  hint="New cohorts default to this time zone."
                />
                <Field
                  label="Default Zoom link"
                  icon={Video}
                  value={form.defaultZoomLink}
                  onChange={(v) => update("defaultZoomLink", v)}
                  placeholder="https://us02web.zoom.us/j/0000000000"
                  hint="Used as the live session join link unless a session overrides it."
                />
              </div>
            </Section>
          )}

          {/* ============ FACILITATOR PROFILE (coaching card) ============ */}
          {showFacilitatorProfile && (
            <Section title="Facilitator profile" icon={MessageCircle}>
              <p className="text-[12.5px] text-ink-muted leading-relaxed mb-3">
                This copy shows on your participants' "Your Facilitator" card.
                Leave any field blank to fall back to the default template.
              </p>
              <div className="grid gap-4">
                <Field
                  label="Coaching headline"
                  icon={MessageCircle}
                  value={form.coachingHeadline}
                  onChange={(v) => update("coachingHeadline", v)}
                  placeholder="Feeling stuck?"
                  hint="The bold hook line. Default: “Feeling stuck?”"
                />
                <TextareaField
                  label="Coaching body"
                  value={form.coachingBody}
                  onChange={(v) => update("coachingBody", v)}
                  rows={3}
                  placeholder="Bring your hardest workflow to office hours — we'll turn it into something you'll actually use every week."
                  hint="A sentence or two inviting participants to bring you their hardest problem."
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field
                    label="Office hours"
                    icon={Clock}
                    value={form.officeHours}
                    onChange={(v) => update("officeHours", v)}
                    placeholder="Fridays · 11 AM CT"
                    hint="Freeform text. Shown on the card next to the calendar icon. Leave blank to hide."
                  />
                  <Field
                    label="Booking URL (Calendly, etc.)"
                    icon={ExternalLink}
                    value={form.calendlyUrl}
                    onChange={(v) => update("calendlyUrl", v)}
                    placeholder="https://calendly.com/yourname/1-1"
                    hint="Where “Book a 1:1” takes participants. Leave blank to disable the button."
                    type="url"
                  />
                </div>
              </div>
            </Section>
          )}

          {/* ============ GOOGLE CALENDAR (facilitators / admins) ============ */}
          {showCohortDefaults && (
            <div id="google-calendar">
              <GoogleCalendarSection user={user} />
            </div>
          )}

          {/* ============ COHORTS (read-only) ============ */}
          <Section title="Your cohorts" icon={GraduationCap} muted>
            {cohorts.length === 0 ? (
              <div className="text-[14px] text-ink-muted">You're not in a cohort yet.</div>
            ) : (
              <div className="space-y-2">
                {cohorts.map((c) => (
                  <div key={c.slug} className="flex items-center justify-between p-3 rounded-xl bg-surface-paper border border-soft">
                    <div className="min-w-0">
                      <div className="text-[14px] font-heading font-bold text-ink truncate">{c.name}</div>
                      <div className="text-[11.5px] text-ink-muted mt-0.5">{c.methodName} · {c.programCode}</div>
                    </div>
                    <Link
                      to={`/cohort/${c.slug}`}
                      className="text-[12px] font-heading font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                    >
                      Open →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ============ SAVE ============ */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saveState === "saving"}
              className={
                "group inline-flex items-center gap-2 px-5 py-3 rounded-xl text-[14px] font-heading font-semibold transition-all duration-200 " +
                (saveState === "saving"
                  ? "bg-ink/60 text-white cursor-wait"
                  : saveState === "saved"
                    ? "bg-emerald-600 text-white"
                    : "bg-ink text-white hover:bg-brand-700")
              }
            >
              {saveState === "saving" ? (
                "Saving…"
              ) : saveState === "saved" ? (
                <>
                  <Check className="w-4 h-4" strokeWidth={2.5} /> Saved
                </>
              ) : (
                <>
                  Save changes
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.5} />
                </>
              )}
            </button>
            <p className="text-[12px] text-ink-muted">
              Changes save to your profile. They'll appear in the cohort dashboards.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}

// ---- Helpers ----

// ---------------------------------------------------------------------------
// GoogleCalendarSection — connect / disconnect / sync controls.
//
// Visual rhythm matches the other Section blocks. Two states:
//   - NOT connected — blue Connect button + explainer
//   - CONNECTED     — green pill + email + last synced + Sync now + Disconnect
//
// The Connect button kicks off the mock OAuth flow today; in production it
// will redirect to /api/auth/google/start.
// ---------------------------------------------------------------------------
function GoogleCalendarSection({ user }) {
  const {
    connected, email, calendarName, lastSyncedAt, syncing,
    autoInvite, setAutoInvite,
    connect, disconnect, syncNow,
  } = useGoogleCalendarConnection(user);
  const [connecting, setConnecting] = useState(false);
  // The "auto-invite participants" toggle is only meaningful to users who
  // actually run sessions. Hide it for pure participants.
  const isFacilitator = hasCapability(user, "facilitator");

  async function handleConnect() {
    setConnecting(true);
    try {
      await connect();
    } finally {
      setConnecting(false);
    }
  }

  return (
    <Section title="Google Calendar" icon={CalendarIcon}>
      {!connected ? (
        <div className="space-y-3">
          <p className="text-[12.5px] text-ink-muted leading-relaxed">
            Sync every cohort session to a calendar called{" "}
            <span className="font-heading font-semibold text-ink">"BRAI Sessions"</span> in your Google account.
            Changes you make in BRAI flow to your calendar automatically — including new cohorts, reschedules, and cancellations.
          </p>
          <button
            type="button"
            onClick={handleConnect}
            disabled={connecting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink text-white text-[13px] font-heading font-bold hover:bg-brand-700 transition-colors disabled:bg-ink/40 disabled:cursor-not-allowed"
          >
            {connecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
                Connecting…
              </>
            ) : (
              <>
                <CalendarIcon className="w-4 h-4" strokeWidth={2.5} />
                Connect Google Calendar
              </>
            )}
          </button>
          <p className="text-[11px] text-ink-subtle">
            You'll be redirected to Google to grant calendar access.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50/60 border border-emerald-100 p-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4" strokeWidth={3} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 text-[10.5px] font-heading font-bold uppercase tracking-wider text-emerald-700">
                Connected
              </div>
              <div className="text-[13px] font-heading font-semibold text-ink truncate">
                {email}
              </div>
              <div className="text-[11.5px] text-ink-muted">
                Writing to <span className="font-semibold text-ink">{calendarName}</span>
                {lastSyncedAt && (
                  <>
                    {" · "}
                    Last synced {timeAgoShort(lastSyncedAt)}
                  </>
                )}
              </div>
            </div>
          </div>
          {/* Facilitator-only: auto-invite participants when a session lands
              on the calendar. Today this just flips a setting; production
              wiring (Google Calendar API events.insert with attendees) is
              queued — see docs/admin-visibility-matrix.md follow-ups. */}
          {isFacilitator && (
            <div className="rounded-xl border border-soft bg-surface-card p-3 flex items-start gap-3">
              <button
                type="button"
                onClick={() => setAutoInvite(!autoInvite)}
                aria-pressed={autoInvite}
                className={`shrink-0 mt-0.5 w-9 h-5 rounded-full p-0.5 transition-colors ${
                  autoInvite ? "bg-brand-600" : "bg-ink/15"
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                    autoInvite ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
              <div className="flex-1 min-w-0">
                <div className="font-heading font-bold text-[12.5px] text-ink inline-flex items-center gap-1.5">
                  Auto-invite participants
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[9.5px] font-heading font-bold uppercase tracking-wider">
                    Coming soon
                  </span>
                </div>
                <div className="text-[11.5px] text-ink-muted leading-snug mt-0.5">
                  When you create or reschedule a session, BRAI will add it
                  to your "{calendarName}" calendar with every cohort
                  participant invited — so it lands on their personal
                  calendar with a Zoom link. They can RSVP from there.
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={syncNow}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-50 text-brand-700 text-[12.5px] font-heading font-semibold hover:bg-brand-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {syncing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.5} />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.5} />
              )}
              {syncing ? "Syncing…" : "Sync now"}
            </button>
            <button
              type="button"
              onClick={disconnect}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-heading font-semibold text-ink-muted hover:text-ink hover:bg-surface-soft transition-colors"
            >
              <Link2Off className="w-3.5 h-3.5" strokeWidth={2.5} />
              Disconnect
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}

// Tiny relative-time helper used in the connection card.
function timeAgoShort(iso) {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

function Section({ title, icon: Icon, muted, children }) {
  return (
    <section className="rounded-2xl bg-surface-card border border-soft p-6 shadow-card">
      <div className="flex items-center gap-2.5 mb-5">
        <Icon className={"w-4 h-4 " + (muted ? "text-ink-subtle" : "text-brand-600")} strokeWidth={2} />
        <h2 className="h-eyebrow !mb-0">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, icon: Icon, value, onChange, placeholder, type = "text", readOnly, hint }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
        {label}
      </span>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle pointer-events-none" strokeWidth={2} />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className={
            "w-full pl-10 pr-4 py-2.5 rounded-xl border text-[14px] font-body transition-all " +
            (readOnly
              ? "border-soft bg-surface-paper text-ink-muted cursor-not-allowed"
              : "border-soft bg-surface-card text-ink placeholder:text-ink-subtle focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15")
          }
        />
      </div>
      {hint && <p className="text-[11.5px] text-ink-muted mt-1.5 leading-relaxed">{hint}</p>}
    </label>
  );
}

function TextareaField({ label, value, onChange, placeholder, rows = 3, hint }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body placeholder:text-ink-subtle focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 resize-y leading-relaxed transition-all"
      />
      {hint && <p className="text-[11.5px] text-ink-muted mt-1.5 leading-relaxed">{hint}</p>}
    </label>
  );
}

function TimeZoneField({ label, value, onChange, hint }) {
  // Flatten the grouped time zones into the branded Select's option shape
  // (group is a sibling field on each option; the popover renders one header
  // per distinct group as it walks the array).
  const options = [];
  for (const [group, zones] of groupTimeZones()) {
    for (const z of zones) {
      options.push({ value: z.value, label: z.label, group });
    }
  }
  return (
    <label className="block">
      <span className="block text-[11.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
        {label}
      </span>
      <Select value={value} onChange={onChange} options={options} icon={Globe} />
      {hint && <p className="text-[11.5px] text-ink-muted mt-1.5 leading-relaxed">{hint}</p>}
    </label>
  );
}

function HeadshotPreview({ src, initials, size = 96 }) {
  if (src) {
    return (
      <img
        src={src}
        alt="Headshot preview"
        style={{ width: size, height: size, boxShadow: "0 0 0 3px #FAFAF7, 0 0 0 5px #2563EB" }}
        className="rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div
      className="rounded-full bg-brand-700 text-white flex items-center justify-center font-heading font-bold shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.32), boxShadow: "0 0 0 3px #FAFAF7, 0 0 0 5px #2563EB" }}
    >
      {initials}
    </div>
  );
}
