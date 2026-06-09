import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, UserPlus, Mail, User as UserIcon, Briefcase, Phone,
  Building2, GraduationCap, Crown, Plus, Trash2, Loader2, Check,
  AlertTriangle,
} from "lucide-react";
import { addParticipantsToCohort } from "../../lib/adminMockData";
import { getAllCohortsForAdmin } from "../../lib/cohortAdmin";
import HeadshotUpload from "../HeadshotUpload";

// ---------------------------------------------------------------------------
// ParticipantForm — used by both:
//   /admin/users/new                        (lockedCohortSlug = null)
//   /admin/cohorts/:slug/participants/add   (lockedCohortSlug = slug)
//
// Modes:
//   "one"  — single participant with the full field set
//   "bulk" — paste a list of emails (cohort comes from lockedCohortSlug or the
//            cohort dropdown above)
// ---------------------------------------------------------------------------

export default function ParticipantForm({ lockedCohortSlug = null, defaultCohortSlug = null, redirectOnSuccess }) {
  const navigate = useNavigate();
  const cohorts = useMemo(() => getAllCohortsForAdmin(), []);

  const [mode, setMode] = useState("one");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const initialCohortSlug = lockedCohortSlug || defaultCohortSlug || "";

  // Single-mode state
  const [single, setSingle] = useState({
    email: "",
    name: "",
    title: "",
    organization: "",
    phone: "",
    cohortSlug: initialCohortSlug,
    isCohortLead: false,
    headshotUrl: "",
  });
  const updateSingle = (field, value) =>
    setSingle((f) => ({ ...f, [field]: value }));

  // Bulk-mode state
  const [bulkText, setBulkText] = useState("");
  const [bulkCohortSlug, setBulkCohortSlug] = useState(initialCohortSlug);
  const bulkEmails = useMemo(() => {
    return bulkText
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter((s) => /\S+@\S+\.\S+/.test(s));
  }, [bulkText]);

  const selectedCohort =
    lockedCohortSlug
      ? cohorts.find((c) => c.slug === lockedCohortSlug)
      : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setResult(null);
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 250));
      let res;
      if (mode === "one") {
        if (!single.email.trim()) throw new Error("Email is required.");
        const cohortSlug = lockedCohortSlug || single.cohortSlug || null;
        res = addParticipantsToCohort(cohortSlug, [single]);
      } else {
        if (bulkEmails.length === 0) throw new Error("Paste at least one email.");
        const cohortSlug = lockedCohortSlug || bulkCohortSlug || null;
        res = addParticipantsToCohort(
          cohortSlug,
          bulkEmails.map((email) => ({ email })),
        );
      }
      setResult(res);
      if (res.skipped.length === 0) {
        setTimeout(() => navigate(redirectOnSuccess || "/admin/participants"), 600);
      } else {
        setSaving(false);
      }
    } catch (err) {
      setResult({ error: err.message });
      setSaving(false);
    }
  }

  return (
    <div className="max-w-[820px] mx-auto space-y-6 animate-fade-in-up">
      <Link
        to={lockedCohortSlug ? `/admin/cohorts/${lockedCohortSlug}` : "/admin/participants"}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-heading font-semibold text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
        {selectedCohort ? `Back to ${selectedCohort.name}` : "Back to Participants"}
      </Link>

      <header className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
          <UserPlus className="w-5 h-5" strokeWidth={2} />
        </div>
        <div>
          <div className="h-eyebrow">Admin · Participants</div>
          <h1 className="font-heading text-[26px] lg:text-[30px] font-extrabold tracking-tight text-ink leading-tight">
            {lockedCohortSlug ? "Add participants" : "New participant"}
          </h1>
          <p className="text-[13px] text-ink-muted mt-1">
            {lockedCohortSlug
              ? `Adding to ${selectedCohort?.name || "this cohort"}. Email invites land when auth ships.`
              : "Create a participant. You can assign them to a cohort now or leave them unassigned and add later."}
          </p>
        </div>
      </header>

      {/* Mode toggle */}
      <div className="inline-flex items-center gap-0.5 rounded-full bg-ink/5 p-0.5">
        <ModeButton active={mode === "one"} onClick={() => setMode("one")} label="Add one" />
        <ModeButton active={mode === "bulk"} onClick={() => setMode("bulk")} label="Bulk paste" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {mode === "one" ? (
          <>
            <section className="rounded-2xl bg-surface-card border border-soft p-5 space-y-4">
              <div>
                <div className="text-[10.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
                  Headshot <span className="font-normal normal-case ml-1">optional</span>
                </div>
                <HeadshotUpload
                  value={single.headshotUrl}
                  onChange={(url) => updateSingle("headshotUrl", url || "")}
                  name={single.name || single.email}
                  size="lg"
                />
              </div>
              <Field
                label="Email"
                icon={Mail}
                type="email"
                required
                value={single.email}
                onChange={(v) => updateSingle("email", v)}
                placeholder="name@org.com"
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="Full name"
                  icon={UserIcon}
                  value={single.name}
                  onChange={(v) => updateSingle("name", v)}
                  placeholder="Auto-derived from email if blank"
                />
                <Field
                  label="Role / Title"
                  icon={Briefcase}
                  value={single.title}
                  onChange={(v) => updateSingle("title", v)}
                  placeholder="Director of Education"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="Organization (optional)"
                  icon={Building2}
                  value={single.organization}
                  onChange={(v) => updateSingle("organization", v)}
                  placeholder="Mayo Clinic Education"
                />
                <Field
                  label="Phone (optional)"
                  icon={Phone}
                  type="tel"
                  value={single.phone}
                  onChange={(v) => updateSingle("phone", v)}
                  placeholder="+1 (555) 234-5678"
                />
              </div>
            </section>

            <section className="rounded-2xl bg-surface-card border border-soft p-5 space-y-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-brand-600" strokeWidth={2.25} />
                <h2 className="font-heading text-[12.5px] font-bold uppercase tracking-wider text-ink-muted">
                  Cohort assignment
                </h2>
              </div>
              {lockedCohortSlug && selectedCohort ? (
                <div className="rounded-xl bg-brand-50/40 border border-brand-100 p-4">
                  <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-brand-700">
                    Adding to
                  </div>
                  <div className="font-heading text-[14px] font-bold text-ink mt-0.5">
                    {selectedCohort.name}
                  </div>
                </div>
              ) : (
                <SelectField
                  label="Cohort (optional)"
                  icon={GraduationCap}
                  value={single.cohortSlug}
                  onChange={(v) => updateSingle("cohortSlug", v)}
                  options={[
                    { value: "", label: "No cohort — assign later" },
                    ...cohorts.map((c) => ({ value: c.slug, label: c.name })),
                  ]}
                />
              )}
              <ToggleField
                label="Cohort leader"
                description="Marks this participant as the leader/champion within their cohort — surfaced in admin views."
                icon={Crown}
                checked={single.isCohortLead}
                onChange={(v) => updateSingle("isCohortLead", v)}
              />
            </section>
          </>
        ) : (
          <section className="rounded-2xl bg-surface-card border border-soft p-5 space-y-4">
            {!lockedCohortSlug && (
              <SelectField
                label="Cohort (optional)"
                icon={GraduationCap}
                value={bulkCohortSlug}
                onChange={setBulkCohortSlug}
                options={[
                  { value: "", label: "No cohort — assign later" },
                  ...cohorts.map((c) => ({ value: c.slug, label: c.name })),
                ]}
              />
            )}
            <div>
              <span className="block text-[11.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
                Emails (one per line)
              </span>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={8}
                placeholder={"sarah.patel@iahe.org\nmarcus.w@iahe.org\nhannah.r@mayo.edu"}
                className="w-full px-4 py-3 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body placeholder:text-ink-subtle focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 resize-y leading-relaxed"
              />
              <div className="flex items-center justify-between gap-3 flex-wrap mt-2">
                <p className="text-[12px] text-ink-muted">
                  {bulkEmails.length === 0
                    ? "Paste emails separated by newlines or commas."
                    : `${bulkEmails.length} valid email${bulkEmails.length === 1 ? "" : "s"} detected.`}
                </p>
                {bulkText && (
                  <button
                    type="button"
                    onClick={() => setBulkText("")}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11.5px] font-heading font-semibold text-ink-muted hover:text-ink"
                  >
                    <Trash2 className="w-3 h-3" strokeWidth={2.5} />
                    Clear
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Result */}
        {result?.error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-[13px] font-heading font-medium text-red-700">
            {result.error}
          </div>
        )}
        {result?.added?.length > 0 && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-[13px] text-emerald-800 inline-flex items-center gap-2">
            <Check className="w-4 h-4" strokeWidth={2.5} />
            Added {result.added.length} participant{result.added.length === 1 ? "" : "s"}. Redirecting…
          </div>
        )}
        {result?.skipped?.length > 0 && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[13px] text-amber-800">
            <div className="inline-flex items-center gap-2 font-heading font-semibold mb-1">
              <AlertTriangle className="w-4 h-4" strokeWidth={2.5} />
              Skipped {result.skipped.length}:
            </div>
            <ul className="list-disc ml-5 text-[12.5px] space-y-0.5">
              {result.skipped.map((s, i) => (
                <li key={i}>{s.email} — {s.reason}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Link
            to={lockedCohortSlug ? `/admin/cohorts/${lockedCohortSlug}` : "/admin/participants"}
            className="px-3 py-2 rounded-xl text-[12.5px] font-heading font-semibold text-ink-muted hover:text-ink hover:bg-ink/5 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className={
              "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-heading font-semibold transition-colors " +
              (saving
                ? "bg-brand-600/70 text-white cursor-wait"
                : "bg-brand-600 text-white hover:bg-brand-700")
            }
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.5} />
                Adding…
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                {mode === "one" ? "Add participant" : `Add ${bulkEmails.length || ""} participants`.trim()}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---- Helpers ----

function ModeButton({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-3 py-1.5 rounded-full text-[12.5px] font-heading font-semibold transition-colors " +
        (active ? "bg-ink text-white shadow-sm" : "text-ink-muted hover:text-ink")
      }
    >
      {label}
    </button>
  );
}

function Field({ label, icon: Icon, value, onChange, placeholder, type = "text", required }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
        {label}
        {required && <span className="text-brand-600 ml-1">*</span>}
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
          required={required}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body placeholder:text-ink-subtle focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all"
        />
      </div>
    </label>
  );
}

function SelectField({ label, icon: Icon, value, onChange, options }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
        {label}
      </span>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle pointer-events-none" strokeWidth={2} />
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all appearance-none"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </label>
  );
}

function ToggleField({ label, description, icon: Icon, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={
        "w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all " +
        (checked
          ? "bg-brand-50/40 border-brand-200"
          : "bg-surface-card border-soft hover:border-brand-200")
      }
    >
      <div className={
        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 " +
        (checked ? "bg-brand-600 text-white" : "bg-ink/5 text-ink-muted")
      }>
        {Icon && <Icon className="w-4 h-4" strokeWidth={2.25} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-heading text-[13.5px] font-bold text-ink">{label}</div>
        {description && (
          <div className="text-[11.5px] text-ink-muted leading-relaxed mt-0.5">{description}</div>
        )}
      </div>
      <div className={
        "shrink-0 w-9 h-5 rounded-full p-0.5 transition-colors " +
        (checked ? "bg-brand-600" : "bg-ink/15")
      }>
        <div className={
          "w-4 h-4 rounded-full bg-white transition-transform " +
          (checked ? "translate-x-4" : "translate-x-0")
        } />
      </div>
    </button>
  );
}
