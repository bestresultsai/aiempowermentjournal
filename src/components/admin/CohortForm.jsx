import { useEffect, useMemo, useState } from "react";
import {
  Building2, GraduationCap, User, Calendar, Save, Loader2, ArrowLeft,
  Trash2, Globe, Lock, Plus, X, Repeat, Video, ChevronDown, ChevronUp,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { BELT_COLORS, MOCK_SESSIONS } from "../../lib/mockCohort";
import {
  slugify,
  createCohort,
  updateCohort,
  archiveCohort,
  createOrganization,
  cohortNameFor,
  getNextOpenCohortNumber,
  getNextOrgCohortNumber,
  defaultSessionSchedule,
  formatDatetimeLocal,
} from "../../lib/cohortAdmin";
import { PROGRAMS, getProgramByCode } from "../../lib/programs";
import { useAuth } from "../../context/AuthContext";
import DateTimeField from "./DateTimeField";
import FacilitatorPicker from "./FacilitatorPicker";

function groupTimeZones() {
  const groups = {};
  for (const z of TIME_ZONES) {
    if (!groups[z.group]) groups[z.group] = [];
    groups[z.group].push(z);
  }
  return Object.entries(groups);
}

// ---------------------------------------------------------------------------
// CohortForm — shared between /admin/cohorts/new and /admin/cohorts/:slug/edit.
//
// Sections:
//   1. Type — Open (no org) or Closed (tied to an org)
//   2. Basics — Program (named), Organization (with "Add new" inline), auto-name
//   3. Assignment — Facilitator
//   4. Schedule — Start datetime + cadence drives 8 sessions; each is editable
//
// All writes go through cohortAdmin.js which emits change events; pages
// subscribed via useCohortVersion refresh automatically.
// ---------------------------------------------------------------------------

const CADENCE_OPTIONS = [
  { value: 7,  label: "Weekly" },
  { value: 14, label: "Every 2 weeks" },
  { value: 21, label: "Every 3 weeks" },
  { value: 28, label: "Monthly (every 4 weeks)" },
  { value: 0,  label: "Custom — set each session" },
];

// Curated list of common cohort time zones. When real data ships, this can
// be expanded — we have facilitators across most US zones plus UK/EU/AU.
const TIME_ZONES = [
  { group: "US",            value: "America/New_York",     label: "Eastern (New York)" },
  { group: "US",            value: "America/Chicago",      label: "Central (Chicago)" },
  { group: "US",            value: "America/Denver",       label: "Mountain (Denver)" },
  { group: "US",            value: "America/Los_Angeles",  label: "Pacific (Los Angeles)" },
  { group: "US",            value: "America/Phoenix",      label: "Arizona (Phoenix)" },
  { group: "Americas",      value: "America/Mexico_City",  label: "Mexico City" },
  { group: "Americas",      value: "America/Sao_Paulo",    label: "São Paulo" },
  { group: "Europe",        value: "Europe/London",        label: "London" },
  { group: "Europe",        value: "Europe/Berlin",        label: "Central Europe (Berlin)" },
  { group: "Europe",        value: "Europe/Madrid",        label: "Madrid" },
  { group: "Middle East",   value: "Asia/Dubai",           label: "Dubai" },
  { group: "Asia",          value: "Asia/Singapore",       label: "Singapore" },
  { group: "Asia",          value: "Asia/Tokyo",           label: "Tokyo" },
  { group: "Australia",     value: "Australia/Sydney",     label: "Sydney" },
  { group: "Other",         value: "UTC",                  label: "UTC" },
];

function guessLocalTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/New_York";
  }
}

export default function CohortForm({ mode, initial = null, orgs: passedOrgs, facilitators, canArchive }) {
  const isCreate = mode === "create";
  const navigate = useNavigate();
  const { user } = useAuth();

  // Orgs are stateful because creating a new one here adds to the list.
  const [orgs, setOrgs] = useState(passedOrgs);

  // ---- Form state ----
  // Initial facilitator: prefer the existing one (edit), else the logged-in
  // user if they're a facilitator in the list, else the first available.
  const initialFacilitatorId =
    initial?.facilitator?.id ||
    facilitators.find((f) => f.email && user?.email && f.email.toLowerCase() === user.email.toLowerCase())?.id ||
    facilitators[0]?.id ||
    "";
  const initialFacilitator = facilitators.find((f) => f.id === initialFacilitatorId);

  const [form, setForm] = useState(() => ({
    cohortType: initial?.cohortType || (initial?.organization ? "closed" : "closed"),
    programCode: initial?.programCode || PROGRAMS[0]?.code || "",
    organizationId: initial?.organization?.id || (passedOrgs[0]?.id ?? ""),
    facilitatorId: initialFacilitatorId,
    slug: initial?.slug || "",
    name: initial?.name || "",
    startDateTime: initial?.sessions?.[0]?.date
      ? toDatetimeLocal(initial.sessions[0].date)
      : defaultStartDateTime(),
    cadenceDays: 7,
    // Time zone: prefer existing → logged-in user's default → detected local.
    timeZone: initial?.timeZone || user?.defaultTimeZone || guessLocalTimeZone(),
    // Cohort Zoom link: prefer existing → initial facilitator's default → user's default.
    zoomLink:
      initial?.zoomLink ||
      initialFacilitator?.defaultZoomLink ||
      user?.defaultZoomLink ||
      "",
    sessionDates: initial?.sessions?.map((s) => toDatetimeLocal(s.date)) || [],
    sessionZoomLinks: initial?.sessions?.map((s) => s.zoomLink || "") || Array(8).fill(""),
  }));
  const [zoomLinkTouched, setZoomLinkTouched] = useState(!isCreate);
  const [slugTouched, setSlugTouched] = useState(!isCreate);
  const [nameTouched, setNameTouched] = useState(!isCreate);

  // ---- Inline "create new org" UI ----
  const [showNewOrgInline, setShowNewOrgInline] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgShortName, setNewOrgShortName] = useState("");
  const [newOrgError, setNewOrgError] = useState(null);

  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // ---- Derived: program + org objects ----
  const selectedProgram = useMemo(
    () => getProgramByCode(form.programCode),
    [form.programCode],
  );
  const selectedOrg = useMemo(
    () => orgs.find((o) => o.id === form.organizationId),
    [orgs, form.organizationId],
  );

  // ---- Derived: auto-name ----
  // For closed cohorts, suffix depends on existing cohorts at the same org+program.
  // For open cohorts, sequence is the next "Open Cohort N" number.
  const sequenceNumber = useMemo(() => {
    if (!isCreate) return null;
    if (form.cohortType === "open") return getNextOpenCohortNumber();
    if (!form.organizationId || !form.programCode) return null;
    return getNextOrgCohortNumber(form.organizationId, form.programCode);
  }, [isCreate, form.cohortType, form.organizationId, form.programCode]);

  const autoName = useMemo(() => {
    return cohortNameFor({
      cohortType: form.cohortType,
      programCode: form.programCode,
      organization: selectedOrg,
      sequenceNumber: sequenceNumber || 1,
    });
  }, [form.cohortType, form.programCode, selectedOrg, sequenceNumber]);

  // ---- Auto-fill name (until user touches it) ----
  useEffect(() => {
    if (!nameTouched) setForm((f) => ({ ...f, name: autoName }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoName]);

  // ---- Auto-fill slug from name (until user touches it) ----
  useEffect(() => {
    if (isCreate && !slugTouched) {
      setForm((f) => ({ ...f, slug: slugify(f.name) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name]);

  // ---- Auto-fill cohort Zoom link from facilitator's default ----
  // Only runs while the user hasn't manually edited the link.
  useEffect(() => {
    if (zoomLinkTouched) return;
    const fac = facilitators.find((f) => f.id === form.facilitatorId);
    const link = fac?.defaultZoomLink || user?.defaultZoomLink || "";
    setForm((f) => ({ ...f, zoomLink: link }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.facilitatorId]);

  // ---- Auto-fill session schedule from start datetime + cadence ----
  // Custom cadence (0) populates only session 1 and leaves the rest for the
  // user to set by hand. Other cadences populate all 8.
  useEffect(() => {
    if (!form.startDateTime) return;
    setForm((f) => {
      if (f.cadenceDays === 0) {
        // Set session 1 to startDateTime; preserve any existing later dates.
        const dates = [...(f.sessionDates.length ? f.sessionDates : Array(8).fill(""))];
        dates[0] = f.startDateTime;
        return { ...f, sessionDates: dates };
      }
      return {
        ...f,
        sessionDates: defaultSessionSchedule(f.startDateTime, f.cadenceDays, 8),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.startDateTime, form.cadenceDays]);

  // ---- Helpers ----
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

  function handleCreateOrg() {
    setNewOrgError(null);
    try {
      const created = createOrganization({
        name: newOrgName,
        shortName: newOrgShortName || newOrgName,
      });
      setOrgs((prev) => [...prev, created]);
      set("organizationId", created.id);
      setShowNewOrgInline(false);
      setNewOrgName("");
      setNewOrgShortName("");
    } catch (e) {
      setNewOrgError(e.message);
    }
  }

  // ---- Submit ----
  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      const payload = {
        cohortType: form.cohortType,
        slug: form.slug,
        name: form.name,
        programCode: form.programCode,
        organizationId: form.cohortType === "open" ? null : form.organizationId,
        facilitatorId: form.facilitatorId,
        sequenceNumber,
        timeZone: form.timeZone,
        zoomLink: form.zoomLink,
        sessionDates: form.sessionDates,
        sessionZoomLinks: form.sessionZoomLinks,
      };
      const opts = { orgs, facilitators, program: selectedProgram };
      const cohort = isCreate
        ? createCohort(payload, opts)
        : updateCohort(initial.slug, payload, opts);
      navigate(`/admin/cohorts/${cohort.slug}`);
    } catch (err) {
      setError(err.message || "Couldn't save the cohort.");
      setSaving(false);
    }
  }

  function handleArchive() {
    if (!initial?.slug) return;
    if (!window.confirm(`Archive "${initial.name}"? Participants will no longer see this cohort.`)) return;
    archiveCohort(initial.slug);
    navigate("/admin/cohorts");
  }

  // ---- Render ----
  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up">
      <Link
        to={isCreate ? "/admin/cohorts" : `/admin/cohorts/${initial.slug}`}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-heading font-semibold text-ink-muted hover:text-ink transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
        {isCreate ? "All cohorts" : `Back to ${initial.name}`}
      </Link>

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
              ? "Tell us the type, pick the program + facilitator, and set the schedule. You'll add participants in the next step."
              : "Adjust facilitator, program, and the session schedule."}
          </p>
        </div>
      </header>

      {/* ---------- 1. Type ---------- */}
      {isCreate && (
        <Section title="Cohort type" icon={Lock}>
          <div className="grid sm:grid-cols-2 gap-3">
            <TypeOption
              active={form.cohortType === "closed"}
              onClick={() => set("cohortType", "closed")}
              icon={Lock}
              label="Closed"
              description="Tied to an organization. Most cohorts."
            />
            <TypeOption
              active={form.cohortType === "open"}
              onClick={() => set("cohortType", "open")}
              icon={Globe}
              label="Open"
              description="Public cohort run by BRAI. Individuals enroll directly. Numbered Open Cohort 1, 2, …"
            />
          </div>
        </Section>
      )}

      {/* ---------- 2. Basics ---------- */}
      <Section title="Basics" icon={GraduationCap}>
        <SelectField
          label="Program"
          icon={GraduationCap}
          value={form.programCode}
          onChange={(v) => set("programCode", v)}
          options={PROGRAMS.map((p) => ({ value: p.code, label: p.name }))}
          hint={selectedProgram ? `Code: ${selectedProgram.code} · ${selectedProgram.sessionsCount} sessions` : null}
        />

        {form.cohortType !== "open" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="block text-[11.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted">
                Organization <span className="text-brand-600">*</span>
              </span>
              {!showNewOrgInline && (
                <button
                  type="button"
                  onClick={() => setShowNewOrgInline(true)}
                  className="inline-flex items-center gap-1 text-[11.5px] font-heading font-semibold text-brand-600 hover:text-brand-700"
                >
                  <Plus className="w-3 h-3" strokeWidth={3} />
                  Add new organization
                </button>
              )}
            </div>

            {showNewOrgInline ? (
              <div className="rounded-xl border border-brand-200 bg-brand-50/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[12px] font-heading font-bold text-brand-700 uppercase tracking-wider">
                    New organization
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowNewOrgInline(false); setNewOrgError(null); }}
                    className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-white"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="Full name (e.g. Stanford Health)"
                    className="w-full px-3 py-2 rounded-lg border border-soft bg-white text-[13.5px] font-body text-ink focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
                  />
                  <input
                    type="text"
                    value={newOrgShortName}
                    onChange={(e) => setNewOrgShortName(e.target.value)}
                    placeholder="Short name (e.g. Stanford)"
                    className="w-full px-3 py-2 rounded-lg border border-soft bg-white text-[13.5px] font-body text-ink focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
                  />
                </div>
                {newOrgError && (
                  <div className="text-[12px] text-red-600 font-heading font-semibold">{newOrgError}</div>
                )}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleCreateOrg}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-[12px] font-heading font-semibold hover:bg-brand-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Add organization
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle pointer-events-none" strokeWidth={2} />
                <select
                  value={form.organizationId}
                  onChange={(e) => set("organizationId", e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 appearance-none"
                >
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Auto-name preview */}
        <div className="rounded-xl bg-brand-50/40 border border-brand-100 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-brand-700">
              Cohort name
            </span>
            {nameTouched && (
              <button
                type="button"
                onClick={() => { setNameTouched(false); }}
                className="text-[11px] font-heading font-semibold text-brand-600 hover:text-brand-700"
              >
                Reset to auto
              </button>
            )}
          </div>
          <input
            type="text"
            value={form.name}
            onChange={(e) => { set("name", e.target.value); setNameTouched(true); }}
            placeholder={autoName}
            className="w-full px-3 py-2 rounded-lg border border-soft bg-white text-[14.5px] font-heading font-bold text-ink focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
          />
          <p className="text-[11.5px] text-brand-700/80 leading-relaxed">
            {nameTouched
              ? "Customized. Click Reset to auto to regenerate."
              : `Auto-generated from ${form.cohortType === "open" ? "program + sequence" : "program + organization"}. You can override.`}
          </p>
        </div>

        <Field
          label="Slug"
          required
          value={form.slug}
          onChange={(v) => { set("slug", v); setSlugTouched(true); }}
          placeholder="iahe-aiew3-2026q1"
          hint="Used in URLs. Lowercase letters, numbers, dashes only."
          readOnly={!isCreate}
        />
      </Section>

      {/* ---------- 3. Facilitator + default Zoom link ---------- */}
      <Section title="Facilitator" icon={User}>
        <div>
          <span className="block text-[11.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
            Facilitator <span className="text-brand-600">*</span>
          </span>
          <FacilitatorPicker
            value={form.facilitatorId}
            onChange={(v) => set("facilitatorId", v)}
            facilitators={facilitators}
            required
          />
        </div>
        <Field
          label="Default Zoom link"
          icon={Video}
          value={form.zoomLink}
          onChange={(v) => { set("zoomLink", v); setZoomLinkTouched(true); }}
          placeholder="https://us02web.zoom.us/j/0000000000"
          hint={
            zoomLinkTouched
              ? "Custom link — won't change when you switch facilitator."
              : "Auto-filled from the facilitator's default Zoom link. Edit to override."
          }
        />
      </Section>

      {/* ---------- 4. Schedule ---------- */}
      <Section title="Session schedule" icon={Calendar}>
        <p className="text-[12.5px] text-ink-muted mb-3 leading-relaxed">
          Set the first session's date and time, plus a cadence — we'll auto-fill
          the rest. You can manually adjust any session below.
        </p>

        <div className="grid sm:grid-cols-3 gap-3 mb-5">
          <div className="sm:col-span-2">
            <span className="block text-[11.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
              First session <span className="text-brand-600">*</span>
            </span>
            <DateTimeField
              value={form.startDateTime}
              onChange={(v) => set("startDateTime", v)}
              timeZone={form.timeZone}
              required
            />
            <p className="text-[11.5px] text-ink-muted mt-1.5">
              Same time will repeat every session.
            </p>
          </div>
          <div>
            <span className="block text-[11.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
              Cadence
            </span>
            <div className="relative">
              <Repeat className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle pointer-events-none" strokeWidth={2} />
              <select
                value={form.cadenceDays}
                onChange={(e) => set("cadenceDays", Number(e.target.value))}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 appearance-none"
              >
                {CADENCE_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Time zone — important for cross-tz facilitators + participants */}
        <div className="mb-5">
          <span className="block text-[11.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
            Time zone <span className="text-brand-600">*</span>
          </span>
          <div className="relative">
            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle pointer-events-none" strokeWidth={2} />
            <select
              value={form.timeZone}
              onChange={(e) => set("timeZone", e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 appearance-none"
            >
              {groupTimeZones().map(([group, zones]) => (
                <optgroup key={group} label={group}>
                  {zones.map((z) => (
                    <option key={z.value} value={z.value}>{z.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <p className="text-[11.5px] text-ink-muted mt-1.5">
            All session times above are expressed in this cohort's time zone.
          </p>
        </div>

        <div className="space-y-2">
          {MOCK_SESSIONS.map((s, i) => (
            <SessionRow
              key={s.order}
              session={s}
              belt={BELT_COLORS[s.belt]}
              dateValue={form.sessionDates[i] || ""}
              onDateChange={(v) => setSessionDate(i, v)}
              timeZone={form.timeZone}
              zoomLink={form.sessionZoomLinks[i] || ""}
              cohortZoomLink={form.zoomLink}
              onZoomChange={(v) => {
                setForm((f) => {
                  const copy = [...f.sessionZoomLinks];
                  copy[i] = v;
                  return { ...f, sessionZoomLinks: copy };
                });
              }}
            />
          ))}
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultStartDateTime() {
  const d = new Date();
  d.setHours(16, 0, 0, 0); // 4:00 PM local
  const dow = d.getDay();
  const offset = ((3 - dow + 7) % 7) || 7; // next Wednesday
  d.setDate(d.getDate() + offset);
  return formatDatetimeLocal(d);
}

function toDatetimeLocal(iso) {
  if (!iso) return "";
  // Accept either YYYY-MM-DD or full ISO; return YYYY-MM-DDTHH:MM
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return formatDatetimeLocal(d);
}

function SessionRow({ session, belt, dateValue, onDateChange, timeZone, zoomLink, cohortZoomLink, onZoomChange }) {
  const [open, setOpen] = useState(!!zoomLink);
  const hasOverride = !!zoomLink;
  return (
    <div className="rounded-xl border border-soft bg-surface-card overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <div
          style={{
            background: belt?.gradient,
            color: belt?.contrast,
            border: belt?.needsBorder ? "1px solid #D1D5DB" : "none",
          }}
          className="w-9 h-9 rounded-lg flex items-center justify-center font-heading font-extrabold text-[13px] shrink-0"
        >
          {session.order}
        </div>
        <div className="flex-1 min-w-0 grid sm:grid-cols-[1fr_minmax(220px,auto)] gap-3 items-center">
          <div className="min-w-0">
            <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-subtle">
              {session.belt} belt · Session {session.order}
            </div>
            <div className="text-[11px] text-ink-muted truncate">{session.title}</div>
          </div>
          <DateTimeField
            value={dateValue}
            onChange={onDateChange}
            timeZone={timeZone}
            required
          />
        </div>
      </div>
      {/* Custom Zoom link override */}
      <div className="border-t border-soft px-3 py-2 bg-surface-soft/60">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 text-[11.5px] font-heading font-semibold text-ink-muted hover:text-ink"
        >
          <Video className="w-3 h-3" strokeWidth={2.5} />
          {hasOverride
            ? "Custom Zoom link for this session"
            : "Uses cohort Zoom link"}
          {open ? <ChevronUp className="w-3 h-3" strokeWidth={2.5} /> : <ChevronDown className="w-3 h-3" strokeWidth={2.5} />}
        </button>
        {open && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="url"
              value={zoomLink}
              onChange={(e) => onZoomChange(e.target.value)}
              placeholder={cohortZoomLink || "https://us02web.zoom.us/j/0000000000"}
              className="flex-1 px-3 py-1.5 rounded-lg border border-soft bg-white text-[12.5px] font-body text-ink focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
            />
            {hasOverride && (
              <button
                type="button"
                onClick={() => onZoomChange("")}
                title="Clear override and use the cohort's default Zoom link"
                className="px-2 py-1.5 rounded-lg text-[11.5px] font-heading font-semibold text-ink-muted hover:text-ink hover:bg-white"
              >
                Use cohort default
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

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

function TypeOption({ active, onClick, icon: Icon, label, description }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-2xl p-4 text-left transition-all duration-200 border-2 " +
        (active
          ? "bg-brand-50 border-brand-500"
          : "bg-surface-card border-soft hover:border-brand-200")
      }
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={
          "w-9 h-9 rounded-xl flex items-center justify-center " +
          (active ? "bg-brand-600 text-white" : "bg-ink/5 text-ink-muted")
        }>
          <Icon className="w-4.5 h-4.5" strokeWidth={2.25} />
        </div>
        <span className="font-heading text-[14.5px] font-extrabold text-ink">
          {label}
        </span>
      </div>
      <p className="text-[12.5px] text-ink-muted leading-relaxed">{description}</p>
    </button>
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

function SelectField({ label, icon: Icon, value, onChange, options, hint }) {
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
      {hint && <p className="text-[11.5px] text-ink-muted mt-1.5 leading-relaxed">{hint}</p>}
    </label>
  );
}
