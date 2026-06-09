import { useMemo, useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import {
  ArrowLeft, UserPlus, Mail, User as UserIcon, Briefcase, Phone, Building2,
  GraduationCap, Crown, Shield, Users, Check, AlertTriangle, Loader2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { canAssignRoles, canManageRoles } from "../../lib/adminRoles";
import { createStandaloneUser } from "../../lib/adminMockData";
import { getAllCohortsForAdmin } from "../../lib/cohortAdmin";
import { LIMITS, isValidEmail } from "../../lib/inputValidation";
import HeadshotUpload from "../../components/HeadshotUpload";
import Select from "../../components/Select";
import {
  COUNTRY_OPTIONS,
  getStateOptionsForCountry,
  getTimeZoneForLocation,
  formatLocation,
} from "../../lib/locationToTimeZone";
import { MapPin, Globe } from "lucide-react";

// ---------------------------------------------------------------------------
// /admin/users/new — unified user creation.
//
// In the new mental model, "Users" is the root concept. Everyone is a User
// who carries one or more capabilities — Participant, Cohort Leader,
// Facilitator, Org Admin, Admin, Super Admin.
//
// This page replaces the old /admin/users/new participant-only form. To make
// a participant you also tick the Participant role; to make a pure admin
// you only tick Admin and skip the cohort assignment.
//
// Role gating:
//   - Super + Admin can create most roles
//   - Only Super can grant the Super capability
// ---------------------------------------------------------------------------

const ROLE_CHOICES = [
  {
    key: "participant",
    label: "Participant",
    desc: "Enrolls in cohorts, logs Journal entries, submits homework.",
    icon: Users,
    color: "brand",
  },
  {
    key: "cohort-leader",
    label: "Cohort Leader",
    desc: "Sees their cohort's aggregate dashboard. Implies Participant.",
    icon: Crown,
    color: "amber",
  },
  {
    key: "facilitator",
    label: "Facilitator",
    desc: "Leads live cohort sessions and grades homework.",
    icon: GraduationCap,
    color: "emerald",
  },
  {
    key: "org",
    label: "Org Admin",
    desc: "Manages cohorts within their organization.",
    icon: Building2,
    color: "brand",
  },
  {
    key: "admin",
    label: "Admin",
    desc: "BRAI staff. Manages cohorts, participants, facilitators.",
    icon: Shield,
    color: "brand",
  },
  {
    key: "super",
    label: "Super Admin",
    desc: "Founder-level. Manages roles + system settings.",
    icon: Shield,
    color: "purple",
    superOnly: true,
  },
];

const COLOR_CLASSES = {
  brand:   { selBg: "bg-brand-50",   selBorder: "border-brand-400", selText: "text-brand-700",  iconBg: "bg-brand-100",   iconText: "text-brand-700" },
  amber:   { selBg: "bg-amber-50",   selBorder: "border-amber-400", selText: "text-amber-800",  iconBg: "bg-amber-100",   iconText: "text-amber-800" },
  emerald: { selBg: "bg-emerald-50", selBorder: "border-emerald-400", selText: "text-emerald-700", iconBg: "bg-emerald-100", iconText: "text-emerald-700" },
  purple:  { selBg: "bg-purple-50",  selBorder: "border-purple-400", selText: "text-purple-700", iconBg: "bg-purple-100",  iconText: "text-purple-700" },
};

export default function AdminUserNew() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!canAssignRoles(user)) {
    return <Navigate to="/admin" replace />;
  }
  const isSuper = canManageRoles(user);
  const cohorts = useMemo(() => getAllCohortsForAdmin(), []);

  // "one" — full identity form for a single user
  // "bulk" — paste a list of emails, apply same roles + optional cohort to all
  const [mode, setMode] = useState("one");

  // Single-mode state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [phone, setPhone] = useState("");
  const [headshotUrl, setHeadshotUrl] = useState("");
  // Location (single mode only — bulk paste keeps it light).
  const [country, setCountry] = useState("US");
  const [stateCode, setStateCode] = useState("");
  const [city, setCity] = useState("");
  // Auto-derived from country + state.
  const defaultTimeZone = useMemo(
    () => getTimeZoneForLocation({ country, state: stateCode }),
    [country, stateCode],
  );
  const stateOptions = useMemo(() => getStateOptionsForCountry(country), [country]);

  // Bulk-mode state
  const [bulkText, setBulkText] = useState("");
  const bulkEmails = useMemo(() => {
    return bulkText
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter((s) => isValidEmail(s));
  }, [bulkText]);

  // Shared
  const [capabilities, setCapabilities] = useState(new Set(["participant"]));
  const [cohortSlug, setCohortSlug] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  function toggleCap(key) {
    setCapabilities((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        // Cohort Leader implies Participant.
        if (key === "cohort-leader") next.add("participant");
      }
      return next;
    });
  }

  const hasParticipant = capabilities.has("participant");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBulkResult(null);
    if (capabilities.size === 0) return setError("Pick at least one role.");
    setSaving(true);
    await new Promise((r) => setTimeout(r, 250));

    if (mode === "one") {
      if (!name.trim()) {
        setSaving(false);
        return setError("Name is required.");
      }
      if (!email.trim() || !isValidEmail(email)) {
        setSaving(false);
        return setError("A valid email is required.");
      }
      const result = createStandaloneUser({
        name,
        email,
        title,
        organization,
        phone,
        headshotUrl,
        capabilities: [...capabilities],
        cohortSlug: hasParticipant ? (cohortSlug || null) : null,
        location: { country, state: stateCode, city },
        defaultTimeZone,
      });
      if (result.errors.length) {
        setError(result.errors.join(" "));
        setSaving(false);
        return;
      }
      // Land on the new user's profile so the admin can verify + tweak.
      navigate(`/admin/participants/${result.user.id}`);
      return;
    }

    // Bulk mode — one createStandaloneUser per parsed email.
    if (bulkEmails.length === 0) {
      setSaving(false);
      return setError("Paste at least one valid email.");
    }
    const added = [];
    const skipped = [];
    for (const e of bulkEmails) {
      const r = createStandaloneUser({
        name: e.split("@")[0], // best-effort placeholder name from email
        email: e,
        capabilities: [...capabilities],
        cohortSlug: hasParticipant ? (cohortSlug || null) : null,
      });
      if (r.user) added.push(r.user);
      else skipped.push({ email: e, reason: r.errors.join(" ") });
    }
    setBulkResult({ added, skipped });
    setSaving(false);
    if (skipped.length === 0 && added.length > 0) {
      // All clean — go to the Users page so the admin sees them in the directory.
      setTimeout(() => navigate("/admin/users"), 800);
    }
  }

  return (
    <div className="max-w-[820px] mx-auto space-y-6 animate-fade-in-up">
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-1.5 text-[12.5px] font-heading font-semibold text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
        Back to Users
      </Link>

      <div>
        <div className="h-eyebrow">Admin · Users · New</div>
        <h1 className="font-heading text-[28px] lg:text-[34px] font-extrabold tracking-tight text-ink leading-tight">
          New user
        </h1>
        <p className="text-[14px] text-ink-muted mt-1.5 max-w-2xl">
          Create a new user and assign one or more roles. A user with the
          Participant role can be added to a cohort below. Facilitator and
          Admin roles don't require a cohort assignment.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Mode toggle — Single vs Bulk paste. */}
        <div className="inline-flex bg-surface-soft border border-soft rounded-xl p-1 gap-1">
          <ModeButton active={mode === "one"} onClick={() => setMode("one")}>
            Single user
          </ModeButton>
          <ModeButton active={mode === "bulk"} onClick={() => setMode("bulk")}>
            Bulk paste
          </ModeButton>
        </div>

        {/* Bulk paste — list of emails. */}
        {mode === "bulk" && (
          <section className="rounded-2xl bg-surface-card border border-soft p-5 space-y-3">
            <SectionTitle>Paste emails</SectionTitle>
            <p className="text-[12.5px] text-ink-muted -mt-1">
              One per line, or comma-separated. We'll create one user per email
              and apply the roles + cohort below to all of them. Names are
              guessed from the email and can be edited later.
            </p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={6}
              placeholder="jane@acme.com&#10;ravi@acme.com&#10;sam@acme.com"
              className="w-full px-3 py-2 rounded-lg bg-white border border-soft text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-brand-300 font-mono"
            />
            <div className="text-[12px] text-ink-muted">
              {bulkEmails.length === 0
                ? "No valid emails yet."
                : `${bulkEmails.length} valid email${bulkEmails.length === 1 ? "" : "s"} parsed.`}
            </div>
          </section>
        )}

        {/* Identity — only in single mode. */}
        {mode === "one" && (
        <section className="rounded-2xl bg-surface-card border border-soft p-5 space-y-4">
          <SectionTitle>Identity</SectionTitle>
          <div>
            <div className="text-[10.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
              Headshot <span className="font-normal normal-case ml-1">optional</span>
            </div>
            <HeadshotUpload
              value={headshotUrl}
              onChange={(url) => setHeadshotUrl(url || "")}
              name={name || email}
              size="lg"
            />
          </div>
          <Field
            label="Email"
            icon={Mail}
            type="email"
            required
            value={email}
            onChange={setEmail}
            placeholder="name@org.com"
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="Full name"
              icon={UserIcon}
              required
              value={name}
              onChange={setName}
              placeholder="Jane Smith"
            />
            <Field
              label="Role / Title"
              icon={Briefcase}
              value={title}
              onChange={setTitle}
              placeholder="Senior Designer"
            />
            <Field
              label="Organization"
              icon={Building2}
              value={organization}
              onChange={setOrganization}
              placeholder="Acme Corp"
            />
            <Field
              label="Phone"
              icon={Phone}
              value={phone}
              onChange={setPhone}
              placeholder="(optional)"
            />
          </div>
        </section>
        )}

        {/* Location — single mode only. Drives default time zone for the user. */}
        {mode === "one" && (
        <section className="rounded-2xl bg-surface-card border border-soft p-5 space-y-4">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-ink-muted" strokeWidth={2.5} />
            <SectionTitle>Location</SectionTitle>
          </div>
          <p className="text-[12.5px] text-ink-muted -mt-2 leading-relaxed">
            Used to set this user's default time zone for session reminders.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-[10.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
                Country
              </div>
              <Select
                value={country}
                onChange={(v) => {
                  setCountry(v);
                  setStateCode("");
                }}
                options={COUNTRY_OPTIONS}
              />
            </div>
            <div>
              <div className="text-[10.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
                {country === "CA" ? "Province" : "State"}
              </div>
              {stateOptions.length > 0 ? (
                <Select
                  value={stateCode}
                  onChange={setStateCode}
                  placeholder="— Pick one —"
                  options={[{ value: "", label: "— Pick one —" }, ...stateOptions]}
                />
              ) : (
                <Field label="" value={stateCode} onChange={setStateCode} placeholder="(Optional)" />
              )}
            </div>
          </div>
          <Field label="City" value={city} onChange={setCity} placeholder="Austin" />
          <div className="rounded-xl border border-soft bg-surface-soft px-3 py-2 inline-flex items-center gap-2 text-[12px] text-ink-muted">
            <Globe className="w-3.5 h-3.5" strokeWidth={2.5} />
            Default time zone:
            <span className="font-heading font-bold text-ink">{defaultTimeZone}</span>
          </div>
        </section>
        )}

        {/* Roles */}
        <section className="rounded-2xl bg-surface-card border border-soft p-5 space-y-4">
          <SectionTitle>Roles</SectionTitle>
          <p className="text-[12.5px] text-ink-muted -mt-2">
            A user can hold multiple roles. Cohort Leader implies Participant.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {ROLE_CHOICES.map((choice) => {
              if (choice.superOnly && !isSuper) return null;
              const selected = capabilities.has(choice.key);
              const colors = COLOR_CLASSES[choice.color];
              const Icon = choice.icon;
              return (
                <button
                  key={choice.key}
                  type="button"
                  onClick={() => toggleCap(choice.key)}
                  className={`text-left rounded-xl border-2 p-3 flex items-start gap-3 transition-all ${
                    selected
                      ? `${colors.selBg} ${colors.selBorder}`
                      : "bg-white border-soft hover:border-ink/20"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${selected ? colors.iconBg : "bg-surface-soft"}`}>
                    <Icon className={`w-4 h-4 ${selected ? colors.iconText : "text-ink-muted"}`} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-heading font-bold text-[13.5px] inline-flex items-center gap-1.5 ${selected ? colors.selText : "text-ink"}`}>
                      {choice.label}
                      {selected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                    </div>
                    <div className="text-[11.5px] text-ink-muted mt-0.5 leading-snug">
                      {choice.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Cohort assignment — only if Participant role is selected */}
        {hasParticipant && (
          <section className="rounded-2xl bg-surface-card border border-soft p-5 space-y-4">
            <SectionTitle>Cohort assignment</SectionTitle>
            <p className="text-[12.5px] text-ink-muted -mt-2">
              Optionally assign to a cohort now. You can also leave them
              unassigned and add to a cohort later.
            </p>
            <div>
              <div className="text-[10.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
                Cohort
              </div>
              <Select
                value={cohortSlug}
                onChange={setCohortSlug}
                placeholder="— Unassigned —"
                options={[
                  { value: "", label: "— Unassigned —" },
                  ...cohorts.map((c) => ({
                    value: c.slug,
                    label: c.name,
                    hint: c.organization?.shortName || "",
                  })),
                ]}
              />
            </div>
          </section>
        )}

        {bulkResult && (
          <div className="rounded-2xl bg-surface-card border border-soft p-4 space-y-2">
            <div className="font-heading text-[13px] font-extrabold text-ink inline-flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" strokeWidth={3} />
              Created {bulkResult.added.length} user{bulkResult.added.length === 1 ? "" : "s"}
              {bulkResult.skipped.length > 0 && (
                <span className="text-ink-muted font-semibold">
                  · skipped {bulkResult.skipped.length}
                </span>
              )}
            </div>
            {bulkResult.skipped.length > 0 && (
              <ul className="space-y-1 text-[12px]">
                {bulkResult.skipped.map((s) => (
                  <li key={s.email} className="flex items-start gap-1.5 text-ink-muted">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span><span className="font-semibold text-ink">{s.email}</span> — {s.reason}</span>
                  </li>
                ))}
              </ul>
            )}
            {bulkResult.skipped.length === 0 && (
              <div className="text-[12px] text-ink-muted">Heading to the Users directory…</div>
            )}
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 inline-flex items-center gap-2 text-[12.5px] text-rose-700">
            <AlertTriangle className="w-4 h-4" strokeWidth={2.5} />
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 sticky bottom-4 bg-white/95 backdrop-blur rounded-xl border border-soft p-3 shadow-sm">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-heading font-bold hover:bg-brand-700 transition-colors disabled:bg-brand-300 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" strokeWidth={2.5} />
                {mode === "bulk"
                  ? `Create ${bulkEmails.length || ""} user${bulkEmails.length === 1 ? "" : "s"}`.trim()
                  : "Create user"}
              </>
            )}
          </button>
          <Link
            to="/admin/users"
            className="px-3 py-2 rounded-lg text-[12.5px] font-heading font-semibold text-ink-muted hover:text-ink hover:bg-surface-soft transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function ModeButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-[12.5px] font-heading font-bold transition-colors ${
        active
          ? "bg-white border border-soft text-ink shadow-sm"
          : "text-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="font-heading text-[15px] font-extrabold text-ink">
      {children}
    </div>
  );
}

function Field({ label, icon: Icon, type = "text", value, onChange, placeholder, required }) {
  const max = type === "email" ? LIMITS.email : LIMITS.shortText;
  return (
    <div>
      <div className="text-[10.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
        {label}
        {required && <span className="text-rose-600 ml-1">*</span>}
      </div>
      <div className="relative">
        {Icon && (
          <Icon className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2.5} />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, max))}
          placeholder={placeholder}
          maxLength={max}
          className={`w-full ${Icon ? "pl-8" : "pl-3"} pr-3 py-2 rounded-lg bg-white border border-soft text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-brand-300`}
        />
      </div>
    </div>
  );
}
