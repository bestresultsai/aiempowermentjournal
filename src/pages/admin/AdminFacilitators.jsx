import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { canCreateCohorts, canAssignRoles } from "../../lib/adminRoles";
import HeadshotUpload from "../../components/HeadshotUpload";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const editFromUrl = searchParams.get("edit");
  const [editing, setEditing] = useState(editFromUrl || null);
  const [creating, setCreating] = useState(false);

  // If the URL has ?edit=:id (e.g. arriving from Super Admin), pop that
  // facilitator into edit mode. Once opened we clear the param to keep the
  // URL clean for back-button navigation.
  useEffect(() => {
    if (editFromUrl) {
      setEditing(editFromUrl);
      const next = new URLSearchParams(searchParams);
      next.delete("edit");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                canAssignRoles={canAssignRoles(user)}
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

function FacilitatorRow({ facilitator: f, cohortCount, editing, canAssignRoles, onEdit, onCancel, onSaved }) {
  const [name, setName] = useState(f.name);
  const [email, setEmail] = useState(f.email || "");
  const [title, setTitle] = useState(f.title || "");
  const [headshotUrl, setHeadshotUrl] = useState(f.headshotUrl || "");
  const [defaultZoomLink, setDefaultZoomLink] = useState(f.defaultZoomLink || "");
  // Capability set per facilitator. Facilitator usually present but can be
  // removed (e.g. someone who's stopping facilitation but staying as admin).
  const [capabilities, setCapabilities] = useState(
    new Set(["facilitator", ...(f.capabilities || [])]),
  );
  const [error, setError] = useState("");
  const initials = f.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  function toggleCap(cap) {
    setCapabilities((prev) => {
      const next = new Set(prev);
      if (next.has(cap)) next.delete(cap);
      else next.add(cap);
      return next;
    });
  }

  function handleSave() {
    setError("");
    if (email && !isValidEmail(email)) {
      setError("That doesn't look like a valid email.");
      return;
    }
    // Headshot can be an http(s) URL (legacy) or a data: URL from the
    // HeadshotUpload component. Both are safe to store; we don't run them
    // through sanitizeUrl because data: URLs are explicitly rejected there.
    const safeHeadshot = (headshotUrl || "").trim();
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
        // Persist the full capability list, including/excluding facilitator
        // as toggled.
        capabilities: [...capabilities],
      });
      onSaved?.();
    } catch (e) {
      setError(e.message);
    }
  }

  if (editing) {
    return (
      <div className="px-5 py-4 border-b border-soft last:border-b-0 bg-emerald-50/30 space-y-2">
        {/* Headshot lives on its own row above the grid since it spans both
            columns visually. */}
        <div>
          <div className="text-[10.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
            Headshot
          </div>
          <HeadshotUpload
            value={headshotUrl}
            onChange={(url) => setHeadshotUrl(url || "")}
            name={name}
            size="lg"
          />
        </div>
        <div className="grid md:grid-cols-2 gap-2">
          <InputField label="Name" value={name} onChange={setName} max={LIMITS.shortText} />
          <InputField label="Email" value={email} onChange={setEmail} type="email" max={LIMITS.email} />
          <InputField label="Title" value={title} onChange={setTitle} max={LIMITS.shortText} />
          <InputField label="Default Zoom link" value={defaultZoomLink} onChange={setDefaultZoomLink} type="url" max={LIMITS.url} />
        </div>

        {/* Capability assignment — Super + Admin only. */}
        {canAssignRoles && (
          <div className="pt-2">
            <div className="text-[10.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
              Capabilities
            </div>
            <p className="text-[11.5px] text-ink-muted leading-relaxed mb-2 max-w-xl">
              Toggle each capability on or off. Removing all of them leaves a known user with no admin permissions — useful when someone stops facilitating but stays in the system.
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {["facilitator", "admin", "org"].map((cap) => {
                const meta = {
                  facilitator: { label: "Facilitator" },
                  admin:       { label: "Admin" },
                  org:         { label: "Org Admin" },
                }[cap];
                const active = capabilities.has(cap);
                return (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => toggleCap(cap)}
                    className={
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-heading font-bold transition-colors cursor-pointer " +
                      (active
                        ? "bg-emerald-600 text-white"
                        : "bg-white border border-soft text-ink-muted hover:text-ink")
                    }
                  >
                    {active && <Check className="w-3 h-3" strokeWidth={3} />}
                    {meta.label}
                  </button>
                );
              })}
            </div>
            {!capabilities.has("facilitator") && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
                <AlertCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
                Without Facilitator, this user can't be assigned to lead cohort sessions. Their cohort assignments stay on their record but become inert.
              </div>
            )}
          </div>
        )}

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
    <button
      type="button"
      onClick={onEdit}
      className="block w-full text-left px-5 py-4 grid md:grid-cols-[1fr_220px_120px_60px] gap-4 items-center border-b border-soft last:border-b-0 hover:bg-surface-soft transition-colors cursor-pointer"
    >
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
      <span className="text-[12.5px] font-heading text-ink-muted inline-flex items-center gap-1.5 truncate">
        <Mail className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
        <span className="truncate">{f.email || "—"}</span>
      </span>
      <div className="text-right text-[14px] font-heading font-bold text-ink inline-flex items-center justify-end gap-1.5">
        <GraduationCap className="w-3.5 h-3.5 text-ink-muted" strokeWidth={2.5} />
        {cohortCount}
      </div>
      <span
        className="p-2 rounded-lg text-ink-muted shrink-0"
        aria-hidden
      >
        <Pencil className="w-3.5 h-3.5" strokeWidth={2.5} />
      </span>
    </button>
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
    // Headshot may be an http(s) URL or a data: URL from HeadshotUpload.
    const safeHeadshot = (headshotUrl || "").trim();
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
      <div>
        <div className="text-[10.5px] font-heading font-semibold tracking-wider uppercase text-ink-muted mb-1.5">
          Headshot
        </div>
        <HeadshotUpload
          value={headshotUrl}
          onChange={(url) => setHeadshotUrl(url || "")}
          name={name}
          size="lg"
        />
      </div>
      <div className="grid md:grid-cols-2 gap-2">
        <InputField label="Name *" value={name} onChange={setName} max={LIMITS.shortText} autoFocus />
        <InputField label="Email *" value={email} onChange={setEmail} type="email" max={LIMITS.email} />
        <InputField label="Title" value={title} onChange={setTitle} max={LIMITS.shortText} placeholder="Lead Facilitator" />
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
