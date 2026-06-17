import { useEffect, useMemo, useRef, useState } from "react";
import { Save, Trash2, Upload, X, Link as LinkIcon } from "lucide-react";
import { RESOURCE_TYPES } from "../../lib/resources";
import { getAllProgramsForAdmin } from "../../lib/programs";
import { getAllCohortsForAdmin } from "../../lib/cohortAdmin";

// ---------------------------------------------------------------------------
// ResourceForm — shared editor for /admin/resources/new + /admin/resources/:id/edit.
//
// Two scope dimensions:
//   programCode  null OR a program code   — gates by program
//   cohortSlug   null OR a cohort slug    — narrows further to one cohort
//                                          (only available when program is set)
//
// Source has two modes:
//   - Paste a URL (link)
//   - Upload a file (base64 data URL stored on the resource, fileName separate)
//
// Production swap for uploads: replace handleFilePick with a Supabase Storage
// upload that returns a hosted URL.
// ---------------------------------------------------------------------------

const MAX_UPLOAD_MB = 5;

const TYPE_BY_EXT = {
  pdf: "pdf",
  doc: "doc", docx: "doc", txt: "doc", md: "doc",
  mp4: "video", mov: "video", webm: "video",
  xlsx: "template", csv: "template",
};

export default function ResourceForm({
  initial,
  mode = "edit",
  onSubmit,
  onCancel,
  onArchive,
}) {
  const programs = useMemo(() => getAllProgramsForAdmin(), []);
  const allCohorts = useMemo(() => getAllCohortsForAdmin(), []);

  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [type, setType] = useState(initial?.type || "link");
  const [url, setUrl] = useState(initial?.url || "");
  const [fileName, setFileName] = useState(initial?.fileName || null);
  const [programCode, setProgramCode] = useState(initial?.programCode || "");
  const [cohortSlug, setCohortSlug] = useState(initial?.cohortSlug || "");
  const [category, setCategory] = useState(initial?.category || "");
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);

  // Re-seed if the parent provides a new initial (e.g. async load).
  useEffect(() => {
    if (!initial) return;
    setTitle(initial.title || "");
    setDescription(initial.description || "");
    setType(initial.type || "link");
    setUrl(initial.url || "");
    setFileName(initial.fileName || null);
    setProgramCode(initial.programCode || "");
    setCohortSlug(initial.cohortSlug || "");
    setCategory(initial.category || "");
  }, [initial]);

  // Cohort scope is only meaningful WITHIN a program. If the admin clears
  // the program, blank the cohort filter too so we don't persist a stale
  // cohort scope on a "global" resource.
  useEffect(() => {
    if (!programCode && cohortSlug) setCohortSlug("");
  }, [programCode, cohortSlug]);

  // Subset of cohorts whose program matches the picked program.
  const availableCohorts = useMemo(
    () => allCohorts.filter((c) => programCode && c.programCode === programCode),
    [allCohorts, programCode],
  );

  const hasUpload = !!fileName;

  function handleFilePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(`File too large. Max ${MAX_UPLOAD_MB} MB.`);
      e.target.value = "";
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const inferredType = TYPE_BY_EXT[ext] || type || "doc";
      setUrl(reader.result); // base64 data URL
      setFileName(file.name);
      // Only override type if the user is still on the default "link" — don't
      // surprise an admin who already picked a specific type.
      if (!type || type === "link") setType(inferredType);
      // Title autofill if blank.
      if (!title) setTitle(stripExt(file.name));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function clearUpload() {
    setUrl("");
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!title.trim()) return setError("Title is required.");
    if (!url.trim() && !hasUpload) {
      return setError("Add a URL or upload a file.");
    }
    if (!category.trim()) return setError("Category is required.");
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      type,
      url: hasUpload ? url : url.trim(), // don't trim data URLs
      fileName: hasUpload ? fileName : null,
      programCode: programCode || null,
      cohortSlug: cohortSlug || null,
      category: category.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up">
      <section className="rounded-2xl bg-surface-card border border-soft p-5 lg:p-6 space-y-4">
        <Field label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
          />
        </Field>

        <Field
          label="Description"
          hint="Short summary participants see on the resource card."
        >
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body leading-relaxed focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
          />
        </Field>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body focus:outline-none focus:border-brand-500"
            >
              {RESOURCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field
            label="Category"
            hint="Free text — e.g. Prompts, Bonus Videos, Templates. Drives grouping on the participant page."
          >
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              placeholder="e.g. Prompts"
              className="w-full px-3.5 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body focus:outline-none focus:border-brand-500"
            />
          </Field>
        </div>

        {/* ---------- Source ---------- */}
        <div>
          <span className="block text-[12px] font-heading font-bold text-ink mb-1">
            Source
          </span>
          <p className="text-[11px] text-ink-muted mb-2">
            Paste a URL or upload a file (max {MAX_UPLOAD_MB} MB). Uploaded
            files are served directly to participants.
          </p>
          {hasUpload ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-2.5 flex items-center gap-2.5">
              <Upload className="w-4 h-4 text-emerald-700 shrink-0" strokeWidth={2.5} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-heading font-semibold text-ink truncate">
                  {fileName}
                </div>
                <div className="text-[11px] text-emerald-700/80">Uploaded</div>
              </div>
              <button
                type="button"
                onClick={clearUpload}
                className="p-1.5 rounded-lg text-ink-muted hover:text-rose-700 hover:bg-white"
                title="Remove file"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <div className="flex items-stretch gap-2 flex-wrap">
              <div className="flex-1 min-w-[240px] relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" strokeWidth={2.25} />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://…"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body focus:outline-none focus:border-brand-500"
                />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[13px] font-heading font-bold hover:bg-surface-soft"
              >
                <Upload className="w-3.5 h-3.5" strokeWidth={2.5} />
                Upload file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFilePick}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* ---------- Scope ---------- */}
        <div className="grid md:grid-cols-2 gap-4">
          <Field
            label="Program scope"
            hint="Leave 'All programs' for a global resource that every participant sees."
          >
            <select
              value={programCode}
              onChange={(e) => setProgramCode(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body focus:outline-none focus:border-brand-500"
            >
              <option value="">All programs (global)</option>
              {programs.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code} · {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Cohort scope"
            hint={
              programCode
                ? "Narrow further to a single cohort, or leave 'All cohorts' for every cohort in this program."
                : "Pick a program above first to scope to a cohort."
            }
          >
            <select
              value={cohortSlug}
              onChange={(e) => setCohortSlug(e.target.value)}
              disabled={!programCode || availableCohorts.length === 0}
              className="w-full px-3.5 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body focus:outline-none focus:border-brand-500 disabled:bg-surface-soft disabled:text-ink-muted"
            >
              <option value="">All cohorts in program</option>
              {availableCohorts.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-900">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 justify-end flex-wrap">
        {mode === "edit" && onArchive && (
          <button
            type="button"
            onClick={onArchive}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[12.5px] font-heading font-semibold text-ink-muted hover:text-rose-700 mr-auto"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
            Archive resource
          </button>
        )}
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
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ink text-white text-[13.5px] font-heading font-bold hover:bg-ink/90"
        >
          <Save className="w-4 h-4" strokeWidth={2.5} />
          {mode === "create" ? "Create resource" : "Save changes"}
        </button>
      </div>
    </form>
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

function stripExt(name) {
  return (name || "").replace(/\.[^.]+$/, "");
}
