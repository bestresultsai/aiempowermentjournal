import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  User, Mail, Phone, Briefcase, Building2, Camera, ArrowRight, Check, GraduationCap,
} from "lucide-react";
import NavBar from "../components/NavBar";
import { useAuth } from "../context/AuthContext";
import { getUserCohorts } from "../lib/cohortResolution";

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
    title: user?.title || "",               // captured during onboarding
    phone: "",                              // not in JWT today; editable
    organization: user?.organization || "",
    headshotPreview: user?.headshotUrl || null,
  });
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
    // Prototype stub. Wire to a real endpoint once the Notion Users DB supports writes.
    await new Promise((r) => setTimeout(r, 700));
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2400);
  }

  const cohorts = getUserCohorts(user);
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
                placeholder="Josue Acuna"
              />
              <Field
                label="Title"
                icon={Briefcase}
                value={form.title}
                onChange={(v) => update("title", v)}
                placeholder="Director of AI Strategy"
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
              placeholder="Iowa Methodist Healthcare"
            />
          </Section>

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
