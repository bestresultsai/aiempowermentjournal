import { useRef } from "react";
import {
  Plus,
  Trash2,
  Upload,
  Video,
  FileText,
  Wrench,
  Sparkles,
  Book,
  Link as LinkIcon,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import Select from "../Select";

// ---------------------------------------------------------------------------
// MaterialsEditor — reusable editor for an array of material items.
//
// Material shape:
//   { title, type, url, fileName? }
//
// Types map 1:1 with the participant-facing renderer's icon set so the admin
// gets a preview-of-truth while editing. File uploads use a base64 data URL
// stored in `url` plus a separate `fileName` for display. Production swaps
// the upload handler for Supabase Storage (see docs/headshot-storage.md).
//
// Backwards compat: callers may pass legacy entries in one of three shapes
// — string ("Cheat sheet"), {label, type, url} (the old AIEW3 seed shape),
// or {title, type, url}. We normalize all of them into the new shape inside
// the editor.
//
// Props:
//   value     Array<Material | legacy>
//   onChange  (next: Array<Material>) => void
//   maxFileMb optional — file size cap. Defaults to 5MB.
// ---------------------------------------------------------------------------

export const MATERIAL_TYPES = [
  { value: "link", label: "Link", icon: LinkIcon },
  { value: "video", label: "Video", icon: Video },
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "template", label: "Template", icon: Wrench },
  { value: "prompt", label: "Prompt", icon: Sparkles },
  { value: "doc", label: "Doc", icon: Book },
];

const TYPE_BY_VALUE = Object.fromEntries(
  MATERIAL_TYPES.map((t) => [t.value, t]),
);

const TYPE_BY_EXT = {
  pdf: "pdf",
  doc: "doc", docx: "doc", txt: "doc", md: "doc",
  mp4: "video", mov: "video", webm: "video",
  xlsx: "template", csv: "template",
};

export default function MaterialsEditor({
  value,
  onChange,
  maxFileMb = 5,
}) {
  const items = (value || []).map(normalizeMaterial);

  function update(idx, patch) {
    const next = items.map((m, i) => (i === idx ? { ...m, ...patch } : m));
    onChange(next);
  }
  function remove(idx) {
    onChange(items.filter((_, i) => i !== idx));
  }
  function add() {
    onChange([...items, { title: "", type: "link", url: "" }]);
  }
  function move(idx, dir) {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-soft p-4 text-center">
        <p className="text-[12.5px] text-ink-muted mb-3">
          No materials yet. Add a link, video, PDF, or upload a file.
        </p>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink text-white text-[12px] font-heading font-bold hover:bg-ink/90"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.75} />
          Add material
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((m, idx) => (
        <MaterialRow
          key={idx}
          index={idx}
          total={items.length}
          material={m}
          maxFileMb={maxFileMb}
          onChange={(patch) => update(idx, patch)}
          onRemove={() => remove(idx)}
          onMoveUp={() => move(idx, -1)}
          onMoveDown={() => move(idx, 1)}
        />
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-soft text-ink text-[12.5px] font-heading font-semibold hover:bg-ink/5"
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
        Add material
      </button>
    </div>
  );
}

function MaterialRow({
  index,
  total,
  material,
  maxFileMb,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}) {
  const fileInputRef = useRef(null);
  const TypeIcon = TYPE_BY_VALUE[material.type]?.icon || LinkIcon;
  const isUploaded = !!material.fileName;

  function handleFilePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxFileMb * 1024 * 1024) {
      alert(`File too large. Max ${maxFileMb} MB.`);
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const inferredType = TYPE_BY_EXT[ext] || material.type || "doc";
      onChange({
        title: material.title || stripExt(file.name),
        type: inferredType,
        url: reader.result, // base64 data URL
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function clearUpload() {
    onChange({ ...material, url: "", fileName: null });
  }

  return (
    <div className="rounded-xl border border-soft bg-surface-soft/40 p-3 space-y-2">
      <div className="flex items-center gap-2">
        {/* Type chip preview */}
        <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
          <TypeIcon className="w-3.5 h-3.5" strokeWidth={2.25} />
        </div>
        {/* Title */}
        <input
          type="text"
          value={material.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Title"
          className="flex-1 min-w-0 px-2 py-1.5 rounded-md bg-white border border-transparent hover:border-soft focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 text-[13px] font-heading font-semibold text-ink outline-none"
        />
        {/* Reorder + remove */}
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
            onClick={onRemove}
            className="p-1.5 rounded-md text-ink-muted hover:text-rose-700 hover:bg-rose-50"
            title="Remove material"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-[120px_1fr_auto] gap-2 items-center">
        {/* Type select */}
        <Select
          value={material.type || "link"}
          onChange={(v) => onChange({ type: v })}
          ariaLabel="Material type"
          options={MATERIAL_TYPES.map((t) => ({ value: t.value, label: t.label }))}
        />
        {/* URL or uploaded filename */}
        {isUploaded ? (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-emerald-50 border border-emerald-100 text-[12px] text-emerald-900 truncate">
            <Upload className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
            <span className="truncate font-heading font-semibold">
              {material.fileName}
            </span>
            <button
              type="button"
              onClick={clearUpload}
              className="ml-auto text-[10.5px] font-heading font-bold uppercase tracking-wider text-emerald-700 hover:text-emerald-900"
            >
              Replace
            </button>
          </div>
        ) : (
          <input
            type="url"
            value={material.url || ""}
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder="https://… (or upload a file →)"
            className="px-2.5 py-1.5 rounded-md border border-soft bg-white text-ink text-[12.5px] font-body focus:outline-none focus:border-brand-500"
          />
        )}
        {/* Upload */}
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white border border-soft text-ink text-[12px] font-heading font-semibold hover:border-brand-500"
          >
            <Upload className="w-3.5 h-3.5" strokeWidth={2.5} />
            Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFilePick}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public normalization — exported so callers can coerce a legacy materials
// array into the new shape before persisting.
// ---------------------------------------------------------------------------

export function normalizeMaterials(arr) {
  return (arr || []).map(normalizeMaterial);
}

function normalizeMaterial(m) {
  if (!m) return { title: "", type: "link", url: "" };
  if (typeof m === "string") {
    return { title: m, type: "link", url: "" };
  }
  return {
    title: m.title || m.label || "",
    type: m.type || "link",
    url: m.url || "",
    fileName: m.fileName || null,
  };
}

function stripExt(name) {
  return name.replace(/\.[^.]+$/, "");
}
