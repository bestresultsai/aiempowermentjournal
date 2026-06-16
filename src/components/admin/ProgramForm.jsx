import { useEffect, useMemo, useState } from "react";
import {
  Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Award, RotateCcw,
  Trophy,
} from "lucide-react";
import { BELT_COLORS } from "../../lib/mockCohort";
import { DEFAULT_CERTIFICATE, DEFAULT_BADGES } from "../../lib/programs";
import MaterialsEditor, { normalizeMaterials } from "./MaterialsEditor";

// Lucide icon names available for badges. Keep in sync with the BADGE_ICONS
// map in JournalGameCard / NextMilestoneCard so anything the editor picks
// renders correctly downstream.
const BADGE_ICON_OPTIONS = [
  "Sprout", "Repeat", "Flame", "Rocket", "Trophy", "Crown",
  "Target", "Sparkles", "Award", "Star",
];

const COMPLETION_CRITERIA_OPTIONS = [
  { value: "all-sessions-completed", label: "All sessions completed" },
  { value: "homework-required", label: "All sessions + homework submitted" },
  { value: "manual", label: "Facilitator awards manually" },
];

// ---------------------------------------------------------------------------
// ProgramForm — shared editor for /admin/programs/new + /:code/edit.
//
// Props:
//   initial:    { code, name, methodName, tagline, sessionDurationMinutes,
//                 belts: string[], sessions: [{order, belt, title, summary,
//                 description, materials: string[], homework}] }
//   mode:       "create" | "edit"
//   onSubmit:   (payload) => void
//   onCancel:   () => void
//   submitLabel?
//
// Inside, state is local — parent commits via onSubmit, then routes away.
// ---------------------------------------------------------------------------

const BELT_OPTIONS = Object.keys(BELT_COLORS);

const EMPTY_SESSION = {
  belt: "",
  title: "",
  summary: "",
  materials: [],
  homework: "",
};

export default function ProgramForm({
  initial,
  mode = "edit",
  onSubmit,
  onCancel,
  submitLabel,
}) {
  const [code, setCode] = useState(initial?.code || "");
  const [name, setName] = useState(initial?.name || "");
  const [methodName, setMethodName] = useState(
    initial?.methodName || "AI Empowerment Method",
  );
  const [tagline, setTagline] = useState(initial?.tagline || "");
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState(
    String(initial?.sessionDurationMinutes || 75),
  );
  const [belts, setBelts] = useState(() => initial?.belts || []);
  const [sessions, setSessions] = useState(() =>
    (initial?.sessions || []).map((s) => ({
      belt: s.belt || "",
      title: s.title || "",
      summary: s.summary || s.description || "",
      materials: Array.isArray(s.materials) ? s.materials : [],
      homework: s.homework || "",
    })),
  );
  const [certificate, setCertificate] = useState(() =>
    initial?.certificate || DEFAULT_CERTIFICATE,
  );
  const [badges, setBadges] = useState(() =>
    Array.isArray(initial?.badges) && initial.badges.length
      ? initial.badges.map((b) => ({ ...b }))
      : DEFAULT_BADGES.map((b) => ({ ...b })),
  );
  const [error, setError] = useState("");

  // If the parent re-seeds (e.g. async load), sync.
  useEffect(() => {
    if (!initial) return;
    setCode(initial.code || "");
    setName(initial.name || "");
    setMethodName(initial.methodName || "AI Empowerment Method");
    setTagline(initial.tagline || "");
    setSessionDurationMinutes(String(initial.sessionDurationMinutes || 75));
    setBelts(initial.belts || []);
    setSessions(
      (initial.sessions || []).map((s) => ({
        belt: s.belt || "",
        title: s.title || "",
        summary: s.summary || s.description || "",
        materials: Array.isArray(s.materials) ? s.materials : [],
        homework: s.homework || "",
      })),
    );
    setCertificate(initial.certificate || DEFAULT_CERTIFICATE);
    setBadges(
      Array.isArray(initial.badges) && initial.badges.length
        ? initial.badges.map((b) => ({ ...b }))
        : DEFAULT_BADGES.map((b) => ({ ...b })),
    );
  }, [initial]);

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!code.trim()) return setError("Program code is required.");
    if (!name.trim()) return setError("Program name is required.");
    if (sessions.length === 0)
      return setError("Add at least one session.");

    try {
      onSubmit({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        methodName: methodName.trim(),
        tagline: tagline.trim(),
        sessionDurationMinutes: Number(sessionDurationMinutes) || 75,
        belts: belts.filter(Boolean),
        // Drop empty signatories before persisting so the cert generator
        // doesn't render half-filled rows.
        certificate: {
          ...certificate,
          signatories: (certificate.signatories || []).filter(
            (s) => s?.slot === "facilitator" || (s?.name || "").trim(),
          ),
        },
        badges: (badges || [])
          .filter((b) => b && (b.name || "").trim() && Number(b.count) > 0)
          .map((b) => ({
            count: Math.max(1, Math.floor(Number(b.count) || 1)),
            icon: b.icon || "Trophy",
            name: (b.name || "").trim(),
            blurb: (b.blurb || "").trim(),
          })),
        sessions: sessions.map((s, i) => ({
          order: i + 1,
          belt: s.belt || (belts[i] || null),
          title: s.title.trim() || `Session ${i + 1}`,
          summary: s.summary,
          description: s.summary,
          // Materials are now structured objects. Drop rows that have neither
          // a title nor a URL/upload so we don't persist empty placeholders.
          materials: normalizeMaterials(s.materials).filter(
            (m) => (m.title || "").trim() || (m.url || "").trim(),
          ),
          homework: s.homework,
        })),
      });
    } catch (err) {
      setError(err?.message || "Couldn't save the program.");
    }
  }

  // Session ops.
  function addSession() {
    setSessions((arr) => [...arr, { ...EMPTY_SESSION }]);
  }
  function removeSession(idx) {
    setSessions((arr) => arr.filter((_, i) => i !== idx));
  }
  function moveSession(idx, dir) {
    setSessions((arr) => {
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return arr;
      const next = arr.slice();
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }
  function updateSession(idx, patch) {
    setSessions((arr) =>
      arr.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    );
  }

  // Belt ops.
  function addBelt() {
    setBelts((arr) => [...arr, BELT_OPTIONS.find((b) => !arr.includes(b)) || ""]);
  }
  function setBeltAt(idx, value) {
    setBelts((arr) => arr.map((b, i) => (i === idx ? value : b)));
  }
  function removeBelt(idx) {
    setBelts((arr) => arr.filter((_, i) => i !== idx));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in-up">
      {/* ---------- Meta ---------- */}
      <section className="rounded-2xl bg-surface-card border border-soft p-5 lg:p-6 space-y-4">
        <div>
          <SectionHeader
            label="Program details"
            description="High-level info participants and facilitators see."
          />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Code" hint="Short identifier, uppercase, no spaces (e.g. AIEW3).">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
              required
              disabled={mode === "edit"}
              maxLength={16}
              className="w-full px-3.5 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-mono focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 disabled:bg-surface-soft disabled:text-ink-muted"
            />
            {mode === "edit" && (
              <p className="text-[11px] text-ink-muted mt-1">
                Code is permanent — cohorts reference it.
              </p>
            )}
          </Field>
          <Field label="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
            />
          </Field>
        </div>
        <Field label="Method name">
          <input
            type="text"
            value={methodName}
            onChange={(e) => setMethodName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
          />
        </Field>
        <Field label="Tagline" hint="One paragraph shown on the cohort hero + Journey page.">
          <textarea
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body leading-relaxed focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
          />
        </Field>
        <Field label="Default session duration (minutes)">
          <input
            type="number"
            min={15}
            max={300}
            value={sessionDurationMinutes}
            onChange={(e) => setSessionDurationMinutes(e.target.value)}
            className="w-32 px-3.5 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
          />
        </Field>
      </section>

      {/* ---------- Belts ---------- */}
      <section className="rounded-2xl bg-surface-card border border-soft p-5 lg:p-6 space-y-4">
        <SectionHeader
          label="Belt sequence"
          description="Ordered belt awarded after each session. Leave empty to use plain numbers."
        />
        <div className="space-y-2">
          {belts.map((b, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-[11.5px] text-ink-muted font-heading font-bold w-6 tabular-nums text-right">
                {idx + 1}.
              </span>
              <BeltSelect value={b} onChange={(v) => setBeltAt(idx, v)} />
              <button
                type="button"
                onClick={() => removeBelt(idx)}
                className="p-1.5 rounded-lg text-ink-muted hover:text-rose-700 hover:bg-rose-50"
                title="Remove belt"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addBelt}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-soft text-ink text-[12.5px] font-heading font-semibold hover:bg-ink/5"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            Add belt
          </button>
        </div>
      </section>

      {/* ---------- Sessions ---------- */}
      <section className="rounded-2xl bg-surface-card border border-soft p-5 lg:p-6 space-y-4">
        <SectionHeader
          label="Sessions"
          description="Curriculum sequence. Each session can be tied to a belt above."
        />
        <ol className="space-y-3">
          {sessions.map((s, idx) => (
            <SessionRow
              key={idx}
              index={idx}
              session={s}
              total={sessions.length}
              beltSuggestions={belts}
              onChange={(patch) => updateSession(idx, patch)}
              onRemove={() => removeSession(idx)}
              onMoveUp={() => moveSession(idx, -1)}
              onMoveDown={() => moveSession(idx, 1)}
            />
          ))}
        </ol>
        <button
          type="button"
          onClick={addSession}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-ink text-white text-[12.5px] font-heading font-bold hover:bg-ink/90"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.75} />
          Add session
        </button>
      </section>

      {/* ---------- Badges ---------- */}
      <BadgesSection badges={badges} onChange={setBadges} />

      {/* ---------- Certificate ---------- */}
      <CertificateSection
        certificate={certificate}
        onChange={setCertificate}
      />

      {/* ---------- Submit ---------- */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-900">
          {error}
        </div>
      )}
      <div className="flex items-center gap-3 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-[13.5px] font-heading font-semibold text-ink-muted hover:text-ink"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-ink text-white text-[13.5px] font-heading font-bold hover:bg-ink/90"
        >
          {submitLabel || (mode === "create" ? "Create program" : "Save changes")}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Per-session expandable row.
// ---------------------------------------------------------------------------
function SessionRow({
  index,
  session,
  total,
  beltSuggestions,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}) {
  const [open, setOpen] = useState(false);

  const beltLabel = session.belt || beltSuggestions[index] || "—";

  // Materials are now structured items: { title, type, url, fileName? }.
  // MaterialsEditor accepts legacy strings + {label, type, url} shapes too,
  // so old programs survive the upgrade.
  const materials = useMemo(
    () => normalizeMaterials(session.materials || []),
    [session.materials],
  );

  return (
    <li className="rounded-xl border border-soft bg-surface-soft/40 overflow-hidden">
      {/* Collapsed header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="text-ink-muted">
          <GripVertical className="w-3.5 h-3.5" strokeWidth={2.5} />
        </span>
        <span className="font-heading font-bold text-[11.5px] uppercase tracking-wider text-ink-muted shrink-0 w-12">
          S{index + 1}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-soft text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink shrink-0">
          {beltLabel}
        </span>
        <input
          type="text"
          value={session.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={`Session ${index + 1} title`}
          className="flex-1 min-w-0 px-2 py-1 rounded-md bg-white border border-transparent hover:border-soft focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 text-[13px] font-heading font-semibold text-ink outline-none"
        />
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1.5 rounded-md text-ink-muted hover:text-ink disabled:opacity-30"
            title="Move up"
          >
            <ChevronUp className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="p-1.5 rounded-md text-ink-muted hover:text-ink disabled:opacity-30"
            title="Move down"
          >
            <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="px-2 py-1 rounded-md text-[11px] font-heading font-bold text-brand-700 hover:bg-brand-50"
          >
            {open ? "Hide" : "Details"}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-md text-ink-muted hover:text-rose-700 hover:bg-rose-50"
            title="Delete session"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {open && (
        <div className="border-t border-soft p-4 space-y-3 bg-white">
          <Field label="Belt">
            <BeltSelect
              value={session.belt}
              onChange={(v) => onChange({ belt: v })}
            />
          </Field>
          <Field label="Summary" hint="Shown on the session card + cohort page.">
            <textarea
              value={session.summary}
              onChange={(e) => onChange({ summary: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-soft bg-surface-card text-ink text-[13px] font-body leading-relaxed focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
            />
          </Field>
          <Field
            label="Materials"
            hint="Add prompt files, videos, templates. Each item supports either a URL or a direct file upload."
          >
            <MaterialsEditor
              value={materials}
              onChange={(next) => onChange({ materials: next })}
            />
          </Field>
          <Field label="Homework prompt">
            <textarea
              value={session.homework}
              onChange={(e) => onChange({ homework: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-soft bg-surface-card text-ink text-[13px] font-body leading-relaxed focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
            />
          </Field>
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Native select for belt picker. Stays simple — we already have a branded
// Select component but this lives inside dense rows.
// ---------------------------------------------------------------------------
function BeltSelect({ value, onChange }) {
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="px-2.5 py-1.5 rounded-md border border-soft bg-white text-ink text-[12.5px] font-heading font-semibold focus:outline-none focus:border-brand-500"
    >
      <option value="">— belt —</option>
      {BELT_OPTIONS.map((b) => (
        <option key={b} value={b}>
          {b}
        </option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Small helpers.
// ---------------------------------------------------------------------------
function SectionHeader({ label, description }) {
  return (
    <div>
      <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
        {label}
      </div>
      {description && (
        <p className="text-[12.5px] text-ink-muted mt-0.5">{description}</p>
      )}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-heading font-bold text-ink mb-1">
        {label}
      </span>
      {children}
      {hint && <p className="text-[11px] text-ink-muted mt-1">{hint}</p>}
    </label>
  );
}

// ---------------------------------------------------------------------------
// CertificateSection — completion criteria + signatories editor.
//
// Signatories list has two row types:
//   slot: "facilitator" — name is dynamic per cohort, only the title is
//                          editable here (and the row is always pinned at top).
//   slot: "static"      — fixed name + title set on the program (e.g. Mike
//                          Burkesmith, Lee Mosby).
// ---------------------------------------------------------------------------
function CertificateSection({ certificate, onChange }) {
  const sigs = certificate.signatories || [];

  function updateSig(idx, patch) {
    const next = sigs.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange({ ...certificate, signatories: next });
  }
  function removeSig(idx) {
    onChange({
      ...certificate,
      signatories: sigs.filter((_, i) => i !== idx),
    });
  }
  function addSig() {
    onChange({
      ...certificate,
      signatories: [...sigs, { slot: "static", name: "", title: "" }],
    });
  }
  function reset() {
    onChange(DEFAULT_CERTIFICATE);
  }

  return (
    <section className="rounded-2xl bg-surface-card border border-soft p-5 lg:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted inline-flex items-center gap-1.5">
            <Award className="w-3 h-3" strokeWidth={2.5} />
            Certificate
          </div>
          <h2 className="font-heading text-[15px] font-bold text-ink mt-0.5">
            What earns a certificate, who signs it.
          </h2>
          <p className="text-[12px] text-ink-muted mt-0.5 max-w-xl">
            Generated as a downloadable PDF on the participant's cohort page
            once they meet the criteria.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-heading font-semibold text-ink-muted hover:text-ink"
        >
          <RotateCcw className="w-3 h-3" strokeWidth={2.5} />
          Reset to defaults
        </button>
      </div>

      {/* Completion criteria */}
      <Field
        label="Completion criteria"
        hint="When the platform considers a participant 'done' and unlocks the certificate."
      >
        <select
          value={certificate.completionCriteria || "all-sessions-completed"}
          onChange={(e) =>
            onChange({ ...certificate, completionCriteria: e.target.value })
          }
          className="w-full px-3.5 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[13.5px] font-body focus:outline-none focus:border-brand-500"
        >
          {COMPLETION_CRITERIA_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      {/* Body copy */}
      <Field
        label="Body copy"
        hint="Sentence printed above the participant name on the certificate."
      >
        <textarea
          value={certificate.bodyCopy || ""}
          onChange={(e) => onChange({ ...certificate, bodyCopy: e.target.value })}
          rows={2}
          className="w-full px-3.5 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[13.5px] font-body leading-relaxed focus:outline-none focus:border-brand-500"
        />
      </Field>

      {/* Signatories */}
      <div>
        <div className="text-[12px] font-heading font-bold text-ink mb-2">
          Signatories
        </div>
        <ul className="space-y-2">
          {sigs.map((s, idx) => (
            <li
              key={idx}
              className="rounded-xl border border-soft bg-surface-soft/40 p-3 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-start"
            >
              <div>
                <label className="block text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted mb-1">
                  Name
                </label>
                {s.slot === "facilitator" ? (
                  <div className="px-3 py-2 rounded-lg bg-white/60 border border-dashed border-soft text-[12.5px] text-ink-muted">
                    Pulled from each cohort's facilitator
                  </div>
                ) : (
                  <input
                    type="text"
                    value={s.name || ""}
                    onChange={(e) => updateSig(idx, { name: e.target.value })}
                    placeholder="e.g. Mike Burkesmith"
                    className="w-full px-3 py-2 rounded-lg border border-soft bg-white text-ink text-[13px] font-body focus:outline-none focus:border-brand-500"
                  />
                )}
              </div>
              <div>
                <label className="block text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={s.title || ""}
                  onChange={(e) => updateSig(idx, { title: e.target.value })}
                  placeholder="e.g. CEO, BestResults.AI"
                  className="w-full px-3 py-2 rounded-lg border border-soft bg-white text-ink text-[13px] font-body focus:outline-none focus:border-brand-500"
                />
              </div>
              <div className="flex items-end h-full">
                {s.slot !== "facilitator" && (
                  <button
                    type="button"
                    onClick={() => removeSig(idx)}
                    className="p-2 rounded-lg text-ink-muted hover:text-rose-700 hover:bg-rose-50"
                    title="Remove signatory"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {sigs.length < 6 && (
          <button
            type="button"
            onClick={addSig}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-soft text-ink text-[12.5px] font-heading font-semibold hover:bg-ink/5"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            Add signatory
          </button>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// BadgesSection — editor for the journal gamification ladder.
//
// Each row: count (entries needed), Lucide icon name, display name, blurb.
// Reset to defaults wipes any custom ladder back to DEFAULT_BADGES. Programs
// inheriting the default get the standard 1/5/10/25/50/100 progression.
// ---------------------------------------------------------------------------
function BadgesSection({ badges, onChange }) {
  const rows = badges || [];

  function updateRow(idx, patch) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function removeRow(idx) {
    onChange(rows.filter((_, i) => i !== idx));
  }
  function addRow() {
    const lastCount = rows[rows.length - 1]?.count || 0;
    onChange([
      ...rows,
      {
        count: lastCount + 1,
        icon: "Trophy",
        name: "",
        blurb: "",
      },
    ]);
  }
  function reset() {
    onChange(DEFAULT_BADGES.map((b) => ({ ...b })));
  }

  return (
    <section className="rounded-2xl bg-surface-card border border-soft p-5 lg:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted inline-flex items-center gap-1.5">
            <Trophy className="w-3 h-3" strokeWidth={2.5} />
            Journal badges
          </div>
          <h2 className="font-heading text-[15px] font-bold text-ink mt-0.5">
            Gamification ladder for this program's AI Journal.
          </h2>
          <p className="text-[12px] text-ink-muted mt-0.5 max-w-xl">
            Each badge unlocks at a count of journal entries. Tweak thresholds
            to match the program's cadence — shorter programs benefit from
            earlier milestones.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-heading font-semibold text-ink-muted hover:text-ink"
        >
          <RotateCcw className="w-3 h-3" strokeWidth={2.5} />
          Reset to defaults
        </button>
      </div>

      <ul className="space-y-2">
        {rows.map((b, idx) => (
          <li
            key={idx}
            className="rounded-xl border border-soft bg-surface-soft/40 p-3 grid grid-cols-[80px_120px_1fr_auto] gap-2 items-start"
          >
            <div>
              <label className="block text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted mb-1">
                Count
              </label>
              <input
                type="number"
                min={1}
                value={b.count}
                onChange={(e) => updateRow(idx, { count: e.target.value })}
                className="w-full px-2.5 py-2 rounded-lg border border-soft bg-white text-ink text-[13px] font-mono tabular-nums focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted mb-1">
                Icon
              </label>
              <select
                value={b.icon || "Trophy"}
                onChange={(e) => updateRow(idx, { icon: e.target.value })}
                className="w-full px-2.5 py-2 rounded-lg border border-soft bg-white text-ink text-[13px] font-body focus:outline-none focus:border-brand-500"
              >
                {BADGE_ICON_OPTIONS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted mb-1">
                Name & blurb
              </label>
              <input
                type="text"
                value={b.name}
                onChange={(e) => updateRow(idx, { name: e.target.value })}
                placeholder="e.g. Habit Forming"
                className="w-full px-3 py-2 rounded-lg border border-soft bg-white text-ink text-[13px] font-body focus:outline-none focus:border-brand-500 mb-1.5"
              />
              <input
                type="text"
                value={b.blurb}
                onChange={(e) => updateRow(idx, { blurb: e.target.value })}
                placeholder="One-sentence celebration"
                className="w-full px-3 py-2 rounded-lg border border-soft bg-white text-ink text-[12.5px] font-body focus:outline-none focus:border-brand-500"
              />
            </div>
            <div className="flex items-start pt-5">
              <button
                type="button"
                onClick={() => removeRow(idx)}
                className="p-2 rounded-lg text-ink-muted hover:text-rose-700 hover:bg-rose-50"
                title="Remove badge"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-soft text-ink text-[12.5px] font-heading font-semibold hover:bg-ink/5"
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
        Add badge
      </button>
    </section>
  );
}
