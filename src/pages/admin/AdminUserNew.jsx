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

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [phone, setPhone] = useState("");
  const [headshotUrl, setHeadshotUrl] = useState("");
  const [capabilities, setCapabilities] = useState(new Set(["participant"]));
  const [cohortSlug, setCohortSlug] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
    if (!name.trim()) return setError("Name is required.");
    if (!email.trim() || !isValidEmail(email)) {
      return setError("A valid email is required.");
    }
    if (capabilities.size === 0) return setError("Pick at least one role.");

    setSaving(true);
    await new Promise((r) => setTimeout(r, 250));
    const result = createStandaloneUser({
      name,
      email,
      title,
      organization,
      phone,
      headshotUrl,
      capabilities: [...capabilities],
      cohortSlug: hasParticipant ? (cohortSlug || null) : null,
    });
    if (result.errors.length) {
      setError(result.errors.join(" "));
      setSaving(false);
      return;
    }
    // Land on the new user's profile so the admin can verify + tweak.
    navigate(`/admin/participants/${result.user.id}`);
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
        {/* Identity */}
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
              <select
                value={cohortSlug}
                onChange={(e) => setCohortSlug(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-soft text-[13px] font-heading font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="">— Unassigned —</option>
                {cohorts.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name} {c.organization?.shortName ? `(${c.organization.shortName})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </section>
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
                Create user
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
