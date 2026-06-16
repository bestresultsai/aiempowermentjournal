import { useEffect, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { RESOURCE_TYPES } from "../../lib/resources";
import { getAllProgramsForAdmin } from "../../lib/programs";

// ---------------------------------------------------------------------------
// ResourceForm — shared editor for /admin/resources/new + /admin/resources/:id/edit.
//
// Props:
//   initial      — optional starter resource shape
//   mode         — "create" | "edit"
//   onSubmit     — (payload) => void
//   onCancel     — () => void
//   onArchive    — optional, only for edit mode; () => void
// ---------------------------------------------------------------------------

export default function ResourceForm({
  initial,
  mode = "edit",
  onSubmit,
  onCancel,
  onArchive,
}) {
  const programs = getAllProgramsForAdmin();
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [type, setType] = useState(initial?.type || "link");
  const [url, setUrl] = useState(initial?.url || "");
  const [programCode, setProgramCode] = useState(initial?.programCode || "");
  const [category, setCategory] = useState(initial?.category || "");
  const [error, setError] = useState("");

  // Re-seed if the parent provides a new initial (e.g. async load).
  useEffect(() => {
    if (!initial) return;
    setTitle(initial.title || "");
    setDescription(initial.description || "");
    setType(initial.type || "link");
    setUrl(initial.url || "");
    setProgramCode(initial.programCode || "");
    setCategory(initial.category || "");
  }, [initial]);

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!title.trim()) return setError("Title is required.");
    if (!url.trim()) return setError("URL is required.");
    if (!category.trim()) return setError("Category is required.");
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      type,
      url: url.trim(),
      programCode: programCode || null,
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

        <Field label="URL">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            placeholder="https://…"
            className="w-full px-3.5 py-2.5 rounded-xl border border-soft bg-surface-card text-ink text-[14px] font-body focus:outline-none focus:border-brand-500"
          />
        </Field>

        <Field
          label="Show to"
          hint="Pick a program to scope this resource. 'All programs' makes it global."
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
