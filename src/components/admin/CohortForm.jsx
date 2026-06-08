import { useEffect, useState } from "react";
import {
  Building2, GraduationCap, User, Calendar, Save, Loader2, ArrowLeft, Trash2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { BELT_COLORS, MOCK_SESSIONS } from "../../lib/mockCohort";
import {
  slugify,
  defaultSessionDates,
  createCohort,
  updateCohort,
  archiveCohort,
} from "../../lib/cohortAdmin";

// ---------------------------------------------------------------------------
// CohortForm — shared between /admin/cohorts/new and /admin/cohorts/:slug/edit.
//
// Props:
//   mode:        "create" | "edit"
//   initial:     existing cohort to pre-fill (edit mode)
//   orgs:        list of orgs available to assign
//   facilitators: list of facilitators available to assign
//   canArchive:  whether to render the Archive button (edit mode only)
// ---------------------------------------------------------------------------

export default function CohortForm({ mode, initial = null, orgs, facilitators, canArchive }) {
  const isCreate = mode === "create";
  const navigate = useNavigate();

  const [form, setForm] = useState(() => ({
    name: initial?.name || "",
    slug: initial?.slug || "",
    programCode: initial?.programCode || "AIEW3",
    methodName: initial?.methodName || "AI Empowerment Method",
    organizationId: initial?.organization?.id || (orgs[0]?.id ?? ""),
    facilitatorId: initial?.facilitator?.id || (facilitators[0]?.id ?? ""),
    sessionDates: initial?.sessions?.map((s) => s.date) || defaultSessionDates(),
  }));
  const [slugTouched, setSlugTouched] = useState(!isCreate);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Auto-derive slug from name while the user hasn't edited it themselves.
  useEffect(() => {
    if (isCreate && !slugTouched) {
      setForm((f) => ({ ...f, slug: slugify(f.name) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function setSessionDate(index, value) {
    setForm((f) => {
      const copy = [...f.sessionDates];
      copy[index] = value;
      return { ...f, sessionDates: copy };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      // Tiny artificial delay so the spinner is visible.
      await new Promise((r) => setTimeout(r, 350));
      if (isCreate) {
        const cohort = createCohort(form, { orgs, facilitators });
        navigate(`/admin/cohorts/${cohort.slug}`);
      } else {
        const cohort = updateCohort(initial.slug, form, { orgs, facilitators });
        navigate(`/admin/cohorts/${cohort.slug}`);
      }
    } catch (err) {
      setError(err.message || "Couldn't save the cohort.");
      setSaving(false);
    }
  }

  function handleArchive() {
    if (!initial?.slug) return;
    if (!window.confirm(`Archive "${initial.name}"? Participants will no longer see this cohort.`)) {
      return;
    }
    archiveCohort(initial.slug);
    navigate("/admin/cohorts");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up">
      {/* Back link */}
      <Link
        to={isCreate ? "/admin/cohorts" : `/admin/cohorts/${initial.slug}`}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-heading font-semibold text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
        {isCreate ? "All cohorts" : `Back to ${initial.name}`}
      </Link>

      {/* Header */}
      <header className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
          <GraduationCap className="w-5 h-5" strokeWidth={2} />
        </div>
        <div>
          <div className="h-eyebrow">Admin · Cohort</div>
          <h1 className="font-heading text-[26px] lg:text-[30px] font-extrabold tracking-tight text-ink leading-tight">
            {isCreate ? "New cohort" : `Edit ${initial.name}`}
          </h1>
          <p className="text-[13px] text-ink-muted mt-1">
            {isCreate
              ? "Create a cohort and schedule its 8 sessions. Participants you assign later will see it in their Journey."
              : "Adjust the cohort's facilitator, branding, and session dates."}
          </p>
        </div>
      </header>

      {/* Basics */}
      <Section title="Basics" icon={GraduationCap}>
        <Field
          label="Cohort name"
          required
          value={form.name}
          onChange={(v) => set("name", v)}
          placeholder="AIEW3 — IAHE Cohort"
          hint="Shown to participants in their app + on the admin views."
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Slug"
            required
            value={form.slug}
            onChange={(v) => { set("slug", v); setSlugTouched(true); }}
            placeholder="iahe-aiew3-2026q1"
            hint="Used in URLs. Lowercase letters, numbers, dashes only."
            readOnly={!isCreate}
          />
          <Field
            label="Program code"
            required
            value={form.programCode}
            onChange={(v) => set("programCode", v)}
            placeholder="AIEW3"
          />
        </div>
        <Field
          label="Method name"
          value={form.methodName}
          onChange={(v) => set("methodName", v)}
          placeholder="AI Empowerment Method"
          hint="The framework label shown above the program code in the cohort header."
        />
      </Section>

      {/* Organization + Facilitator */}
      <Section title="Assignment" icon={Building2}>
        <div className="grid sm:grid-cols-2 gap-4">
          <SelectField
            label="Organization"
            icon={Building2}
            value={form.organizationId}
            onChange={(v) => set("organizationId", v)}
            options={orgs.map((o) => ({ value: o.id, label: o.name }))}
          />
          <SelectField
            label="Facilitator"
            icon={User}
            value={form.facilitatorId}
            onChange={(v) => set("facilitatorId", v)}
            options={facilitators.map((f) => ({ value: f.id, label: f.name }))}
          />
        </div>
      </Section>

      {/* Sessions */}
      <Section title="Session schedule" icon={Calendar}>
        <p className="text-[12.5px] text-ink-muted mb-4 leading-relaxed">
          Dates for the cohort's 8 belt-ranked sessions. Defaults to one per week
          on Wednesdays — edit any date below.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {MOCK_SESSIONS.map((s, i) => {
            const belt = BELT_COLORS[s.belt];
            return (
              <label key={s.order} className="flex items-center gap-3 p-3 rounded-xl border border-soft bg-surface-card">
                <div
                  style={{
                    background: belt?.gradient,
                    color: belt?.contrast,
                    border: belt?.needsBorder ? "1px solid #D1D5DB" : "none",
                  }}
                  className="w-9 h-9 rounded-lg flex items-center justify-center font-heading font-extrabold text-[13px] shrink-0"
                >
                  {s.order}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
                    {s.belt} belt
                  </div>
                  <input
                    type="date"
                    value={form.sessionDates[i] || ""}
                    onChange={(e) => setSessionDate(i, e.target.value)}
                    required
                    className="w-full mt-0.5 bg-transparent border-0 p-0 text-[13.5px] font-heading font-semibold text-ink focus:outline-none focus:ring-0"
                  />
                </div>
              </label>
            );
          })}
        </div>
      </Section>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-[13px] font-heading font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
        <div>
          {!isCreate && canArchive && (
            <button
              type="button"
              onClick={handleArchive}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-white text-[12.5px] font-heading font-semibold text-red-700 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
              Archive cohort
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={isCreate ? "/admin/cohorts" : `/admin/cohorts/${initial.slug}`}
            className="px-3 py-2 rounded-xl text-[12.5px] font-heading font-semibold text-ink-muted hover:text-ink hover:bg-ink/5 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className={
              "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-heading font-semibold transition-all duration-200 " +
              (saving
                ? "bg-brand-600/70 text-white cursor-wait"
                : "bg-brand-600 text-white hover:bg-brand-700")
            }
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.5} />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" strokeWidth={2.5} />
                {isCreate ? "Create cohort" : "Save changes"}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

// ---- Helpers ----

function Section({ title, icon: Icon, children }) {
  return (
    <section className="rounded-2xl bg-surface-card border border-soft p-5 space-y-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-brand-600" strokeWidth={2.25} />}
        <h2 className="font-heading text-[12.5px] font-bold uppercase tracking-wider text-ink-muted">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, icon: Icon, value, onChange, placeholder, hint, required, readOnly }) {
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
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className={
            "w-full py-2.5 rounded-xl border text-[14px] font-body transition-all " +
            (Icon ? "pl-10 pr-4" : "px-4") + " " +
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

function SelectField({ label, icon: Icon, value, onChange, options }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
        {label}
        <span className="text-brand-600 ml-1">*</span>
      </span>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle pointer-events-none" strokeWidth={2} />
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={
            "w-full py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all appearance-none " +
            (Icon ? "pl-10 pr-8" : "px-4")
          }
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </label>
  );
}
