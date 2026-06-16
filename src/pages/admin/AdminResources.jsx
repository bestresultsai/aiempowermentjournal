import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Library,
  Plus,
  Pencil,
  Video,
  FileText,
  Wrench,
  Sparkles,
  Link as LinkIcon,
  Book,
} from "lucide-react";
import {
  getAllResourcesForAdmin,
  useResourceVersion,
} from "../../lib/resources";

// ---------------------------------------------------------------------------
// /admin/resources — the curated library admin view.
//
// Cards grouped by category. Each card shows title, description preview,
// type chip, and a program scope badge (global vs program-specific).
// Click → /admin/resources/:id/edit. "+ New resource" → /admin/resources/new.
// ---------------------------------------------------------------------------

const TYPE_ICONS = {
  video: Video,
  pdf: FileText,
  template: Wrench,
  prompt: Sparkles,
  doc: Book,
  link: LinkIcon,
};

const TYPE_LABELS = {
  video: "Video",
  pdf: "PDF",
  template: "Template",
  prompt: "Prompt",
  doc: "Doc",
  link: "Link",
};

export default function AdminResources() {
  const version = useResourceVersion();

  const resources = useMemo(
    () => getAllResourcesForAdmin(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );
  // Group by category for the section layout.
  const byCategory = useMemo(() => {
    const groups = new Map();
    for (const r of resources) {
      const key = r.category || "Uncategorized";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }
    return Array.from(groups.entries());
  }, [resources]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="h-eyebrow">Admin · Resources</div>
          <h1 className="font-heading text-[28px] lg:text-[34px] font-extrabold tracking-tight text-ink leading-tight">
            The library.
          </h1>
          <p className="text-[14px] text-ink-muted mt-1.5 max-w-2xl">
            Prompts, videos, templates, docs — anything participants should
            have one click away. Mark a resource global or pin it to a
            specific program.
          </p>
        </div>
        <Link
          to="/admin/resources/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink text-white text-[13.5px] font-heading font-bold hover:bg-ink/90 transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2.75} />
          New resource
        </Link>
      </header>

      {/* Empty state */}
      {byCategory.length === 0 && (
        <div className="rounded-2xl border border-dashed border-soft p-10 text-center">
          <div className="text-[13px] text-ink-muted">
            No resources yet. Create one to get started.
          </div>
        </div>
      )}

      {/* Sections */}
      {byCategory.map(([category, items]) => (
        <section key={category} className="space-y-3">
          <h2 className="font-heading text-[14px] font-bold uppercase tracking-wider text-ink-muted inline-flex items-center gap-1.5">
            <Library className="w-3 h-3" strokeWidth={2.5} />
            {category}
            <span className="text-ink-subtle">· {items.length}</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {items.map((r) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ResourceCard({ resource }) {
  const Icon = TYPE_ICONS[resource.type] || LinkIcon;
  return (
    <Link
      to={`/admin/resources/${encodeURIComponent(resource.id)}/edit`}
      className="rounded-2xl bg-surface-card border border-soft p-4 lg:p-5 hover:border-ink/20 hover:shadow-lift transition-all flex items-start gap-3 group"
    >
      <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="inline-flex items-center px-1.5 py-0 rounded-md bg-ink/5 text-ink text-[9.5px] font-heading font-bold uppercase tracking-wider">
            {TYPE_LABELS[resource.type] || resource.type}
          </span>
          <span
            className={`inline-flex items-center px-1.5 py-0 rounded-md text-[9.5px] font-heading font-bold uppercase tracking-wider ${
              resource.programCode
                ? "bg-brand-50 text-brand-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {resource.programCode || "Global"}
          </span>
        </div>
        <h3 className="font-heading text-[14px] font-extrabold text-ink leading-tight truncate">
          {resource.title}
        </h3>
        {resource.description && (
          <p className="text-[12px] text-ink-muted leading-relaxed mt-1 line-clamp-2">
            {resource.description}
          </p>
        )}
      </div>
      <span className="inline-flex items-center gap-1 text-[11.5px] font-heading font-bold text-brand-700 group-hover:text-brand-800 shrink-0">
        <Pencil className="w-3 h-3" strokeWidth={2.5} />
        Edit
      </span>
    </Link>
  );
}
