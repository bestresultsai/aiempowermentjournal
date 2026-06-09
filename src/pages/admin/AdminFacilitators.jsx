import { useMemo, useState } from "react";
import {
  Users, Plus, Mail, GraduationCap, Pencil, Check, X, AlertCircle, Video,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  useCohortVersion,
  getAllFacilitators,
  getCohortsForFacilitator,
  createFacilitator,
  updateFacilitator,
} from "../../lib/cohortAdmin";
import { clampString, sanitizeUrl, isValidEmail, LIMITS } from "../../lib/inputValidation";
import { canCreateCohorts } from "../../lib/adminRoles";

// ---------------------------------------------------------------------------
// /admin/facilitators — Facilitator management.
//
// Lists every facilitator the platform knows about (derived from cohort
// assignments + created via this page). Inline create + edit. Stats per
// facilitator: # assigned cohorts.
// ---------------------------------------------------------------------------
export default function AdminFacilitators() {
  const { user } = useAuth();
  const version = useCohortVersion();
  const facilitators = useMemo(() => getAllFacilitators(), [version]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const rows = useMemo(
    () =>
      facilitators.map((f) => ({
        facilitator: f,
        cohortCount: getCohortsForFacilitator(f.id).length,
      })),
    [facilitators],
  );

  if (!canCreateCohorts(user)) {
    return (
      <div className="space-y-3">
        <h1 className="font-heading text-[24px] font-extrabold text-ink">Facilitators</h1>
        <p className="text-[14px] text-ink-muted">
          You don't have permission to manage facilitators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <header className="flex items-start gap-3 flex-wrap">
        <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
          <Users className="w-5 h-5" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-eyebrow">Admin · Facilitators</div>
          <h1 className="font-heading text-[28px] lg:text-[34px] font-extrabold tracking-tight text-ink leading-tight">
            Facilitators
          </h1>
          <p className="text-[14px] text-ink-muted mt-1.5 max-w-2xl">
            {facilitators.length} {facilitators.length === 1 ? "facilitator" : "facilitators"} on the platform.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-[12.5px] font-heading font-semibold hover:bg-emerald-700 transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          New facilitator
        </button>
      </header>

      {creating && (
        <NewFacilitatorForm
          onCancel={() => setCreating(false)}
          onCreated={() => setCreating(false)}
        />
      )}

      <section>
        <div className="rounded-2xl bg-surface-card border border-soft overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_220px_120px_60px] gap-4 px-5 py-3 border-b border-soft bg-surface-soft text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
            <div>Facilitator</div>
            <div>Email</div>
            <div className="text-right">Cohorts</div>
            <div />
          </div>
          {rows.length === 0 ? (
            <div className="p-8 text-center text-[14px] text-ink-muted">
              No facilitators yet.
            </div>
          ) : (
            rows.map(({ facilitator, cohortCount }) => (
              <FacilitatorRow
                key={facilitator.id}
                facilitator={facilitator}
                cohortCount={cohortCount}
                editing={editing === facilitator.id}
                onEdit={() => setEditing(facilitator.id)}
                onCancel={() => setEditing(null)}
                onSaved={() => setEditing(null)}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function FacilitatorRow({ facilitator: f, cohortCount, editing, onEdit, onCancel, onSaved }) {
  const [name, setName] = useState(f.name);
  const [email, setEmail] = useState(f.email || "");
  const [title, setTitle] = useState(f.title || "");
  const [headshotUrl, setHeadshotUrl] = useState(f.headshotUrl || "");
  const [defaultZoomLink, setDefaultZoomLink] = useState(f.defaultZoomLink || "");
  const [error, setError] = useState("");
  const initials = f.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  function handleSave() {
    setError("");
    if (email && !isValidEmail(email)) {
      setError("That doesn't look like a valid email.");
      return;
    }
    let safeHeadshot = "";
    if (headshotUrl.trim()) {
      const check = sanitizeUrl(headshotUrl);
      if (!check.ok) {
        setError(check.reason);
        return;
      }
      safeHeadshot = check.value;
    }
    let safeZoom = "";
    if (defaultZoomLink.trim()) {
      const check = sanitizeUrl(defaultZoomLink);
      if (!check.ok) {
        setError(check.reason);
        return;
      }
      safeZoom = check.value;
    }
    try {
      updateFacilitator(f.id, {
        name: clampString(name, LIMITS.shortText),
        email,
        title: clampString(title, LIMITS.shortText),
        headshotUrl: safeHeadshot,
        defaultZoomLink: safeZoom,
      });
      onSaved?.();
    } catch (e) {
      setError(e.message);
    }
  }

  if (editing) {
    return (
      <div className="px-5 py-4 border-b border-soft last:border-b-0 bg-emerald-50/30 space-y-2">
        <div className="grid md:grid-cols-2 gap-2">
          <InputField label="Name" value={name} onChange={setName} max={LIMITS.shortText} />
          <InputField label="Email" value={email} onChange={setEmail} type="email" max={LIMITS.email} />
          <InputField label="Title" value={title} onChange={setTitle} max={LIMITS.shortText} />
          <InputField label="Headshot URL" value={headshotUrl} onChange={setHeadshotUrl} type="url" max={LIMITS.url} />
          <InputField label="Default Zoom link" value={defaultZoomLink} onChange={setDefaultZoomLink} type="url" max={LIMITS.url} />
        </div>
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-[12.5px] font-heading font-bold hover:bg-emerald-700 transition-colors"
          >
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-white transition-colors"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
        {error && (
          <div className="inline-flex items-center gap-1 text-[12px] text-rose-700">
            <AlertCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-5 py-4 grid md:grid-cols-[1fr_220px_120px_60px] gap-4 items-center border-b border-soft last:border-b-0 hover:bg-surface-soft transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        {f.headshotUrl ? (
          <img
            src={f.headshotUrl}
            alt=""
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center justify-center text-[12px] font-heading font-bold shrink-0">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-heading text-[14px] font-bold text-ink truncate">
            {f.name}
          </div>
          <div className="text-[11.5px] text-ink-muted truncate">
            {f.title || "Facilitator"}
          </div>
        </div>
      </div>
      <a
        href={`mailto:${f.email || ""}`}
        className="text-[12.5px] font-heading text-ink-muted hover:text-brand-700 inline-flex items-center gap-1.5 truncate"
      >
        <Mail className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
        <span className="truncate">{f.email || "—"}</span>
      </a>
      <div className="text-right text-[14px] font-heading font-bold text-ink inline-flex items-center justify-end gap-1.5">
        <GraduationCap className="w-3.5 h-3.5 text-ink-muted" strokeWidth={2.5} />
        {cohortCount}
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-white transition-colors shrink-0"
        aria-label="Edit"
      >
        <Pencil className="w-3.5 h-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function NewFacilitatorForm({ onCancel, onCreated }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [headshotUrl, setHeadshotUrl] = useState("");
  const [defaultZoomLink, setDefaultZoomLink] = useState("");
  const [error, setError] = useState("");

  function handleCreate() {
    setError("");
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!email.trim() || !isValidEmail(email)) {
      setError("A valid email is required.");
      return;
    }
    let safeHeadshot = "";
    if (headshotUrl.trim()) {
      const check = sanitizeUrl(headshotUrl);
      if (!check.ok) {
        setError(check.reason);
        return;
      }
      safeHeadshot = check.value;
    }
    let safeZoom = "";
    if (defaultZoomLink.trim()) {
      const check = sanitizeUrl(defaultZoomLink);
      if (!check.ok) {
        setError(check.reason);
        return;
      }
      safeZoom = check.value;
    }
    try {
      createFacilitator({
        name,
        email,
        title,
        headshotUrl: safeHeadshot,
        defaultZoomLink: safeZoom,
      });
      onCreated?.();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <section className="rounded-2xl bg-emerald-50/40 border border-emerald-200 p-4 space-y-3">
      <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-emerald-700">
        New facilitator
      </div>
      <div className="grid md:grid-cols-2 gap-2">
        <InputField label="Name *" value={name} onChange={setName} max={LIMITS.shortText} autoFocus />
        <InputField label="Email *" value={email} onChange={setEmail} type="email" max={LIMITS.email} />
        <InputField label="Title" value={title} onChange={setTitle} max={LIMITS.shortText} placeholder="Lead Facilitator" />
        <InputField label="Headshot URL" value={headshotUrl} onChange={setHeadshotUrl} type="url" max={LIMITS.url} />
        <InputField label="Default Zoom link" value={defaultZoomLink} onChange={setDefaultZoomLink} type="url" max={LIMITS.url} placeholder="https://us02web.zoom.us/j/..." icon={Video} />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCreate}
          disabled={!name.trim() || !email.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-[12.5px] font-heading font-bold hover:bg-emerald-700 transition-colors disabled:bg-emerald-300 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          Create
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-white transition-colors"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>
      {error && (
        <div className="inline-flex items-center gap-1 text-[12px] text-rose-700">
          <AlertCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
          {error}
        </div>
      )}
    </section>
  );
}

function InputField({ label, value, onChange, type = "text", max, placeholder, autoFocus, icon: Icon }) {
  return (
    <label className="block">
      <span className="block text-[10.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1">
        {label}
      </span>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" strokeWidth={2.5} />
        )}
        <input
          type={type}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(clampString(e.target.value, max))}
          maxLength={max}
          placeholder={placeholder}
          className={
            "w-full py-2 rounded-lg border border-soft bg-white text-[13.5px] text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-brand-500 " +
            (Icon ? "pl-8 pr-3" : "px-3")
          }
        />
      </div>
    </label>
  );
}
