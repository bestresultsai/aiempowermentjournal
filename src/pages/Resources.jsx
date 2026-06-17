import { useMemo } from "react";
import {
  Library,
  FileText,
  Video,
  Wrench,
  Sparkles,
  Book,
  Link as LinkIcon,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import NavBar from "../components/NavBar";
import {
  getResourcesForParticipant,
  useResourceVersion,
} from "../lib/resources";
import { useResolvedCohort } from "../lib/cohortResolution";

// ---------------------------------------------------------------------------
// /resources — the participant's curated library.
//
// Pulls from the resources store, filtered to the participant's program
// (plus globals). Grouped by category for scannability. Each card opens
// the resource in a new tab.
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

export default function Resources() {
  const version = useResourceVersion();
  const { cohort } = useResolvedCohort();
  const programCode = cohort?.programCode || null;
  const cohortSlug = cohort?.slug || null;

  const resources = useMemo(
    () => getResourcesForParticipant(programCode, cohortSlug),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [programCode, cohortSlug, version],
  );

  // Group by category.
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
    <div className="min-h-screen bg-surface-paper">
      <NavBar />
      <main className="max-w-[1180px] mx-auto px-6 lg:px-8 py-8">
        <header className="mb-8 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Library className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="h-eyebrow">Resources</div>
          </div>
          <h1 className="font-heading text-[32px] lg:text-[36px] font-extrabold tracking-tight text-ink leading-tight">
            The library.
          </h1>
          <p className="text-[14.5px] text-ink-muted mt-2 max-w-2xl leading-relaxed">
            Prompt files, extra videos, templates, and curated content from
            the BestResults.AI team.
          </p>
        </header>

        {byCategory.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-8 animate-fade-in-up delay-100">
            {byCategory.map(([category, items]) => (
              <section key={category}>
                <h2 className="font-heading text-[14px] font-bold uppercase tracking-wider text-ink-muted inline-flex items-center gap-1.5 mb-3">
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
        )}
      </main>
    </div>
  );
}

function ResourceCard({ resource }) {
  const Icon = TYPE_ICONS[resource.type] || LinkIcon;
  // Uploaded files have a fileName; attach `download` so the browser saves
  // with the original name rather than the data-URL hash.
  const isUpload = !!resource.fileName;
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      download={isUpload ? resource.fileName : undefined}
      className="group flex items-start gap-3 p-4 lg:p-5 rounded-2xl border border-soft bg-surface-card hover:border-brand-500 hover:shadow-card transition-all"
    >
      <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="inline-flex items-center px-1.5 py-0 rounded-md bg-ink/5 text-ink text-[9.5px] font-heading font-bold uppercase tracking-wider">
            {TYPE_LABELS[resource.type] || resource.type}
          </span>
          {isUpload && (
            <span className="inline-flex items-center px-1.5 py-0 rounded-md bg-emerald-50 text-emerald-700 text-[9.5px] font-heading font-bold uppercase tracking-wider">
              File
            </span>
          )}
        </div>
        <h3 className="font-heading text-[15px] font-extrabold text-ink leading-tight">
          {resource.title}
        </h3>
        {resource.description && (
          <p className="text-[12.5px] text-ink-muted leading-relaxed mt-1">
            {resource.description}
          </p>
        )}
      </div>
      <ExternalLink
        className="w-4 h-4 text-ink-subtle group-hover:text-brand-600 mt-1 shrink-0"
        strokeWidth={2.5}
      />
    </a>
  );
}

function EmptyState() {
  return (
    <section className="animate-fade-in-up delay-100">
      <div className="rounded-3xl bg-surface-card border border-soft p-10 lg:p-14 text-center shadow-card">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 items-center justify-center mb-5">
          <Sparkles className="w-7 h-7" strokeWidth={2} />
        </div>
        <h2 className="font-heading text-[24px] font-extrabold tracking-tight text-ink mb-3">
          Library coming soon.
        </h2>
        <p className="text-[14.5px] text-ink-muted max-w-xl mx-auto leading-relaxed mb-8">
          We're curating the first batch of resources for your program. In the
          meantime, your cohort sessions and the AI Journal have plenty to chew
          on.
        </p>
        <a
          href="/journey"
          className="group inline-flex items-center gap-1.5 text-[14px] font-heading font-semibold text-brand-600 hover:text-brand-700 transition-colors"
        >
          Back to your Journey
          <ArrowRight
            className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
            strokeWidth={2.5}
          />
        </a>
      </div>
    </section>
  );
}
