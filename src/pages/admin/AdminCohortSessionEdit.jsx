import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  GraduationCap,
  RotateCcw,
  Save,
  Video,
} from "lucide-react";
import {
  getAllCohortsForAdmin,
  getSessionForCohort,
  setSessionOverride,
  useCohortVersion,
} from "../../lib/cohortAdmin";
import { getProgramForCohort } from "../../lib/programs";
import { BELT_COLORS } from "../../lib/mockCohort";
import MaterialsEditor, { normalizeMaterials } from "../../components/admin/MaterialsEditor";

// ---------------------------------------------------------------------------
// /admin/cohorts/:slug/sessions/:order/edit
//
// Per-cohort session customization. Lets a facilitator override the program
// defaults for THIS cohort only — without changing the program template
// (which would ripple to every other cohort using it).
//
// Editable fields (each has a "use program default" reset button):
//   - customSummary    — replaces program summary
//   - customMaterials  — additional materials appended to program list
//   - facilitatorNotes — participant-facing notes from the facilitator
//   - customHomework   — overrides program homework prompt
//   - videoUrl         — session recording URL
//
// Everything writes to the cohort overlay; participants on /session/:order
// see the merged result.
// ---------------------------------------------------------------------------

export default function AdminCohortSessionEdit() {
  const { slug, order } = useParams();
  const navigate = useNavigate();
  const version = useCohortVersion();
  const orderNum = Number(order);

  const cohort = useMemo(
    () => getAllCohortsForAdmin().find((c) => c.slug === slug) || null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slug, version],
  );
  const session = useMemo(
    () => getSessionForCohort(slug, orderNum),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slug, orderNum, version],
  );
  const program = useMemo(() => getProgramForCohort(cohort), [cohort]);
  const programSession = useMemo(() => {
    if (!program?.sessions) return null;
    return program.sessions.find((s) => s.order === orderNum) || null;
  }, [program, orderNum]);

  // Local form state, hydrated from the current session shape.
  const [customSummary, setCustomSummary] = useState(session?.customSummary || "");
  // Cohort-level material overrides — structured items (title/type/url/fileName)
  // appended on top of the program's defaults at render time.
  const [customMaterials, setCustomMaterials] = useState(() =>
    normalizeMaterials(session?.customMaterials || []),
  );
  const [facilitatorNotes, setFacilitatorNotes] = useState(session?.facilitatorNotes || "");
  const [customHomework, setCustomHomework] = useState(session?.customHomework || "");
  const [videoUrl, setVideoUrl] = useState(session?.videoUrl || "");
  const [saving, setSaving] = useState(false);

  if (!cohort || !session) {
    return <Navigate to={`/admin/cohorts/${slug || ""}`} replace />;
  }

  function handleSave() {
    setSaving(true);
    setSessionOverride(slug, orderNum, {
      customSummary,
      customMaterials: normalizeMaterials(customMaterials).filter(
        (m) => (m.title || "").trim() || (m.url || "").trim(),
      ),
      facilitatorNotes,
      customHomework,
      videoUrl,
    });
    setSaving(false);
    navigate(`/admin/cohorts/${slug}`);
  }

  function clearOverride(field) {
    if (field === "customSummary") setCustomSummary("");
    else if (field === "customMaterials") setCustomMaterials([]);
    else if (field === "facilitatorNotes") setFacilitatorNotes("");
    else if (field === "customHomework") setCustomHomework("");
    else if (field === "videoUrl") setVideoUrl("");
  }

  const belt = BELT_COLORS[session.belt] || BELT_COLORS.White;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <header className="space-y-2">
        <Link
          to={`/admin/cohorts/${slug}`}
          className="inline-flex items-center gap-1 text-[12.5px] font-heading font-semibold text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
          Back to cohort
        </Link>
        <div className="flex items-start gap-3 flex-wrap">
          <div
            style={{
              background: belt.gradient,
              color: belt.contrast,
              border: belt.needsBorder ? "1px solid #D1D5DB" : "none",
            }}
            className="w-12 h-12 rounded-xl flex items-center justify-center font-heading font-extrabold text-[15px] shrink-0"
          >
            {session.order}
          </div>
          <div className="min-w-0 flex-1">
            <div className="h-eyebrow inline-flex items-center gap-1.5">
              <GraduationCap className="w-3 h-3" strokeWidth={2.5} />
              {cohort.name} · Session {session.order}
            </div>
            <h1 className="font-heading text-[24px] lg:text-[28px] font-extrabold tracking-tight text-ink leading-tight truncate">
              {session.title}
            </h1>
            <p className="text-[12.5px] text-ink-muted mt-1">
              Edits apply to this cohort only. The {program?.code || "program"}{" "}
              template stays untouched.
            </p>
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Editable fields */}
        <section className="lg:col-span-2 space-y-4">
          <OverrideField
            label="Session summary"
            hint="Replaces the program's default summary on the participant page."
            placeholder={programSession?.summary || ""}
            value={customSummary}
            onChange={setCustomSummary}
            onReset={() => clearOverride("customSummary")}
            multiline
            rows={4}
          />

          <div className="rounded-2xl bg-surface-card border border-soft p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="text-[12px] font-heading font-bold text-ink">
                  Additional materials
                </div>
                <p className="text-[11.5px] text-ink-muted mt-0.5">
                  Appended to the program's materials list — not replacing it.
                  Each item supports either a URL or a direct file upload.
                </p>
              </div>
              {customMaterials.length > 0 && (
                <button
                  type="button"
                  onClick={() => clearOverride("customMaterials")}
                  className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-heading font-semibold text-ink-muted hover:text-rose-700"
                >
                  Clear all
                </button>
              )}
            </div>
            <MaterialsEditor
              value={customMaterials}
              onChange={setCustomMaterials}
            />
          </div>

          <OverrideField
            label="Facilitator notes for participants"
            hint="Shown as a callout on the participant session page. Use it for cohort-specific context (e.g. shared docs, in-class moments)."
            placeholder="Add a quick note for your cohort…"
            value={facilitatorNotes}
            onChange={setFacilitatorNotes}
            onReset={() => clearOverride("facilitatorNotes")}
            multiline
            rows={4}
          />

          <OverrideField
            label="Homework prompt"
            hint="Replaces the program's default homework prompt."
            placeholder={
              // The program's homework field may be a string OR an object
              // shaped like { prompt, dueDate, submissionType }. Coerce to
              // the prompt string for the placeholder.
              typeof programSession?.homework === "string"
                ? programSession.homework
                : programSession?.homework?.prompt || ""
            }
            value={customHomework}
            onChange={setCustomHomework}
            onReset={() => clearOverride("customHomework")}
            multiline
            rows={5}
          />

          <OverrideField
            label="Recording URL"
            hint="Paste the recording link once the session has happened. Participants will see it on /session/:order."
            placeholder="https://…"
            value={videoUrl}
            onChange={setVideoUrl}
            onReset={() => clearOverride("videoUrl")}
            iconLeft={<Video className="w-4 h-4" strokeWidth={2} />}
          />

          {/* Actions */}
          <div className="flex items-center gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => navigate(`/admin/cohorts/${slug}`)}
              className="px-4 py-2.5 rounded-xl text-[13.5px] font-heading font-semibold text-ink-muted hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ink text-white text-[13.5px] font-heading font-bold hover:bg-ink/90 disabled:opacity-50"
            >
              <Save className="w-4 h-4" strokeWidth={2.5} />
              Save changes
            </button>
          </div>
        </section>

        {/* Program defaults sidebar */}
        <aside className="space-y-3">
          <div className="rounded-2xl bg-surface-card border border-soft p-4">
            <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted mb-1">
              Program default
            </div>
            <div className="font-heading text-[14px] font-bold text-ink">
              {program?.name || "—"}
            </div>
            <div className="text-[12px] text-ink-muted mt-0.5">
              {program?.code} · Session {session.order}
            </div>
            <div className="mt-3 space-y-3">
              <DefaultBlock label="Summary" value={programSession?.summary} />
              {(programSession?.materials || []).length > 0 && (
                <DefaultBlock
                  label="Materials"
                  value={
                    <ul className="text-[12.5px] text-ink space-y-0.5 list-disc list-inside">
                      {(programSession?.materials || []).map((m, i) => (
                        // Materials can be plain strings OR objects shaped
                        // like {label, type, url}. Stringify defensively so
                        // React doesn't choke on the object case.
                        <li key={i}>{typeof m === "string" ? m : (m?.label || m?.title || "Material")}</li>
                      ))}
                    </ul>
                  }
                />
              )}
              <DefaultBlock
                label="Homework"
                value={
                  typeof programSession?.homework === "string"
                    ? programSession.homework
                    : programSession?.homework?.prompt
                }
              />
            </div>
          </div>
          <div className="rounded-2xl border border-dashed border-soft p-4">
            <div className="text-[11.5px] text-ink-muted leading-relaxed">
              <strong className="font-bold text-ink">Tip:</strong> editing the{" "}
              <Link
                to={`/admin/programs/${program?.code}/edit`}
                className="text-brand-700 hover:text-brand-800 font-semibold"
              >
                program template
              </Link>{" "}
              changes the default for every cohort using {program?.code}. Use
              cohort overrides only when this group needs something different.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OverrideField — labeled input with a Reset button that clears the override
// (falling back to the program default).
// ---------------------------------------------------------------------------
function OverrideField({
  label,
  hint,
  value,
  onChange,
  onReset,
  placeholder,
  multiline = false,
  rows = 3,
  iconLeft,
}) {
  const dirty = !!(value || "").trim();
  return (
    <div className="rounded-2xl bg-surface-card border border-soft p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="text-[12px] font-heading font-bold text-ink">{label}</div>
          {hint && <p className="text-[11.5px] text-ink-muted mt-0.5">{hint}</p>}
        </div>
        {dirty && (
          <button
            type="button"
            onClick={onReset}
            className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-heading font-semibold text-ink-muted hover:text-rose-700"
          >
            <RotateCcw className="w-3 h-3" strokeWidth={2.5} />
            Use program default
          </button>
        )}
      </div>
      <div className="relative">
        {iconLeft && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none">
            {iconLeft}
          </span>
        )}
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="w-full px-3 py-2 rounded-xl border border-soft bg-surface-card text-ink text-[13px] font-body leading-relaxed focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full ${iconLeft ? "pl-9" : "pl-3"} pr-3 py-2 rounded-xl border border-soft bg-surface-card text-ink text-[13px] font-body focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15`}
          />
        )}
      </div>
    </div>
  );
}

function DefaultBlock({ label, value }) {
  return (
    <div>
      <div className="text-[10.5px] font-heading font-bold uppercase tracking-wider text-ink-muted">
        {label}
      </div>
      <div className="text-[12.5px] text-ink leading-relaxed mt-0.5 break-words">
        {value || <span className="text-ink-muted italic">—</span>}
      </div>
    </div>
  );
}
